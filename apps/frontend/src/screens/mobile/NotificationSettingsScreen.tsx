// 通知设置（手机端）

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { SettingsItem } from './components/SettingsItem';
import { ChevronLeftIcon, BellIcon } from '../../components/icons';

interface NotificationSettingsScreenProps {
  onBack: () => void;
}

export const NotificationSettingsScreen: React.FC<NotificationSettingsScreenProps> = ({ onBack }) => {
  const colors = useWebTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <SettingsItem
          icon={<ChevronLeftIcon size={22} color={colors.text} />}
          title="通知设置"
          showChevron={false}
          onPress={onBack}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.sectionHeader}>
            <BellIcon size={20} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>通知类型</Text>
          </View>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            通知设置开发中，敬请期待。当前通知将通过系统默认方式发送。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  section: { borderRadius: 12, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  desc: { fontSize: 14, paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
});

export default NotificationSettingsScreen;
