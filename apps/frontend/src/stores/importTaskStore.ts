// 后台任务状态管理

import { create } from 'zustand';
import {
  getTasks,
  getTask,
  createImportTask,
  cancelTask,
  Task,
  TaskStatus,
  TaskType,
  ImportTaskCreate,
  PaginatedResponse,
} from '../api/importTask';
import { useToastStore } from './toastStore';
import apiClient from '../api/client';

// 重新导出类型，保持兼容性
export { TaskStatus, TaskType };
export type { Task, Task as ImportTask, ImportTaskCreate };

// 状态类型定义
interface ImportTaskState {
  // 当前活动任务
  activeTask: Task | null;
  // 任务列表
  tasks: Task[];
  // 分页信息
  pagination: {
    page: number;
    size: number;
    total: number;
    pages: number;
  };
  // 是否正在加载
  isLoading: boolean;
  // 错误信息
  error: string | null;

  // 设置活动任务
  setActiveTask: (task: Task | null) => void;

  // 创建导入任务
  createTask: (data: ImportTaskCreate) => Promise<Task>;

  // 获取任务列表（支持分页）
  fetchTasks: (page?: number, size?: number) => Promise<void>;

  // 获取单个任务
  fetchTask: (taskId: number) => Promise<Task>;

  // 取消任务
  cancelTask: (taskId: number) => Promise<void>;

  // 更新活动任务进度（用于轮询）
  pollActiveTask: () => Promise<void>;

  // 清除错误
  clearError: () => void;
}

// 通知设置接口
interface NotificationSettings {
  task_complete: boolean;
  import_progress: boolean;
  import_complete: boolean;
  knowledge_graph_complete: boolean;
  error_alerts: boolean;
}

// 默认通知设置
const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  task_complete: true,
  import_progress: true,
  import_complete: true,
  knowledge_graph_complete: true,
  error_alerts: true,
};

// 轮询间隔（毫秒）
const POLL_INTERVAL = 1000;

// 轮询中的任务状态
const POLLING_STATUSES = [TaskStatus.PENDING, TaskStatus.RUNNING];

// 默认分页配置
const DEFAULT_PAGE_SIZE = 10;

// 获取用户通知设置
const fetchNotificationSettings = async (): Promise<NotificationSettings> => {
  try {
    const response = await apiClient.get('/preferences');
    return response.data.notifications || DEFAULT_NOTIFICATIONS;
  } catch (error) {
    console.error('获取通知设置失败:', error);
    return DEFAULT_NOTIFICATIONS;
  }
};

export const useImportTaskStore = create<ImportTaskState>((set, get) => ({
  activeTask: null,
  tasks: [],
  pagination: {
    page: 1,
    size: DEFAULT_PAGE_SIZE,
    total: 0,
    pages: 0,
  },
  isLoading: false,
  error: null,

  setActiveTask: (task) => {
    set({ activeTask: task, error: null });
  },

  clearError: () => {
    set({ error: null });
  },

  createTask: async (data: ImportTaskCreate) => {
    try {
      const task = await createImportTask(data);

      // 添加到活动任务
      set({ activeTask: task, error: null });

      // 同时添加到任务列表开头
      set((state) => ({
        tasks: [task, ...state.tasks],
        pagination: {
          ...state.pagination,
          total: state.pagination.total + 1,
        },
      }));

      return task;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '创建任务失败';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  fetchTasks: async (page = 1, size = DEFAULT_PAGE_SIZE) => {
    try {
      set({ isLoading: true });
      const result = await getTasks({ page, size });
      set({
        tasks: result.items,
        pagination: {
          page: result.page,
          size: result.size,
          total: result.total,
          pages: result.pages,
        },
        isLoading: false,
      });
    } catch (error: any) {
      console.error('importTaskStore: 获取任务列表失败:', error);
      const errorMessage = error.response?.data?.detail || '获取任务列表失败';
      set({ error: errorMessage, isLoading: false });
    }
  },

  fetchTask: async (taskId: number) => {
    try {
      const task = await getTask(taskId);
      return task;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '获取任务详情失败';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  cancelTask: async (taskId: number) => {
    try {
      const cancelledTask = await cancelTask(taskId);

      // 更新活动任务
      const { activeTask } = get();
      if (activeTask?.id === taskId) {
        set({ activeTask: cancelledTask });
      }

      // 更新任务列表
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? cancelledTask : t
        ),
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '取消任务失败';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  pollActiveTask: async () => {
    const { activeTask } = get();
    if (!activeTask || !POLLING_STATUSES.includes(activeTask.status)) {
      return;
    }

    try {
      const task = await get().fetchTask(activeTask.id);

      // 检查状态变化，如果从运行中变为完成/失败/取消，显示通知
      const wasActive = POLLING_STATUSES.includes(activeTask.status);
      const isNowInactive = !POLLING_STATUSES.includes(task.status);

      if (wasActive && isNowInactive) {
        // 获取用户通知设置
        const notifications = await fetchNotificationSettings();

        if (task.status === TaskStatus.COMPLETED) {
          // 检查是否开启了完成通知
          if (notifications.task_complete || notifications.import_complete) {
            useToastStore.getState().showSuccess(
              '导入完成',
              `《${task.title}》已成功导入`,
              5000
            );
          }
          // 导入完成后刷新笔记列表和标签
          const { fetchNotes, fetchTags } = (await import('./noteStore')).useNoteStore.getState();
          fetchNotes();
          // 延迟刷新标签（后端可能还在异步提取）
          setTimeout(() => fetchTags(), 5000);
          setTimeout(() => fetchTags(), 15000);
          setTimeout(() => fetchTags(), 30000);
        } else if (task.status === TaskStatus.FAILED) {
          // 检查是否开启了错误通知
          if (notifications.error_alerts) {
            useToastStore.getState().showError(
              '导入失败',
              task.error_message || '导入失败，请重试',
              5000
            );
          }
        }
      }

      set({ activeTask: task });

      // 更新任务列表中的对应项
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === task.id ? task : t
        ),
      }));
    } catch (error) {
      console.error('轮询任务状态失败:', error);
    }
  },
}));

export default useImportTaskStore;
