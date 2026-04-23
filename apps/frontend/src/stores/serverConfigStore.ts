// 服务器配置状态管理

import { create } from 'zustand';
import axios from 'axios';
import apiClient from '../api/client';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { APP_VERSION } from '../utils/version';

const STORAGE_KEY = '@sparknoteai:serverConfig';
const SECURE_KEY = 'server_base_url';

// 本地存储操作
const getStoredConfig = async (): Promise<{ baseUrl: string } | null> => {
  try {
    if (Platform.OS === 'web') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } else {
      const stored = await SecureStore.getItemAsync(SECURE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (e) {
    console.error('解析服务器配置失败:', e);
  }
  return null;
};

const saveStoredConfig = async (config: { baseUrl: string }) => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } else {
      await SecureStore.setItemAsync(SECURE_KEY, JSON.stringify(config));
    }
  } catch (e) {
    console.error('保存服务器配置失败:', e);
  }
};

const clearStoredConfig = async () => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      await SecureStore.deleteItemAsync(SECURE_KEY);
    }
  } catch (e) {
    console.error('清除服务器配置失败:', e);
  }
};

// 版本兼容性检查规则
interface VersionCompatibility {
  compatible: boolean;
  message: string;
  requiresUpdate?: boolean;
}

// 服务器信息响应
interface ServerInfoResponse {
  version: string;
  api_version?: string;
  app_name?: string;
  build?: string;
  compatible_client_versions?: string[];
}

interface ServerConfigState {
  baseUrl: string;
  hasConfigured: boolean;
  isLoading: boolean;
  isTesting: boolean;
  lastTestResult: boolean | null;
  serverInfo: ServerInfoResponse | null;
  compatibility: VersionCompatibility | null;
  error: string | null;

  // Actions
  loadConfig: () => Promise<void>;
  setBaseUrl: (url: string) => Promise<void>;
  testConnection: () => Promise<VersionCompatibility>;
  resetConfig: () => Promise<void>;
  clearError: () => void;
}

const DEFAULT_BASE_URL = 'http://localhost:8000';

// 当前客户端版本（从 package.json 读取）
const CLIENT_VERSION = APP_VERSION;

// 解析版本号
const parseVersion = (version: string): { major: number; minor: number; patch: number } => {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return { major: 0, minor: 0, patch: 0 };
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
};

// 检查版本兼容性
const checkVersionCompatibility = (
  clientVersion: string,
  serverVersion: string
): VersionCompatibility => {

  if (serverVersion.includes('dev')) {
    return {
      compatible: true,
      message: `版本兼容 - 客户端 v${clientVersion} / 服务器 v${serverVersion}`,
    };
 }

  const client = parseVersion(clientVersion);
  const server = parseVersion(serverVersion);

  // 检查主版本是否兼容
  if (server.major > client.major) {
    return {
      compatible: false,
      message: `服务器版本 (${serverVersion}) 过高，客户端需要升级`,
      requiresUpdate: true,
    };
  }

  if (server.major < client.major) {
    return {
      compatible: false,
      message: `服务器版本 (${serverVersion}) 过低，请升级服务器`,
      requiresUpdate: false,
    };
  }

  // 主版本相同，检查次版本
  if (server.minor > client.minor + 1) {
    return {
      compatible: false,
      message: `服务器次版本过高 (${serverVersion})，可能存在兼容性问题`,
      requiresUpdate: true,
    };
  }

  return {
    compatible: true,
    message: `版本兼容 - 客户端 v${clientVersion} / 服务器 v${serverVersion}`,
  };
};

export const useServerConfigStore = create<ServerConfigState>((set, get) => ({
  baseUrl: DEFAULT_BASE_URL,
  hasConfigured: false,
  isLoading: true,
  isTesting: false,
  lastTestResult: null,
  serverInfo: null,
  compatibility: null,
  error: null,

  loadConfig: async () => {
    set({ isLoading: true });
    const stored = await getStoredConfig();
    if (stored?.baseUrl) {
      set({ baseUrl: stored.baseUrl, hasConfigured: true, isLoading: false });
      // 同步更新 apiClient 的 baseURL
      apiClient.defaults.baseURL = stored.baseUrl + '/api';
    } else {
      set({ isLoading: false });
    }
  },

  setBaseUrl: async (url: string) => {
    // 移除末尾的斜杠
    const normalizedUrl = url.replace(/\/$/, '');

    await saveStoredConfig({ baseUrl: normalizedUrl });
    set({ baseUrl: normalizedUrl, hasConfigured: true });

    // 更新 API 客户端的 baseURL（添加 /api 后缀）
    apiClient.defaults.baseURL = normalizedUrl + '/api';
  },

  testConnection: async () => {
    const { baseUrl } = get();
    set({ isTesting: true, error: null });

    try {
      // 创建临时 axios 实例进行测试
      // baseUrl 已经是完整的服务器地址（如 http://localhost:8000），直接添加 /api 后缀
      const apiBaseUrl = baseUrl.endsWith('/api') ? baseUrl : baseUrl + '/api';
      const testClient = axios.create({
        baseURL: apiBaseUrl,
        timeout: 10000,
      });

      // 测试连接并获取服务器信息
      const response = await testClient.get('/health');

      if (response.status !== 200) {
        throw new Error(`服务器返回状态码：${response.status}`);
      }

      // 尝试获取版本信息（如果后端支持）
      let serverVersion = CLIENT_VERSION; // 默认使用客户端版本
      let compatibleClientVersions: string[] = [];
      try {
        const versionResponse = await testClient.get('/version', { timeout: 5000 });
        if (versionResponse.data?.version) {
          serverVersion = versionResponse.data.version;
        }
        if (versionResponse.data?.compatible_client_versions) {
          compatibleClientVersions = versionResponse.data.compatible_client_versions;
        }
      } catch (e) {
        console.log('服务器未提供版本信息，使用默认版本');
      }

      // 检查版本兼容性
      const compatibility = checkVersionCompatibility(CLIENT_VERSION, serverVersion);

      set({
        isTesting: false,
        lastTestResult: compatibility.compatible,
        serverInfo: { version: serverVersion, compatible_client_versions: compatibleClientVersions },
        compatibility,
        error: compatibility.compatible ? null : compatibility.message,
      });

      return compatibility;
    } catch (error: any) {
      console.error('连接测试失败:', error);

      let errorMessage = '无法连接到服务器';
      if (error.code === 'ECONNREFUSED') {
        errorMessage = '连接被拒绝，请检查服务器是否运行';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = '连接超时，请检查网络或服务器状态';
      } else if (error.response) {
        errorMessage = `服务器错误：${error.response.status}`;
      }

      set({
        isTesting: false,
        lastTestResult: false,
        serverInfo: null,
        compatibility: { compatible: false, message: errorMessage },
        error: errorMessage,
      });

      return { compatible: false, message: errorMessage };
    }
  },

  resetConfig: async () => {
    await clearStoredConfig();
    set({
      baseUrl: DEFAULT_BASE_URL,
      hasConfigured: false,
      lastTestResult: null,
      serverInfo: null,
      compatibility: null,
      error: null,
    });
    apiClient.defaults.baseURL = DEFAULT_BASE_URL + '/api';
  },

  clearError: () => {
    set({ error: null });
  },
}));

export default useServerConfigStore;
