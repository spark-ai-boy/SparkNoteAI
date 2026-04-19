// 图片存储配置 API 客户端 - 适配统一集成配置系统

import client from './client';
import type { ConfigField } from './featureConfig';
import { Platform } from 'react-native';

// 重新导出 ConfigField 供其他模块使用
export type { ConfigField };

// 图片存储集成配置
export interface ImageStorageIntegration {
  id: number;
  integration_type: 'storage';
  config_key: string;
  name: string;
  provider: 'local' | 'lskypro' | string;
  config: {
    api_url?: string;
    api_token?: string;
    strategy_id?: string;
    base_path?: string;
    base_url?: string;
    [key: string]: any;
  };
  is_default: boolean;
  is_enabled: boolean;
  has_api_token: boolean;
  created_at: string;
  updated_at?: string;
  description?: string;
  icon?: string;
  color?: string;
  tags?: string[];
}

// 创建图片存储配置请求
export interface CreateImageStorageRequest {
  integration_type: 'storage';
  config_key: string;
  name: string;
  provider: 'local' | 'lskypro' | string;
  config: {
    api_url?: string;
    api_token?: string;
    strategy_id?: string;
    base_path?: string;
    base_url?: string;
    [key: string]: any;
  };
  is_default?: boolean;
  is_enabled?: boolean;
  description?: string;
  icon?: string;
  color?: string;
  tags?: string[];
}

// 更新图片存储配置请求
export interface UpdateImageStorageRequest {
  name?: string;
  config?: {
    api_url?: string;
    api_token?: string;
    strategy_id?: string;
    base_path?: string;
    base_url?: string;
    [key: string]: any;
  };
  is_default?: boolean;
  is_enabled?: boolean;
  description?: string;
  icon?: string;
  color?: string;
  tags?: string[];
}

// 测试连接请求
export interface TestImageStorageRequest {
  provider: 'local' | 'lskypro' | string;
  config: {
    api_url?: string;
    api_token?: string;
    strategy_id?: string;
    base_path?: string;
    base_url?: string;
    [key: string]: any;
  };
}

// 测试结果
export interface ImageStorageTestResult {
  success: boolean;
  message: string;
}

// 集成类型定义（Provider Schema）
export interface ImageStorageProviderSchema {
  provider_id: string;
  provider_name: string;
  description: string;
  icon: string;
  config_fields: ConfigField[];
  is_default: boolean;
}

// 获取所有图片存储集成配置
export const getImageStorageIntegrations = async (): Promise<ImageStorageIntegration[]> => {
  const response = await client.get('/integrations', {
    params: { integration_type: 'storage', include_config: false },
  });
  return response.data;
};

// 获取单个图片存储集成配置详情
export const getImageStorageIntegration = async (configKey: string): Promise<ImageStorageIntegration> => {
  const response = await client.get(`/integrations/storage/${configKey}`);
  return response.data;
};

// 创建图片存储集成配置
export const createImageStorageIntegration = async (data: CreateImageStorageRequest): Promise<ImageStorageIntegration> => {
  const response = await client.post('/integrations', data);
  return response.data;
};

// 更新图片存储集成配置
export const updateImageStorageIntegration = async (configKey: string, data: UpdateImageStorageRequest): Promise<ImageStorageIntegration> => {
  const response = await client.put(`/integrations/storage/${configKey}`, data);
  return response.data;
};

// 删除图片存储集成配置
export const deleteImageStorageIntegration = async (configKey: string): Promise<void> => {
  await client.delete(`/integrations/storage/${configKey}`);
};

// 设置默认图片存储配置
export const setDefaultImageStorage = async (configKey: string): Promise<ImageStorageIntegration> => {
  const response = await client.post(`/integrations/storage/${configKey}/set-default`);
  return response.data;
};

// 取消默认图片存储配置
export const unsetDefaultImageStorage = async (configKey: string): Promise<ImageStorageIntegration> => {
  const response = await client.post(`/integrations/storage/${configKey}/unset-default`);
  return response.data;
};

// 测试图片存储连接（临时配置）
export const testImageStorageConnectionTemp = async (data: TestImageStorageRequest): Promise<ImageStorageTestResult> => {
  const response = await client.post('/integrations/storage/test', {
    provider: data.provider,
    config: data.config,
  });
  return response.data;
};

// 测试已有配置的连接
export const testImageStorageConnection = async (configKey: string): Promise<ImageStorageTestResult> => {
  const response = await client.post(`/integrations/storage/${configKey}/test`);
  return response.data;
};

// 获取支持的图片存储 Provider 列表（Schema）
export const getImageStorageProviders = async (): Promise<ImageStorageProviderSchema[]> => {
  const response = await client.get('/integrations/providers', {
    params: { integration_type: 'storage' },
  });
  // 后端返回格式：{ storage: { type, name, description, providers: [] } }
  return response.data.storage?.providers || [];
};

// 获取单个 Provider 的 Schema
export const getImageStorageProviderSchema = async (providerId: string): Promise<ImageStorageProviderSchema> => {
  const response = await client.get(`/integrations/providers/${providerId}`, {
    params: { integration_type: 'storage' },
  });
  return response.data;
};

// 兼容旧 API - 已废弃
export const getImageStorageConfig = getImageStorageIntegrations;
export const saveImageStorageConfig = createImageStorageIntegration;

// 上传一张或多图片（Web 端，使用 File 对象）
export const uploadImage = async (files: File[]): Promise<string[]> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await client.post('/images/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.urls;
};

// 上传图片（移动端，使用本地 URI）
export interface MobileImageUploadData {
  uri: string;
  name: string;
  type: string;
}

export const uploadImageMobile = async (images: MobileImageUploadData[]): Promise<string[]> => {
  const formData = new FormData();
  images.forEach((image) => {
    formData.append('files', image as any);
  });

  const response = await client.post('/images/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.urls;
};

export default {
  getImageStorageIntegrations,
  getImageStorageIntegration,
  createImageStorageIntegration,
  updateImageStorageIntegration,
  deleteImageStorageIntegration,
  setDefaultImageStorage,
  testImageStorageConnectionTemp,
  testImageStorageConnection,
  getImageStorageProviders,
  getImageStorageProviderSchema,
  uploadImage,
  uploadImageMobile,
};
