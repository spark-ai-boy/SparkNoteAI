// 界面设置（手机端）— iOS 分组卡片风格

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { useInterfaceSettingsStore } from '../../stores/interfaceSettingsStore';
import { SunIcon, MoonIcon, MonitorIcon, CheckIcon } from '../../components/icons';

const THEMES: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: 'light', label: '浅色', icon: <SunIcon size={20} /> },
  { id: 'dark', label: '深色', icon: <MoonIcon size={20} /> },
  { id: 'system', label: '跟随系统', icon: <MonitorIcon size={20} /> },
];

export const InterfaceSettingsScreen: React.FC = () => {
  const colors = useTheme();
  const { theme, setTheme } = useInterfaceSettingsStore();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
          {THEMES.map((t, i) => {
            const isLast = i === THEMES.length - 1;
            const isSelected = theme === t.id;
            return (
              <View key={t.id}>
                <Pressable
                  style={styles.row}
                  onPress={() => setTheme(t.id as any)}
                >
                  <View style={styles.rowLeft}>
                    {t.icon}
                    <Text style={[styles.label, { color: colors.text }]}>{t.label}</Text>
                  </View>
                  {isSelected && <CheckIcon size={20} color={colors.primary} />}
                </Pressable>
                {!isLast && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  label: {
    fontSize: 17,
  },
  divider: {
    height: 0.5,
    marginLeft: 32,
  },
});

export default InterfaceSettingsScreen;
