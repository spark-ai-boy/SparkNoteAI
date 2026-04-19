// 主题设置（手机端）

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { useInterfaceSettingsStore } from '../../stores/interfaceSettingsStore';
import { SettingsItem } from './components/SettingsItem';
import { ChevronLeftIcon, SunIcon, MoonIcon, MonitorIcon, CheckIcon } from '../../components/icons';

interface InterfaceSettingsScreenProps {
  onBack: () => void;
}

const THEMES: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: 'light', label: '浅色', icon: <SunIcon size={20} /> },
  { id: 'dark', label: '深色', icon: <MoonIcon size={20} /> },
  { id: 'system', label: '跟随系统', icon: <MonitorIcon size={20} /> },
];

export const InterfaceSettingsScreen: React.FC<InterfaceSettingsScreenProps> = ({ onBack }) => {
  const colors = useWebTheme();
  const { theme, setTheme } = useInterfaceSettingsStore();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <SettingsItem
          icon={<ChevronLeftIcon size={22} color={colors.text} />}
          title="主题设置"
          showChevron={false}
          onPress={onBack}
        />
      </View>
      <ScrollView>
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary, margin: spacing.md, borderRadius: 12, overflow: 'hidden' }]}>
          {THEMES.map((t, i) => (
            <React.Fragment key={t.id}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <TouchableOpacity
                style={styles.themeItem}
                onPress={() => setTheme(t.id as any)}
                activeOpacity={0.7}
              >
                <View style={styles.themeLeft}>
                  {t.icon}
                  <Text style={[styles.themeLabel, { color: colors.text }]}>{t.label}</Text>
                </View>
                {theme === t.id && (
                  <CheckIcon size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
  },
  section: {},
  divider: {
    height: 1,
  },
  themeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  themeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  themeLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
});

export default InterfaceSettingsScreen;
