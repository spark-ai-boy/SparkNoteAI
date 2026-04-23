// 关于页面（手机端）— 简洁风格

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { SparklesIcon } from '../../components/icons';

const GITHUB_URL = 'https://github.com/SparkNoteAI/SparkNoteAI';
const DOCS_URL = 'https://github.com/SparkNoteAI/SparkNoteAI/wiki';

export const AboutScreen: React.FC = () => {
  const colors = useTheme();
  const version = Constants.expoConfig?.version ?? '1.1.0';

  const openUrl = (url: string) => {
    // fallback: 如果 expo-linking 不可用则忽略
    import('expo-linking')
      .then((linking) => linking.default.openURL(url))
      .catch(() => {});
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Logo + 名称 */}
        <View style={styles.header}>
          <View style={[styles.logoCircle, { backgroundColor: colors.backgroundSecondary }]}>
            <SparklesIcon size={36} color={colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>SparkNoteAI</Text>
          <Text style={[styles.version, { color: colors.textTertiary }]}>v{version}</Text>
        </View>

        {/* 描述 */}
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            SparkNoteAI 是一个知识整理与管理系统，支持笔记管理、碎片化内容采集、大模型智能总结、知识图谱可视化和智能搜索。
          </Text>
        </View>

        {/* 链接 */}
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
          <Pressable onPress={() => openUrl(GITHUB_URL)} style={styles.linkRow}>
            <Text style={[styles.linkLabel, { color: colors.text }]}>GitHub</Text>
            <Text style={[styles.linkValue, { color: colors.textSecondary }]} numberOfLines={1}>{GITHUB_URL}</Text>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable onPress={() => openUrl(DOCS_URL)} style={styles.linkRow}>
            <Text style={[styles.linkLabel, { color: colors.text }]}>文档</Text>
            <Text style={[styles.linkValue, { color: colors.textSecondary }]} numberOfLines={1}>{DOCS_URL}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },

  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
  },
  version: {
    fontSize: 13,
    marginTop: spacing.xs,
  },

  card: { borderRadius: 12, overflow: 'hidden', marginBottom: spacing.md },
  desc: {
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
    padding: spacing.lg,
  },

  linkRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  linkLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  linkValue: {
    fontSize: 13,
  },
  divider: { height: 0.5, marginLeft: spacing.md },
});

export default AboutScreen;
