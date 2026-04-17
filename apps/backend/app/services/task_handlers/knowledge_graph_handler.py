"""
知识图谱构建任务处理器
处理全量或增量构建知识图谱的任务
"""

from typing import Any, Dict, Optional, List

from .base import TaskHandler, ProgressCallback
from ...core.database import SessionLocal
from ...core.logger import get_logger
from ...models.note import Note
from ...models.integration import Integration, FeatureSetting
from ...services.knowledge_graph import KnowledgeGraphService

logger = get_logger(__name__)


class KnowledgeGraphBuildHandler(TaskHandler):
    """知识图谱构建任务处理器"""

    @property
    def task_type(self) -> str:
        return "knowledge_graph_build"

    def validate_metadata(self, metadata: Dict[str, Any]) -> None:
        """验证构建任务参数"""
        rebuild = metadata.get("rebuild", False)
        note_ids = metadata.get("note_ids", [])

        # note_ids 应该是列表
        if note_ids is not None and not isinstance(note_ids, list):
            raise ValueError("note_ids 必须是列表")

    async def execute(
        self,
        task_id: int,
        user_id: int,
        metadata: Dict[str, Any],
        progress_callback: ProgressCallback,
    ) -> Dict[str, Any]:
        """
        执行知识图谱构建任务

        Args:
            metadata: {
                "rebuild": bool,  # 是否重新构建（清空现有图谱）
                "note_ids": List[int] | None,  # 指定笔记ID列表，None表示全部
            }

        Returns:
            {"nodes_created": int, "edges_created": int, "concepts_extracted": int}
        """
        # 创建独立数据库会话
        db = SessionLocal()
        try:
            rebuild = metadata.get("rebuild", False)
            note_ids = metadata.get("note_ids")

            logger.info(f"开始知识图谱构建任务: task_id={task_id}, user_id={user_id}, rebuild={rebuild}")

            await progress_callback(5, "正在初始化...")

            # 获取 LLM 集成配置
            # 1. 先检查场景配置
            feature_setting = db.query(FeatureSetting).filter(
                FeatureSetting.user_id == user_id,
                FeatureSetting.feature_id == "knowledge_graph"
            ).first()

            integration = None
            # 优先从 integration_refs 中获取指定的 LLM 配置
            if feature_setting and feature_setting.integration_refs:
                llm_key = feature_setting.integration_refs.get("llm")
                if llm_key:
                    integration = db.query(Integration).filter(
                        Integration.user_id == user_id,
                        Integration.integration_type == "llm",
                        Integration.config_key == llm_key,
                        Integration.is_enabled == True
                    ).first()

            # 2. 使用默认配置
            if not integration:
                integration = db.query(Integration).filter(
                    Integration.user_id == user_id,
                    Integration.integration_type == "llm",
                    Integration.is_default == True,
                    Integration.is_enabled == True
                ).first()

            if not integration:
                raise ValueError("请先配置知识图谱大模型，在集成配置中创建 LLM 配置")

            if not integration.config or not integration.config.get("api_key"):
                raise ValueError("知识图谱 LLM 配置无效或缺少 API Key")

            logger.info(f"知识图谱LLM配置: integration_id={integration.id}, provider={integration.provider}")

            await progress_callback(10, "正在准备数据...")

            # 创建服务（传入 LLM 配置）
            service = KnowledgeGraphService(db, user_id, llm_integration=integration)

            # 如果需要重新构建，先清空现有图谱
            if rebuild:
                await progress_callback(15, "正在清空现有图谱...")
                service.clear_graph()

            # 获取笔记列表
            query = db.query(Note).filter(Note.user_id == user_id)
            if note_ids:
                query = query.filter(Note.id.in_(note_ids))

            notes = query.all()
            total_notes = len(notes)

            if total_notes == 0:
                raise ValueError("没有笔记可供构建知识图谱")

            logger.info(f"知识图谱构建-找到 {total_notes} 篇笔记: note_ids={[n.id for n in notes]}")

            await progress_callback(20, f"正在分析 {total_notes} 篇笔记...")

            # 执行构建（带进度回调）
            async def on_progress(stage_progress: int, message: str):
                """转换内部进度到任务进度（20%-100%）"""
                # 阶段 1: 提取概念 (20% -> 50%)
                # 阶段 2: 发现关系 (50% -> 80%)
                # 阶段 3: 保存数据 (80% -> 100%)
                overall_progress = 20 + int(stage_progress * 0.8)
                await progress_callback(overall_progress, message)

            stats = await service.build_graph_with_progress(
                notes=notes,
                integration=integration,
                progress_callback=on_progress,
            )

            await progress_callback(100, "知识图谱构建完成")

            logger.info(
                f"知识图谱构建完成: task_id={task_id}, user_id={user_id}, "
                f"nodes={stats.get('nodes_created', 0)}, edges={stats.get('edges_created', 0)}, "
                f"notes={total_notes}, rebuild={rebuild}"
            )

            return {
                "nodes_created": stats.get("nodes_created", 0),
                "edges_created": stats.get("edges_created", 0),
                "concepts_extracted": stats.get("concepts_extracted", 0),
                "total_notes": total_notes,
            }

        finally:
            db.close()
