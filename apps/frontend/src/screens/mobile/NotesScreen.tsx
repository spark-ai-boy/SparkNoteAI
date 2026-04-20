// 笔记列表（手机端）

import React, { useState, useCallback, useEffect, useLayoutEffect } from 'react';
import {
  View,
  StyleSheet,
  SectionList,
  ScrollView,
  RefreshControl,
  Text,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { MenuView, type MenuAction } from '@react-native-menu/menu';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { PlusIcon, CloseIcon, BookIcon, SearchIcon } from '../../components/icons';
import { NoteCard } from './components/NoteCard';
import { EmptyState } from './components/EmptyState';
import { ImportDialog } from '../../components/ImportDialog';
import { notesApi, type Note, type Tag } from '../../api/note';
import { createImportTask } from '../../api/importTask';
import { useToast } from '../../hooks/useToast';
import { useToastStore } from '../../stores/toastStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type MobileNotesStackParamList = {
  NotesHome: undefined;
  AIAgent: undefined;
  KnowledgeGraph: undefined;
  Settings: undefined;
  Tasks: undefined;
  NoteDetail: { noteId: number };
};

type NavProp = NativeStackNavigationProp<MobileNotesStackParamList, 'NotesHome'>;

interface DateGroup {
  date: string;
  dateLabel: string;
  data: Note[];
}

const groupByDate = (items: Note[]): DateGroup[] => {
  const groups: Map<string, DateGroup> = new Map();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  items.forEach((item) => {
    const date = new Date(item.created_at);
    // Use local date for key to avoid timezone mismatch
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    const localDate = new Date(year, parseInt(month) - 1, parseInt(day));
    let dateLabel: string;
    if (localDate.getTime() === today.getTime()) {
      dateLabel = '今天';
    } else if (localDate.getTime() === yesterday.getTime()) {
      dateLabel = '昨天';
    } else {
      dateLabel = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    if (!groups.has(dateKey)) {
      groups.set(dateKey, { date: dateKey, dateLabel, data: [] });
    }
    groups.get(dateKey)!.data.push(item);
  });

  return Array.from(groups.values());
};

const menuActions: MenuAction[] = [
  { id: 'create', title: '新建笔记', image: 'plus', imageColor: '#666666' },
  { id: 'import', title: '导入笔记', image: 'square.and.arrow.up', imageColor: '#666666' },
  { id: 'ai', title: 'AI 助手', image: 'bubble.left.and.bubble.right', imageColor: '#666666' },
  { id: 'graph', title: '知识图谱', image: 'network', imageColor: '#666666' },
  { id: 'tasks', title: '后台任务', image: 'doc.text', imageColor: '#666666' },
  { id: 'settings', title: '设置', image: 'gear', imageColor: '#666666' },
];

export const NotesScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const colors = useTheme();
  const toast = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [menuKey, setMenuKey] = useState(0); // Force re-render after action

  const handleMenuAction = useCallback(({ nativeEvent }: { nativeEvent: { event: string } }) => {
    const action = nativeEvent.event;
    switch (action) {
      case 'create':
        handleCreateNote();
        break;
      case 'import':
        setShowImportDialog(true);
        break;
      case 'ai':
        navigation.navigate('AIAgent');
        break;
      case 'graph':
        navigation.navigate('KnowledgeGraph');
        break;
      case 'tasks':
        navigation.navigate('Tasks');
        break;
      case 'settings':
        navigation.navigate('Settings');
        break;
    }
  }, [navigation]);

  // 右上角按钮
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <MenuView
          key={menuKey}
          actions={menuActions}
          onPressAction={handleMenuAction}
          shouldOpenOnLongPress={false}
        >
          <View style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
            <PlusIcon size={22} color={colors.primary} />
          </View>
        </MenuView>
      ),
    });
  }, [navigation, colors.primary, menuKey]);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notesApi.getNotes({ page: 1, size: 50 });
      setNotes(res.items);
    } catch (e: any) {
      useToastStore.getState().showError('获取笔记失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
    fetchTags();
  }, []);

  // 从笔记详情页返回时刷新
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchNotes();
    });
    return unsubscribe;
  }, [navigation, fetchNotes]);

  const fetchTags = async () => {
    try {
      const res = await notesApi.getTags();
      setTags(res);
    } catch (e: any) {
      // 标签获取失败不影响笔记列表
    }
  };

  const getTagColor = (tagName: string): string => {
    const tag = tags.find((t) => t.name === tagName);
    return tag?.color || colors.textTertiary;
  };

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

  const filteredNotes = notes.filter((n) => {
    if (selectedTag && !n.tags.includes(selectedTag)) return false;
    if (searchQuery) {
      return (
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return true;
  });

  const groupedNotes = groupByDate(filteredNotes);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.searchBar}>
        <View style={[styles.searchInputWrap, { backgroundColor: '#E5E5EA' }]}>
          <SearchIcon size={16} color={colors.textTertiary} />
          {selectedTag && (
            <View style={[styles.searchTagChip, { backgroundColor: getTagColor(selectedTag) + '20' }]}>
              <Text style={[styles.searchTagChipText, { color: getTagColor(selectedTag) }]}>{selectedTag}</Text>
              <TouchableOpacity onPress={() => setSelectedTag(null)} activeOpacity={0.6} style={styles.searchTagClose}>
                <CloseIcon size={12} color={getTagColor(selectedTag)} />
              </TouchableOpacity>
            </View>
          )}
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={selectedTag ? `在 #${selectedTag} 中搜索...` : '搜索笔记...'}
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
          />
          {(searchQuery.length > 0 || selectedTag !== null) && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSelectedTag(null); }} activeOpacity={0.6} style={{ padding: 4 }}>
              <CloseIcon size={14} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {tags.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagBar} contentContainerStyle={styles.tagBarContent}>
          <TouchableOpacity
            style={[styles.tagChip, { backgroundColor: selectedTag === null ? colors.primary + '20' : '#E5E5EA' }]}
            onPress={() => setSelectedTag(null)}
            activeOpacity={0.6}
          >
            <Text style={[styles.tagChipText, { color: selectedTag === null ? colors.primary : colors.textSecondary }]}>全部</Text>
          </TouchableOpacity>
          {tags.map((tag) => {
            const tagColor = getTagColor(tag.name);
            const isSelected = selectedTag === tag.name;
            return (
              <TouchableOpacity
                key={tag.id}
                style={[styles.tagChip, { backgroundColor: isSelected ? tagColor + '20' : tagColor + '12' }]}
                onPress={() => setSelectedTag(isSelected ? null : tag.name)}
                activeOpacity={0.6}
              >
                <View style={[styles.tagDot, { backgroundColor: tagColor }]} />
                <Text style={[styles.tagChipText, { color: tagColor }]}>{tag.name}</Text>
              </TouchableOpacity>
            );
          })}
          {selectedTag !== null && (
            <TouchableOpacity style={styles.clearTagBtn} onPress={() => setSelectedTag(null)} activeOpacity={0.6}>
              <CloseIcon size={14} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
      <View style={styles.listWrapper}>
        <View style={[styles.timelineGlobalLine, { backgroundColor: colors.borderLight }]} />
        <SectionList
        sections={groupedNotes}
        renderItem={({ item, index, section }) => {
          const tagColorMap: Record<string, string> = {};
          item.tags.forEach((t) => {
            tagColorMap[t] = getTagColor(t);
          });
          const isFirstInGroup = index === 0;
          return (
            <View style={styles.timelineRow}>
              <View style={styles.timelineColumn}>
                <View style={[styles.timelineDot, isFirstInGroup ? styles.timelineDotFirst : styles.timelineDotSecondary, isFirstInGroup ? { backgroundColor: colors.primary } : { backgroundColor: colors.border }]} />
              </View>
              <View style={styles.timelineCard}>
                <NoteCard
                  title={item.title}
                  summary={item.summary || item.content?.slice(0, 100)}
                  tags={item.tags}
                  tagColors={tagColorMap}
                  platform={item.platform}
                  createdAt={item.created_at}
                  onPress={() => navigation.navigate('NoteDetail', { noteId: item.id })}
                />
              </View>
            </View>
          );
        }}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeaderRow}>
            <View style={styles.timelineColumn}>
              <View style={[styles.timelineDot, styles.timelineDotFirst, { backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>{section.dateLabel}</Text>
          </View>
        )}
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
          !loading && groupedNotes.length === 0 ? (
            <EmptyState
              icon={searchQuery ? <SearchIcon size={48} color={colors.textTertiary} /> : <BookIcon size={48} color={colors.textTertiary} />}
              title={searchQuery ? '未找到相关笔记' : '暂无笔记'}
              description={searchQuery ? '尝试其他关键词' : '点击右上角 ··· 创建笔记'}
            />
          ) : null
        }
        stickySectionHeadersEnabled={false}
      />
      </View>

      <ImportDialog
        visible={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImport}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 0 },
  tagBar: { maxHeight: 40 },
  tagBarContent: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.xs },
  tagChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 12, gap: 4, height: 28 },
  tagChipText: { fontSize: 13, fontWeight: '500' },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  clearTagBtn: { justifyContent: 'center', alignItems: 'center', width: 28, height: 28 },
  searchInputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: 6, gap: spacing.xs, marginTop: spacing.xs },
  searchTagChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, gap: 4 },
  searchTagChipText: { fontSize: 13, fontWeight: '600' },
  searchTagClose: { padding: 2 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: spacing.xs },
  listWrapper: { flex: 1, position: 'relative' },
  timelineGlobalLine: { position: 'absolute', left: 20, top: 0, bottom: 0, width: 1.5, zIndex: 0 },
  listContent: { paddingVertical: spacing.md, paddingLeft: 8, paddingRight: spacing.lg, paddingBottom: spacing.xl, paddingTop: 0 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  sectionHeaderText: { fontSize: 13, fontWeight: '600', flex: 1 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineColumn: { position: 'relative', width: spacing.lg, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.md, paddingBottom: spacing.md },
  timelineDot: { width: 6, height: 6, borderRadius: 3 },
  timelineDotFirst: { width: 8, height: 8, borderRadius: 4 },
  timelineDotSecondary: { opacity: 0.5 },
  timelineCard: { flex: 1 },
});

export default NotesScreen;
