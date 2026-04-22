// 平台感知主题 Hook
// Web 端使用 useWebTheme（动态 CSS 变量），原生端根据用户设置返回对应颜色

import { Platform, useColorScheme } from 'react-native';
import { iosLightColors, iosDarkColors } from '../theme/colors';
import { useWebTheme } from './useWebTheme';
import { useInterfaceSettingsStore } from '../stores/interfaceSettingsStore';

export const useTheme = () => {
  const webColors = useWebTheme();
  const systemColorScheme = useColorScheme();
  const theme = useInterfaceSettingsStore((state) => state.theme);

  if (Platform.OS === 'web') {
    return webColors;
  }

  const isDark = theme === 'system'
    ? systemColorScheme === 'dark'
    : theme === 'dark';

  return isDark ? iosDarkColors : iosLightColors;
};
