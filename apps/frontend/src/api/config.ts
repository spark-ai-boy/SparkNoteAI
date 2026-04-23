// API 配置

import { API_CONFIG } from '@sparknoteai/shared';

// 运行时注入的 API 地址（由 docker entrypoint 写入 config.js）
// 注意：React Native 有 window polyfill 但没有 window.location，需要额外检查
const runtimeBaseURL = (typeof window !== 'undefined' && (window as any).location)
  ? (window as any).__API_BASE_URL__
  : undefined;

const hasLocation = typeof window !== 'undefined' && (window as any).location;

// 生产环境优先使用运行时注入的地址，否则使用相对路径（通过 Nginx 代理）
// 开发环境使用硬编码的完整 URL（Expo Metro 与后端不同端口）
const isDevWeb = hasLocation &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
  window.location.port !== '80' && window.location.port !== '443';

// 原生环境（Android/iOS）没有 window.location，使用开发模式后端地址
const isNative = !hasLocation;

export const apiConfig = {
  baseURL: isDevWeb
    ? API_CONFIG.BASE_URL.DEVELOPMENT
    : (runtimeBaseURL ? runtimeBaseURL + '/api' : (isNative ? API_CONFIG.BASE_URL.DEVELOPMENT : '/api')),
  timeout: API_CONFIG.TIMEOUT,
};

export default apiConfig;
