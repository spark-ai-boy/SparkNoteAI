// 笔记编辑器组件 - 基于 md-editor-rt（React 版本）

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { spacing } from '../theme';
import { useWebTheme } from '../hooks/useWebTheme';
import { Note } from '../../api/note';
import { useNoteStore } from '../stores/noteStore';
import { Tag } from '../../api/note';
import { useServerConfigStore } from '../stores/serverConfigStore';
import { uploadImage } from '../api/imageStorage';
import { transformImageUrl, transformMarkdownImages } from '../utils/imageUrlTransform';

// Web 端导入 markdown 编辑器
import { MdEditor, MdPreview } from 'md-editor-rt';
import 'md-editor-rt/lib/style.css';

interface NoteEditorProps {
  note?: Note | null;
  onSave: (note: { title: string; content: string; tag_ids: number[] }) => void;
  onCancel: () => void;
  onEdit?: () => void;
  isLoading?: boolean;
  isViewMode?: boolean;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  onSave,
  onCancel,
  onEdit,
  isLoading = false,
  isViewMode = true,
}) => {
  const colors = useWebTheme();
  const { tags, fetchTags } = useNoteStore();
  const { baseUrl } = useServerConfigStore();
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '# Hello Markdown\n');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [isEditing, setIsEditing] = useState(!isViewMode);
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  const [tagInputText, setTagInputText] = useState('');
  const tagInputRef = useRef<TextInput>(null);
  const isDark = colors.background === '#0a0a0a' || colors.background === '#171717';

  // 加载标签
  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    if (note) {
      const initialContent = note.content || '# Hello Markdown\n';
      setTitle(note.title);
      setContent(initialContent);
      setIsEditing(!isViewMode);
      if (note.tag_ids && note.tag_ids.length > 0) {
        setSelectedTags(note.tag_ids);
      }
    }
  }, [note, isViewMode]);

  // 创建标签
  const handleCreateTag = async (name: string) => {
    const defaultColors = [
      '#4F46E5', '#10B981', '#F59E0B', '#EF4444',
      '#EC4899', '#8B5CF6', '#06B6D4', '#84CC16',
    ];
    const color = defaultColors[Math.floor(Math.random() * defaultColors.length)];
    try {
      const newTag = await useNoteStore.getState().createTag({ name, color });
      if (newTag) {
        setSelectedTags((prev) => [...prev, newTag.id]);
      }
      setTagInputText('');
      tagInputRef.current?.focus();
    } catch (error) {
      console.error('创建标签失败:', error);
    }
  };

  // 标签输入回车处理
  const handleTagInputKeyPress = async (e: any) => {
    if (e.nativeEvent?.key === 'Enter' && tagInputText.trim()) {
      const name = tagInputText.trim();
      // 先检查是否已存在
      const existingTag = tags?.find(
        (tag) => tag.name.toLowerCase() === name.toLowerCase()
      );
      if (existingTag) {
        if (!selectedTags.includes(existingTag.id)) {
          setSelectedTags((prev) => [...prev, existingTag.id]);
        }
        setTagInputText('');
      } else {
        await handleCreateTag(name);
      }
    }
  };

  const handleSave = () => {
    onSave({
      title: title || '无标题',
      content,
      tag_ids: selectedTags,
    });
  };

  const handleEditClick = () => {
    setIsEditing(true);
    onEdit?.();
  };

  // 编辑器变更回调
  const handleContentChange = useCallback((val: string) => {
    // 仅还原开发模式下添加的后端 base URL 前缀（针对本地存储图片）
    // 第三方图床的完整 URL 不会被影响
    const devBasePattern = new RegExp(
      `(https?:\\/\\/(?:localhost|127\\.0\\.0\\.1)[:0-9]*)?(\\/uploads[^\\s\\)]+)`,
      'gi'
    );
    const reverted = val.replace(
      /(\!\[.*?\]\()https?:\/\/(?:localhost|127\.0\.0\.1):\d+(\/uploads[^\s)]+)(\))/g,
      '$1$2$3'
    ).replace(
      /(<img[^>]+src=")https?:\/\/(?:localhost|127\.0\.0\.1):\d+(\/uploads[^"]+)(")/g,
      '$1$2$3'
    );
    setContent(reverted);
  }, []);

  // 预处理内容中的图片路径（开发模式下 transformImgUrl 可能不生效）
  const editorContent = useMemo(() => transformMarkdownImages(content, baseUrl), [content, baseUrl]);

  // 图片上传回调（供 md-editor-rt 的 "上传图片" 和 "剪裁上传" 使用）
  const handleImageUpload = useCallback(async (files: File[], callback: (urls: string[]) => void) => {
    try {
      const urls = await uploadImage(files);
      // 转换相对路径为完整 URL（上传返回 /uploads/...，需要补全）
      const transformedUrls = urls.map(url => transformImageUrl(url, baseUrl));
      callback(transformedUrls);
    } catch (error) {
      console.error('图片上传失败:', error);
      callback([]);
    }
  }, [baseUrl]);

  // Web 端 - 使用 md-editor-rt
  if (Platform.OS === 'web') {
    const textColor = isDark ? '#e5e5e5' : '#171717';
    const mutedColor = isDark ? '#737373' : '#a3a3a3';
    const borderColor = colors.border;
    const primaryColor = colors.primary;

    return (
      <View style={styles.container}>
        {/* 编辑器头部 - 标题输入 */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TextInput
            style={[styles.titleInput, { color: textColor }]}
            placeholder="无标题笔记"
            placeholderTextColor={mutedColor}
            value={title}
            onChangeText={setTitle}
            multiline={false}
            returnKeyType="next"
          />
        </View>

        {/* Markdown 编辑器 */}
        <View style={styles.mdEditorWrapper}>
          {isEditing ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* 全局样式注入 */}
              <style>{`
                .md-editor {
                  border: none !important;
                  border-radius: 0 !important;
                  flex: 1 !important;
                  display: flex !important;
                  flex-direction: column !important;
                  background: ${isDark ? '#0a0a0a' : '#ffffff'} !important;
                }
                .md-editor-toolbar {
                  background: ${isDark ? '#0a0a0a' : '#ffffff'} !important;
                  border-bottom: none !important;
                }
                .md-editor-toolbar-wrapper {
                  background: ${isDark ? '#0a0a0a' : '#ffffff'} !important;
                }
                .md-editor-toolbar svg {
                  fill: ${textColor} !important;
                  color: ${textColor} !important;
                }
                .md-editor-content {
                  flex: 1 !important;
                  min-height: 0 !important;
                  background: ${isDark ? '#0a0a0a' : '#ffffff'} !important;
                }
                .md-editor-content textarea {
                  color: ${textColor} !important;
                  caret-color: ${textColor} !important;
                  font-size: 15px !important;
                  line-height: 1.7 !important;
                  padding: 20px 24px !important;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                  background: transparent !important;
                }
                .md-editor-content textarea::placeholder {
                  color: ${mutedColor} !important;
                }
                .md-editor-preview {
                  background: ${isDark ? '#0a0a0a' : '#ffffff'} !important;
                  border-left: 1px solid ${borderColor} !important;
                  padding: 20px 24px !important;
                  color: ${textColor} !important;
                  overflow: auto !important;
                }
                .md-editor-preview h1 {
                  font-size: 32px !important;
                  font-weight: 800 !important;
                  color: ${textColor} !important;
                  margin: 40px 0 16px 0 !important;
                  padding-bottom: 12px !important;
                  border-bottom: 2px solid ${borderColor} !important;
                  letter-spacing: -0.5px !important;
                  line-height: 1.3 !important;
                }
                .md-editor-preview h2 {
                  font-size: 26px !important;
                  font-weight: 700 !important;
                  color: ${textColor} !important;
                  margin: 32px 0 12px 0 !important;
                  letter-spacing: -0.3px !important;
                  line-height: 1.3 !important;
                }
                .md-editor-preview h3 {
                  font-size: 22px !important;
                  font-weight: 600 !important;
                  color: ${textColor} !important;
                  margin: 24px 0 10px 0 !important;
                  line-height: 1.4 !important;
                }
                .md-editor-preview h4 {
                  font-size: 18px !important;
                  font-weight: 600 !important;
                  color: ${textColor} !important;
                  margin: 20px 0 10px 0 !important;
                }
                .md-editor-preview h5 {
                  font-size: 16px !important;
                  font-weight: 600 !important;
                  color: ${textColor} !important;
                  margin: 16px 0 8px 0 !important;
                }
                .md-editor-preview h6 {
                  font-size: 14px !important;
                  font-weight: 600 !important;
                  color: ${mutedColor} !important;
                  margin: 16px 0 8px 0 !important;
                }
                .md-editor-preview p {
                  font-size: 16px !important;
                  line-height: 1.8 !important;
                  color: ${textColor} !important;
                  margin: 0 0 20px 0 !important;
                }
                .md-editor-preview code {
                  background: ${isDark ? '#262626' : '#f5f5f5'} !important;
                  color: ${isDark ? '#fca5a5' : '#dc2626'} !important;
                  padding: 2px 8px !important;
                  border-radius: 4px !important;
                  font-size: 14px !important;
                  font-family: "Menlo", "Monaco", "Consolas", monospace !important;
                }
                /* ===== 代码块样式 ===== */
                .md-editor-preview .md-editor-code {
                  background: #1e293b !important;
                  border-radius: 12px !important;
                  margin: 16px 0 !important;
                  overflow: hidden !important;
                }
                /* 顶部栏：语言标签 + 复制按钮 */
                .md-editor-preview .md-editor-code .md-editor-code-head {
                  background: #334155 !important;
                  border-start-start-radius: 12px !important;
                  border-start-end-radius: 12px !important;
                  border-end-start-radius: 0 !important;
                  border-end-end-radius: 0 !important;
                  border-bottom: 1px solid #475569 !important;
                  padding: 0 16px !important;
                }
                .md-editor-preview .md-editor-code[open] .md-editor-code-head {
                  border-end-start-radius: 0 !important;
                  border-end-end-radius: 0 !important;
                }
                .md-editor-preview .md-editor-code .md-editor-code-lang {
                  line-height: 32px !important;
                  color: #94a3b8 !important;
                }
                /* 代码内容区 */
                .md-editor-preview .md-editor-code pre {
                  background: #1e293b !important;
                  margin: 0 !important;
                }
                .md-editor-preview .md-editor-code pre code {
                  background: transparent !important;
                  color: #e2e8f0 !important;
                  font-size: 14px !important;
                  line-height: 1.7 !important;
                  border-end-start-radius: 12px !important;
                  border-end-end-radius: 12px !important;
                }
                /* 行号容器 */
                .md-editor-preview .md-editor-code pre code span[rn-wrapper] {
                  position: absolute !important;
                  left: 0 !important;
                  top: 11px !important;
                  width: 40px !important;
                  text-align: right !important;
                  color: #64748b !important;
                  font-size: 12px !important;
                  line-height: 1.7 !important;
                  padding-right: 12px !important;
                  border-right: 1px solid #334155 !important;
                  background: transparent !important;
                  user-select: none !important;
                }
                /* 代码文本缩进，给行号留空间 */
                .md-editor-preview .md-editor-code pre code .md-editor-code-block {
                  padding-left: 20px !important;
                  padding-right: 20px !important;
                }
                .md-editor-preview blockquote {
                  border-left: 3px solid ${primaryColor} !important;
                  background: ${isDark ? '#171717' : '#fafafa'} !important;
                  padding: 12px 20px !important;
                  margin: 16px 0 !important;
                  color: ${mutedColor} !important;
                  font-style: italic !important;
                  border-radius: 0 8px 8px 0 !important;
                }
                .md-editor-preview a {
                  color: ${isDark ? '#60a5fa' : '#2563eb'} !important;
                  text-decoration: underline !important;
                  text-underline-offset: 2px !important;
                }
                .md-editor-preview ul, .md-editor-preview ol {
                  padding-left: 24px !important;
                  margin: 12px 0 !important;
                }
                .md-editor-preview li {
                  font-size: 16px !important;
                  line-height: 1.8 !important;
                  color: ${textColor} !important;
                  margin-bottom: 6px !important;
                }
                .md-editor-preview hr {
                  border: none !important;
                  border-top: 1px solid ${borderColor} !important;
                  margin: 32px 0 !important;
                }
                .md-editor-preview table {
                  border-collapse: collapse !important;
                  width: 100% !important;
                  margin: 16px 0 !important;
                  border-radius: 8px !important;
                  overflow: hidden !important;
                }
                .md-editor-preview th, .md-editor-preview td {
                  border: 1px solid ${borderColor} !important;
                  padding: 10px 14px !important;
                  font-size: 14px !important;
                }
                .md-editor-preview th {
                  background: ${isDark ? '#262626' : '#f5f5f5'} !important;
                  font-weight: 600 !important;
                  color: ${textColor} !important;
                }
                .md-editor-preview td {
                  color: ${textColor} !important;
                }
                .md-editor-preview img {
                  max-width: 100% !important;
                  border-radius: 8px !important;
                  margin: 16px 0 !important;
                }
                .md-editor-preview strong {
                  font-weight: 700 !important;
                  color: ${textColor} !important;
                }
                .md-editor-preview em {
                  font-style: italic !important;
                  color: ${textColor} !important;
                }
                .md-editor-preview del {
                  text-decoration: line-through !important;
                  color: ${mutedColor} !important;
                }
                /* 工具栏按钮 hover 样式 */
                .md-editor-toolbar-item:hover {
                  background: ${isDark ? '#262626' : '#f5f5f5'} !important;
                }
                /* 隐藏库自带的底部栏（字数统计+同步滚动），使用自定义工具栏 */
                .md-editor-footer {
                  display: none !important;
                }
              `}</style>
              <MdEditor
                value={editorContent}
                onChange={handleContentChange}
                onUploadImg={handleImageUpload}
                theme={isDark ? 'dark' : 'light'}
                language="zh-CN"
                transformImgUrl={(src: string) => transformImageUrl(src, baseUrl)}
                pageFullscreen={false}
                preview={true}
                htmlPreview={false}
                toolbars={[
                  'bold',
                  'underline',
                  'italic',
                  'strikeThrough',
                  '-',
                  'title',
                  'sub',
                  'sup',
                  'quote',
                  'unorderedList',
                  'orderedList',
                  '-',
                  'codeRow',
                  'code',
                  'link',
                  'image',
                  'table',
                  'mermaid',
                  'katex',
                  '-',
                  'revoke',
                  'next',
                  '-',
                  'catalog',
                ]}
                noHighlight
                showCodeRowNumber
                style={{ flex: 1 }}
                onHtmlChanged={(html: string) => {
                  // 如果需要处理 HTML 输出
                }}
              />
            </div>
          ) : (
            /* 仅预览模式 - 使用 MdPreview */
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <style>{`
                .md-editor-preview-wrapper {
                  background: ${isDark ? '#0a0a0a' : '#ffffff'} !important;
                  padding: 32px 24px !important;
                  max-width: 800px;
                  margin: 0 auto;
                  width: 100%;
                  overflow: auto;
                  height: 100%;
                }
                .md-editor-preview h1 {
                  font-size: 32px !important;
                  font-weight: 800 !important;
                  color: ${textColor} !important;
                  margin: 40px 0 16px 0 !important;
                  padding-bottom: 12px !important;
                  border-bottom: 2px solid ${borderColor} !important;
                  letter-spacing: -0.5px !important;
                  line-height: 1.3 !important;
                }
                .md-editor-preview h2 {
                  font-size: 26px !important;
                  font-weight: 700 !important;
                  color: ${textColor} !important;
                  margin: 32px 0 12px 0 !important;
                  letter-spacing: -0.3px !important;
                  line-height: 1.3 !important;
                }
                .md-editor-preview h3 {
                  font-size: 22px !important;
                  font-weight: 600 !important;
                  color: ${textColor} !important;
                  margin: 24px 0 10px 0 !important;
                  line-height: 1.4 !important;
                }
                .md-editor-preview h4 {
                  font-size: 18px !important;
                  font-weight: 600 !important;
                  color: ${textColor} !important;
                  margin: 20px 0 10px 0 !important;
                }
                .md-editor-preview h5 {
                  font-size: 16px !important;
                  font-weight: 600 !important;
                  color: ${textColor} !important;
                  margin: 16px 0 8px 0 !important;
                }
                .md-editor-preview h6 {
                  font-size: 14px !important;
                  font-weight: 600 !important;
                  color: ${mutedColor} !important;
                  margin: 16px 0 8px 0 !important;
                }
                .md-editor-preview p {
                  font-size: 16px !important;
                  line-height: 1.8 !important;
                  color: ${textColor} !important;
                  margin: 0 0 20px 0 !important;
                }
                .md-editor-preview code {
                  background: ${isDark ? '#262626' : '#f5f5f5'} !important;
                  color: ${isDark ? '#fca5a5' : '#dc2626'} !important;
                  padding: 2px 8px !important;
                  border-radius: 4px !important;
                  font-size: 14px !important;
                  font-family: "Menlo", "Monaco", "Consolas", monospace !important;
                }
                /* ===== 代码块样式 ===== */
                .md-editor-preview .md-editor-code {
                  background: #1e293b !important;
                  border-radius: 12px !important;
                  margin: 16px 0 !important;
                  overflow: hidden !important;
                }
                /* 顶部栏：语言标签 + 复制按钮 */
                .md-editor-preview .md-editor-code .md-editor-code-head {
                  background: #334155 !important;
                  border-start-start-radius: 12px !important;
                  border-start-end-radius: 12px !important;
                  border-end-start-radius: 0 !important;
                  border-end-end-radius: 0 !important;
                  border-bottom: 1px solid #475569 !important;
                  padding: 0 16px !important;
                }
                .md-editor-preview .md-editor-code[open] .md-editor-code-head {
                  border-end-start-radius: 0 !important;
                  border-end-end-radius: 0 !important;
                }
                .md-editor-preview .md-editor-code .md-editor-code-lang {
                  line-height: 32px !important;
                  color: #94a3b8 !important;
                }
                /* 代码内容区 */
                .md-editor-preview .md-editor-code pre {
                  background: #1e293b !important;
                  margin: 0 !important;
                }
                .md-editor-preview .md-editor-code pre code {
                  background: transparent !important;
                  color: #e2e8f0 !important;
                  font-size: 14px !important;
                  line-height: 1.7 !important;
                  border-end-start-radius: 12px !important;
                  border-end-end-radius: 12px !important;
                }
                /* 行号容器 */
                .md-editor-preview .md-editor-code pre code span[rn-wrapper] {
                  position: absolute !important;
                  left: 0 !important;
                  top: 11px !important;
                  width: 40px !important;
                  text-align: right !important;
                  color: #64748b !important;
                  font-size: 12px !important;
                  line-height: 1.7 !important;
                  padding-right: 12px !important;
                  border-right: 1px solid #334155 !important;
                  background: transparent !important;
                  user-select: none !important;
                }
                /* 代码文本缩进，给行号留空间 */
                .md-editor-preview .md-editor-code pre code .md-editor-code-block {
                  padding-left: 52px !important;
                  padding-right: 20px !important;
                }
                .md-editor-preview blockquote {
                  border-left: 3px solid ${primaryColor} !important;
                  background: ${isDark ? '#171717' : '#fafafa'} !important;
                  padding: 12px 20px !important;
                  margin: 16px 0 !important;
                  color: ${mutedColor} !important;
                  font-style: italic !important;
                  border-radius: 0 8px 8px 0 !important;
                }
                .md-editor-preview a {
                  color: ${isDark ? '#60a5fa' : '#2563eb'} !important;
                  text-decoration: underline !important;
                  text-underline-offset: 2px !important;
                }
                .md-editor-preview ul, .md-editor-preview ol {
                  padding-left: 24px !important;
                  margin: 12px 0 !important;
                }
                .md-editor-preview li {
                  font-size: 16px !important;
                  line-height: 1.8 !important;
                  color: ${textColor} !important;
                  margin-bottom: 6px !important;
                }
                .md-editor-preview hr {
                  border: none !important;
                  border-top: 1px solid ${borderColor} !important;
                  margin: 32px 0 !important;
                }
                .md-editor-preview table {
                  border-collapse: collapse !important;
                  width: 100% !important;
                  margin: 16px 0 !important;
                  border-radius: 8px !important;
                  overflow: hidden !important;
                }
                .md-editor-preview th, .md-editor-preview td {
                  border: 1px solid ${borderColor} !important;
                  padding: 10px 14px !important;
                  font-size: 14px !important;
                }
                .md-editor-preview th {
                  background: ${isDark ? '#262626' : '#f5f5f5'} !important;
                  font-weight: 600 !important;
                  color: ${textColor} !important;
                }
                .md-editor-preview td {
                  color: ${textColor} !important;
                }
                .md-editor-preview img {
                  max-width: 100% !important;
                  border-radius: 8px !important;
                  margin: 16px 0 !important;
                }
                .md-editor-preview strong {
                  font-weight: 700 !important;
                  color: ${textColor} !important;
                }
                .md-editor-preview em {
                  font-style: italic !important;
                  color: ${textColor} !important;
                }
                .md-editor-preview del {
                  text-decoration: line-through !important;
                  color: ${mutedColor} !important;
                }
              `}</style>
              <MdPreview
                value={editorContent}
                theme={isDark ? 'dark' : 'light'}
                language="zh-CN"
                showCodeRowNumber
                noHighlight
                style={{ flex: 1 }}
              />
            </div>
          )}
        </View>

        {/* 底部工具栏 */}
        <View style={[styles.toolbar, { borderTopColor: borderColor }]}>
          <View style={styles.toolbarLeft}>
            <Text style={[styles.wordCount, { color: mutedColor }]}>
              {content.length} 字符
            </Text>

            {/* 标签选择器内嵌 */}
            {isEditing && (
              <View style={styles.toolbarTags}>
                {/* 已选标签 pill */}
                {selectedTags.map((tagId) => {
                  const tag = tags?.find(t => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <TouchableOpacity
                      key={tag.id}
                      style={[styles.toolbarTagPill, { backgroundColor: tag.color + '20' }]}
                      onPress={() => setSelectedTags((prev) => prev.filter((id) => id !== tagId))}
                      activeOpacity={0.6}
                    >
                      <View style={[styles.toolbarTagDot, { backgroundColor: tag.color }]} />
                      <Text style={[styles.toolbarTagText, { color: textColor }]}>{tag.name}</Text>
                    </TouchableOpacity>
                  );
                })}
                {/* 添加标签按钮 */}
                <TouchableOpacity
                  style={[styles.addTagButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => setIsTagPickerOpen(!isTagPickerOpen)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.addTagText, { color: colors.textSecondary }]}>
                    {selectedTags.length === 0 ? '+ 添加标签' : '+'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 预览模式下显示已选标签 */}
            {!isEditing && selectedTags.length > 0 && (
              <View style={styles.toolbarTags}>
                {selectedTags.map((tagId) => {
                  const tag = tags?.find(t => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <View
                      key={tag.id}
                      style={[styles.toolbarTagPill, { backgroundColor: tag.color + '20' }]}
                    >
                      <View style={[styles.toolbarTagDot, { backgroundColor: tag.color }]} />
                      <Text style={[styles.toolbarTagText, { color: textColor }]}>{tag.name}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* 标签下拉选择面板 */}
            {isTagPickerOpen && (
              <View style={styles.tagPickerPanel}>
                <View style={[styles.tagPickerContent, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff', borderColor, shadowColor: isDark ? '#000' : '#000' }]}>
                  <Text style={[styles.tagPickerTitle, { color: mutedColor }]}>选择或创建标签</Text>
                  <View style={styles.tagPickerList}>
                    {tags?.filter(t => !selectedTags.includes(t.id)).map((tag) => (
                      <TouchableOpacity
                        key={tag.id}
                        style={[styles.tagPickerItem, { backgroundColor: tag.color + '15' }]}
                        onPress={() => {
                          setSelectedTags((prev) => [...prev, tag.id]);
                          setIsTagPickerOpen(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.tagPickerItemDot, { backgroundColor: tag.color }]} />
                        <Text style={[styles.tagPickerItemText, { color: textColor }]}>{tag.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {/* 创建标签输入 */}
                  <View style={[styles.tagCreateInput, { backgroundColor: isDark ? '#262626' : '#f5f5f5', borderColor }]}>
                    <TextInput
                      ref={tagInputRef}
                      style={[styles.tagCreateInputText, { color: textColor }]}
                      value={tagInputText}
                      onChangeText={setTagInputText}
                      onKeyPress={handleTagInputKeyPress}
                      placeholder="输入标签名回车创建..."
                      placeholderTextColor={colors.textTertiary}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>
          <View style={styles.toolbarRight}>
            {isEditing ? (
              <>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: borderColor }]}
                  onPress={onCancel}
                >
                  <Text style={[styles.cancelButtonText, { color: mutedColor }]}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: textColor }]}
                  onPress={handleSave}
                  disabled={isLoading}
                >
                  <Text style={[styles.saveButtonText, { color: colors.background }]}>
                    {isLoading ? '保存中...' : '保存'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: textColor }]}
                onPress={handleEditClick}
              >
                <Text style={[styles.editButtonText, { color: colors.background }]}>编辑</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  // 移动端
  return (
    <View style={styles.container}>
      <View style={styles.mobileNotSupported}>
        <Text style={styles.notSupportedIcon}>📝</Text>
        <Text style={styles.notSupportedTitle}>Markdown 编辑器</Text>
        <Text style={styles.notSupportedText}>请在 Web 浏览器中使用完整的 Markdown 编辑器</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 0,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    padding: 0,
    letterSpacing: -0.3,
  },
  mdEditorWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  // 底部工具栏
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    minHeight: 48,
    flexWrap: 'wrap',
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    flexWrap: 'wrap',
  },
  toolbarTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  toolbarTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
    gap: 4,
  },
  toolbarTagDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  toolbarTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  addTagButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
  },
  addTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // 标签选择面板
  tagPickerPanel: {
    position: 'absolute',
    bottom: 48,
    left: 8,
    zIndex: 100,
  },
  tagPickerContent: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 240,
    maxWidth: 360,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  tagPickerTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  tagPickerList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    maxHeight: 200,
  },
  tagPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagPickerItemDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 4,
  },
  tagPickerItemText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tagPickerEmpty: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  tagCreateInput: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagCreateInputText: {
    fontSize: 12,
  },
  toolbarRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  wordCount: {
    fontSize: 12,
  },
  // 按钮样式
  cancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  editButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // 移动端提示
  mobileNotSupported: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  notSupportedIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  notSupportedTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  notSupportedText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default NoteEditor;
