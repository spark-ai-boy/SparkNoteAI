// 笔记详情页（手机端）— 支持 Markdown 预览/编辑

import React, { useEffect, useState, useRef, useMemo, useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { useToastStore } from '../../stores/toastStore';
import { useServerConfigStore } from '../../stores/serverConfigStore';
import { transformMarkdownImages } from '../../utils/imageUrlTransform';
import { notesApi, type Note, type Tag } from '../../api/note';
import {
  ChevronLeftIcon,
  EditIcon,
  TrashIcon,
  CheckIcon,
  CloseIcon,
  GlobeIcon,
  ClockIcon,
  MessageSquareIcon,
  FileTextIcon,
  BoldIcon,
  ItalicIcon,
  HeadingIcon,
  CodeIcon,
  ListIcon,
  ListOrderedIcon,
  LinkIcon,
} from '../../components/icons';
import Markdown from 'react-native-marked';

type NoteDetailNavProp = NativeStackNavigationProp<{
  NotesHome: undefined;
  NoteDetail: { noteId: number };
  AIAgent: undefined;
  KnowledgeGraph: undefined;
  Settings: undefined;
  Tasks: undefined;
}, 'NoteDetail'>;

type ViewMode = 'preview' | 'edit';

const PLATFORM_MAP: Record<string, { label: string; color: string; Icon: React.FC<{ size: number; color: string }> }> = {
  wechat: { label: '公众号', color: '#07C160', Icon: MessageSquareIcon },
  xiaohongshu: { label: '小红书', color: '#FF2442', Icon: FileTextIcon },
  bilibili: { label: 'B站', color: '#FB7299', Icon: FileTextIcon },
  youtube: { label: 'YouTube', color: '#FF0000', Icon: GlobeIcon },
};

export const NoteDetailScreen: React.FC = () => {
  const navigation = useNavigation<NoteDetailNavProp>();
  const route = useRoute<any>();
  const { noteId } = route.params as { noteId: number };
  const colors = useTheme();
  const { baseUrl } = useServerConfigStore();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>('preview');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const textInputRef = useRef<TextInput>(null);
  const [cursorPosition, setCursorPosition] = useState({ start: 0, end: 0 });
  const saveRef = useRef<() => Promise<void>>(null);

  // 设置原生 header 右侧按钮
  useLayoutEffect(() => {
    if (!note) return;
    if (mode === 'edit') {
      navigation.setOptions({
        headerRight: () => (
          <Pressable onPress={() => saveRef.current?.()} style={{ paddingHorizontal: 8, padding: 4 }}>
            <CheckIcon size={20} color={colors.primary} />
          </Pressable>
        ),
      });
    } else {
      navigation.setOptions({
        headerRight: () => (
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <Pressable onPress={() => setMode('edit')} style={{ padding: 4 }}>
              <EditIcon size={20} color={colors.primary} />
            </Pressable>
            <Pressable onPress={handleDelete} style={{ padding: 4 }}>
              <TrashIcon size={20} color={colors.error} />
            </Pressable>
          </View>
        ),
      });
    }
    navigation.setOptions({ title: mode === 'edit' ? '编辑' : note.title });
  }, [note, mode, colors.primary, colors.textSecondary, colors.error]);

  useEffect(() => {
    fetchNote();
    fetchTags();
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

  const fetchTags = async () => {
    try {
      const res = await notesApi.getTags();
      setTags(res);
    } catch {
      // 不影响主流程
    }
  };

  const getTagColor = (tagName: string): string => {
    const tag = tags.find((t) => t.name === tagName);
    return tag?.color || colors.primary;
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
      useToastStore.getState().showSuccess('已保存');
    } catch {
      useToastStore.getState().showError('保存失败');
    }
  };

  // 保持 ref 始终指向最新的 handleSave
  saveRef.current = handleSave;

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
              navigation.goBack();
            } catch {
              useToastStore.getState().showError('删除失败');
            }
          },
        },
      ],
    );
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const formatTime = (iso: string): string => {
    try {
      return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Markdown 工具栏插入语法
  const insertMarkdown = useCallback((prefix: string, suffix: string = '', placeholder: string = '') => {
    const input = textInputRef.current;
    if (!input) return;
    input.focus();
    const start = cursorPosition.start;
    const end = cursorPosition.end;
    const selectedText = editContent.slice(start, end);
    const text = selectedText || placeholder;
    const before = editContent.slice(0, start);
    const after = editContent.slice(end);
    const newContent = before + prefix + text + suffix + after;
    setEditContent(newContent);
    // 延迟设置光标位置
    setTimeout(() => {
      if (selectedText) {
        input.setSelection?.(start + prefix.length, start + prefix.length + selectedText.length);
      } else {
        input.setSelection?.(start + prefix.length, start + prefix.length + placeholder.length);
      }
    }, 50);
  }, [editContent, cursorPosition]);

  const toolbarItems = [
    { icon: HeadingIcon, prefix: '## ', placeholder: '标题', key: 'heading' },
    { icon: BoldIcon, prefix: '**', suffix: '**', placeholder: '粗体', key: 'bold' },
    { icon: ItalicIcon, prefix: '*', suffix: '*', placeholder: '斜体', key: 'italic' },
    { icon: CodeIcon, prefix: '`', suffix: '`', placeholder: '代码', key: 'code' },
    { icon: ListIcon, prefix: '- ', placeholder: '列表项', key: 'list' },
    { icon: ListOrderedIcon, prefix: '1. ', placeholder: '列表项', key: 'olist' },
    { icon: LinkIcon, prefix: '[', suffix: '](url)', placeholder: '链接文字', key: 'link' },
  ];

  // Markdown 样式
  const markdownStyles = useMemo(() => ({
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: colors.border,
      paddingLeft: spacing.md,
      paddingVertical: spacing.xs,
      backgroundColor: colors.backgroundSecondary,
      marginVertical: spacing.sm,
      borderRadius: 8,
    },
    codespan: {
      backgroundColor: colors.backgroundSecondary,
      color: colors.primary,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: 4,
      fontSize: 14,
    },
    code: {
      backgroundColor: colors.backgroundSecondary,
      padding: spacing.md,
      borderRadius: 12,
      marginVertical: spacing.sm,
    },
    link: {
      color: colors.blue,
    },
    hr: {
      borderColor: colors.border,
      marginVertical: spacing.lg,
    },
    paragraph: {
      marginVertical: spacing.xs,
      lineHeight: 24,
    },
    h1: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '700',
      marginTop: spacing.xl,
      marginBottom: spacing.md,
    },
    h2: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
      marginTop: spacing.xl,
      marginBottom: spacing.md,
    },
    h3: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    table: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: 'hidden',
      marginVertical: spacing.md,
    },
    tableRow: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    list: {
      marginVertical: spacing.sm,
    },
    listItem: {
      marginVertical: spacing.xs,
      lineHeight: 22,
    },
  }), [colors.text, colors.primary, colors.border, colors.backgroundSecondary, colors.blue]);

  const platformInfo = note ? PLATFORM_MAP[note.platform || ''] : null;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!note) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>笔记不存在或已被删除</Text>
          <Pressable style={[styles.backBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.goBack()}>
            <Text style={[styles.backBtnText, { color: colors.primaryForeground }]}>返回列表</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {mode === 'edit' ? (
        // ========== 编辑模式 ==========
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.editContent} keyboardShouldPersistTaps="handled">
            <TextInput
              ref={textInputRef}
              style={[styles.titleInput, { color: colors.text }]}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="标题"
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
            {/* Markdown 工具栏 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolbar}>
              {toolbarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.toolbarBtn, { borderColor: colors.border }]}
                    onPress={() => insertMarkdown(item.prefix, item.suffix, item.placeholder)}
                    activeOpacity={0.6}
                  >
                    <Icon size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TextInput
              style={[styles.contentInput, { color: colors.text }]}
              value={editContent}
              onChangeText={setEditContent}
              placeholder="开始写 Markdown..."
              placeholderTextColor={colors.textTertiary}
              multiline
              textAlignVertical="top"
              onSelectionChange={(e) => setCursorPosition({ start: e.nativeEvent.selection.start, end: e.nativeEvent.selection.end })}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        // ========== 预览模式 ==========
        <ScrollView contentContainerStyle={styles.previewContent}>
          {/* 标题 */}
          <Text style={[styles.noteTitle, { color: colors.text }]}>{note.title}</Text>

          {/* 统一内容卡片：元信息 + Markdown */}
          <View style={[styles.contentCard, { backgroundColor: colors.backgroundSecondary }]}>
            {platformInfo && (
              <View style={[styles.platformBadge, { backgroundColor: platformInfo.color + '18' }]}>
                <platformInfo.Icon size={14} color={platformInfo.color} />
                <Text style={[styles.platformLabel, { color: platformInfo.color }]}>{platformInfo.label}</Text>
              </View>
            )}

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <ClockIcon size={14} color={colors.textTertiary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {formatDate(note.created_at)}
                </Text>
              </View>
              {note.updated_at !== note.created_at && (
                <View style={[styles.metaItem, styles.metaItemUpdated]}>
                  <ClockIcon size={14} color={colors.textTertiary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {formatDate(note.updated_at)}
                  </Text>
                </View>
              )}
            </View>

            {/* 标签 */}
            {note.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {note.tags.map((tag, i) => {
                  const tagColor = getTagColor(tag);
                  return (
                    <View key={i} style={[styles.tag, { backgroundColor: tagColor + '18' }]}>
                      <View style={[styles.tagDot, { backgroundColor: tagColor }]} />
                      <Text style={[styles.tagText, { color: tagColor }]}>{tag}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Markdown 内容 */}
            {note.content ? (
              <Markdown
                value={transformMarkdownImages(note.content, baseUrl)}
                styles={markdownStyles as any}
                flatListProps={{
                  scrollEnabled: false,
                }}
              />
            ) : (
              <View style={styles.noContent}>
                <Text style={[styles.noContentText, { color: colors.textTertiary }]}>暂无内容</Text>
              </View>
            )}
          </View>

          {/* 来源链接 */}
          {note.source_url && (
            <View style={[styles.sourceRow, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
              <GlobeIcon size={16} color={colors.blue} />
              <Text style={[styles.sourceText, { color: colors.blue }]} numberOfLines={1}>
                {note.source_url}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  // 预览模式
  previewContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  noteTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: spacing.lg,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  contentCard: {
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  platformLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaRow: {
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaItemUpdated: {
    opacity: 0.7,
  },
  metaText: {
    fontSize: 13,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 0.5,
    marginBottom: spacing.lg,
  },
  sourceText: {
    fontSize: 13,
    flex: 1,
  },
  noContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  noContentText: {
    fontSize: 14,
  },
  // 编辑模式
  editContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.md,
    minHeight: 40,
  },
  toolbar: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 0.5,
    gap: spacing.xs,
  },
  toolbarBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
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
    borderRadius: 12,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default NoteDetailScreen;
