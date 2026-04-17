// API 配置

import { API_CONFIG } from '@sparknoteai/shared';
import { Platform } from 'react-native';

// 开发环境判断 - 明确检查 localhost 环境
const isDev = __DEV__ ||
              process.env.NODE_ENV === 'development' ||
              window?.location?.hostname === 'localhost' ||
              window?.location?.hostname === '127.0.0.1';

export const apiConfig = {
  baseURL: isDev
    ? API_CONFIG.BASE_URL.DEVELOPMENT
    : API_CONFIG.BASE_URL.PRODUCTION,
  timeout: API_CONFIG.TIMEOUT,
};

export default apiConfig;
