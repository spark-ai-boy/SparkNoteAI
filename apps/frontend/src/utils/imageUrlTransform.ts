// 图片 URL 转换工具

/**
 * 将相对路径的图片 URL 保持为相对路径（生产环境使用同源）
 * @param src 原始图片 URL（可能是相对路径或完整 URL）
 * @param baseUrl 后端服务器地址（保留参数用于向后兼容，生产环境不再使用）
 * @returns 可用的图片 URL
 */
export const transformImageUrl = (src: string, _baseUrl?: string): string => {
  if (!src) return src;

  // 如果已经是完整 URL，直接返回
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  // 相对路径（如 /uploads/images/test.png），直接使用，浏览器自动使用当前页面域名
  return src;
};

/**
 * React Hook 版本的图片 URL 转换函数
 * 使用相对路径，浏览器自动使用当前页面域名
 * @returns 转换函数
 *
 * 使用示例：
 * const transformImageUrl = useTransformImageUrl();
 * const imgUrl = transformImageUrl('/uploads/images/test.png');
 */
export const useTransformImageUrl = (): ((src: string) => string) => {
  return (src: string) => transformImageUrl(src);
};
