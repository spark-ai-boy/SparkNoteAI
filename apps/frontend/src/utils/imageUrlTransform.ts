// 图片 URL 转换工具

import { useServerConfigStore } from '../stores/serverConfigStore';

/**
 * 将相对路径的图片 URL 转换为完整的 URL
 * @param src 原始图片 URL（可能是相对路径或完整 URL）
 * @param baseUrl 后端服务器地址（可选，不传则使用默认值）
 * @returns 完整的图片 URL
 */
export const transformImageUrl = (src: string, baseUrl?: string): string => {
  if (!src) return src;

  // 如果已经是完整 URL，直接返回
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  // 使用传入的 baseUrl 或默认值
  const apiBaseUrl = baseUrl || 'http://localhost:8000';

  // 相对路径，添加后端 URL 前缀
  return `${apiBaseUrl}${src}`;
};

/**
 * React Hook 版本的图片 URL 转换函数
 * 自动从 store 获取当前配置的后端地址
 * @returns 转换函数
 *
 * 使用示例：
 * const transformImageUrl = useTransformImageUrl();
 * const imgUrl = transformImageUrl('/uploads/images/test.png');
 */
export const useTransformImageUrl = (): ((src: string) => string) => {
  const { baseUrl } = useServerConfigStore();

  return (src: string) => transformImageUrl(src, baseUrl);
};
