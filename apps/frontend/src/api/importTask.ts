// 任务系统 API - 适配统一配置系统

import client from './client';

// 任务状态枚举
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// 任务类型枚举
export enum TaskType {
  IMPORT = 'import',
  KNOWLEDGE_GRAPH_BUILD = 'knowledge_graph_build',
}

// 任务类型定义
export interface TaskTypeInfo {
  type: string;
  name: string;
  description: string;
}

// 后台任务类型
export interface Task {
  id: number;
  user_id: number;
  title: string;
  task_type: TaskType;
  metadata_json?: Record<string, any>;
  status: TaskStatus;
  progress: number;
  error_message?: string;
  result_content?: string;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
}

// 创建任务请求
export interface TaskCreate {
  title: string;
  task_type: TaskType;
  description?: string;
  metadata_json?: Record<string, any>;
}

// 创建导入任务专用请求
export interface ImportTaskCreate {
  url: string;
  platform?: string;
}

// 平台信息
export interface Platform {
  id: string;
  name: string;
}

// 分页参数
export interface PaginationParams {
  page?: number;
  size?: number;
  status_filter?: string;
  task_type?: string;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

/**
 * 获取支持的任务类型列表
 */
export const getTaskTypes = async (): Promise<TaskTypeInfo[]> => {
  const response = await client.get<TaskTypeInfo[]>('/tasks/types');
  return response.data;
};

/**
 * 获取任务列表（支持分页）
 */
export const getTasks = async (params?: PaginationParams): Promise<PaginatedResponse<Task>> => {
  const queryParams: any = {};
  if (params?.status_filter) queryParams.status_filter = params.status_filter;
  if (params?.task_type) queryParams.task_type = params.task_type;
  if (params?.page) queryParams.page = params.page;
  if (params?.size) queryParams.size = params.size;

  const response = await client.get<PaginatedResponse<Task>>('/tasks', { params: queryParams });
  return response.data;
};

/**
 * 获取单个任务
 */
export const getTask = async (taskId: number): Promise<Task> => {
  const response = await client.get<Task>(`/tasks/${taskId}`);
  return response.data;
};

/**
 * 创建通用任务
 */
export const createTask = async (data: TaskCreate): Promise<Task> => {
  const response = await client.post<Task>('/tasks', data);
  return response.data;
};

/**
 * 创建导入任务
 */
export const createImportTask = async (data: ImportTaskCreate): Promise<Task> => {
  const response = await client.post<Task>('/tasks', {
    title: '导入内容',
    task_type: TaskType.IMPORT,
    metadata_json: {
      url: data.url,
      platform: data.platform || 'wechat',
    },
  });
  return response.data;
};

/**
 * 取消任务
 */
export const cancelTask = async (taskId: number): Promise<Task> => {
  const response = await client.post<Task>(`/tasks/${taskId}/cancel`);
  return response.data;
};

/**
 * 根据 URL 自动识别平台
 */
export const detectPlatformFromUrl = (url: string): string => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('mp.weixin.qq.com') || lowerUrl.includes('wechat')) {
    return 'wechat';
  }
  if (lowerUrl.includes('xiaohongshu.com') || lowerUrl.includes('xhslink.com') || lowerUrl.includes('小红书')) {
    return 'xiaohongshu';
  }
  if (lowerUrl.includes('bilibili.com') || lowerUrl.includes('b23.tv')) {
    return 'bilibili';
  }
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return 'youtube';
  }
  if (lowerUrl.includes('zhihu.com')) {
    return 'zhihu';
  }
  return 'other';
};

/**
 * 获取支持的平台列表
 */
export const getPlatforms = async (): Promise<Platform[]> => {
  const response = await client.get<Platform[]>('/tasks/platforms');
  return response.data;
};

// 兼容旧 API
export const getImportTasks = getTasks;
export const getImportTask = getTask;
export const cancelImportTask = cancelTask;

export default {
  getTaskTypes,
  getTasks,
  getTask,
  createTask,
  createImportTask,
  cancelTask,
  getPlatforms,
};
