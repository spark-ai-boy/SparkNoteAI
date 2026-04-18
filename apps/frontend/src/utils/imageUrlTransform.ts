// 图片 URL 转换工具
import { API_CONFIG } from '@sparknoteai/shared';
import { useServerConfigStore } from '../stores/serverConfigStore';

/**
 * 判断是否为开发模式（本地不同端口访问）
 * 与 api/config.ts 中的 isDevWeb 逻辑保持一致
 */
const isDevWeb = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
    window.location.port !== '80' && window.location.port !== '443'
  );
};

/**
 * 将后端返回的相对路径转换为可用的图片 URL
 * - Web 生产环境（Nginx 同源代理）：相对路径直接使用
 * - Web 开发模式（npm run dev:frontend）：补全为后端地址（与 API 请求一致）
 * - Electron 桌面端（file:// 协议）：补全为后端地址
 * @param src 原始图片 URL（可能是相对路径或完整 URL）
 * @param baseUrl 后端服务器地址（Electron 下必填，开发模式下可选）
 * @returns 可用的图片 URL
 */
export const transformImageUrl = (src: string, baseUrl?: string): string => {
  if (!src) return src;

  // 完整 URL，直接返回
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  // Electron 桌面端（file:// 协议）
  const isElectron = typeof window !== 'undefined' && window.location.protocol === 'file:';

  // 开发模式：补全为后端地址
  if (isDevWeb()) {
    // 从 API_CONFIG 中获取开发模式后端地址，去掉 /api 后缀
    const devBaseUrl = API_CONFIG.BASE_URL.DEVELOPMENT.replace(/\/api$/, '');
    return `${devBaseUrl}${src}`;
  }

  // Electron：需要补全 baseUrl
  if (isElectron) {
    const effectiveBaseUrl = baseUrl || 'http://localhost:8000';
    const normalizedBase = effectiveBaseUrl.replace(/\/$/, '');
    return `${normalizedBase}${src}`;
  }

  // 生产环境（Nginx 同源代理）：直接使用相对路径
  return src;
};

/**
 * React Hook 版本的图片 URL 转换函数
 * 自动从 serverConfigStore 获取 baseUrl
 * @returns 转换函数
 */
export const useTransformImageUrl = (): ((src: string) => string) => {
  const { baseUrl } = useServerConfigStore();
  return (src: string) => transformImageUrl(src, baseUrl);
};

/**
 * 预处理 Markdown 内容，将其中所有相对图片路径（/uploads/...）替换为完整 URL
 * 与 transformImageUrl 逻辑保持一致：仅 Electron 和开发模式需要补全
 * @param content 原始 markdown 内容
 * @param baseUrl 后端服务器地址
 * @returns 替换后的 markdown 内容
 */
export const transformMarkdownImages = (content: string, baseUrl?: string): string => {
  if (!content) return content;

  // 生产环境不需要替换
  if (!isDevWeb() && !(typeof window !== 'undefined' && window.location.protocol === 'file:')) {
    return content;
  }

  // 确定 baseUrl
  let effectiveBase: string;
  if (isDevWeb()) {
    effectiveBase = API_CONFIG.BASE_URL.DEVELOPMENT.replace(/\/api$/, '');
  } else {
    effectiveBase = baseUrl || 'http://localhost:8000';
  }
  const normalizedBase = effectiveBase.replace(/\/$/, '');

  // 匹配 markdown 图片语法 ![alt](/uploads/...) 和 HTML img src="/uploads/..."
  return content.replace(
    /(\!\[.*?\]\()((?:\/uploads|uploads)[^\s)]+)(\))/g,
    `$1${normalizedBase}$2$3`
  ).replace(
    /(<img[^>]+src=")((?:\/uploads|uploads)[^"]+)(")/g,
    `$1${normalizedBase}$2$3`
  );
};
