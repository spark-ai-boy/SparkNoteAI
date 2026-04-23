// 设计系统颜色配置
// 基于 shadcn/ui new-york 风格

// 浅色主题
export const lightColors = {
  // 基础颜色
  primary: '#171717',
  primaryForeground: '#fafafa',

  // 背景色
  background: '#ffffff',
  foreground: '#171717',

  // 卡片
  card: '#ffffff',
  cardForeground: '#171717',

  // Popover
  popover: '#ffffff',
  popoverForeground: '#171717',

  // 次要色
  secondary: '#f5f5f5',
  secondaryForeground: '#171717',

  // muted
  muted: '#f5f5f5',
  mutedForeground: '#737373',

  // 强调色
  accent: '#f5f5f5',
  accentForeground: '#171717',

  // 边框和输入
  border: '#e5e5e5',
  input: '#e5e5e5',
  ring: '#a3a3a3',

  // 破坏性操作
  destructive: '#dc2626',
  destructiveForeground: '#fef2f2',

  // 图表颜色
  chart1: '#eab308',
  chart2: '#22c55e',
  chart3: '#3b82f6',
  chart4: '#a855f7',
  chart5: '#f97316',

  // 侧边栏
  sidebar: '#fafafa',
  sidebarForeground: '#171717',
  sidebarPrimary: '#171717',
  sidebarPrimaryForeground: '#fafafa',
  sidebarAccent: '#f5f5f5',
  sidebarAccentForeground: '#171717',
  sidebarBorder: '#e5e5e5',
  sidebarRing: '#a3a3a3',

  // 便捷别名（兼容旧代码）
  white: '#ffffff',
  cta: '#fafafa',
  text: '#171717',
  textSecondary: '#737373',
  textTertiary: '#a3a3a3',
  textLight: '#a3a3a3',
  borderLight: '#f5f5f5',
  backgroundSecondary: '#fafafa',
  hover: '#f5f5f5',
  selected: '#e5e5e5',
  error: '#dc2626',
  success: '#22c55e',
  warning: '#f97316',
  blue: '#3b82f6',
  purple: '#a855f7',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#dc2626',
  orange: '#f97316',

  // 透明度变体
  primaryLight: 'rgba(23, 23, 23, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.4)',
};

// 深色主题
export const darkColors = {
  // 主色调 - 浅灰色系
  primary: '#fafafa',
  primaryForeground: '#171717',

  // 背景色 - 深色
  background: '#0a0a0a',
  foreground: '#fafafa',

  // 卡片
  card: '#0a0a0a',
  cardForeground: '#fafafa',

  // Popover
  popover: '#0a0a0a',
  popoverForeground: '#fafafa',

  // 次要色
  secondary: '#171717',
  secondaryForeground: '#fafafa',

  // muted
  muted: '#171717',
  mutedForeground: '#a3a3a3',

  // 强调色
  accent: '#171717',
  accentForeground: '#fafafa',

  // 边框和输入
  border: '#262626',
  input: '#262626',
  ring: '#404040',

  // 破坏性操作
  destructive: '#ef4444',
  destructiveForeground: '#7f1d1d',

  // 图表颜色
  chart1: '#facc15',
  chart2: '#4ade80',
  chart3: '#60a5fa',
  chart4: '#c084fc',
  chart5: '#fb923c',

  // 侧边栏
  sidebar: '#0a0a0a',
  sidebarForeground: '#fafafa',
  sidebarPrimary: '#fafafa',
  sidebarPrimaryForeground: '#0a0a0a',
  sidebarAccent: '#171717',
  sidebarAccentForeground: '#fafafa',
  sidebarBorder: '#262626',
  sidebarRing: '#404040',

  // 便捷别名（兼容旧代码）
  white: '#0a0a0a',
  cta: '#171717',
  text: '#fafafa',
  textSecondary: '#a3a3a3',
  textTertiary: '#737373',
  textLight: '#737373',
  borderLight: '#171717',
  backgroundSecondary: '#171717',
  hover: '#171717',
  selected: '#262626',
  error: '#ef4444',
  success: '#4ade80',
  warning: '#fb923c',
  blue: '#60a5fa',
  purple: '#c084fc',
  green: '#4ade80',
  yellow: '#facc15',
  red: '#ef4444',
  orange: '#fb923c',

  // 透明度变体
  primaryLight: 'rgba(250, 250, 250, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

// 获取 CSS 变量值（Web 端）
const getCssVar = (name: string, fallback: string): string => {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(`--${name}`)
      .trim();
    return value || fallback;
  }
  return fallback;
};

// 创建动态颜色对象（Web 端从 CSS 变量读取）
const createDynamicColors = () => ({
  // 便捷别名（动态获取）
  get background() { return getCssVar('background', lightColors.background); },
  get backgroundSecondary() { return getCssVar('background-secondary', lightColors.backgroundSecondary); },
  get text() { return getCssVar('text', lightColors.text); },
  get textSecondary() { return getCssVar('text-secondary', lightColors.textSecondary); },
  get textTertiary() { return getCssVar('text-tertiary', lightColors.textTertiary); },
  get textLight() { return getCssVar('text-tertiary', lightColors.textLight); },
  get border() { return getCssVar('border', lightColors.border); },
  get borderLight() { return getCssVar('muted', lightColors.borderLight); },
  get primary() { return getCssVar('primary', lightColors.primary); },
  get primaryForeground() { return getCssVar('primary-foreground', lightColors.primaryForeground); },
  get card() { return getCssVar('card', lightColors.card); },
  get cardForeground() { return getCssVar('card-foreground', lightColors.cardForeground); },
  get muted() { return getCssVar('muted', lightColors.muted); },
  get mutedForeground() { return getCssVar('muted-foreground', lightColors.mutedForeground); },
  get accent() { return getCssVar('accent', lightColors.accent); },
  get accentForeground() { return getCssVar('accent-foreground', lightColors.accentForeground); },
  get secondary() { return getCssVar('secondary', lightColors.secondary); },
  get secondaryForeground() { return getCssVar('secondary-foreground', lightColors.secondaryForeground); },
  get error() { return getCssVar('error', lightColors.error); },
  get success() { return getCssVar('success', lightColors.success); },
  get warning() { return getCssVar('warning', lightColors.warning); },

  // 动态获取（非固定值）
  get cta() { return getCssVar('cta', lightColors.cta); },
  get hover() { return getCssVar('hover', lightColors.hover); },
  get selected() { return getCssVar('selected', lightColors.selected); },
  get overlay() { return getCssVar('overlay', lightColors.overlay); },
  get primaryLight() { return getCssVar('primary-light', lightColors.primaryLight); },

  // 固定值（不动态变化）
  white: lightColors.white,
  blue: lightColors.blue,
  purple: lightColors.purple,
  green: lightColors.green,
  yellow: lightColors.yellow,
  red: lightColors.red,
  orange: lightColors.orange,

  // 其他别名
  foreground: lightColors.foreground,
  popover: lightColors.popover,
  popoverForeground: lightColors.popoverForeground,
  destructive: lightColors.destructive,
  destructiveForeground: lightColors.destructiveForeground,
  chart1: lightColors.chart1,
  chart2: lightColors.chart2,
  chart3: lightColors.chart3,
  chart4: lightColors.chart4,
  chart5: lightColors.chart5,
  sidebar: lightColors.sidebar,
  sidebarForeground: lightColors.sidebarForeground,
  sidebarPrimary: lightColors.sidebarPrimary,
  sidebarPrimaryForeground: lightColors.sidebarPrimaryForeground,
  sidebarAccent: lightColors.sidebarAccent,
  sidebarAccentForeground: lightColors.sidebarAccentForeground,
  sidebarBorder: lightColors.sidebarBorder,
  sidebarRing: lightColors.sidebarRing,
  input: lightColors.input,
  ring: lightColors.ring,
});

// 默认导出（动态颜色对象）
export const colors = createDynamicColors();

// iOS 系统颜色（原生移动端使用）
export const iosLightColors = {
  primary: '#007AFF',
  primaryForeground: '#FFFFFF',
  background: '#F2F2F7',
  backgroundSecondary: '#FFFFFF',
  foreground: '#000000',
  text: '#000000',
  textSecondary: '#6E6E73',
  textTertiary: '#AEAEB2',
  textLight: '#AEAEB2',
  card: '#FFFFFF',
  cardForeground: '#000000',
  popover: '#FFFFFF',
  popoverForeground: '#000000',
  secondary: '#F2F2F7',
  secondaryForeground: '#000000',
  muted: '#F2F2F7',
  mutedForeground: '#6E6E73',
  accent: '#F2F2F7',
  accentForeground: '#000000',
  border: '#C6C6C8',
  borderLight: '#E5E5EA',
  input: '#E5E5EA',
  ring: '#AEAEB2',
  destructive: '#FF3B30',
  destructiveForeground: '#FFFFFF',
  chart1: '#FF9500',
  chart2: '#34C759',
  chart3: '#007AFF',
  chart4: '#AF52DE',
  chart5: '#FF3B30',
  sidebar: '#F2F2F7',
  sidebarForeground: '#000000',
  sidebarPrimary: '#007AFF',
  sidebarPrimaryForeground: '#FFFFFF',
  sidebarAccent: '#F2F2F7',
  sidebarAccentForeground: '#000000',
  sidebarBorder: '#C6C6C8',
  sidebarRing: '#AEAEB2',
  white: '#FFFFFF',
  cta: '#007AFF',
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  blue: '#007AFF',
  purple: '#AF52DE',
  green: '#34C759',
  yellow: '#FFCC00',
  red: '#FF3B30',
  orange: '#FF9500',
  primaryLight: 'rgba(0, 122, 255, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.4)',
  hover: '#E5E5EA',
  selected: '#E5E5EA',
};

export const iosDarkColors = {
  primary: '#0A84FF',
  primaryForeground: '#FFFFFF',
  background: '#000000',
  backgroundSecondary: '#1C1C1E',
  foreground: '#FFFFFF',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#48484A',
  textLight: '#48484A',
  card: '#1C1C1E',
  cardForeground: '#FFFFFF',
  popover: '#1C1C1E',
  popoverForeground: '#FFFFFF',
  secondary: '#2C2C2E',
  secondaryForeground: '#FFFFFF',
  muted: '#2C2C2E',
  mutedForeground: '#8E8E93',
  accent: '#2C2C2E',
  accentForeground: '#FFFFFF',
  border: '#38383A',
  borderLight: '#2C2C2E',
  input: '#2C2C2E',
  ring: '#48484A',
  destructive: '#FF453A',
  destructiveForeground: '#FFFFFF',
  chart1: '#FF9F0A',
  chart2: '#30D158',
  chart3: '#0A84FF',
  chart4: '#BF5AF2',
  chart5: '#FF453A',
  sidebar: '#000000',
  sidebarForeground: '#FFFFFF',
  sidebarPrimary: '#0A84FF',
  sidebarPrimaryForeground: '#FFFFFF',
  sidebarAccent: '#2C2C2E',
  sidebarAccentForeground: '#FFFFFF',
  sidebarBorder: '#38383A',
  sidebarRing: '#48484A',
  white: '#1C1C1E',
  cta: '#0A84FF',
  error: '#FF453A',
  success: '#30D158',
  warning: '#FF9F0A',
  blue: '#0A84FF',
  purple: '#BF5AF2',
  green: '#30D158',
  yellow: '#FFD60A',
  red: '#FF453A',
  orange: '#FF9F0A',
  primaryLight: 'rgba(10, 132, 255, 0.15)',
  overlay: 'rgba(0, 0, 0, 0.6)',
  hover: '#2C2C2E',
  selected: '#2C2C2E',
};

export type ColorTheme = typeof lightColors;
export type ThemeMode = 'light' | 'dark' | 'system';
