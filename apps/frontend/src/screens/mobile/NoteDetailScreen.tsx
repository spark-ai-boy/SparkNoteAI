// 笔记详情页（手机端）— 支持 Markdown 预览/编辑

import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { useToastStore } from '../../stores/toastStore';
import { notesApi, type Note } from '../../api/note';
import {
  ChevronLeftIcon,
  EditIcon,
  TrashIcon,
  CheckIcon,
  CloseIcon,
  GlobeIcon,
  TagIcon,
} from '../../components/icons';
import Markdown from 'react-native-marked';

interface NoteDetailScreenProps {
  noteId: number;
  onBack: () => void;
  onUpdate?: () => void;
}

type ViewMode = 'preview' | 'edit';

export const NoteDetailScreen: React.FC<NoteDetailScreenProps> = ({ noteId, onBack, onUpdate }) => {
  const colors = useTheme();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>('preview');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const textInputRef = useRef<TextInput>(null);

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
    } catch {
      useToastStore.getState().showError('获取笔记详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editTitle.trim()) {
      useToastStore.getState().showError('标题不能为空');
      return;
    }
    try {
      const updated = await notesApi.updateNote(noteId, {
        title: editTitle.trim(),
        content: editContent,
      });
      setNote(updated);
      setMode('preview');
      onUpdate?.();
      useToastStore.getState().showSuccess('已保存');
    } catch {
      useToastStore.getState().showError('保存失败');
    }
  };

  const handleCancelEdit = () => {
    setMode('preview');
    setEditTitle(note?.title || '');
    setEditContent(note?.content || '');
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
            } catch {
              useToastStore.getState().showError('删除失败');
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

  // Markdown 样式
  const markdownStyles = useMemo(() => ({
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: colors.border,
      paddingLeft: spacing.md,
      paddingVertical: spacing.xs,
      backgroundColor: colors.backgroundSecondary,
      marginVertical: spacing.sm,
      borderRadius: 4,
    },
    codespan: {
      backgroundColor: colors.backgroundSecondary,
      color: colors.primary,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: 3,
    },
    code: {
      backgroundColor: colors.backgroundSecondary,
      padding: spacing.md,
      borderRadius: 8,
      marginVertical: spacing.sm,
    },
    link: {
      color: colors.primary,
    },
    hr: {
      borderColor: colors.border,
      marginVertical: spacing.md,
    },
    paragraph: {
      marginVertical: spacing.xs,
    },
    h1: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '700',
      marginTop: spacing.lg,
      marginBottom: spacing.md,
    },
    h2: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    h3: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    table: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      overflow: 'hidden',
      marginVertical: spacing.sm,
    },
    tableRow: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
  }), [colors.text, colors.primary, colors.border, colors.backgroundSecondary]);

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
          <Pressable onPress={onBack}>
            <ChevronLeftIcon size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>笔记详情</Text>
          <View />
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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={mode === 'edit' ? handleCancelEdit : onBack} style={styles.headerBtn}>
            {mode === 'edit' ? <CloseIcon size={20} color={colors.textSecondary} /> : <ChevronLeftIcon size={22} color={colors.text} />}
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {mode === 'edit' ? '编辑' : '笔记详情'}
          </Text>
          {mode === 'edit' ? (
            <Pressable onPress={handleSave} style={styles.headerBtn}>
              <CheckIcon size={20} color={colors.primary} />
            </Pressable>
          ) : (
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <Pressable onPress={() => setMode('edit')} style={styles.headerBtn}>
                <EditIcon size={20} color={colors.primary} />
              </Pressable>
              <Pressable onPress={handleDelete} style={styles.headerBtn}>
                <TrashIcon size={20} color={colors.error} />
              </Pressable>
            </View>
          )}
        </View>

        {mode === 'edit' ? (
          // ========== 编辑模式 ==========
          <ScrollView contentContainerStyle={styles.editContent}>
            <TextInput
              ref={textInputRef}
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
              placeholder="开始写 Markdown..."
              placeholderTextColor={colors.textTertiary}
              multiline
              textAlignVertical="top"
            />
          </ScrollView>
        ) : (
          // ========== 预览模式 ==========
          <ScrollView contentContainerStyle={styles.previewContent}>
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

            {/* Markdown 内容 */}
            {note.content ? (
              <View style={[styles.contentSection, { borderTopColor: colors.border }]}>
                <Markdown
                  value={note.content}
                  styles={markdownStyles as any}
                  flatListProps={{
                    scrollEnabled: false,
                  }}
                />
              </View>
            ) : (
              <View style={styles.noContent}>
                <Text style={[styles.noContentText, { color: colors.textTertiary }]}>暂无内容</Text>
              </View>
            )}
          </ScrollView>
        )}

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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  headerBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  // 预览模式
  previewContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
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
  noContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noContentText: {
    fontSize: 14,
  },
  // 编辑模式
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
  // 通用
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
