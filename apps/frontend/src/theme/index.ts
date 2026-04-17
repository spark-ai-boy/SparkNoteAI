// 主题入口文件

export * from './colors';
export * from './spacing';
export * from './typography';

import { colors, ColorTheme } from './colors';
import { spacing, Spacing } from './spacing';
import { typography, Typography, fontSizes, fontWeights, fontFamily } from './typography';

export interface Theme {
  colors: ColorTheme;
  spacing: Spacing;
  typography: Typography;
  fontSizes: typeof fontSizes;
  fontWeights: typeof fontWeights;
  fontFamily: typeof fontFamily;
}

export const theme: Theme = {
  colors,
  spacing,
  typography,
  fontSizes,
  fontWeights,
  fontFamily,
};

export default theme;
