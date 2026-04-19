// 设置分组标题

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing } from '../../../theme';
import { useWebTheme } from '../../../hooks/useWebTheme';

interface SectionHeaderProps {
  title: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => {
  const colors = useWebTheme();

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
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default SectionHeader;
