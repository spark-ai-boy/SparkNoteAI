// 平台感知主题 Hook
// Web 端使用 useWebTheme（动态 CSS 变量），原生端使用 iOS 系统颜色

import { Platform, useColorScheme } from 'react-native';
import { iosLightColors, iosDarkColors } from '../theme/colors';
import { useWebTheme } from './useWebTheme';

export const useTheme = () => {
  const webColors = useWebTheme();
  const colorScheme = useColorScheme();

  if (Platform.OS === 'web') {
    return webColors;
  }

  return colorScheme === 'dark' ? iosDarkColors : iosLightColors;
};
