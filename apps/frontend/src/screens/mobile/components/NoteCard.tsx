// 笔记卡片

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { spacing } from '../../../theme';
import { useWebTheme } from '../../../hooks/useWebTheme';

interface NoteCardProps {
  title: string;
  summary?: string;
  tags?: string[];
  onPress?: () => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ title, summary, tags, onPress }) => {
  const colors = useWebTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      {summary ? (
        <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={2}>
          {summary}
        </Text>
      ) : null}
      {tags && tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {tags.slice(0, 3).map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  summary: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default NoteCard;
