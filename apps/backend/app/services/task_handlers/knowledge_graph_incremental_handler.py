"""
知识图谱增量更新任务处理器
处理单篇笔记导入后的知识图谱增量更新任务
"""

from typing import Any, Dict

from .base import TaskHandler, ProgressCallback
from ...core.database import SessionLocal
from ...core.logger import get_logger
from ...models.note import Note
from ...models.integration import Integration, FeatureSetting
from ...services.knowledge_graph import KnowledgeGraphService

logger = get_logger(__name__)


class KnowledgeGraphIncrementalHandler(TaskHandler):
    """知识图谱增量更新任务处理器"""

    @property
    def task_type(self) -> str:
        return "knowledge_graph_incremental"

    def validate_metadata(self, metadata: Dict[str, Any]) -> None:
        """验证增量更新任务参数"""
        note_id = metadata.get("note_id")
        if not note_id:
            raise ValueError("缺少 note_id 参数")

    async def execute(
        self,
        task_id: int,
        user_id: int,
        metadata: Dict[str, Any],
        progress_callback: ProgressCallback,
    ) -> Dict[str, Any]:
        """
        执行知识图谱增量更新任务

        Args:
            metadata: {
                "note_id": int,  # 触发更新的笔记 ID
            }

        Returns:
            {"concepts_extracted": int, "nodes_created": int, "edges_created": int}
        """
        # 创建独立数据库会话
        db = SessionLocal()
        try:
            note_id = metadata.get("note_id")

            logger.info(f"开始知识图谱增量更新任务: task_id={task_id}, user_id={user_id}, note_id={note_id}")

            await progress_callback(10, "正在加载笔记...")

            # 获取笔记
            note = db.query(Note).filter(
                Note.id == note_id,
                Note.user_id == user_id
            ).first()

            if not note:
                raise ValueError(f"笔记 {note_id} 不存在")

            await progress_callback(20, "正在获取 LLM 配置...")

            # 获取 LLM 集成配置
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

            # 如果没有指定配置，尝试使用默认配置 (is_default=True)
            if not integration:
                integration = db.query(Integration).filter(
                    Integration.user_id == user_id,
                    Integration.integration_type == "llm",
                    Integration.is_default == True,
                    Integration.is_enabled == True
                ).first()

            if not integration or not integration.config or not integration.config.get("api_key"):
                raise ValueError("LLM 配置不存在或无效")

            await progress_callback(30, "正在提取概念...")

            # 创建服务并执行增量更新（传入 LLM 配置）
            service = KnowledgeGraphService(db, user_id, llm_integration=integration)
            stats = await service.incremental_update_for_note(note, integration)

            await progress_callback(100, "知识图谱更新完成")

            logger.info(
                f"知识图谱增量更新完成: task_id={task_id}, user_id={user_id}, note_id={note_id}, "
                f"concepts={stats.get('concepts_extracted', 0)}, nodes={stats.get('nodes_created', 0)}, "
                f"edges={stats.get('edges_created', 0)}"
            )

            return {
                "concepts_extracted": stats.get("concepts_extracted", 0),
                "nodes_created": stats.get("nodes_created", 0),
                "edges_created": stats.get("edges_created", 0),
                "note_id": note_id,
            }

        except Exception as e:
            logger.error(f"知识图谱增量更新任务失败: task_id={task_id}, user_id={user_id}, note_id={metadata.get('note_id')}, error={e}")
            raise
        finally:
            db.close()
