// 共享常量定义

// API 配置
export const API_CONFIG = {
  BASE_URL: {
    DEVELOPMENT: 'http://localhost:8000/api',
    PRODUCTION: 'https://api.sparknoteai.com/api', // 官方服务器地址
  },
  TIMEOUT: 10000,
} as const;

// 平台名称映射
export const PLATFORM_NAMES: Record<string, string> = {
  wechat: '微信公众号',
  xiaohongshu: '小红书',
  bilibili: 'B站',
  youtube: 'YouTube',
  web: '网页',
  other: '其他',
};

// 平台图标映射
export const PLATFORM_ICONS: Record<string, string> = {
  wechat: '💬',
  xiaohongshu: '📕',
  bilibili: '📺',
  youtube: '▶️',
  web: '🌐',
  other: '📄',
};

// 分页配置
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// Token 存储 Key
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_INFO: 'user_info',
  THEME: 'theme',
} as const;

// 错误消息
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  UNAUTHORIZED: '登录已过期，请重新登录',
  UNKNOWN_ERROR: '发生未知错误，请稍后重试',
} as const;
