// 主页面 - 笔记列表

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, typography } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';

// 模拟数据
const MOCK_NOTES = [
  { id: 1, title: 'React Native 学习笔记', content: '...', tags: ['React', 'Mobile'] },
  { id: 2, title: 'TypeScript 类型系统', content: '...', tags: ['TypeScript'] },
  { id: 3, title: '知识图谱构建方法', content: '...', tags: ['AI', 'Knowledge'] },
];

export const NotesScreen: React.FC = () => {
  const colors = useWebTheme();

  const isDark = colors.background === '#0a0a0a' || colors.background === '#171717';

  const renderNoteItem = ({ item }: { item: typeof MOCK_NOTES[0] }) => (
    <TouchableOpacity
      style={[
        styles.noteCard,
        {
          backgroundColor: isDark ? colors.secondary : '#ffffff',
          borderWidth: isDark ? 1 : 0,
          borderColor: isDark ? colors.border : 'transparent',
          ...(!isDark && {
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
          } as any),
        },
      ]}
    >
      <Text style={[styles.noteTitle, { color: colors.text }]}>{item.title}</Text>
      <View style={styles.tagsContainer}>
        {item.tags.map((tag) => (
          <View key={tag} style={[styles.tag, { backgroundColor: colors.primary }]}>
            <Text style={[styles.tagText, { color: colors.cta }]}>{tag}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>笔记</Text>
      </View>
      <FlatList
        data={MOCK_NOTES}
        renderItem={renderNoteItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  title: {
    ...typography.h2,
  },
  listContent: {
    padding: spacing.md,
  },
  noteCard: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noteTitle: {
    ...typography.h4,
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
    fontSize: 12,
  },
});

export default NotesScreen;
