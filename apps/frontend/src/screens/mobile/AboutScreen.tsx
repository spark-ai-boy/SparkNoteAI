// 关于页面（手机端）

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { SettingsItem } from './components/SettingsItem';
import { SectionHeader } from './components/SectionHeader';
import { ChevronLeftIcon } from '../../components/icons';

interface AboutScreenProps {
  onBack: () => void;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ onBack }) => {
  const colors = useWebTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <SettingsItem
          icon={<ChevronLeftIcon size={22} color={colors.text} />}
          title="关于"
          showChevron={false}
          onPress={onBack}
        />
      </View>
      <ScrollView>
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

        <SectionHeader title="技术栈" />
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.techItem}>
            <Text style={[styles.techLabel, { color: colors.textSecondary }]}>后端</Text>
            <Text style={[styles.techValue, { color: colors.text }]}>FastAPI + PostgreSQL + Neo4j</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.techItem}>
            <Text style={[styles.techLabel, { color: colors.textSecondary }]}>前端</Text>
            <Text style={[styles.techValue, { color: colors.text }]}>React Native + Expo</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.techItem}>
            <Text style={[styles.techLabel, { color: colors.textSecondary }]}>AI</Text>
            <Text style={[styles.techValue, { color: colors.text }]}>多模型大语言模型</Text>
          </View>
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
  section: {
    marginHorizontal: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
  },
  techItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  techLabel: {
    fontSize: 15,
  },
  techValue: {
    fontSize: 14,
  },
});

export default AboutScreen;
