// 内容详情组件 - 右侧栏

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Platform,
} from 'react-native';
import { FileTextIcon, FileIcon, LinkIcon, CalendarIcon, EditIcon, TrashIcon, SaveIcon, PinIcon, TagIcon } from '../../../components/icons';
import { spacing } from '../../../theme';
import { useWebTheme } from '../../../hooks/useWebTheme';
import { useServerConfigStore } from '../../../stores/serverConfigStore';
import { Fragment } from '../../../mock';
import { Note, Tag } from '../../../api/note';

// Web 端导入 MdPreview
import { MdPreview } from 'md-editor-rt';
import 'md-editor-rt/lib/style.css';

import { transformImageUrl, transformMarkdownImages } from '../../../utils/imageUrlTransform';

// 联合类型，支持 Fragment 和 Note
type ContentItem = Fragment | Note;

interface ContentDetailProps {
  fragment?: Fragment;
  note?: Note;
  isEditing?: boolean;
  onTitleChange?: (title: string) => void;
  onContentChange?: (content: string) => void;
  onEdit?: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  tags?: Tag[]; // 标签列表（用于显示颜色）
}

export const ContentDetail: React.FC<ContentDetailProps> = ({
  fragment,
  note,
  isEditing = false,
  onTitleChange,
  onContentChange,
  onEdit,
  onSave,
  onDelete,
  tags = [],
}) => {
  const colors = useWebTheme();
  const { baseUrl } = useServerConfigStore();
  const isDark = colors.background === '#0a0a0a' || colors.background === '#171717';

  // 优先使用 note，否则使用 fragment
  const contentItem: ContentItem | undefined = note || fragment;
  const [localTitle, setLocalTitle] = useState(contentItem?.title || '');
  const [localContent, setLocalContent] = useState(contentItem?.content || '');

  // 预处理 markdown 中的图片路径（开发模式下 transformImgUrl 可能不生效）
  const processedContent = useMemo(() => {
    const content = isEditing ? localContent : (contentItem?.content || '');
    return transformMarkdownImages(content, baseUrl);
  }, [isEditing, localContent, contentItem?.content, baseUrl]);

  // 获取标签颜色的辅助函数
  const getTagColor = (tagName: string): string => {
    const tag = tags.find(t => t.name === tagName);
    return tag?.color || '#666666';
  };

  if (!contentItem) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyIconContainer, { backgroundColor: colors.backgroundSecondary }]}>
          <FileTextIcon size={64} color={colors.textSecondary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>选择或创建一篇笔记</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          从左侧列表选择笔记，或点击「新建」创建新内容
        </Text>
      </View>
    );
  }

  const handleOpenLink = () => {
    if ('source_url' in contentItem && contentItem.source_url) {
      Linking.openURL(contentItem.source_url);
    }
  };

  // 判断是否是 Note 类型
  const isNote = 'user_id' in contentItem;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 头部 */}
      {Platform.OS === 'web' ? (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' } as any}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.typeBadge, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={[styles.typeIconContainer, { backgroundColor: colors.border }]}>
                  {isNote ? (
                    <FileTextIcon size={12} color={colors.textSecondary} />
                  ) : (
                    <FileIcon size={12} color={colors.textSecondary} />
                  )}
                </View>
                <Text style={[styles.typeText, { color: colors.textSecondary }]}>
                  {isNote ? '原创笔记' : '导入内容'}
                </Text>
              </View>

              {isEditing ? (
                <TextInput
                  style={styles.titleInput}
                  value={localTitle}
                  onChangeText={(text) => {
                    setLocalTitle(text);
                    onTitleChange?.(text);
                  }}
                  placeholder="标题"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              ) : (
                <>
                  <Text style={[styles.title, { color: colors.text }]}>{contentItem.title}</Text>
                  {'source_url' in contentItem && contentItem.source_url && (
                    <TouchableOpacity onPress={handleOpenLink} style={styles.sourceLink}>
                      <View style={styles.sourceLinkContent}>
                        <LinkIcon size={13} color={colors.blue} />
                        <Text style={[styles.sourceLinkText, { color: colors.blue }]}>查看原文</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </>
              )}

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <CalendarIcon size={12} color={colors.textSecondary} />
                  <Text style={[styles.metaItemText, { color: colors.textSecondary }]}>
                    {new Date(contentItem.created_at).toLocaleDateString('zh-CN')}
                  </Text>
                </View>
                {contentItem.updated_at && (
                  <View style={styles.metaItem}>
                    <EditIcon size={12} color={colors.textSecondary} />
                    <Text style={[styles.metaItemText, { color: colors.textSecondary }]}>
                      更新于 {new Date(contentItem.updated_at).toLocaleDateString('zh-CN')}
                    </Text>
                  </View>
                )}
                {'tags' in contentItem && contentItem.tags && contentItem.tags.length > 0 && (
                  <View style={styles.metaTags}>
                    {contentItem.tags.filter(tag => tag && tag.trim()).map((tag: string) => (
                      <View
                        key={tag}
                        style={[
                          styles.metaTag,
                          { backgroundColor: getTagColor(tag) + '20' }, // 20% 透明度
                        ]}
                      >
                        <Text
                          style={[
                            styles.metaTagText,
                            { color: getTagColor(tag) },
                          ]}
                        >
                          #{tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' } as any}>
              {isEditing ? (
                <TouchableOpacity style={styles.saveButton} onPress={onSave}>
                  <SaveIcon size={16} color={colors.background} />
                  <Text style={[styles.saveButtonText, { color: colors.background }]}>保存</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={styles.iconButton} onPress={onEdit}>
                    <EditIcon size={16} color={colors.text} />
                    <Text style={[styles.iconButtonLabel, { color: colors.text }]}>编辑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButtonDanger}
                    onPress={onDelete}
                  >
                    <TrashIcon size={18} color="#dc2626" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </div>
      ) : (
        <View style={[styles.headerWrapper, { borderBottomColor: colors.border }]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.typeBadge, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={[styles.typeIconContainer, { backgroundColor: colors.border }]}>
                  {isNote ? (
                    <FileTextIcon size={12} color={colors.textSecondary} />
                  ) : (
                    <FileIcon size={12} color={colors.textSecondary} />
                  )}
                </View>
                <Text style={[styles.typeText, { color: colors.textSecondary }]}>
                  {isNote ? '原创笔记' : '导入内容'}
                </Text>
              </View>

              {isEditing ? (
                <TextInput
                  style={styles.titleInput}
                  value={localTitle}
                  onChangeText={(text) => {
                    setLocalTitle(text);
                    onTitleChange?.(text);
                  }}
                  placeholder="标题"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              ) : (
                <>
                  <Text style={[styles.title, { color: colors.text }]}>{contentItem.title}</Text>
                  {'source_url' in contentItem && contentItem.source_url && (
                    <TouchableOpacity onPress={handleOpenLink} style={styles.sourceLink}>
                      <View style={styles.sourceLinkContent}>
                        <LinkIcon size={13} color={colors.blue} />
                        <Text style={[styles.sourceLinkText, { color: colors.blue }]}>查看原文</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </>
              )}

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <CalendarIcon size={12} color={colors.textSecondary} />
                  <Text style={[styles.metaItemText, { color: colors.textSecondary }]}>
                    {new Date(contentItem.created_at).toLocaleDateString('zh-CN')}
                  </Text>
                </View>
                {contentItem.updated_at && (
                  <View style={styles.metaItem}>
                    <EditIcon size={12} color={colors.textSecondary} />
                    <Text style={[styles.metaItemText, { color: colors.textSecondary }]}>
                      更新于 {new Date(contentItem.updated_at).toLocaleDateString('zh-CN')}
                    </Text>
                  </View>
                )}
                {'tags' in contentItem && contentItem.tags && contentItem.tags.length > 0 && (
                  <View style={styles.metaTags}>
                    {contentItem.tags.filter(tag => tag && tag.trim()).map((tag: string) => (
                      <View
                        key={tag}
                        style={[
                          styles.metaTag,
                          { backgroundColor: getTagColor(tag) + '20' }, // 20% 透明度
                        ]}
                      >
                        <Text
                          style={[
                            styles.metaTagText,
                            { color: getTagColor(tag) },
                          ]}
                        >
                          #{tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
              {isEditing ? (
                <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={onSave}>
                  <SaveIcon size={16} color={colors.cta} />
                  <Text style={[styles.saveButtonText, { color: colors.cta }]}>保存</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={styles.iconButton} onPress={onEdit}>
                    <EditIcon size={16} color={colors.text} />
                    <Text style={[styles.iconButtonLabel, { color: colors.text }]}>编辑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButtonDanger}
                    onPress={onDelete}
                  >
                    <TrashIcon size={18} color="#dc2626" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      )}

      {/* 内容区域 */}
      <ScrollView style={[styles.contentContainer, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        {/* 摘要 - 仅在有 summary 且不是默认占位符时显示 */}
        {(() => {
          if (!('summary' in contentItem)) return null;
          if (!contentItem.summary) return null;
          if (!contentItem.summary.trim()) return null;
          if (contentItem.summary.length <= 30) return null;
          if (contentItem.summary.includes('笔记内容')) return null;
          if (contentItem.summary.includes('视频内容')) return null;
          const summary = contentItem.summary;
          return (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' } as any}>
              <div style={{
                width: '100%',
                maxWidth: 670,
                padding: '0 24px',
              } as any}>
                <View style={[styles.summaryBox, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                  <View style={styles.summaryTitleContainer}>
                    <PinIcon size={14} color={colors.text} />
                    <Text style={[styles.summaryTitle, { color: colors.text }]}>摘要</Text>
                  </View>
                  <Text style={[styles.summaryContent, { color: colors.text }]}>{summary}</Text>
                </View>
              </div>
            </div>
          );
        })()}

        {isEditing ? (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' } as any}>
            <TextInput
              style={[styles.contentInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, width: '100%', maxWidth: 670, padding: 24 }]}
              value={localContent}
              onChangeText={(text) => {
                setLocalContent(text);
                onContentChange?.(text);
              }}
              placeholder="开始写作..."
              placeholderTextColor={colors.textSecondary}
              multiline
              textAlignVertical="top"
            />
          </div>
        ) : Platform.OS === 'web' ? (
          // Web 端使用 MdPreview 渲染（与编辑模式预览一致）
          <div style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
          } as any}>
            <div style={{
              width: '100%',
              maxWidth: 670,
              padding: '24px 24px 40px 24px',
            } as any}>
              {/* 全局样式注入 */}
              <style>{`
                .md-editor-preview-wrapper {
                  background: ${isDark ? '#0a0a0a' : '#ffffff'} !important;
                  padding: 0 !important;
                  max-width: none !important;
                }
                .md-editor-preview {
                  background: ${isDark ? '#0a0a0a' : '#ffffff'} !important;
                  color: ${isDark ? '#e5e5e5' : '#171717'} !important;
                }
                .md-editor-preview h1 {
                  font-size: 32px !important;
                  font-weight: 800 !important;
                  color: ${isDark ? '#e5e5e5' : '#171717'} !important;
                  margin: 28px 0 12px 0 !important;
                  padding-bottom: 8px !important;
                  border-bottom: 1px solid ${colors.border} !important;
                  letter-spacing: -0.5px !important;
                  line-height: 1.3 !important;
                }
                .md-editor-preview h2 {
                  font-size: 26px !important;
                  font-weight: 700 !important;
                  color: ${isDark ? '#e5e5e5' : '#171717'} !important;
                  margin: 24px 0 10px 0 !important;
                  letter-spacing: -0.3px !important;
                  line-height: 1.3 !important;
                }
                .md-editor-preview h3 {
                  font-size: 22px !important;
                  font-weight: 600 !important;
                  color: ${isDark ? '#e5e5e5' : '#171717'} !important;
                  margin: 20px 0 8px 0 !important;
                  line-height: 1.4 !important;
                }
                .md-editor-preview h4 {
                  font-size: 18px !important;
                  font-weight: 600 !important;
                  color: ${isDark ? '#e5e5e5' : '#171717'} !important;
                  margin: 18px 0 8px 0 !important;
                }
                .md-editor-preview h5 {
                  font-size: 16px !important;
                  font-weight: 600 !important;
                  color: ${isDark ? '#e5e5e5' : '#171717'} !important;
                  margin: 16px 0 6px 0 !important;
                }
                .md-editor-preview h6 {
                  font-size: 14px !important;
                  font-weight: 600 !important;
                  color: ${isDark ? '#a3a3a3' : '#737373'} !important;
                  margin: 14px 0 6px 0 !important;
                }
                .md-editor-preview p {
                  font-size: 16px !important;
                  line-height: 1.7 !important;
                  color: ${isDark ? '#e5e5e5' : '#171717'} !important;
                  margin: 0 0 8px 0 !important;
                }
                .md-editor-preview a {
                  color: ${isDark ? '#60a5fa' : '#2563eb'} !important;
                  text-decoration: underline !important;
                  text-underline-offset: 2px !important;
                }
                .md-editor-preview img {
                  max-width: 100% !important;
                  border-radius: 12px !important;
                  margin: 12px 0 !important;
                }
                /* 行内代码 */
                .md-editor-preview code:not(pre code) {
                  background: ${isDark ? '#262626' : '#f5f5f5'} !important;
                  color: ${isDark ? '#fca5a5' : '#dc2626'} !important;
                  padding: 2px 8px !important;
                  border-radius: 6px !important;
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
                /* 引用 */
                .md-editor-preview blockquote {
                  border-left: 4px solid ${colors.border} !important;
                  background: ${isDark ? '#171717' : '#fafafa'} !important;
                  padding: 14px 20px !important;
                  margin: 14px 0 !important;
                  color: ${isDark ? '#a3a3a3' : '#737373'} !important;
                  font-style: italic !important;
                  border-radius: 0 8px 8px 0 !important;
                }
                /* 列表 */
                .md-editor-preview ul, .md-editor-preview ol {
                  padding-left: 24px !important;
                  margin: 10px 0 !important;
                }
                .md-editor-preview li {
                  font-size: 16px !important;
                  line-height: 1.7 !important;
                  color: ${isDark ? '#e5e5e5' : '#171717'} !important;
                  margin-bottom: 6px !important;
                }
                /* 分割线 */
                .md-editor-preview hr {
                  border: none !important;
                  border-top: 1px solid ${colors.border} !important;
                  margin: 20px 0 !important;
                }
                /* 表格 */
                .md-editor-preview table {
                  border-collapse: collapse !important;
                  width: 100% !important;
                  margin: 14px 0 !important;
                  border-radius: 8px !important;
                  overflow: hidden !important;
                }
                .md-editor-preview th, .md-editor-preview td {
                  border: 1px solid ${colors.border} !important;
                  padding: 12px !important;
                  font-size: 14px !important;
                }
                .md-editor-preview th {
                  background: ${isDark ? '#262626' : '#f5f5f5'} !important;
                  font-weight: 600 !important;
                  color: ${isDark ? '#e5e5e5' : '#171717'} !important;
                }
                .md-editor-preview td {
                  color: ${isDark ? '#e5e5e5' : '#171717'} !important;
                }
                /* 加粗/斜体/删除线 */
                .md-editor-preview strong {
                  font-weight: 700 !important;
                  color: ${isDark ? '#e5e5e5' : '#171717'} !important;
                }
                .md-editor-preview em {
                  font-style: italic !important;
                }
                .md-editor-preview del {
                  text-decoration: line-through !important;
                  color: ${isDark ? '#a3a3a3' : '#737373'} !important;
                }
              `}</style>
              <MdPreview
                value={processedContent}
                theme={isDark ? 'dark' : 'light'}
                language="zh-CN"
                showCodeRowNumber
                noMermaid={false}
                transformImgUrl={(src: string) => transformImageUrl(src, baseUrl)}
              />

              {/* 实体区域 - 放在底部 */}
              {'entities' in contentItem && contentItem.entities && (contentItem as Fragment).entities.length > 0 && (
                <div style={{
                  marginTop: 40,
                  paddingTop: 20,
                  borderTopWidth: 1,
                  borderTopColor: '#e2e8f0',
                } as any}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: colors.textSecondary,
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  } as any}>
                    <TagIcon size={14} color={colors.textSecondary} />
                    <span>实体</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as any}>
                    {(contentItem as Fragment).entities.map((entity) => (
                      <div key={entity} style={{
                        backgroundColor: colors.backgroundSecondary,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 4,
                      } as any}>
                        <div style={{
                          color: colors.text,
                          fontSize: 13,
                        } as any}>{entity}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // 移动端使用简单文本渲染
          <View style={[styles.contentDisplay, { maxWidth: 670, width: '100%', alignSelf: 'center', paddingHorizontal: spacing.lg }]}>
            {contentItem.content.split('\n').map((line, index) => {
              if (line.startsWith('# ')) {
                return <Text key={index} style={styles.h1}>{line.replace('# ', '')}</Text>;
              } else if (line.startsWith('## ')) {
                return <Text key={index} style={styles.h2}>{line.replace('## ', '')}</Text>;
              } else if (line.startsWith('### ')) {
                return <Text key={index} style={styles.h3}>{line.replace('### ', '')}</Text>;
              } else if (line.startsWith('- ') || line.startsWith('* ')) {
                return (
                  <Text key={index} style={styles.listItem}>
                    • {line.substring(2)}
                  </Text>
                );
              } else if (line.startsWith('```')) {
                return null;
              } else if (line.trim()) {
                return <Text key={index} style={styles.paragraph}>{line}</Text>;
              }
              return <View key={index} style={styles.spacer} />;
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIconContainer: {
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  headerWrapper: {
    width: '100%',
    borderBottomWidth: 1,
  },
  header: {
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    maxWidth: 670,
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  typeIconContainer: {
    marginRight: 4,
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xs,
    padding: 0,
    minHeight: 32,
  },
  sourceLink: {
    marginBottom: spacing.sm,
  },
  sourceLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sourceLinkText: {
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaItemText: {
    fontSize: 12,
  },
  metaTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
  },
  metaTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 22,
  },
  metaTagText: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
  // 图标按钮 - 编辑按钮
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    height: 36,
  },
  iconButtonLabel: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
  },
  // 删除按钮
  iconButtonDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  // 保存按钮
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
  },
  summaryBox: {
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  summaryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  summaryContent: {
    fontSize: 14,
    lineHeight: 22,
  },
  contentDisplay: {
    minHeight: 300,
    padding: spacing.lg,
  },
  h1: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  h2: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  h3: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  listItem: {
    fontSize: 15,
    lineHeight: 26,
    marginLeft: spacing.md,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 28,
    marginBottom: spacing.sm,
  },
  spacer: {
    height: spacing.md,
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 28,
    minHeight: 400,
    padding: spacing.lg,
  },
});

export default ContentDetail;
