// 关于页面（手机端）— iOS 分组卡片风格

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

export const AboutScreen: React.FC = () => {
  const colors = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <Text style={[styles.appName, { color: colors.text }]}>SparkNoteAI</Text>
          <Text style={[styles.slogan, { color: colors.textSecondary }]}>
            拾光如 spark，沉淀成 note
          </Text>
          <Text style={[styles.slogan, { color: colors.textSecondary }]}>
            捕捉灵感的碎片，编织知识的图谱
          </Text>
          <Text style={[styles.version, { color: colors.textTertiary }]}>Version 1.0.0</Text>
        </View>

        {/* 技术栈 */}
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>技术栈</Text>
          <DetailRow label="后端" value="FastAPI + PostgreSQL + Neo4j" colors={colors} />
          <DetailRow label="前端" value="React Native + Expo" colors={colors} />
          <DetailRow label="AI" value="多模型大语言模型" colors={colors} isLast />
        </View>
      </ScrollView>
    </View>
  );
};

const DetailRow: React.FC<{ label: string; value: string; colors: ReturnType<typeof useTheme>; isLast?: boolean }> = ({ label, value, colors, isLast }) => (
  <View style={[styles.detailRow, !isLast && { borderBottomColor: colors.border, borderBottomWidth: 0.5 }]}>
    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  logoSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  slogan: {
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  version: {
    fontSize: 12,
    marginTop: spacing.lg,
  },
  card: { borderRadius: 12, overflow: 'hidden' },
  groupLabel: {
    fontSize: 13,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  detailLabel: { fontSize: 15 },
  detailValue: { fontSize: 14 },
});

export default AboutScreen;
