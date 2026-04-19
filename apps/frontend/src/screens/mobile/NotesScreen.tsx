// 笔记列表（手机端）

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, typography } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { PlusIcon, SearchIcon, CloseIcon, BookIcon } from '../../components/icons';
import { NoteCard } from './components/NoteCard';
import { EmptyState } from './components/EmptyState';
import { ImportDialog } from '../../components/ImportDialog';
import { NoteDetailScreen } from './NoteDetailScreen';
import { notesApi, type Note } from '../../api/note';
import { createImportTask } from '../../api/importTask';
import { useToast } from '../../hooks/useToast';

export const NotesScreen: React.FC = () => {
  const colors = useWebTheme();
  const toast = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [viewingNote, setViewingNote] = useState<number | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notesApi.getNotes({ page: 1, size: 50 });
      setNotes(res.items);
    } catch (e: any) {
      toast.error('获取笔记失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotes();
  }, [fetchNotes]);

  const handleCreateNote = async () => {
    try {
      const note = await notesApi.createNote({ title: '无标题笔记' });
      setNotes((prev) => [note, ...prev]);
      toast.success('已创建新笔记');
    } catch (e: any) {
      toast.error('创建笔记失败');
    }
  };

  const handleImport = async (url: string, platform: string) => {
    try {
      await createImportTask({ url, platform });
      toast.success('导入任务已创建');
      setShowImportDialog(false);
    } catch (e: any) {
      toast.error('创建导入任务失败');
    }
  };

  const filteredNotes = searchQuery
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : notes;

  const renderNoteItem = ({ item }: { item: Note }) => (
    <NoteCard
      title={item.title}
      summary={item.summary || item.content?.slice(0, 100)}
      tags={item.tags}
      onPress={() => setViewingNote(item.id)}
    />
  );

  const handleRefreshList = useCallback(() => {
    setRefreshing(true);
    fetchNotes();
  }, [fetchNotes]);

  if (viewingNote !== null) {
    return (
      <NoteDetailScreen
        noteId={viewingNote}
        onBack={() => setViewingNote(null)}
        onUpdate={handleRefreshList}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        {showSearch ? (
          <View style={styles.searchHeader}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="搜索笔记..."
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
            <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(''); }}>
              <CloseIcon size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.title, { color: colors.text }]}>笔记</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setShowSearch(true)}>
                <SearchIcon size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={handleCreateNote}>
                <PlusIcon size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Note List */}
      <FlatList
        data={filteredNotes}
        renderItem={renderNoteItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !loading && filteredNotes.length === 0 ? (
            <EmptyState
              icon={searchQuery ? <SearchIcon size={48} color={colors.textTertiary} /> : <BookIcon size={48} color={colors.textTertiary} />}
              title={searchQuery ? '未找到相关笔记' : '暂无笔记'}
              description={searchQuery ? '尝试其他关键词' : '点击右上角 + 创建第一篇笔记'}
            />
          ) : null
        }
      />

      {/* Import Dialog */}
      <ImportDialog
        visible={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImport}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 56,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    padding: spacing.xs,
  },
  searchHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
});

export default NotesScreen;
