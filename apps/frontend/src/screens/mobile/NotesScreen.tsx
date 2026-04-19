// 主页面 - 笔记列表

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, typography } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { PlusIcon } from '../../components/icons';
import { ImportDialog } from '../../components';

// 模拟数据
const MOCK_NOTES = [
  { id: 1, title: 'React Native 学习笔记', content: '...', tags: ['React', 'Mobile'] },
  { id: 2, title: 'TypeScript 类型系统', content: '...', tags: ['TypeScript'] },
  { id: 3, title: '知识图谱构建方法', content: '...', tags: ['AI', 'Knowledge'] },
];

export const NotesScreen: React.FC = () => {
  const colors = useWebTheme();
  const [showImportDialog, setShowImportDialog] = useState(false);

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
        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={styles.importButton}
            onPress={() => setShowImportDialog(true)}
          >
            <PlusIcon size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={MOCK_NOTES}
        renderItem={renderNoteItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
      />

      {/* 导入对话框（仅手机端） */}
      {Platform.OS !== 'web' && (
        <ImportDialog
          visible={showImportDialog}
          onClose={() => setShowImportDialog(false)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...typography.h2,
  },
  importButton: {
    padding: spacing.xs,
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
