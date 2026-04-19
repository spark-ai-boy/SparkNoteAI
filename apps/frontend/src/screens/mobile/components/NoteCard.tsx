// 笔记卡片

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { spacing } from '../../../theme';
import { useTheme } from '../../../hooks/useTheme';
import { MessageSquareIcon, FileTextIcon, GlobeIcon } from '../../../components/icons';

const PLATFORM_MAP: Record<string, { label: string; color: string; Icon: React.FC<{ size: number; color: string }> }> = {
  wechat: { label: '公众号', color: '#07C160', Icon: MessageSquareIcon },
  xiaohongshu: { label: '小红书', color: '#FF2442', Icon: FileTextIcon },
  bilibili: { label: 'B站', color: '#FB7299', Icon: FileTextIcon },
  youtube: { label: 'YouTube', color: '#FF0000', Icon: GlobeIcon },
};

interface NoteCardProps {
  title: string;
  summary?: string;
  tags?: string[];
  tagColors?: Record<string, string>;
  platform?: string;
  createdAt?: string;
  onPress?: () => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ title, summary, tags, tagColors, platform, createdAt, onPress }) => {
  const colors = useTheme();
  const platformInfo = PLATFORM_MAP[platform || ''];

  const getTagColor = (tagName: string): string => {
    return tagColors?.[tagName] || colors.primary;
  };

  const formatTime = (iso: string): string => {
    try {
      return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {createdAt && (
          <Text style={[styles.timeText, { color: colors.textTertiary }]}>{formatTime(createdAt)}</Text>
        )}
      </View>
      {summary ? (
        <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={2}>
          {summary}
        </Text>
      ) : null}
      {platformInfo && (
        <View style={[styles.platformBadge, { backgroundColor: platformInfo.color + '18' }]}>
          <platformInfo.Icon size={12} color={platformInfo.color} />
          <Text style={[styles.platformLabel, { color: platformInfo.color }]}>{platformInfo.label}</Text>
        </View>
      )}
      {tags && tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {tags.slice(0, 3).map((tag) => {
            const tagColor = getTagColor(tag);
            return (
              <View key={tag} style={[styles.tag, { backgroundColor: tagColor + '15' }]}>
                <Text style={[styles.tagText, { color: tagColor }]}>{tag}</Text>
              </View>
            );
          })}
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
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: spacing.sm,
    flexShrink: 0,
  },
  summary: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginBottom: spacing.sm,
  },
  platformLabel: {
    fontSize: 11,
    fontWeight: '600',
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
