// 设置分组标题

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing } from '../../../theme';
import { useTheme } from '../../../hooks/useTheme';

interface SectionHeaderProps {
  title: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => {
  const colors = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: colors.textSecondary }]}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  text: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.08,
    textTransform: 'uppercase',
  },
});

export default SectionHeader;
