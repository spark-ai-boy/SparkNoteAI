// LLM 配置状态管理 - 统一配置系统

import { create } from 'zustand';
import {
  getLLMIntegrations,
  getLLMIntegration,
  createLLMIntegration,
  updateLLMIntegration,
  deleteLLMIntegration,
  setDefaultLLMIntegration,
  testLLMConnection,
  testLLMConnectionTemp,
  getLLMIntegrationTypes,
  LLMIntegration,
  LLMIntegrationType,
  CreateLLMIntegrationRequest,
  UpdateLLMIntegrationRequest,
} from '../api/llmConfig';

interface LLMConfigState {
  // 数据
  types: LLMIntegrationType[];
  configs: LLMIntegration[];
  // 向后兼容：单个配置
  config: {
    provider: string;
    model: string;
    has_api_key: boolean;
  } | null;

  // 状态
  isLoading: boolean;
  isSaving: boolean;
  isTesting: boolean;
  error: string | null;

  // 动作
  fetchTypes: () => Promise<void>;
  fetchConfigs: () => Promise<void>;
  fetchConfig: (configKey: string) => Promise<LLMIntegration | null>; // 使用 configKey 替代 id
  createConfig: (data: CreateLLMIntegrationRequest) => Promise<LLMIntegration>;
  updateConfig: (configKey: string, data: UpdateLLMIntegrationRequest) => Promise<LLMIntegration>;
  deleteConfig: (configKey: string) => Promise<void>;
  setDefault: (configKey: string) => Promise<void>;
  testConnection: (configKey: string) => Promise<{ success: boolean; message: string }>;
  testConnectionTemp: (provider: string, config: any) => Promise<{ success: boolean; message: string }>;
  clearError: () => void;

  // Getters
  getConfigByKey: (configKey: string) => LLMIntegration | undefined;
  getDefaultConfig: () => LLMIntegration | undefined;
  getTypeById: (type: string) => LLMIntegrationType | undefined;
}

export const useLLMConfigStore = create<LLMConfigState>((set, get) => ({
  types: [],
  configs: [],
  config: null, // 向后兼容
  isLoading: false,
  isSaving: false,
  isTesting: false,
  error: null,

  fetchTypes: async () => {
    set({ isLoading: true, error: null });
    try {
      const types = await getLLMIntegrationTypes();
      set({ types, isLoading: false });
    } catch (error: any) {
      console.error('获取 LLM 类型列表失败:', error);
      set({ error: '获取 LLM 类型列表失败', isLoading: false });
    }
  },

  fetchConfigs: async () => {
    set({ isLoading: true, error: null });
    try {
      const configs = await getLLMIntegrations();
      // 向后兼容：更新 config
      const defaultConfig = configs.find(c => c.is_default);
      const compatConfig = defaultConfig ? {
        provider: defaultConfig.provider,
        model: defaultConfig.config?.model || '',
        has_api_key: defaultConfig.has_api_key,
      } : null;
      set({ configs, config: compatConfig, isLoading: false });
    } catch (error: any) {
      console.error('获取 LLM 配置列表失败:', error);
      set({ error: '获取 LLM 配置列表失败', isLoading: false });
    }
  },

  fetchConfig: async (configKey: string) => {
    try {
      const config = await getLLMIntegration(configKey);
      // 更新本地缓存
      const configs = get().configs.map(c => c.config_key === configKey ? config : c);
      set({ configs });
      return config;
    } catch (error: any) {
      console.error('获取 LLM 配置详情失败:', error);
      throw error;
    }
  },

  createConfig: async (data) => {
    set({ isSaving: true, error: null });
    try {
      const config = await createLLMIntegration(data);
      // 刷新配置列表
      await get().fetchConfigs();
      set({ isSaving: false });
      return config;
    } catch (error: any) {
      console.error('创建配置失败:', error);
      console.error('错误详情:', error.response?.data);
      console.error('错误状态:', error.response?.status);
      set({ error: error.response?.data?.detail || '创建配置失败', isSaving: false });
      throw error;
    }
  },

  updateConfig: async (configKey, data) => {
    set({ isSaving: true, error: null });
    try {
      const config = await updateLLMIntegration(configKey, data);
      // 刷新配置列表
      await get().fetchConfigs();
      set({ isSaving: false });
      return config;
    } catch (error: any) {
      console.error('更新配置失败:', error);
      set({ error: error.response?.data?.detail || '更新配置失败', isSaving: false });
      throw error;
    }
  },

  deleteConfig: async (configKey: string) => {
    set({ isSaving: true, error: null });
    try {
      await deleteLLMIntegration(configKey);
      // 刷新配置列表
      await get().fetchConfigs();
      set({ isSaving: false });
    } catch (error: any) {
      console.error('删除配置失败:', error);
      set({ error: error.response?.data?.detail || '删除配置失败', isSaving: false });
      throw error;
    }
  },

  setDefault: async (configKey: string) => {
    set({ isSaving: true, error: null });
    try {
      await setDefaultLLMIntegration(configKey);
      // 刷新配置列表
      await get().fetchConfigs();
      set({ isSaving: false });
    } catch (error: any) {
      console.error('设置默认配置失败:', error);
      set({ error: error.response?.data?.detail || '设置默认配置失败', isSaving: false });
      throw error;
    }
  },

  testConnection: async (configKey: string) => {
    set({ isTesting: true, error: null });
    try {
      const result = await testLLMConnection(configKey);
      set({ isTesting: false });
      return result;
    } catch (error: any) {
      console.error('测试连接失败:', error);
      set({ error: '测试连接失败', isTesting: false });
      return { success: false, message: error.response?.data?.detail || '测试连接失败' };
    }
  },

  testConnectionTemp: async (provider: string, config: any) => {
    set({ isTesting: true, error: null });
    try {
      const result = await testLLMConnectionTemp(provider, config);
      set({ isTesting: false });
      return result;
    } catch (error: any) {
      console.error('测试连接失败:', error);
      set({ error: '测试连接失败', isTesting: false });
      return { success: false, message: error.response?.data?.detail || '测试连接失败' };
    }
  },

  clearError: () => set({ error: null }),

  getConfigByKey: (configKey: string) => {
    const { configs } = get();
    return configs.find(c => c.config_key === configKey);
  },

  getDefaultConfig: () => {
    const { configs } = get();
    return configs.find(c => c.is_default);
  },

  getTypeById: (type: string) => {
    const { types } = get();
    return types.find(t => t.type === type);
  },
}));

export default useLLMConfigStore;
