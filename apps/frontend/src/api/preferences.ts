// 用户偏好 API

import client from './client';

export interface NotificationSettings {
  task_complete: boolean;
  import_progress: boolean;
  import_complete: boolean;
  knowledge_graph_complete: boolean;
  error_alerts: boolean;
}

export interface UserPreference {
  theme: string;
  language: string;
  font_size: number;
  sidebar_collapsed: boolean;
  default_llm_integration?: string;
  default_storage_integration?: string;
  notifications: NotificationSettings;
  preferences: Record<string, any>;
}

export interface UpdatePreferenceRequest {
  theme?: string;
  language?: string;
  font_size?: number;
  sidebar_collapsed?: boolean;
  default_llm_integration?: string;
  default_storage_integration?: string;
  notifications?: Partial<NotificationSettings>;
  preferences?: Record<string, any>;
}

// 获取用户偏好
export const getPreferences = async (): Promise<UserPreference> => {
  const response = await client.get('/preferences');
  return response.data;
};

// 更新用户偏好
export const updatePreferences = async (
  data: UpdatePreferenceRequest
): Promise<UserPreference> => {
  const response = await client.put('/preferences', data);
  return response.data;
};

// 获取通知设置
export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  const response = await client.get('/preferences');
  return response.data.notifications || {
    task_complete: true,
    import_progress: true,
    import_complete: true,
    knowledge_graph_complete: true,
    error_alerts: true,
  };
};
