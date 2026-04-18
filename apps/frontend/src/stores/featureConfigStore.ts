// 场景配置状态管理 - 适配新配置系统

import { create } from 'zustand';
import {
  getFeatureSchemas,
  getFeatureSchema,
  getAllFeatureSettings,
  getFeatureSetting,
  updateFeatureSetting,
  resetFeatureSetting,
  FeatureSchema,
  FeatureSettingResponse,
  UpdateFeatureSettingRequest,
} from '../api/featureConfig';

interface FeatureConfigState {
  // 配置定义 (schemas)
  schemas: FeatureSchema[];
  schemasMap: Map<string, FeatureSchema>;

  // 用户设置 (settings)
  settings: Map<string, FeatureSettingResponse>;

  // 状态
  isLoadingSchemas: boolean;
  isLoadingSettings: boolean;
  isSaving: boolean;

  // 错误
  error: string | null;

  // Actions
  fetchSchemas: () => Promise<void>;
  fetchSchema: (featureId: string) => Promise<void>;
  fetchAllSettings: () => Promise<void>;
  fetchSetting: (featureId: string) => Promise<void>;
  saveSetting: (featureId: string, settings: Record<string, any>) => Promise<void>;
  resetSetting: (featureId: string) => Promise<void>;

  // Getters
  getSchema: (featureId: string) => FeatureSchema | undefined;
  getSetting: (featureId: string) => FeatureSettingResponse | undefined;
  getConfigValue: (featureId: string, key: string, defaultValue?: any) => any;
  isFeatureEnabled: (featureId: string) => boolean;
  clearError: () => void;
}

export const useFeatureConfigStore = create<FeatureConfigState>((set, get) => ({
  schemas: [],
  schemasMap: new Map(),
  settings: new Map(),
  isLoadingSchemas: false,
  isLoadingSettings: false,
  isSaving: false,
  error: null,

  // 获取所有配置定义 (schemas)
  fetchSchemas: async () => {
    set({ isLoadingSchemas: true, error: null });
    try {
      const schemas = await getFeatureSchemas();
      const schemasMap = new Map(schemas.map(s => [s.feature_id, s]));
      set({ schemas, schemasMap, isLoadingSchemas: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || '获取配置定义失败',
        isLoadingSchemas: false,
      });
    }
  },

  // 获取单个配置定义
  fetchSchema: async (featureId: string) => {
    set({ isLoadingSchemas: true, error: null });
    try {
      const schema = await getFeatureSchema(featureId);
      const schemasMap = new Map(get().schemasMap);
      schemasMap.set(featureId, schema);
      // 同时更新 schemas 数组
      const schemas = get().schemas.filter(s => s.feature_id !== featureId);
      schemas.push(schema);
      set({ schemas, schemasMap, isLoadingSchemas: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || '获取配置定义失败',
        isLoadingSchemas: false,
      });
    }
  },

  // 获取所有设置
  fetchAllSettings: async () => {
    set({ isLoadingSettings: true, error: null });
    try {
      const allSettings = await getAllFeatureSettings();
      const settings = new Map(allSettings.map(s => [s.feature_id, s]));
      set({ settings, isLoadingSettings: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || '获取设置失败',
        isLoadingSettings: false,
      });
    }
  },

  // 获取单个设置
  fetchSetting: async (featureId: string) => {
    set({ isLoadingSettings: true, error: null });
    try {
      const setting = await getFeatureSetting(featureId);
      const settings = new Map(get().settings);
      settings.set(featureId, setting);
      set({ settings, isLoadingSettings: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || '获取设置失败',
        isLoadingSettings: false,
      });
    }
  },

  // 保存设置 - 自动分发到 integration_refs 和 custom_settings
  saveSetting: async (featureId: string, formValues: Record<string, any>) => {
    set({ isSaving: true, error: null });
    try {
      const schema = get().schemasMap.get(featureId);

      // 分离 integration_refs 和 custom_settings
      const integrationRefs: Record<string, any> = {};
      const customSettings: Record<string, any> = {};

      // 根据 schema 中的字段定义，判断字段属于哪个分类
      const integrationRefFields = new Set<string>();
      for (const field of schema?.config_fields || []) {
        if (field.name.endsWith('_config_id') || field.name.endsWith('_integration')) {
          integrationRefFields.add(field.name);
        }
      }

      // 分发字段值
      for (const [key, value] of Object.entries(formValues)) {
        if (integrationRefFields.has(key)) {
          // 根据字段名推断 ref 类型：llm_config_id -> llm, storage_config_id -> storage
          const refType = key.replace('_config_id', '').replace('_integration', '');
          // null/空值也需要保留，以便后端清除旧的引用
          integrationRefs[refType] = value || null;
        } else {
          customSettings[key] = value;
        }
      }

      const response = await updateFeatureSetting(featureId, {
        integration_refs: integrationRefs,
        custom_settings: customSettings,
      });
      const settings = new Map(get().settings);
      settings.set(featureId, response);
      set({ settings, isSaving: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || '保存设置失败',
        isSaving: false,
      });
      throw error;
    }
  },

  // 重置设置为默认值
  resetSetting: async (featureId: string) => {
    set({ isSaving: true, error: null });
    try {
      const response = await resetFeatureSetting(featureId);
      const settings = new Map(get().settings);
      settings.set(featureId, response);
      set({ settings, isSaving: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || '重置设置失败',
        isSaving: false,
      });
      throw error;
    }
  },

  // 获取配置定义
  getSchema: (featureId: string) => {
    return get().schemasMap.get(featureId);
  },

  // 获取用户设置
  getSetting: (featureId: string) => {
    return get().settings.get(featureId);
  },

  // 获取特定配置值 - 从 effective_config 中读取
  getConfigValue: (featureId: string, key: string, defaultValue?: any) => {
    const setting = get().settings.get(featureId);
    if (setting?.effective_config && key in setting.effective_config) {
      return setting.effective_config[key];
    }
    // 如果用户没有配置，使用 schema 中的默认值
    const schema = get().schemasMap.get(featureId);
    const field = schema?.config_fields.find(f => f.name === key);
    return field?.default ?? defaultValue;
  },

  // 检查功能是否启用
  isFeatureEnabled: (featureId: string) => {
    const setting = get().settings.get(featureId);
    return setting?.is_enabled ?? false;
  },

  clearError: () => set({ error: null }),
}));

export default useFeatureConfigStore;
