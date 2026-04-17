// 主题选择器组件

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { CheckIcon, SunIcon, MoonIcon, MonitorIcon } from '../icons';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeSelectorProps {
  value: ThemeMode;
  onChange: (theme: ThemeMode) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ value, onChange }) => {
  const colors = useWebTheme();

  const themes: { mode: ThemeMode; label: string; icon: React.ReactNode; description: string }[] = [
    {
      mode: 'light',
      label: '浅色模式',
      icon: <SunIcon size={24} color={value === 'light' ? colors.primaryForeground : colors.text} />,
      description: '明亮清爽的界面',
    },
    {
      mode: 'dark',
      label: '深色模式',
      icon: <MoonIcon size={24} color={value === 'dark' ? colors.primaryForeground : colors.text} />,
      description: '护眼舒适的暗色主题',
    },
    {
      mode: 'system',
      label: '跟随系统',
      icon: <MonitorIcon size={24} color={value === 'system' ? colors.primaryForeground : colors.text} />,
      description: '根据系统设置自动切换',
    },
  ];

  return (
    <View style={styles.container}>
      {themes.map((theme) => (
        <TouchableOpacity
          key={theme.mode}
          style={[
            styles.themeCard,
            { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
            value === theme.mode && {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
            },
          ]}
          onPress={() => onChange(theme.mode)}
          activeOpacity={0.7}
        >
          <View style={styles.themeCardLeft}>
            <View style={[
              styles.themeIconContainer,
              { backgroundColor: value === theme.mode ? colors.primaryForeground + '20' : 'rgba(128, 128, 128, 0.1)' },
            ]}>
              {theme.icon}
            </View>
            <View style={styles.themeCardText}>
              <Text
                style={[
                  styles.themeLabel,
                  { color: value === theme.mode ? colors.primaryForeground : colors.text },
                ]}
              >
                {theme.label}
              </Text>
              <Text
                style={[
                  styles.themeDescription,
                  { color: value === theme.mode ? colors.primaryForeground + 'cc' : colors.textSecondary },
                ]}
              >
                {theme.description}
              </Text>
            </View>
          </View>
          {value === theme.mode && (
            <View style={[styles.checkmark, { backgroundColor: colors.success }]}>
              <CheckIcon size={16} color={colors.primaryForeground} />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  themeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    width: 'auto',
  },
  themeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  themeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCardText: {
    gap: spacing.xs,
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  themeDescription: {
    fontSize: 12,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ThemeSelector;
