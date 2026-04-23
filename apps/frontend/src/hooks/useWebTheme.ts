// Web 端主题 Hook - 使用 CSS 变量获取当前主题颜色

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// 定义颜色类型
export interface WebThemeColors {
  background: string;
  backgroundSecondary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  primary: string;
  primaryForeground: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  secondary: string;
  secondaryForeground: string;
  error: string;
  success: string;
  warning: string;
  blue: string;
  purple: string;
  green: string;
  yellow: string;
  red: string;
  orange: string;
  destructive: string;
  destructiveForeground: string;
  cta: string;
  hover: string;
  selected: string;
  white: string;
  overlay: string;
  primaryLight: string;
}

// 默认颜色（浅色主题）
const defaultColors: WebThemeColors = {
  background: '#ffffff',
  backgroundSecondary: '#fafafa',
  text: '#171717',
  textSecondary: '#737373',
  textTertiary: '#a3a3a3',
  border: '#e5e5e5',
  borderLight: '#f5f5f5',
  primary: '#171717',
  primaryForeground: '#fafafa',
  card: '#ffffff',
  cardForeground: '#171717',
  muted: '#f5f5f5',
  mutedForeground: '#737373',
  accent: '#f5f5f5',
  accentForeground: '#171717',
  secondary: '#f5f5f5',
  secondaryForeground: '#171717',
  error: '#dc2626',
  success: '#22c55e',
  warning: '#f97316',
  blue: '#3b82f6',
  purple: '#a855f7',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#dc2626',
  orange: '#f97316',
  destructive: '#dc2626',
  destructiveForeground: '#fef2f2',
  cta: '#fafafa',
  hover: '#f5f5f5',
  selected: '#e5e5e5',
  white: '#ffffff',
  overlay: 'rgba(0, 0, 0, 0.4)',
  primaryLight: 'rgba(23, 23, 23, 0.1)',
};

// 获取 CSS 变量值的辅助函数
const getCssVar = (name: string): string => {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(`--${name}`)
      .trim() || defaultColors[name as keyof WebThemeColors];
  }
  return defaultColors[name as keyof WebThemeColors];
};

// 从 CSS 变量获取当前颜色
const getColorsFromCss = (): WebThemeColors => {
  return {
    background: getCssVar('background'),
    backgroundSecondary: getCssVar('background-secondary'),
    text: getCssVar('text'),
    textSecondary: getCssVar('text-secondary'),
    textTertiary: getCssVar('text-tertiary'),
    border: getCssVar('border'),
    borderLight: getCssVar('muted'),
    primary: getCssVar('primary'),
    primaryForeground: getCssVar('primary-foreground'),
    card: getCssVar('card'),
    cardForeground: getCssVar('card-foreground'),
    muted: getCssVar('muted'),
    mutedForeground: getCssVar('muted-foreground'),
    accent: getCssVar('accent'),
    accentForeground: getCssVar('accent-foreground'),
    secondary: getCssVar('secondary'),
    secondaryForeground: getCssVar('secondary-foreground'),
    error: getCssVar('error'),
    success: getCssVar('success'),
    warning: getCssVar('warning'),
    blue: getCssVar('blue'),
    purple: getCssVar('purple'),
    green: getCssVar('green'),
    yellow: getCssVar('yellow'),
    red: getCssVar('red'),
    orange: getCssVar('orange'),
    destructive: getCssVar('error'),
    destructiveForeground: getCssVar('destructive-foreground'),
    cta: getCssVar('cta'),
    hover: getCssVar('hover'),
    selected: getCssVar('selected'),
    white: getCssVar('background'),
    overlay: getCssVar('overlay'),
    primaryLight: getCssVar('primary-light'),
  };
};

export const useWebTheme = (): WebThemeColors => {
  const [colors, setColors] = useState<WebThemeColors>(defaultColors);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    // 初始获取颜色
    setColors(getColorsFromCss());

    // 创建 MutationObserver 监听 CSS 变量变化
    const observer = new MutationObserver(() => {
      setColors(getColorsFromCss());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    });

    return () => observer.disconnect();
  }, []);

  return colors;
};

export default useWebTheme;
