// 笔记列表（手机端）

import React, { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Text,
  Dimensions,
} from 'react-native';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { PlusIcon, CloseIcon, BookIcon, MoreHorizontalIcon, BotIcon, NetworkIcon, SettingsIcon, UploadIcon, FileTextIcon, SearchIcon } from '../../components/icons';
import { NoteCard } from './components/NoteCard';
import { EmptyState } from './components/EmptyState';
import { ImportDialog } from '../../components/ImportDialog';
import { NoteDetailScreen } from './NoteDetailScreen';
import { notesApi, type Note } from '../../api/note';
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

const menuItems = [
  { key: 'create', label: '新建笔记', icon: PlusIcon },
  { key: 'import', label: '导入笔记', icon: UploadIcon },
  { key: 'ai', label: 'AI 助手', icon: BotIcon },
  { key: 'graph', label: '知识图谱', icon: NetworkIcon },
  { key: 'tasks', label: '后台任务', icon: FileTextIcon },
  { key: 'settings', label: '设置', icon: SettingsIcon },
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
  const [viewingNote, setViewingNote] = useState<number | null>(null);
  const menuButtonRef = useRef<any>(null);
  const [menuRect, setMenuRect] = useState({ top: 0, right: 0 });

  const handleMenuAction = (key: string) => {
    setShowMenu(false);
    switch (key) {
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
  };

  const handleShowMenu = () => {
    if (menuButtonRef.current) {
      menuButtonRef.current.measureInWindow((x: number, y: number, w: number, h: number) => {
        setMenuRect({ top: y + h, right: Dimensions.get('window').width - x - w });
        setShowMenu(true);
      });
    }
  };

  // 右上角按钮
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity ref={menuButtonRef} onPress={handleShowMenu} activeOpacity={0.5}>
            <PlusIcon size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, colors.textSecondary]);

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
  }, []);

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.searchBar}>
        <View style={[styles.searchInputWrap, { backgroundColor: '#E5E5EA' }]}>
          <SearchIcon size={16} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="搜索笔记..."
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.6} style={{ padding: 4 }}>
              <CloseIcon size={14} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
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
              description={searchQuery ? '尝试其他关键词' : '点击右上角 ··· 创建笔记'}
            />
          ) : null
        }
      />

      <ImportDialog
        visible={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImport}
      />

      {/* iOS 风格弹出菜单 */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <View style={styles.menuOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowMenu(false)} />
          <View
            style={[
              styles.menuContainer,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
                top: menuRect.top,
                right: menuRect.right,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {menuItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={styles.menuItem}
                  onPress={() => handleMenuAction(item.key)}
                  activeOpacity={0.6}
                >
                  <View style={styles.menuIconWrap}>
                    <Icon size={18} color={colors.textSecondary} />
                  </View>
                  <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  searchInputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: 6, gap: spacing.xs },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: spacing.xs },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  menuContainer: { borderRadius: 12, borderWidth: 0.5, overflow: 'hidden', position: 'absolute', width: 200, paddingVertical: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', height: 40, paddingHorizontal: spacing.md },
  menuIconWrap: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 15, flex: 1 },
});

export default NotesScreen;
