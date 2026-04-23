// 应用入口

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './src/navigation';
import { lightColors, darkColors } from './src/theme';
import { useInterfaceSettingsStore } from './src/stores/interfaceSettingsStore';
import { ToastContainer } from './src/components/ToastContainer';

// Web 端全局样式
const useWebStyles = () => {
  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        :root {
          --background: #ffffff;
          --background-secondary: #fafafa;
          --text: #171717;
          --text-secondary: #737373;
          --text-tertiary: #a3a3a3;
          --border: #e5e5e5;
          --border-light: #f5f5f5;
          --primary: #171717;
          --primary-foreground: #fafafa;
          --card: #ffffff;
          --card-foreground: #171717;
          --muted: #f5f5f5;
          --muted-foreground: #737373;
          --accent: #f5f5f5;
          --accent-foreground: #171717;
          --secondary: #f5f5f5;
          --secondary-foreground: #171717;
          --error: #dc2626;
          --success: #22c55e;
          --warning: #f97316;
          --blue: #3b82f6;
          --purple: #a855f7;
          --green: #22c55e;
          --yellow: #eab308;
          --red: #dc2626;
          --orange: #f97316;
          --destructive: #dc2626;
          --destructive-foreground: #fef2f2;
          --cta: #fafafa;
          --hover: #f5f5f5;
          --selected: #e5e5e5;
          --white: #ffffff;
          --overlay: rgba(0, 0, 0, 0.4);
          --primary-light: rgba(23, 23, 23, 0.1);
          // 编辑器 CSS 变量
          --editor-bg: #ffffff;
          --editor-toolbar-bg: #ffffff;
          --editor-border: #e5e5e5;
          --editor-hover-bg: #f5f5f5;
          --editor-accent: #171717;
          --editor-icon: #737373;
          --editor-text: #171717;
          --editor-placeholder: #737373;
          --editor-text-secondary: #737373;
          --editor-code-bg: #f5f5f5;
          --editor-code-color: #dc2626;
          --editor-pre-bg: #1e293b;
          --editor-pre-code-color: #e2e8f0;
          --editor-blockquote-bg: #f5f5f5;
          --editor-thead-bg: #f5f5f5;
        }
        input:focus, textarea:focus {
          outline: none !important;
          outline-width: 0 !important;
          box-shadow: none !important;
        }
        div[role="textbox"]:focus {
          outline: none !important;
          outline-width: 0 !important;
        }
        html, body {
          height: 100%;
          margin: 0;
          overflow: hidden;
        }
        /* 全局背景色 */
        body {
          background-color: var(--background);
          color: var(--text);
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);
};

// 主题样式管理 - 根据主题设置全局 CSS 变量
const useThemeStyles = () => {
  const { theme, loadSettings } = useInterfaceSettingsStore();
  const systemColorScheme = useColorScheme(); // 在顶层调用 hook

  useEffect(() => {
    // 加载保存的设置
    loadSettings();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // 确定当前应该使用的颜色主题
      let colorsToUse = lightColors;

      if (theme === 'system') {
        // 跟随系统
        colorsToUse = systemColorScheme === 'dark' ? darkColors : lightColors;
      } else if (theme === 'dark') {
        colorsToUse = darkColors;
      }

      // 更新全局 CSS 变量
      const root = document.documentElement;
      root.style.setProperty('--background', colorsToUse.background);
      root.style.setProperty('--background-secondary', colorsToUse.backgroundSecondary);
      root.style.setProperty('--text', colorsToUse.text);
      root.style.setProperty('--text-secondary', colorsToUse.textSecondary);
      root.style.setProperty('--text-tertiary', colorsToUse.textTertiary);
      root.style.setProperty('--border', colorsToUse.border);
      root.style.setProperty('--border-light', colorsToUse.muted);
      root.style.setProperty('--primary', colorsToUse.primary);
      root.style.setProperty('--primary-foreground', colorsToUse.primaryForeground);
      root.style.setProperty('--card', colorsToUse.card);
      root.style.setProperty('--card-foreground', colorsToUse.cardForeground);
      root.style.setProperty('--muted', colorsToUse.muted);
      root.style.setProperty('--muted-foreground', colorsToUse.mutedForeground);
      root.style.setProperty('--accent', colorsToUse.accent);
      root.style.setProperty('--accent-foreground', colorsToUse.accentForeground);
      root.style.setProperty('--secondary', colorsToUse.secondary);
      root.style.setProperty('--secondary-foreground', colorsToUse.secondaryForeground);
      root.style.setProperty('--error', colorsToUse.error);
      root.style.setProperty('--success', colorsToUse.success);
      root.style.setProperty('--warning', colorsToUse.warning);
      root.style.setProperty('--blue', colorsToUse.blue);
      root.style.setProperty('--purple', colorsToUse.purple);
      root.style.setProperty('--green', colorsToUse.green);
      root.style.setProperty('--yellow', colorsToUse.yellow);
      root.style.setProperty('--red', colorsToUse.red);
      root.style.setProperty('--orange', colorsToUse.orange);
      root.style.setProperty('--destructive', colorsToUse.destructive);
      root.style.setProperty('--destructive-foreground', colorsToUse.destructiveForeground);
      root.style.setProperty('--cta', colorsToUse.cta);
      root.style.setProperty('--hover', colorsToUse.hover);
      root.style.setProperty('--selected', colorsToUse.selected);
      root.style.setProperty('--white', colorsToUse.white);
      root.style.setProperty('--overlay', colorsToUse.overlay);
      root.style.setProperty('--primary-light', colorsToUse.primaryLight);
      // 编辑器 CSS 变量
      root.style.setProperty('--editor-bg', colorsToUse.background);
      root.style.setProperty('--editor-toolbar-bg', colorsToUse.background);
      root.style.setProperty('--editor-border', colorsToUse.border);
      root.style.setProperty('--editor-hover-bg', colorsToUse.backgroundSecondary);
      root.style.setProperty('--editor-accent', colorsToUse.primary);
      root.style.setProperty('--editor-icon', colorsToUse.textSecondary);
      root.style.setProperty('--editor-text', colorsToUse.text);
      root.style.setProperty('--editor-placeholder', colorsToUse.textSecondary);
      root.style.setProperty('--editor-text-secondary', colorsToUse.textSecondary);
      root.style.setProperty('--editor-code-bg', colorsToUse.backgroundSecondary);
      root.style.setProperty('--editor-code-color', colorsToUse.error);
      root.style.setProperty('--editor-pre-bg', '#1e293b');
      root.style.setProperty('--editor-pre-code-color', '#e2e8f0');
      root.style.setProperty('--editor-blockquote-bg', colorsToUse.backgroundSecondary);
      root.style.setProperty('--editor-thead-bg', colorsToUse.backgroundSecondary);
    }
  }, [theme, systemColorScheme]);
};

export default function App() {
  useWebStyles();
  useThemeStyles();

  return (
    <SafeAreaProvider>
      {/* Web 端不需要 StatusBar */}
      {Platform.OS !== 'web' && <StatusBar style="light" />}
      <RootNavigator />
      <ToastContainer />
    </SafeAreaProvider>
  );
}
