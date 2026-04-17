// 版本工具函数 - 版本号统一从 Git Tag 管理

import packageJson from '../../package.json';

/**
 * 获取应用版本号
 * 单一事实来源：Git Tag（格式 v1.2.0）
 *
 * 读取优先级：
 * 1. EXPO_PUBLIC_APP_VERSION（构建时注入，Docker/CI）
 * 2. package.json（由 version.sh set 与 Git tag 保持同步）
 * 3. 默认值 0.0.0
 */
export const APP_VERSION =
  process.env.EXPO_PUBLIC_APP_VERSION ||
  packageJson.version ||
  '0.0.0';

/**
 * 获取构建号（Git commit hash）
 */
export const BUILD_NUMBER = process.env.BUILD_NUMBER || '1';

/**
 * 版本比较工具
 */
export const compareVersions = (v1: string, v2: string): number => {
  const parts1 = v1.split(/[.-]/).map((p) => (isNaN(Number(p)) ? 0 : Number(p)));
  const parts2 = v2.split(/[.-]/).map((p) => (isNaN(Number(p)) ? 0 : Number(p)));

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;

    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
};

/**
 * 检查版本是否兼容
 */
export const isVersionCompatible = (clientVersion: string, compatibleVersions: string[]): boolean => {
  return compatibleVersions.some((version) => {
    // 支持通配符匹配，如 "1.0.x"
    if (version.includes('*') || version.includes('x')) {
      const pattern = version.replace(/\*/g, '\\d+').replace(/x/g, '\\d+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(clientVersion);
    }
    return compareVersions(clientVersion, version) >= 0;
  });
};

/**
 * 获取完整的版本信息
 */
export const getVersionInfo = () => ({
  version: APP_VERSION,
  build: BUILD_NUMBER,
  platform: process.env.EXPO_PLATFORM || 'web',
});
