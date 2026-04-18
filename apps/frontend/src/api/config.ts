// API 配置

import { API_CONFIG } from '@sparknoteai/shared';

// 开发环境判断
const isDev = __DEV__ ||
              process.env.NODE_ENV === 'development' ||
              window?.location?.hostname === 'localhost' ||
              window?.location?.hostname === '127.0.0.1';

// 运行时注入的 API 地址（由 docker entrypoint 写入 config.js）
const runtimeBaseURL = (typeof window !== 'undefined')
  ? (window as any).__API_BASE_URL__
  : undefined;

// 优先级：运行时注入 > Nginx 反向代理(/api 相对路径) > 硬编码生产地址
const resolvedBaseURL = runtimeBaseURL || '/api';

export const apiConfig = {
  baseURL: isDev
    ? API_CONFIG.BASE_URL.DEVELOPMENT
    : resolvedBaseURL,
  timeout: API_CONFIG.TIMEOUT,
};

export default apiConfig;
