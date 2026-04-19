// 笔记详情页（手机端）

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, typography } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { useToast } from '../../hooks/useToast';
import { notesApi, type Note } from '../../api/note';
import { SettingsItem } from './components/SettingsItem';
import { ChevronLeftIcon, EditIcon, TrashIcon, CheckIcon, GlobeIcon, TagIcon } from '../../components/icons';

interface NoteDetailScreenProps {
  noteId: number;
  onBack: () => void;
  onUpdate?: () => void;
}

export const NoteDetailScreen: React.FC<NoteDetailScreenProps> = ({ noteId, onBack, onUpdate }) => {
  const colors = useWebTheme();
  const toast = useToast();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  useEffect(() => {
    fetchNote();
  }, [noteId]);

  const fetchNote = async () => {
    setLoading(true);
    try {
      const data = await notesApi.getNote(noteId);
      setNote(data);
      setEditTitle(data.title);
      setEditContent(data.content || '');
    } catch (e: any) {
      toast.error('获取笔记详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editTitle.trim()) {
      toast.error('标题不能为空');
      return;
    }
    try {
      const updated = await notesApi.updateNote(noteId, {
        title: editTitle.trim(),
        content: editContent,
      });
      setNote(updated);
      setEditing(false);
      onUpdate?.();
      toast.success('已保存');
    } catch (e: any) {
      toast.error('保存失败');
    }
  };

  const handleDelete = () => {
    if (!note) return;
    Alert.alert(
      '删除笔记',
      `确定要删除「${note.title}」吗？此操作不可恢复。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await notesApi.deleteNote(noteId);
              setShowDeleteSuccess(true);
              onUpdate?.();
            } catch (e: any) {
              toast.error('删除失败');
            }
          },
        },
      ],
    );
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!note) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <SettingsItem
            icon={<ChevronLeftIcon size={22} color={colors.text} />}
            title="笔记详情"
            showChevron={false}
            onPress={onBack}
          />
        </View>
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>笔记不存在或已被删除</Text>
          <Pressable style={[styles.backBtn, { backgroundColor: colors.primary }]} onPress={onBack}>
            <Text style={[styles.backBtnText, { color: colors.primaryForeground }]}>返回列表</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (editing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => { setEditing(false); setEditTitle(note.title); setEditContent(note.content || ''); }}>
            <ChevronLeftIcon size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>编辑笔记</Text>
          <Pressable onPress={handleSave}>
            <CheckIcon size={22} color={colors.primary} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.editContent}>
          <TextInput
            style={[styles.titleInput, { color: colors.text }]}
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="标题"
            placeholderTextColor={colors.textTertiary}
            autoFocus
          />
          <TextInput
            style={[styles.contentInput, { color: colors.text }]}
            value={editContent}
            onChangeText={setEditContent}
            placeholder="开始写点什么..."
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={onBack} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <ChevronLeftIcon size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable style={styles.headerAction} onPress={() => setEditing(true)}>
          <EditIcon size={20} color={colors.primary} />
        </Pressable>
        <Pressable style={styles.headerAction} onPress={handleDelete}>
          <TrashIcon size={20} color={colors.error} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 标题 */}
        <Text style={[styles.noteTitle, { color: colors.text }]}>{note.title}</Text>

        {/* 元信息 */}
        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            创建于 {formatTime(note.created_at)}
          </Text>
          {note.updated_at !== note.created_at && (
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              更新于 {formatTime(note.updated_at)}
            </Text>
          )}
        </View>

        {/* 标签 */}
        {note.tags.length > 0 && (
          <View style={styles.tagsRow}>
            <TagIcon size={14} color={colors.textTertiary} />
            <View style={styles.tagsList}>
              {note.tags.map((tag, i) => (
                <View key={i} style={[styles.tag, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 来源 */}
        {note.source_url && (
          <View style={[styles.sourceRow, { backgroundColor: colors.backgroundSecondary }]}>
            <GlobeIcon size={16} color={colors.textTertiary} />
            <Text style={[styles.sourceText, { color: colors.textSecondary }]} numberOfLines={1}>
              {note.source_url}
            </Text>
          </View>
        )}

        {/* 内容 */}
        {note.content ? (
          <View style={[styles.contentSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.contentText, { color: colors.text }]}>{note.content}</Text>
          </View>
        ) : (
          <View style={styles.noContent}>
            <Text style={[styles.noContentText, { color: colors.textTertiary }]}>暂无内容</Text>
          </View>
        )}
      </ScrollView>

      {/* 删除成功提示 */}
      {showDeleteSuccess && (
        <View style={styles.deleteSuccessOverlay}>
          <View style={[styles.deleteSuccessBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>笔记已删除</Text>
            <Pressable style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={onBack}>
              <Text style={[styles.modalBtnText, { color: colors.primaryForeground }]}>返回列表</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerAction: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  content: {
    padding: spacing.lg,
  },
  noteTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.md,
    lineHeight: 30,
  },
  metaRow: {
    marginBottom: spacing.md,
  },
  metaText: {
    fontSize: 12,
    marginBottom: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  sourceText: {
    fontSize: 13,
    flex: 1,
  },
  contentSection: {
    borderTopWidth: 1,
    paddingTop: spacing.lg,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 24,
  },
  noContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noContentText: {
    fontSize: 14,
  },
  editContent: {
    padding: spacing.lg,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.md,
    minHeight: 40,
  },
  contentInput: {
    fontSize: 15,
    lineHeight: 24,
    minHeight: 300,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  backBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  deleteSuccessOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  deleteSuccessBox: {
    borderRadius: 16,
    padding: spacing.xl,
    width: '80%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  modalBtn: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default NoteDetailScreen;
