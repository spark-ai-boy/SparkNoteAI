// 图片存储配置状态管理 - 适配统一集成配置系统

import { create } from 'zustand';
import {
  getImageStorageIntegrations,
  getImageStorageIntegration,
  createImageStorageIntegration,
  updateImageStorageIntegration,
  deleteImageStorageIntegration,
  setDefaultImageStorage,
  unsetDefaultImageStorage,
  testImageStorageConnection,
  testImageStorageConnectionTemp,
  getImageStorageProviders,
  ImageStorageIntegration,
  ImageStorageProviderSchema,
  ImageStorageTestResult,
  CreateImageStorageRequest,
  UpdateImageStorageRequest,
  TestImageStorageRequest,
} from '../api/imageStorage';

interface ImageStorageState {
  // 数据
  providers: ImageStorageProviderSchema[];
  configs: ImageStorageIntegration[];

  // 加载状态
  isLoading: boolean;
  isSaving: boolean;
  isTesting: boolean;

  // 错误信息
  error: string | null;

  // Actions
  fetchProviders: () => Promise<void>;
  fetchConfigs: () => Promise<void>;
  fetchConfig: (configKey: string) => Promise<ImageStorageIntegration>;
  createConfig: (data: CreateImageStorageRequest) => Promise<ImageStorageIntegration>;
  updateConfig: (configKey: string, data: UpdateImageStorageRequest) => Promise<ImageStorageIntegration>;
  deleteConfig: (configKey: string) => Promise<void>;
  setDefault: (configKey: string) => Promise<void>;
  unsetDefault: (configKey: string) => Promise<void>;
  testConnection: (configKey: string) => Promise<ImageStorageTestResult>;
  testConnectionTemp: (data: TestImageStorageRequest) => Promise<ImageStorageTestResult>;
  clearError: () => void;

  // Getters
  getConfigByKey: (configKey: string) => ImageStorageIntegration | undefined;
  getDefaultConfig: () => ImageStorageIntegration | undefined;
  getProviderById: (providerId: string) => ImageStorageProviderSchema | undefined;
}

export const useImageStorageStore = create<ImageStorageState>((set, get) => ({
  providers: [],
  configs: [],
  isLoading: false,
  isSaving: false,
  isTesting: false,
  error: null,

  clearError: () => {
    set({ error: null });
  },

  fetchProviders: async () => {
    set({ isLoading: true, error: null });
    try {
      const providers = await getImageStorageProviders();
      set({ providers, isLoading: false });
    } catch (error: any) {
      console.error('获取图片存储 Provider 失败:', error);
      set({
        error: error.response?.data?.detail || '获取 Provider 失败',
        isLoading: false,
      });
    }
  },

  fetchConfigs: async () => {
    set({ isLoading: true, error: null });
    try {
      const configs = await getImageStorageIntegrations();
      set({ configs, isLoading: false });
    } catch (error: any) {
      console.error('获取图片存储配置失败:', error);
      set({
        error: error.response?.data?.detail || '获取配置失败',
        isLoading: false,
      });
    }
  },

  fetchConfig: async (configKey: string) => {
    try {
      const config = await getImageStorageIntegration(configKey);
      // 更新本地缓存
      const configs = get().configs.map(c => c.config_key === configKey ? config : c);
      set({ configs });
      return config;
    } catch (error: any) {
      console.error('获取图片存储配置详情失败:', error);
      throw error;
    }
  },

  createConfig: async (data: CreateImageStorageRequest) => {
    set({ isSaving: true, error: null });
    try {
      const config = await createImageStorageIntegration(data);
      // 刷新配置列表
      await get().fetchConfigs();
      set({ isSaving: false });
      return config;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '保存配置失败';
      set({
        error: errorMessage,
        isSaving: false,
      });
      throw new Error(errorMessage);
    }
  },

  updateConfig: async (configKey: string, data: UpdateImageStorageRequest) => {
    set({ isSaving: true, error: null });
    try {
      const config = await updateImageStorageIntegration(configKey, data);
      // 刷新配置列表
      await get().fetchConfigs();
      set({ isSaving: false });
      return config;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '更新配置失败';
      set({
        error: errorMessage,
        isSaving: false,
      });
      throw new Error(errorMessage);
    }
  },

  deleteConfig: async (configKey: string) => {
    set({ isSaving: true, error: null });
    try {
      await deleteImageStorageIntegration(configKey);
      // 刷新配置列表
      await get().fetchConfigs();
      set({ isSaving: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '删除配置失败';
      set({
        error: errorMessage,
        isSaving: false,
      });
      throw new Error(errorMessage);
    }
  },

  setDefault: async (configKey: string) => {
    set({ isSaving: true, error: null });
    try {
      await setDefaultImageStorage(configKey);
      // 刷新配置列表
      await get().fetchConfigs();
      set({ isSaving: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '设置默认配置失败';
      set({
        error: errorMessage,
        isSaving: false,
      });
      throw new Error(errorMessage);
    }
  },

  unsetDefault: async (configKey: string) => {
    set({ isSaving: true, error: null });
    try {
      await unsetDefaultImageStorage(configKey);
      // 刷新配置列表
      await get().fetchConfigs();
      set({ isSaving: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '取消默认配置失败';
      set({
        error: errorMessage,
        isSaving: false,
      });
      throw new Error(errorMessage);
    }
  },

  testConnection: async (configKey: string) => {
    set({ isTesting: true, error: null });
    try {
      const result = await testImageStorageConnection(configKey);
      set({ isTesting: false });
      return result;
    } catch (error: any) {
      console.error('测试连接失败:', error);
      set({
        error: error.message || '测试连接失败',
        isTesting: false,
      });
      throw error;
    }
  },

  testConnectionTemp: async (data: TestImageStorageRequest) => {
    set({ isTesting: true, error: null });
    try {
      console.log('[ImageStorage Store] 开始测试连接:', data);
      const result = await testImageStorageConnectionTemp(data);
      console.log('[ImageStorage Store] 测试结果:', result);
      set({ isTesting: false });

      if (!result.success) {
        throw new Error(result.message);
      }
      return result;
    } catch (error: any) {
      console.error('[ImageStorage Store] 测试失败:', error);
      set({
        error: error.message || '测试连接失败',
        isTesting: false,
      });
      throw error;
    }
  },

  getConfigByKey: (configKey: string) => {
    const { configs } = get();
    return configs.find(c => c.config_key === configKey);
  },

  getDefaultConfig: () => {
    const { configs } = get();
    return configs.find(c => c.is_default);
  },

  getProviderById: (providerId: string) => {
    const { providers } = get();
    return providers.find(p => p.provider_id === providerId);
  },
}));

export default useImageStorageStore;
