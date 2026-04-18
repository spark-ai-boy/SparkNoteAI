// 图片 URL 转换工具

import { useServerConfigStore } from '../stores/serverConfigStore';

/**
 * 将后端返回的相对路径转换为可用的图片 URL
 * - Web 部署（Nginx 同源代理）：相对路径直接使用，浏览器自动使用当前域名
 * - Electron 桌面端（file:// 协议）：需要补全后端服务器地址
 * - Web 开发模式（npm run dev:frontend）：需要补全后端地址（dev server 不代理 /uploads/）
 * @param src 原始图片 URL（可能是相对路径或完整 URL）
 * @param baseUrl 后端服务器地址（Electron / 开发模式下必填）
 * @returns 可用的图片 URL
 */
export const transformImageUrl = (src: string, baseUrl?: string): string => {
  if (!src) return src;

  // 完整 URL，直接返回
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  // 相对路径（如 /uploads/images/test.png）
  const isElectron = typeof window !== 'undefined' && window.location.protocol === 'file:';
  // 开发模式：localhost/本地 IP + 非标准端口
  const isDev = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.hostname.startsWith('172.')
  );

  // 开发模式/Electron 下需要补全
  if (isElectron || isDev) {
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
 * 用于 md-editor-rt 的 transformImgUrl 不生效时的兜底方案
 * @param content 原始 markdown 内容
 * @param baseUrl 后端服务器地址
 * @returns 替换后的 markdown 内容
 */
export const transformMarkdownImages = (content: string, baseUrl?: string): string => {
  if (!content) return content;

  const effectiveBaseUrl = baseUrl || 'http://localhost:8000';
  const normalizedBase = effectiveBaseUrl.replace(/\/$/, '');

  // 匹配 markdown 图片语法 ![alt](/uploads/...) 和 HTML img src="/uploads/..."
  return content.replace(
    /(\!\[.*?\]\()((?:\/uploads|uploads)[^\s)]+)(\))/g,
    `$1${normalizedBase}$2$3`
  ).replace(
    /(<img[^>]+src=")((?:\/uploads|uploads)[^"]+)(")/g,
    `$1${normalizedBase}$2$3`
  );
};
