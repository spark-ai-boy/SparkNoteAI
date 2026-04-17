// 主题设置 Store

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, type ColorTheme } from '@/theme/colors';
import { Appearance } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface InterfaceSettings {
  theme: ThemeMode;
  fontSize: number;
  sidebarCollapsed: boolean;
  compactMode: boolean;
  language: 'zh-CN' | 'en-US';
}

interface InterfaceSettingsState extends InterfaceSettings {
  // Actions
  setTheme: (theme: ThemeMode) => Promise<void>;
  setFontSize: (size: number) => Promise<void>;
  setSidebarCollapsed: (collapsed: boolean) => Promise<void>;
  setCompactMode: (compact: boolean) => Promise<void>;
  setLanguage: (language: 'zh-CN' | 'en-US') => Promise<void>;
  loadSettings: () => Promise<void>;
  getColors: () => ColorTheme;
}

const STORAGE_KEY = '@interface_settings';

const defaultSettings: InterfaceSettings = {
  theme: 'system',
  fontSize: 14,
  sidebarCollapsed: false,
  compactMode: false,
  language: 'zh-CN',
};

export const useInterfaceSettingsStore = create<InterfaceSettingsState>((set, get) => ({
  ...defaultSettings,

  setTheme: async (theme) => {
    const newState = { ...get(), theme };
    set(newState);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      theme: newState.theme,
      fontSize: newState.fontSize,
      sidebarCollapsed: newState.sidebarCollapsed,
      compactMode: newState.compactMode,
      language: newState.language,
    }));
  },

  setFontSize: async (fontSize) => {
    const newState = { ...get(), fontSize };
    set(newState);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      theme: newState.theme,
      fontSize: newState.fontSize,
      sidebarCollapsed: newState.sidebarCollapsed,
      compactMode: newState.compactMode,
      language: newState.language,
    }));
  },

  setSidebarCollapsed: async (sidebarCollapsed) => {
    const newState = { ...get(), sidebarCollapsed };
    set(newState);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      theme: newState.theme,
      fontSize: newState.fontSize,
      sidebarCollapsed: newState.sidebarCollapsed,
      compactMode: newState.compactMode,
      language: newState.language,
    }));
  },

  setCompactMode: async (compactMode) => {
    const newState = { ...get(), compactMode };
    set(newState);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      theme: newState.theme,
      fontSize: newState.fontSize,
      sidebarCollapsed: newState.sidebarCollapsed,
      compactMode: newState.compactMode,
      language: newState.language,
    }));
  },

  setLanguage: async (language) => {
    const newState = { ...get(), language };
    set(newState);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      theme: newState.theme,
      fontSize: newState.fontSize,
      sidebarCollapsed: newState.sidebarCollapsed,
      compactMode: newState.compactMode,
      language: newState.language,
    }));
  },

  loadSettings: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({
          theme: parsed.theme ?? defaultSettings.theme,
          fontSize: parsed.fontSize ?? defaultSettings.fontSize,
          sidebarCollapsed: parsed.sidebarCollapsed ?? defaultSettings.sidebarCollapsed,
          compactMode: parsed.compactMode ?? defaultSettings.compactMode,
          language: parsed.language ?? defaultSettings.language,
        });
      }
    } catch (error) {
      console.error('Failed to load interface settings:', error);
    }
  },

  getColors: (): ColorTheme => {
    const { theme } = get();

    // 如果是 system，根据系统主题返回
    if (theme === 'system') {
      // React Native 中检测系统主题
      const colorScheme = Appearance?.getColorScheme?.();
      return colorScheme === 'dark' ? darkColors : lightColors;
    }

    return theme === 'dark' ? darkColors : lightColors;
  },
}));

// 导出一个 hook 用于获取当前主题颜色
export const useThemeColors = () => {
  const getColors = useInterfaceSettingsStore((state) => state.getColors);
  const theme = useInterfaceSettingsStore((state) => state.theme);

  // 订阅 theme 变化
  return getColors();
};

export default useInterfaceSettingsStore;
