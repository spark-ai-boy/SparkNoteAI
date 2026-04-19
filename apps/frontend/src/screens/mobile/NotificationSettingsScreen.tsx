// 通知设置（手机端）— iOS 分组卡片风格

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

export const NotificationSettingsScreen: React.FC = () => {
  const colors = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.row}>
            <Text style={[styles.desc, { color: colors.textSecondary }]}>
              通知设置开发中，敬请期待。当前通知将通过系统默认方式发送。
            </Text>
          </View>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  desc: {
    fontSize: 15,
    lineHeight: 22,
  },
});

export default NotificationSettingsScreen;
