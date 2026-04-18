# 知识图谱服务 - 使用大模型提取概念和发现关系

import json
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.core.logger import get_logger
from app.models.knowledge_graph import GraphNode, GraphEdge, NodeType, EdgeType
from app.models.integration import Integration, FeatureSetting
from app.models.note import Note
from app.utils.encryption import decrypt_api_key
from app.services.llm.factory import ProviderRegistry
from app.services.feature_config.base import FeatureConfigRegistry

logger = get_logger(__name__)


class KnowledgeGraphService:
    """知识图谱服务"""

    def __init__(self, db: Session, user_id: int, llm_integration: Optional[Integration] = None):
        self.db = db
        self.user_id = user_id
        self.llm_integration = llm_integration  # 可选：预先传入 LLM 配置
        self.feature_config = None

    def _get_llm_integration(self) -> Optional[Integration]:
        """获取知识图谱场景使用的 LLM 集成配置"""
        # 如果已经传入了 LLM 配置，直接使用
        if self.llm_integration:
            return self.llm_integration

        # 获取场景配置
        feature_setting = self.db.query(FeatureSetting).filter(
            FeatureSetting.user_id == self.user_id,
            FeatureSetting.feature_id == "knowledge_graph"
        ).first()

        # 优先从 integration_refs 中获取指定的 LLM 配置
        if feature_setting and feature_setting.integration_refs:
            llm_key = feature_setting.integration_refs.get("llm")
            if llm_key:
                integration = self.db.query(Integration).filter(
                    Integration.user_id == self.user_id,
                    Integration.integration_type == "llm",
                    Integration.config_key == llm_key,
                    Integration.is_enabled == True
                ).first()
                if integration:
                    self.llm_integration = integration
                    return integration

        # 使用默认配置
        integration = self.db.query(Integration).filter(
            Integration.user_id == self.user_id,
            Integration.integration_type == "llm",
            Integration.is_default == True,
            Integration.is_enabled == True
        ).first()
        self.llm_integration = integration
        return integration

    def _get_feature_config(self) -> Dict[str, Any]:
        """获取知识图谱场景配置"""
        feature_setting = self.db.query(FeatureSetting).filter(
            FeatureSetting.user_id == self.user_id,
            FeatureSetting.feature_id == "knowledge_graph"
        ).first()

        if feature_setting and feature_setting.custom_settings:
            return FeatureConfigRegistry.merge_with_defaults(
                "knowledge_graph",
                feature_setting.custom_settings
            )

        return FeatureConfigRegistry.get_default_config("knowledge_graph")

    def has_llm_config(self) -> bool:
        """检查用户是否配置了大模型"""
        integration = self._get_llm_integration()
        if not integration:
            return False
        config = integration.config or {}
        return bool(config.get("api_key"))

    @staticmethod
    def normalize_edge_direction(source_id: int, target_id: int, edge_type: str) -> Tuple[int, int]:
        """规范化边的方向

        对于对称关系（related），始终使用小 ID→大 ID 的方向
        对于非对称关系（hierarchical, sequential），保持原方向

        Args:
            source_id: 源节点 ID
            target_id: 目标节点 ID
            edge_type: 边类型

        Returns:
            (normalized_source, normalized_target)
        """
        if edge_type == EdgeType.RELATED.value:
            # 对称关系：始终小 ID→大 ID
            return (min(source_id, target_id), max(source_id, target_id))
        else:
            # 非对称关系保持原方向
            return (source_id, target_id)

    def _create_provider(self):
        """创建 LLM Provider 实例"""
        integration = self._get_llm_integration()
        if not integration:
            raise ValueError("未配置大模型")

        config = dict(integration.config) if integration.config else {}
        provider_id = config.get("provider_id") or integration.provider

        if not provider_id:
            raise ValueError("配置中缺少 provider_id")

        # 解密 API Key
        if "api_key" in config and config["api_key"]:
            try:
                config["api_key"] = decrypt_api_key(config["api_key"])
            except Exception as e:
                logger.warning(f"解密 API Key 失败: {e}")
                raise ValueError("无法解密 API Key")

        return ProviderRegistry.create_provider(provider_id, config)

    @staticmethod
    def _normalize_concept_name(name: str) -> str:
        """归一化概念名称

        处理常见的名称变体：
        - 去除首尾空格、中英文空格
        - 统一全角/半角字符
        - 统一大小写（英文）
        - 去除常见标点符号

        Args:
            name: 原始概念名称

        Returns:
            归一化后的名称
        """
        if not name:
            return ""

        # 去除首尾空白（包含全角空格）
        name = name.strip().strip('\u3000')

        # 统一全角字符为半角
        name = name.replace('\uff08', '(').replace('\uff09', ')')
        name = name.replace('\uff0c', ',').replace('\u3001', ',')
        name = name.replace('\u2018', "'").replace('\u2019', "'")
        name = name.replace('\u201c', '"').replace('\u201d', '"')
        name = name.replace('\u2014', '-').replace('\u2013', '-')
        name = name.replace('\u2026', '...')

        # 去除常见标点（中英文标点）
        for ch in '，。、；：！？"\'""''（）【】《》.:;!?,\'"()[]{}<>':
            name = name.replace(ch, '')

        # 合并连续空格为无空格
        name = ''.join(name.split())

        # 英文统一为小写
        if name.isascii():
            name = name.lower()

        return name

    def _find_matching_node(self, concept_name: str, concept_description: str = "") -> Optional[Any]:
        """查找匹配的已有节点

        匹配策略（按优先级）：
        1. 精确匹配：名称完全相同
        2. 归一化匹配：名称归一化后相同
        3. 包含关系匹配：一个名称包含另一个（忽略大小写）

        Args:
            concept_name: 待匹配的概念名称
            concept_description: 概念描述（用于辅助判断，暂未使用）

        Returns:
            匹配的 GraphNode 对象，未匹配到则返回 None
        """
        # 策略 1: 精确匹配
        exact_node = self.db.query(GraphNode).filter(
            GraphNode.user_id == self.user_id,
            GraphNode.name == concept_name
        ).first()
        if exact_node:
            return exact_node

        # 策略 2: 归一化匹配
        normalized = self._normalize_concept_name(concept_name)
        if normalized:
            all_nodes = self.db.query(GraphNode).filter(
                GraphNode.user_id == self.user_id
            ).all()

            for node in all_nodes:
                node_normalized = self._normalize_concept_name(node.name)
                if node_normalized and node_normalized == normalized:
                    logger.debug(f"概念归一化匹配: '{concept_name}' -> '{node.name}' (归一化: '{normalized}')")
                    return node

        # 策略 3: 包含关系匹配（仅当概念名较短时尝试，避免误匹配）
        if len(concept_name) <= 15:
            # 检查是否有节点名包含当前概念名
            containing_node = self.db.query(GraphNode).filter(
                GraphNode.user_id == self.user_id,
                GraphNode.name.ilike(f"%{concept_name}%")
            ).first()
            if containing_node:
                # 反向检查：当前概念名也包含节点名，说明是互相包含，更可能是同一个概念
                if concept_name.lower() in containing_node.name.lower():
                    logger.debug(f"概念包含匹配: '{concept_name}' -> '{containing_node.name}'")
                    return containing_node

        return None

    @staticmethod
    def _estimate_tokens(text: str) -> int:
        """估算文本的 token 数量（中文字符约 1.5 token/字，英文约 0.75 token/词）"""
        if not text:
            return 0
        # 简化估算：中文字符数 * 1.5 + 英文字符数 * 0.25
        chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
        english_chars = sum(1 for c in text if c.isascii() and c.isalpha())
        return int(chinese_chars * 1.5 + english_chars * 0.25)

    @staticmethod
    def truncate_content_smart(content: str, max_tokens: int = 1500) -> str:
        """智能截断内容，保留关键信息

        策略：
        1. 优先保留首尾段落（通常包含核心信息）
        2. 中间段落按长度降序选择
        3. 超过阈值时截断长段落

        Args:
            content: 原始内容
            max_tokens: 最大 token 数

        Returns:
            截断后的内容
        """
        if not content:
            return ""

        # 如果内容较短，直接返回
        if KnowledgeGraphService._estimate_tokens(content) <= max_tokens:
            return content

        # 按段落分割
        paragraphs = content.split('\n\n')

        if len(paragraphs) <= 1:
            # 单段落直接截断
            return content[:int(len(content) * max_tokens / KnowledgeGraphService._estimate_tokens(content))]

        result = []
        token_count = 0

        # 首段（总是保留）
        if paragraphs:
            first_para = paragraphs[0]
            first_tokens = KnowledgeGraphService._estimate_tokens(first_para)
            if first_tokens <= max_tokens * 0.3:  # 首段不超过 30%
                result.append(first_para)
                token_count += first_tokens

        # 尾段（总是保留，如果与首段不同）
        if len(paragraphs) > 1:
            last_para = paragraphs[-1]
            if last_para != paragraphs[0]:
                last_tokens = KnowledgeGraphService._estimate_tokens(last_para)
                if token_count + last_tokens <= max_tokens * 0.5:
                    result.append(last_para)
                    token_count += last_tokens

        # 中间段落（按长度降序，优先保留信息密度高的）
        middle = paragraphs[1:-1] if len(paragraphs) > 2 else []
        middle_sorted = sorted(middle, key=lambda p: len(p), reverse=True)

        for para in middle_sorted:
            para_tokens = KnowledgeGraphService._estimate_tokens(para)
            if token_count + para_tokens > max_tokens:
                break
            result.append(para)
            token_count += para_tokens

        return '\n\n'.join(result) if result else content[:1000]

    async def _call_llm(self, prompt: str, system_prompt: str = "你是一个知识图谱构建助手。") -> str:
        """调用大模型 API"""
        provider = self._create_provider()

        integration = self._get_llm_integration()
        model = integration.config.get("model", "") if integration and integration.config else ""

        if not model:
            # 如果没有指定模型，获取第一个可用模型
            models = await provider.get_models()
            if models:
                model = models[0].id
            else:
                raise ValueError("未指定模型且无法获取默认模型")

        # 获取场景配置中的 temperature
        feature_config = self._get_feature_config()
        temperature = feature_config.get("temperature", 0.7)

        return await provider.generate(prompt, model, system_prompt, temperature=temperature)

    async def _batch_extract_concepts(
        self,
        notes: List[Any],
        batch_size: int = 5,
        max_concurrent: int = 3,
        progress_callback: callable = None,
    ) -> List[Dict[str, Any]]:
        """批量处理笔记，提取概念

        注意：使用顺序处理（非并发），确保每篇笔记提取的概念
        能作为已有概念传给后续笔记，减少重复概念创建。

        Args:
            notes: 笔记列表
            batch_size: 每批处理的笔记数量
            max_concurrent: 保留参数（暂未使用）
            progress_callback: 进度回调函数

        Returns:
            所有概念的扁平列表
        """
        all_concepts = []
        total_notes = len(notes)
        existing_concepts_accum = []  # 累积已提取的概念

        for note_idx, note in enumerate(notes):
            try:
                # 将已有概念传给 LLM，避免重复创建
                existing_hint = existing_concepts_accum[:200] if len(existing_concepts_accum) > 0 else None
                concepts = await self.extract_concepts_from_note(
                    note.id, note.title, note.content,
                    existing_concepts=existing_hint,
                )

                # 累积新概念供后续笔记复用
                for c in concepts:
                    new_concept = {"name": c["name"], "description": c.get("description", "")}
                    if new_concept not in existing_concepts_accum:
                        existing_concepts_accum.append(new_concept)
                    all_concepts.append(c)

                # 更新进度
                if progress_callback:
                    progress = int((note_idx + 1) / total_notes * 50)
                    await progress_callback(
                        progress,
                        f"已处理 {note_idx + 1}/{total_notes} 篇笔记，提取 {len(all_concepts)} 个概念"
                    )
            except Exception as e:
                logger.error(f"批量提取概念-处理笔记失败: note_id={note.id}, error={e}")

        return all_concepts

    async def extract_concepts_from_note(
        self, note_id: int, title: str, content: str,
        existing_concepts: Optional[List[Dict[str, str]]] = None,
    ) -> List[Dict[str, Any]]:
        """从笔记中提取概念

        Args:
            note_id: 笔记 ID
            title: 笔记标题
            content: 笔记内容
            existing_concepts: 已有的概念列表，格式 [{"name": "...", "description": "..."}]
                LLM 会优先从已有概念中选择，仅在全不匹配时才创建新概念

        Returns:
            概念列表
        """
        # 获取实体数量配置
        feature_config = self._get_feature_config()
        entity_count = feature_config.get("entity_count", 10)

        # 构建已有概念提示
        existing_hint = ""
        if existing_concepts:
            max_hint = entity_count * 20  # 根据配置动态调整提示数量
            existing_list = "\n".join(
                [f"- {c['name']}: {c.get('description', '无描述')}" for c in existing_concepts[:max_hint]]
            )
            existing_hint = f"""
**已有概念列表**（请优先从中选择匹配的概念，不要创建重复的变体）：
{existing_list}

**重要规则**：
1. 如果笔记中的概念与上面列表中的某个概念含义相同或高度相似，必须使用列表中已有的名称，不要创建新名称
2. 例如已有"飞牛NAS"时，不要创建"飞牛 NAS"、"fnOS"等变体
3. 只有在完全不匹配的情况下，才创建新概念"""

        system_prompt = f"""你是一个专业的知识图谱构建助手。你的任务是从用户的笔记中提取核心概念和关键词。

请遵循以下规则：
1. 提取 {min(3, entity_count)}-{entity_count} 个核心概念（重要的名词、术语、人物、地点等）
2. 为每个概念提供简短的描述（不超过 50 字）
3. 判断概念的类型：concept（核心概念）、topic（主题类别）、entity（实体：人物/地点/组织）
4. 返回严格的 JSON 格式，不要包含其他说明文字{existing_hint}"""

        prompt = f"""请从以下笔记中提取核心概念：

笔记标题：{title}
笔记内容：
{self.truncate_content_smart(content, 1500)}

请以如下 JSON 格式返回：
{{
    "concepts": [
        {{"name": "概念名称", "type": "concept|topic|entity", "description": "概念描述"}},
        ...
    ]
}}"""

        try:
            result = await self._call_llm(prompt, system_prompt)
            # 解析 JSON 响应
            result = result.strip()
            if result.startswith("```json"):
                result = result[7:]
            if result.endswith("```"):
                result = result[:-3]
            result = result.strip()

            data = json.loads(result)
            concepts = data.get("concepts", [])

            # 添加来源笔记 ID
            for concept in concepts:
                concept["source_note_id"] = str(note_id)

            return concepts

        except Exception as e:
            logger.error(f"概念提取失败: note_id={note_id}, error={e}")
            return []

    async def discover_relationships(
        self, concepts: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """发现概念之间的关系"""
        system_prompt = """你是一个知识图谱关系发现助手。你的任务是分析概念列表，发现概念之间的潜在关系。

请遵循以下规则：
1. 识别概念之间的有意义的关系（不要为了关联而关联）
2. 关系类型包括：
   - related: 一般关联关系
   - hierarchical: 层级关系（上位概念→下位概念）
   - sequential: 顺序关系（前置知识→后续知识）
3. 为每个关系提供简短的描述
4. 评估关系强度（0.0-1.0）
5. 返回严格的 JSON 格式"""

        concepts_text = "\n".join(
            [f"- {c['name']}: {c.get('description', '无描述')}" for c in concepts[:20]]
        )  # 限制概念数量

        prompt = f"""请分析以下概念之间的关系：

{concepts_text}

请以如下 JSON 格式返回：
{{
    "relationships": [
        {{
            "source": "源概念名称",
            "target": "目标概念名称",
            "type": "related|hierarchical|sequential",
            "description": "关系描述",
            "strength": 0.8
        }},
        ...
    ]
}}"""

        try:
            result = await self._call_llm(prompt, system_prompt)
            result = result.strip()
            if result.startswith("```json"):
                result = result[7:]
            if result.endswith("```"):
                result = result[:-3]
            result = result.strip()

            data = json.loads(result)
            return data.get("relationships", [])

        except Exception as e:
            logger.error(f"关系发现失败: error={e}")
            return []

    async def _discover_relationships_layered(
        self,
        all_concepts: List[Dict[str, Any]],
        progress_callback: callable = None,
    ) -> List[Dict[str, Any]]:
        """分层关系发现 - 基于图谱大小的自适应策略

        根据概念数量采用不同策略：
        - 小型图谱 (≤50): 全量分析
        - 中型图谱 (51-200): 分组 + 组内采样
        - 大型图谱 (>200): 智能聚类 + 增量分析

        Args:
            all_concepts: 所有概念列表
            progress_callback: 进度回调函数

        Returns:
            关系列表
        """
        if len(all_concepts) < 2:
            return []

        # 策略 1: 小型图谱 - 直接全量分析（分批）
        if len(all_concepts) <= 50:
            if progress_callback:
                await progress_callback(20, "小型图谱 - 全量分析模式")
            return await self._discover_relationships_batched(all_concepts, progress_callback)

        # 策略 2: 中型图谱 - 分批分析（适用于 51-200 个概念）
        if len(all_concepts) <= 200:
            if progress_callback:
                await progress_callback(20, "中型图谱 - 分批分析模式")
            return await self._discover_relationships_batched(all_concepts, progress_callback)

        # 策略 3: 大型图谱 - 智能聚类 + 增量分析
        if progress_callback:
            await progress_callback(20, "大型图谱 - 智能聚类模式")
        return await self._discover_relationships_clustered(all_concepts, progress_callback)

    async def _discover_relationships_batched(
        self,
        all_concepts: List[Dict[str, Any]],
        progress_callback: callable = None,
    ) -> List[Dict[str, Any]]:
        """分批全量分析（适用于≤50 个概念）

        将概念分批，每批 20 个进行全量分析，然后合并结果
        """
        if len(all_concepts) <= 20:
            return await self.discover_relationships(all_concepts)

        all_relationships = []
        seen_relationships = set()
        batch_size = 20

        # 分批处理
        batches = [all_concepts[i:i+batch_size] for i in range(0, len(all_concepts), batch_size)]

        for idx, batch in enumerate(batches):
            if progress_callback:
                await progress_callback(30 + idx * 20, f"分析批次 {idx + 1}/{len(batches)}")

            relationships = await self.discover_relationships(batch)
            for rel in relationships:
                key = tuple(sorted([rel.get("source", ""), rel.get("target", "")]))
                if key not in seen_relationships:
                    seen_relationships.add(key)
                    all_relationships.append(rel)

        return all_relationships

    async def _discover_relationships_clustered(
        self,
        all_concepts: List[Dict[str, Any]],
        progress_callback: callable = None,
    ) -> List[Dict[str, Any]]:
        """智能聚类关系发现（适用于>200 个概念的大型图谱）

        策略：
        1. 按概念名称前缀/类型粗聚类（减少 LLM 调用）
        2. 每簇内分析关系
        3. 簇间通过代表概念关联

        Args:
            all_concepts: 所有概念列表（>200）
            progress_callback: 进度回调函数

        Returns:
            关系列表
        """
        all_relationships = []
        seen_relationships = set()

        # 步骤 1: 粗聚类（按概念类型 + 名称前缀）
        clusters: Dict[str, List[Dict[str, Any]]] = {}

        for concept in all_concepts:
            # 聚类键：类型 + 名称首字母
            name = concept.get("name", "")
            node_type = concept.get("type", "other")
            cluster_key = f"{node_type}_{name[0].upper() if name else 'X'}"

            if cluster_key not in clusters:
                clusters[cluster_key] = []
            clusters[cluster_key].append(concept)

        if progress_callback:
            await progress_callback(30, f"已聚类为 {len(clusters)} 簇")

        # 步骤 2: 每簇内分析关系
        cluster_representatives = []
        processed_clusters = 0

        for cluster_key, concepts in clusters.items():
            if len(concepts) < 2:
                if concepts:
                    cluster_representatives.append(concepts[0])
                continue

            # 簇内分析（最多 20 个）
            cluster_sample = concepts[:20]
            relationships = await self.discover_relationships(cluster_sample)

            for rel in relationships:
                key = tuple(sorted([rel.get("source", ""), rel.get("target", "")]))
                if key not in seen_relationships:
                    seen_relationships.add(key)
                    all_relationships.append(rel)

            processed_clusters += 1
            if progress_callback and processed_clusters % 5 == 0:
                await progress_callback(40 + (processed_clusters / len(clusters) * 40),
                                       f"已分析 {processed_clusters}/{len(clusters)} 簇")

            # 每簇取 1-2 个代表用于簇间关联
            cluster_representatives.extend(concepts[:2])

        # 步骤 3: 簇间关联（代表概念之间）
        if len(cluster_representatives) >= 2:
            if progress_callback:
                await progress_callback(85, "正在分析簇间关系...")

            # 代表概念分批分析
            rep_sample = cluster_representatives[:50]  # 限制代表数量
            cross_cluster_rels = await self.discover_relationships(rep_sample)

            for rel in cross_cluster_rels:
                key = tuple(sorted([rel.get("source", ""), rel.get("target", "")]))
                if key not in seen_relationships:
                    seen_relationships.add(key)
                    all_relationships.append(rel)

        if progress_callback:
            await progress_callback(95, f"共发现 {len(all_relationships)} 个关系")

        return all_relationships

    async def build_graph_with_progress(
        self,
        notes: List[Any],
        integration: Integration,
        progress_callback: callable = None,
    ) -> Dict[str, Any]:
        """构建知识图谱（支持进度回调）

        Args:
            notes: 笔记列表
            integration: LLM 集成配置
            progress_callback: 进度回调函数 (progress: int, message: str) -> None

        Returns:
            构建统计信息
        """
        if not notes:
            return {"status": "no_notes", "message": "没有笔记可处理"}

        if not integration:
            raise ValueError("未提供 LLM 集成配置")

        total_notes = len(notes)
        stats = {
            "total_notes": total_notes,
            "concepts_extracted": 0,
            "relationships_discovered": 0,
            "nodes_created": 0,
            "edges_created": 0,
        }

        all_concepts = []
        concept_to_node_id = {}

        # 阶段 1: 批量并发提取概念 (0% - 50%)
        if progress_callback:
            await progress_callback(0, f"开始处理 {total_notes} 篇笔记...")

        # 使用批量并发处理提取概念
        raw_concepts = await self._batch_extract_concepts(
            notes=notes,
            batch_size=5,
            max_concurrent=3,
            progress_callback=progress_callback,
        )

        # 创建节点（数据库操作，串行）
        for concept in raw_concepts:
            concept_name = concept["name"]

            # 先尝试精确匹配
            existing_node = self.db.query(GraphNode).filter(
                GraphNode.user_id == self.user_id,
                GraphNode.name == concept_name
            ).first()

            # 精确匹配失败时，使用模糊匹配（归一化 + 包含关系）
            if not existing_node:
                existing_node = self._find_matching_node(concept_name, concept.get("description", ""))
                if existing_node:
                    logger.info(f"全量构建-模糊匹配概念: '{concept_name}' -> '{existing_node.name}'")

            if existing_node:
                existing_ids = set(existing_node.source_note_ids.split(",") if existing_node.source_note_ids else [])
                existing_ids.add(str(concept.get("source_note_id")))
                existing_node.source_note_ids = ",".join(existing_ids)
                existing_node.description = concept.get("description")
                concept_to_node_id[concept_name] = existing_node.id
            else:
                node = GraphNode(
                    user_id=self.user_id,
                    name=concept_name,
                    node_type=concept.get("type", NodeType.CONCEPT.value),
                    description=concept.get("description"),
                    source_note_ids=concept.get("source_note_id"),
                )
                self.db.add(node)
                self.db.flush()
                concept_to_node_id[concept_name] = node.id
                stats["nodes_created"] += 1

            if concept not in all_concepts:
                all_concepts.append(concept)

        stats["concepts_extracted"] = len(raw_concepts)
        self.db.commit()

        # 阶段 2: 发现关系 (50% - 80%) - 使用分层关系发现
        if len(all_concepts) >= 2:
            if progress_callback:
                await progress_callback(50, "正在分析概念间的关系...")

            # 使用分层关系发现（突破 20 概念限制）
            relationships = await self._discover_relationships_layered(
                all_concepts=all_concepts,
                progress_callback=progress_callback,
            )
            stats["relationships_discovered"] = len(relationships)

            if progress_callback:
                await progress_callback(65, f"发现 {len(relationships)} 个潜在关系")

            # 创建边
            for idx, rel in enumerate(relationships):
                source_name = rel.get("source")
                target_name = rel.get("target")

                if source_name not in concept_to_node_id or target_name not in concept_to_node_id:
                    continue

                source_node_id = concept_to_node_id[source_name]
                target_node_id = concept_to_node_id[target_name]
                edge_type = rel.get("type", EdgeType.RELATED.value)

                # 规范化边的方向
                norm_source, norm_target = self.normalize_edge_direction(source_node_id, target_node_id, edge_type)

                # 双向检查（对称关系）
                if edge_type == EdgeType.RELATED.value:
                    existing_edge = self.db.query(GraphEdge).filter(
                        GraphEdge.user_id == self.user_id,
                        or_(
                            (GraphEdge.source_node_id == norm_source) &
                            (GraphEdge.target_node_id == norm_target),
                            (GraphEdge.source_node_id == norm_target) &
                            (GraphEdge.target_node_id == norm_source)
                        )
                    ).first()
                else:
                    existing_edge = self.db.query(GraphEdge).filter(
                        GraphEdge.user_id == self.user_id,
                        GraphEdge.source_node_id == norm_source,
                        GraphEdge.target_node_id == norm_target
                    ).first()

                if existing_edge:
                    existing_edge.edge_type = edge_type
                    existing_edge.description = rel.get("description")
                    existing_edge.strength = rel.get("strength", 0.5)
                else:
                    edge = GraphEdge(
                        user_id=self.user_id,
                        source_node_id=norm_source,
                        target_node_id=norm_target,
                        edge_type=edge_type,
                        description=rel.get("description"),
                        strength=rel.get("strength", 0.5),
                    )
                    self.db.add(edge)
                    stats["edges_created"] += 1

                # 每处理10个关系更新一次进度
                if progress_callback and idx % 10 == 0:
                    progress = 65 + int((idx + 1) / len(relationships) * 15)
                    await progress_callback(min(progress, 80), f"正在保存关系 ({idx + 1}/{len(relationships)})...")

            self.db.commit()

        if progress_callback:
            await progress_callback(85, "正在最终处理...")

        if progress_callback:
            await progress_callback(95, "构建完成")

        return stats

    async def incremental_update_for_note(
        self,
        note: Any,
        integration: Integration,
    ) -> Dict[str, Any]:
        """为单个笔记增量更新知识图谱

        Args:
            note: 笔记对象
            integration: LLM 集成配置

        Returns:
            更新统计
        """
        if not integration:
            return {"status": "error", "message": "LLM 配置不存在"}

        try:
            stats = {"concepts_extracted": 0, "nodes_created": 0, "edges_created": 0}

            # 获取已有概念（用于提示 LLM 优先复用）
            existing_nodes = self.db.query(GraphNode.name, GraphNode.description).filter(
                GraphNode.user_id == self.user_id
            ).all()
            existing_concepts = [{"name": n.name, "description": n.description or ""} for n in existing_nodes]
            if existing_concepts:
                logger.info(f"增量更新-加载已有概念: user_id={self.user_id}, count={len(existing_concepts)}")

            # 提取概念（传入已有概念供 LLM 复用）
            concepts = await self.extract_concepts_from_note(
                note.id, note.title, note.content,
                existing_concepts=existing_concepts if len(existing_concepts) <= 200 else None,  # 概念太多时跳过
            )
            stats["concepts_extracted"] = len(concepts)

            if not concepts:
                return stats

            logger.info(f"增量更新-提取概念完成: note_id={note.id}, count={len(concepts)}, concepts={[c['name'] for c in concepts]}")

            concept_to_node_id = {}
            new_concept_names = []

            # 创建/更新节点
            for concept in concepts:
                concept_name = concept["name"]

                existing_node = self._find_matching_node(concept_name, concept.get("description", ""))

                if existing_node:
                    existing_ids = set(existing_node.source_note_ids.split(",") if existing_node.source_note_ids else [])
                    existing_ids.add(str(note.id))
                    existing_node.source_note_ids = ",".join(existing_ids)
                    existing_node.description = concept.get("description")
                    concept_to_node_id[concept_name] = existing_node.id
                else:
                    node = GraphNode(
                        user_id=self.user_id,
                        name=concept_name,
                        node_type=concept.get("type", NodeType.CONCEPT.value),
                        description=concept.get("description"),
                        source_note_ids=str(note.id),
                    )
                    self.db.add(node)
                    self.db.flush()
                    concept_to_node_id[concept_name] = node.id
                    new_concept_names.append(concept_name)
                    stats["nodes_created"] += 1

            self.db.commit()

            # 发现新概念与已有概念的关系
            # 只要有新概念，就尝试建立与已有概念的关系（即使只有 1 个新概念）
            if new_concept_names:
                all_concepts = [{"name": c["name"], "description": c.get("description", "")} for c in concepts]

                # 获取已有概念数量，决定策略
                existing_node_count = self.db.query(func.count(GraphNode.id)).filter(
                    GraphNode.user_id == self.user_id
                ).scalar()

                # 根据已有概念数量选择加载策略
                if existing_node_count <= 50:
                    # 小型图谱：加载所有已有概念
                    existing_nodes = self.db.query(GraphNode).filter(
                        GraphNode.user_id == self.user_id
                    ).all()
                elif existing_node_count <= 200:
                    # 中型图谱：加载最近创建的 100 个概念 + 随机 50 个
                    recent_nodes = self.db.query(GraphNode).filter(
                        GraphNode.user_id == self.user_id
                    ).order_by(GraphNode.created_at.desc()).limit(100).all()

                    random_nodes = self.db.query(GraphNode).filter(
                        GraphNode.user_id == self.user_id
                    ).order_by(func.random()).limit(50).all()

                    # 合并去重
                    existing_nodes = recent_nodes
                    for node in random_nodes:
                        if node not in existing_nodes:
                            existing_nodes.append(node)
                else:
                    # 大型图谱：基于名称相似度筛选相关概念
                    # 使用简单策略：加载与新概念名称有共同字符的概念
                    existing_nodes = []

                    # 1. 最近创建的 50 个
                    recent_nodes = self.db.query(GraphNode).filter(
                        GraphNode.user_id == self.user_id
                    ).order_by(GraphNode.created_at.desc()).limit(50).all()
                    existing_nodes.extend(recent_nodes)

                    # 2. 名称包含相同字符的（潜在相关）
                    for new_name in new_concept_names[:5]:  # 限制新概念数量
                        if len(new_name) >= 2:
                            similar_nodes = self.db.query(GraphNode).filter(
                                GraphNode.user_id == self.user_id,
                                GraphNode.name.ilike(f"%{new_name[:2]}%")
                            ).limit(10).all()
                            for node in similar_nodes:
                                if node not in existing_nodes:
                                    existing_nodes.append(node)

                    # 限制总数
                    existing_nodes = existing_nodes[:150]

                for node in existing_nodes:
                    if node.name not in concept_to_node_id:
                        all_concepts.append({"name": node.name, "description": node.description or "无描述"})
                        concept_to_node_id[node.name] = node.id

                # 限制总概念数（避免 token 超限）
                if len(all_concepts) > 50:
                    # 保留所有新概念，随机采样已有概念
                    new_concepts_list = [c for c in all_concepts if c["name"] in new_concept_names]
                    existing_concepts_list = [c for c in all_concepts if c["name"] not in new_concept_names]

                    import random
                    sampled_existing = random.sample(existing_concepts_list, min(45, len(existing_concepts_list)))
                    all_concepts = new_concepts_list + sampled_existing

                relationships = await self.discover_relationships(all_concepts)

                # 创建边
                edges_created = self.create_edges_from_relationships(relationships, concept_to_node_id)
                stats["edges_created"] = edges_created

            return stats

        except Exception as e:
            logger.error(f"知识图谱增量更新失败: user_id={self.user_id}, note_id={note.id}, error={e}", exc_info=True)
            return {"status": "error", "message": str(e)}

    async def build_graph_for_user(self, note_ids: Optional[List[int]] = None) -> Dict[str, Any]:
        """为用户构建知识图谱

        Args:
            note_ids: 可选的笔记 ID 列表，如果为 None 则处理所有笔记

        Returns:
            包含处理统计信息的字典
        """
        from app.models.note import Note

        # 查询笔记
        query = self.db.query(Note).filter(Note.user_id == self.user_id)
        if note_ids:
            query = query.filter(Note.id.in_(note_ids))
        notes = query.all()

        if not notes:
            return {"status": "no_notes", "message": "没有笔记可处理"}

        stats = {
            "total_notes": len(notes),
            "concepts_extracted": 0,
            "relationships_discovered": 0,
            "nodes_created": 0,
            "edges_created": 0,
        }

        all_concepts = []  # 存储所有提取的概念（用于后续关系发现）
        concept_to_node_id = {}  # 概念名到节点 ID 的映射

        # 获取已有概念（全量构建时也传入已有节点，避免重复创建）
        db_existing_nodes = self.db.query(GraphNode.name, GraphNode.description).filter(
            GraphNode.user_id == self.user_id
        ).all()
        db_existing_concepts = [{"name": n.name, "description": n.description or ""} for n in db_existing_nodes]

        # 步骤 1: 为每个笔记提取概念
        for note in notes:
            try:
                # 传入已有概念 + 已处理笔记提取的概念，让 LLM 优先复用
                context_concepts = db_existing_concepts + all_concepts
                concepts = await self.extract_concepts_from_note(
                    note.id, note.title, note.content,
                    existing_concepts=context_concepts if len(context_concepts) <= 200 else None,
                )
                stats["concepts_extracted"] += len(concepts)

                # 将新提取的概念添加到 all_concepts
                all_concepts.extend(concepts)

                # 创建/更新节点
                for concept in concepts:
                    concept_name = concept["name"]

                    # 如果概念已存在，更新来源笔记 ID
                    existing_node = self.db.query(GraphNode).filter(
                        GraphNode.user_id == self.user_id,
                        GraphNode.name == concept_name
                    ).first()

                    if existing_node:
                        # 更新来源笔记 ID
                        existing_ids = set(existing_node.source_note_ids.split(",") if existing_node.source_note_ids else [])
                        existing_ids.add(str(note.id))
                        existing_node.source_note_ids = ",".join(existing_ids)
                        existing_node.description = concept.get("description")
                        concept_to_node_id[concept_name] = existing_node.id
                    else:
                        # 创建新节点
                        node = GraphNode(
                            user_id=self.user_id,
                            name=concept_name,
                            node_type=concept.get("type", NodeType.CONCEPT.value),
                            description=concept.get("description"),
                            source_note_ids=str(note.id),
                        )
                        self.db.add(node)
                        self.db.flush()
                        concept_to_node_id[concept_name] = node.id
                        stats["nodes_created"] += 1

                    # 添加到所有概念列表用于关系发现
                    if concept not in all_concepts:
                        all_concepts.append(concept)

                self.db.commit()

            except Exception as e:
                logger.error(f"构建图谱-处理笔记失败: note_id={note.id}, error={e}")
                continue

        # 步骤 2: 发现概念间关系
        if len(all_concepts) >= 2:
            relationships = await self.discover_relationships(all_concepts)
            stats["relationships_discovered"] = len(relationships)

            # 创建边（使用封装方法，支持对称关系去重）
            edges_created = self.create_edges_from_relationships(relationships, concept_to_node_id)
            stats["edges_created"] = edges_created

            self.db.commit()

        return stats

    def get_graph_data(self) -> Dict[str, Any]:
        """获取图谱数据（用于前端可视化）"""
        nodes = self.db.query(GraphNode).filter(GraphNode.user_id == self.user_id).all()
        edges = self.db.query(GraphEdge).filter(GraphEdge.user_id == self.user_id).all()

        return {
            "nodes": [
                {
                    "id": node.id,
                    "name": node.name,
                    "type": node.node_type,
                    "description": node.description,
                    "source_note_ids": node.source_note_ids.split(",") if node.source_note_ids else [],
                }
                for node in nodes
            ],
            "edges": [
                {
                    "id": edge.id,
                    "source": edge.source_node_id,
                    "target": edge.target_node_id,
                    "type": edge.edge_type,
                    "description": edge.description,
                    "strength": edge.strength,
                }
                for edge in edges
            ],
        }

    def clear_graph(self) -> None:
        """清空用户的知识图谱"""
        self.db.query(GraphEdge).filter(GraphEdge.user_id == self.user_id).delete()
        self.db.query(GraphNode).filter(GraphNode.user_id == self.user_id).delete()
        self.db.commit()

    async def discover_relationships_for_concepts(
        self,
        new_concept_names: List[str],
        all_concepts: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """发现新概念与用户已有概念之间的关系

        Args:
            new_concept_names: 新提取的概念名称列表
            all_concepts: 所有概念列表（包含新提取的和已有的）

        Returns:
            关系列表
        """
        # 获取用户已有的所有节点
        existing_nodes = self.db.query(GraphNode).filter(
            GraphNode.user_id == self.user_id
        ).all()

        # 如果已有概念太少，直接返回
        if len(existing_nodes) < 2:
            return []

        # 构建概念列表用于关系发现（只包含新概念 + 相关已有概念）
        # 为了节省 token，只选取与新概念可能相关的已有概念（基于名称相似度）
        related_existing = []
        for node in existing_nodes[:50]:  # 限制最多 50 个已有概念
            related_existing.append({
                "name": node.name,
                "description": node.description or "无描述",
                "is_new": False
            })

        # 添加新概念
        new_concepts = [{"name": name, "description": "", "is_new": True} for name in new_concept_names]

        # 合并概念列表
        concepts_for_discovery = related_existing + new_concepts

        if len(concepts_for_discovery) < 2:
            return []

        # 调用 LLM 发现关系
        relationships = await self.discover_relationships(concepts_for_discovery)

        # 只保留涉及至少一个新概念的关系
        filtered_relationships = [
            rel for rel in relationships
            if rel.get("source") in new_concept_names or rel.get("target") in new_concept_names
        ]

        return filtered_relationships

    def create_edges_from_relationships(
        self,
        relationships: List[Dict[str, Any]],
        concept_to_node_id: Dict[str, int]
    ) -> int:
        """根据关系创建边

        Args:
            relationships: 关系列表
            concept_to_node_id: 概念名到节点 ID 的映射

        Returns:
            创建的边数量
        """
        edges_created = 0

        for rel in relationships:
            source_name = rel.get("source")
            target_name = rel.get("target")

            if source_name not in concept_to_node_id or target_name not in concept_to_node_id:
                continue

            source_node_id = concept_to_node_id[source_name]
            target_node_id = concept_to_node_id[target_name]
            edge_type = rel.get("type", EdgeType.RELATED.value)

            # 规范化边的方向（对称关系使用小 ID→大 ID）
            normalized_source, normalized_target = self.normalize_edge_direction(
                source_node_id, target_node_id, edge_type
            )

            # 检查边是否已存在（双向检查对称关系）
            if edge_type == EdgeType.RELATED.value:
                # 对称关系：双向检查
                existing_edge = self.db.query(GraphEdge).filter(
                    GraphEdge.user_id == self.user_id,
                    or_(
                        (GraphEdge.source_node_id == normalized_source) &
                        (GraphEdge.target_node_id == normalized_target),
                        (GraphEdge.source_node_id == normalized_target) &
                        (GraphEdge.target_node_id == normalized_source)
                    )
                ).first()
            else:
                # 非对称关系：单向检查
                existing_edge = self.db.query(GraphEdge).filter(
                    GraphEdge.user_id == self.user_id,
                    GraphEdge.source_node_id == normalized_source,
                    GraphEdge.target_node_id == normalized_target
                ).first()

            if existing_edge:
                # 更新现有边
                existing_edge.edge_type = edge_type
                existing_edge.description = rel.get("description")
                existing_edge.strength = rel.get("strength", 0.5)
            else:
                # 创建新边（使用规范化方向）
                edge = GraphEdge(
                    user_id=self.user_id,
                    source_node_id=normalized_source,
                    target_node_id=normalized_target,
                    edge_type=edge_type,
                    description=rel.get("description"),
                    strength=rel.get("strength", 0.5),
                )
                self.db.add(edge)
                edges_created += 1

        self.db.commit()
        return edges_created

    def cleanup_graph_after_note_delete(self, note_id: int) -> Dict[str, int]:
        """删除笔记后清理知识图谱

        Args:
            note_id: 被删除的笔记 ID

        Returns:
            清理统计信息
        """
        stats = {"nodes_removed": 0, "edges_removed": 0}

        # 查找所有引用了该笔记的节点
        nodes_to_check = self.db.query(GraphNode).filter(
            GraphNode.user_id == self.user_id,
            GraphNode.source_note_ids.ilike(f"%{note_id}%")
        ).all()

        for node in nodes_to_check:
            # 解析来源笔记 ID 列表
            source_ids = set(node.source_note_ids.split(",") if node.source_note_ids else [])

            # 移除当前笔记 ID
            source_ids.discard(str(note_id))

            if not source_ids:
                # 没有其他来源笔记，删除节点及相关边
                self.db.query(GraphEdge).filter(
                    GraphEdge.user_id == self.user_id,
                    (GraphEdge.source_node_id == node.id) |
                    (GraphEdge.target_node_id == node.id)
                ).delete()
                self.db.delete(node)
                stats["nodes_removed"] += 1
            else:
                # 还有其他来源，只更新来源列表
                node.source_note_ids = ",".join(source_ids)

        self.db.commit()
        return stats

    def optimize_graph(self, min_degree_for_hub: int = 3) -> Dict[str, int]:
        """优化图结构

        执行以下优化操作：
        1. 清理孤立节点（无任何边连接且超过 7 天）
        2. 识别 Hub 节点（度数 >= min_degree_for_hub）

        Args:
            min_degree_for_hub: 判定为 Hub 节点的最小度数

        Returns:
            优化统计信息
        """
        from datetime import datetime, timedelta

        stats = {"isolated_removed": 0, "hubs_identified": 0}

        # 1. 识别孤立节点（无任何边连接）
        # 使用左连接查找没有关联边的节点
        from sqlalchemy.orm import aliased

        isolated_nodes = (
            self.db.query(GraphNode)
            .outerjoin(
                GraphEdge,
                (GraphNode.id == GraphEdge.source_node_id) |
                (GraphNode.id == GraphEdge.target_node_id)
            )
            .filter(
                GraphEdge.id.is_(None),  # 没有关联边
                GraphNode.user_id == self.user_id,
                GraphNode.created_at < datetime.now() - timedelta(days=7)  # 超过 7 天
            )
            .all()
        )

        # 删除孤立节点
        for node in isolated_nodes:
            self.db.delete(node)
            stats["isolated_removed"] += 1

        if stats["isolated_removed"] > 0:
            self.db.commit()

        # 2. 识别 Hub 节点（度数 >= min_degree_for_hub）
        # 计算每个节点的度数（入度 + 出度）
        from sqlalchemy import distinct

        hub_results = (
            self.db.query(
                GraphNode.id,
                GraphNode.name,
                func.count(distinct(GraphEdge.id)).label('degree')
            )
            .join(
                GraphEdge,
                (GraphNode.id == GraphEdge.source_node_id) |
                (GraphNode.id == GraphEdge.target_node_id)
            )
            .filter(GraphNode.user_id == self.user_id)
            .group_by(GraphNode.id, GraphNode.name)
            .having(func.count(distinct(GraphEdge.id)) >= min_degree_for_hub)
            .all()
        )

        # 标记 Hub 节点
        for hub_id, hub_name, degree in hub_results:
            stats["hubs_identified"] += 1
            logger.debug(f"Hub 节点识别: user_id={self.user_id}, name={hub_name}, id={hub_id}, degree={degree}")

        self.db.commit()
        return stats

    def get_graph_statistics(self) -> Dict[str, Any]:
        """获取图谱统计信息

        Returns:
            包含节点数、边数、平均度数等信息
        """
        from sqlalchemy import distinct

        node_count = self.db.query(func.count(GraphNode.id)).filter(
            GraphNode.user_id == self.user_id
        ).scalar()

        edge_count = self.db.query(func.count(GraphEdge.id)).filter(
            GraphEdge.user_id == self.user_id
        ).scalar()

        # 计算平均度数
        if node_count > 0:
            avg_degree = (2 * edge_count) / node_count if edge_count > 0 else 0
        else:
            avg_degree = 0

        # 计算连通分量数量（简化版本：基于边的连接）
        connected_nodes = self.db.query(func.count(distinct(GraphEdge.source_node_id))).filter(
            GraphEdge.user_id == self.user_id
        ).scalar()

        return {
            "node_count": node_count,
            "edge_count": edge_count,
            "avg_degree": round(avg_degree, 2),
            "connected_nodes": connected_nodes,
            "isolated_nodes": node_count - connected_nodes,
        }
