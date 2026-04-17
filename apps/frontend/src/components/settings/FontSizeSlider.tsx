// 字体大小选择器组件

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';

interface FontSizeSliderProps {
  value: number;
  onChange: (size: number) => void;
}

const FONT_SIZES = [12, 13, 14, 15, 16, 18, 20];

export const FontSizeSlider: React.FC<FontSizeSliderProps> = ({ value, onChange }) => {
  const colors = useWebTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      {/* 滑块轨道 */}
      <View style={styles.sliderTrack}>
        <View style={styles.sliderLine}>
          {FONT_SIZES.map((size) => {
            const isActive = value === size;
            return (
              <TouchableOpacity
                key={size}
                style={[
                  styles.sliderDot,
                  { backgroundColor: colors.border, borderColor: colors.borderLight },
                  isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => onChange(size)}
                activeOpacity={0.7}
              />
            );
          })}
        </View>
        {/* 标签 */}
        <View style={styles.labelsRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>小</Text>
          <View style={styles.labelSpacer} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>标准</Text>
          <View style={styles.labelSpacer} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>大</Text>
        </View>
      </View>

      {/* 当前值显示 */}
      <View style={[styles.valueDisplay, { borderTopColor: colors.border }]}>
        <Text style={[styles.valueText, { color: colors.textSecondary }]}>当前：{value}px</Text>
        <Text style={[styles.previewText, { fontSize: value, color: colors.text }]}>
          预览文字
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: 12,
  },
  sliderTrack: {
    marginBottom: spacing.md,
  },
  sliderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  sliderDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  sliderDotActive: {
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  label: {
    fontSize: 12,
  },
  labelSpacer: {
    flex: 1,
  },
  valueDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
  valueText: {
    fontSize: 13,
  },
  previewText: {
    fontWeight: '500',
  },
});

export default FontSizeSlider;
