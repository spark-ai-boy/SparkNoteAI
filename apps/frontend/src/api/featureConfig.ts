// 场景配置 API - 适配新配置系统

import apiClient from './client';

// 配置字段
export interface ConfigField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'number' | 'select' | 'boolean';
  required: boolean;
  description: string;
  placeholder: string;
  default: any;
  options?: { value: string; label: string }[];
  group?: string;
}

// 配置分组
export interface ConfigGroup {
  id: string;
  label: string;
  icon: string;
}

// 功能场景 Schema
export interface FeatureSchema {
  feature_id: string;
  feature_name: string;
  description: string;
  icon: string;
  config_groups: ConfigGroup[];
  config_fields: ConfigField[];
  default_config: Record<string, any>;
  is_required: boolean;
}

// 功能设置响应
export interface FeatureSettingResponse {
  feature_id: string;
  is_enabled: boolean;
  integration_refs?: Record<string, any>;
  use_default_llm?: boolean;
  use_default_storage?: boolean;
  custom_settings?: Record<string, any>;
  effective_config?: Record<string, any>;
  is_valid?: boolean;
  error_message?: string | null;
}

// 更新功能设置请求
export interface UpdateFeatureSettingRequest {
  integration_refs?: Record<string, any>;
  use_default_llm?: boolean;
  use_default_storage?: boolean;
  custom_settings?: Record<string, any>;
  is_enabled?: boolean;
}

// 运行时配置响应
export interface RuntimeConfigResponse {
  features: Record<string, any>;
  integrations: {
    llm?: {
      provider: string;
      model: string;
    };
    image_storage?: {
      storage_type: string;
    };
  };
}

// 获取所有功能场景 Schemas
export const getFeatureSchemas = async (): Promise<FeatureSchema[]> => {
  const response = await apiClient.get('/features');
  return response.data;
};

// 获取单个功能场景 Schema
export const getFeatureSchema = async (featureId: string): Promise<FeatureSchema> => {
  const response = await apiClient.get(`/features/${featureId}/schema`);
  return response.data;
};

// 获取所有功能设置
export const getAllFeatureSettings = async (): Promise<FeatureSettingResponse[]> => {
  const response = await apiClient.get('/features/settings');
  return response.data;
};

// 获取单个功能设置
export const getFeatureSetting = async (featureId: string): Promise<FeatureSettingResponse> => {
  const response = await apiClient.get(`/features/${featureId}/settings`);
  return response.data;
};

// 更新功能设置
export const updateFeatureSetting = async (
  featureId: string,
  data: UpdateFeatureSettingRequest
): Promise<FeatureSettingResponse> => {
  const response = await apiClient.put(`/features/${featureId}/settings`, data);
  return response.data;
};

// 重置功能设置为默认值
export const resetFeatureSetting = async (featureId: string): Promise<FeatureSettingResponse> => {
  const response = await apiClient.delete(`/features/${featureId}/settings`);
  return response.data;
};

// 获取运行时配置（前端初始化用）
export const getRuntimeConfig = async (): Promise<RuntimeConfigResponse> => {
  const response = await apiClient.get('/features/runtime-config');
  return response.data;
};

// 兼容旧 API - 已废弃
export const getFeatureConfigSchemas = getFeatureSchemas;
export const getFeatureConfigSchema = getFeatureSchema;
export const getAllFeatureConfigs = getAllFeatureSettings;
export const getFeatureConfig = getFeatureSetting;
export const updateFeatureConfig = updateFeatureSetting;
export const resetFeatureConfig = resetFeatureSetting;

export default {
  getFeatureSchemas,
  getFeatureSchema,
  getAllFeatureSettings,
  getFeatureSetting,
  updateFeatureSetting,
  resetFeatureSetting,
  getRuntimeConfig,
};
