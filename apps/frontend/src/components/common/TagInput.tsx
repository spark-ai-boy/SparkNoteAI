// 标签输入组件 - 可折叠版本

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { Tag } from '../../api/note';
import { ChevronDownIcon } from '../icons';

// 启用 LayoutAnimation（仅 Web）
if (Platform.OS === 'web' && (UIManager as any).setLayoutAnimationEnabledExperimental) {
  (UIManager as any).setLayoutAnimationEnabledExperimental(true);
}

interface TagInputProps {
  tags: Tag[];
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
  onCreateTag: (name: string, color: string) => Promise<Tag>;
  placeholder?: string;
  disabled?: boolean;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  selectedTagIds,
  onChange,
  onCreateTag,
  placeholder = '输入标签后按回车...',
  disabled = false,
}) => {
  const colors = useWebTheme();
  const isDark = colors.background === '#0a0a0a' || colors.background === '#171717';
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const defaultColors = [
    '#4F46E5', '#10B981', '#F59E0B', '#EF4444',
    '#EC4899', '#8B5CF6', '#06B6D4', '#84CC16',
    '#F43F5E', '#14B8A6', '#8B5CF6', '#F97316',
  ];

  // 展开/折叠切换
  const toggleExpand = () => {
    LayoutAnimation.configureNext({
      duration: 250,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.spring,
        springDamping: 0.7,
      },
    });
    setIsExpanded(!isExpanded);
  };

  const headerBg = isExpanded
    ? (isDark ? '#171717' : '#fafafa')
    : 'transparent';

  // 处理回车创建标签
  const handleKeyPress = async (e: any) => {
    if (e.nativeEvent.key === 'Enter' && inputValue.trim()) {
      const newTagName = inputValue.trim();

      const existingTag = tags.find(
        (tag) => tag.name.toLowerCase() === newTagName.toLowerCase()
      );

      if (existingTag) {
        if (!selectedTagIds.includes(existingTag.id)) {
          onChange([...selectedTagIds, existingTag.id]);
        }
        setInputValue('');
      } else {
        const randomColor = defaultColors[Math.floor(Math.random() * defaultColors.length)];
        try {
          const newTag = await onCreateTag(newTagName, randomColor);
          onChange([...selectedTagIds, newTag.id]);
          setInputValue('');
          if (!isExpanded) {
            toggleExpand();
          }
        } catch (error: any) {
          console.error('创建标签失败:', error);
          if (error.response?.status === 400) {
            const existingTag = tags.find((tag) => tag.name.toLowerCase() === newTagName.toLowerCase());
            if (existingTag && !selectedTagIds.includes(existingTag.id)) {
              onChange([...selectedTagIds, existingTag.id]);
            }
            setInputValue('');
          }
          throw error;
        }
      }
      inputRef.current?.blur();
    }
  };

  const removeTag = (tagId: number) => {
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  const selectTag = (tagId: number) => {
    if (!selectedTagIds.includes(tagId)) {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const selectedTags = selectedTagIds
    .map((id) => tags.find((tag) => tag.id === id))
    .filter((tag): tag is Tag => tag !== undefined);

  const availableTags = tags
    .filter((tag) => !selectedTagIds.includes(tag.id) && tag.user_id !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <View style={styles.container}>
      {/* 标题行 - 始终显示 */}
      <TouchableOpacity
        style={[
          styles.header,
          { backgroundColor: headerBg },
        ]}
        onPress={toggleExpand}
        disabled={disabled}
        activeOpacity={disabled ? 1 : 0.6}
      >
        <View style={styles.headerLeft}>
          <Text style={[styles.headerLabel, { color: colors.text }]}>标签</Text>
          {selectedTags.length > 0 && (
            <Text style={[styles.countBadge, { color: colors.textSecondary }]}>
              {selectedTags.length}
            </Text>
          )}
        </View>
        <ChevronDownIcon
          size={14}
          strokeWidth={2}
          color={colors.textTertiary}
          style={[styles.expandIcon, isExpanded && styles.expandIconRotated]}
        />
      </TouchableOpacity>

      {/* 展开的内容区域 */}
      {isExpanded && !disabled && (
        <View style={styles.expandedContent}>
          {/* 已选标签 */}
          {selectedTags.length > 0 && (
            <View style={styles.selectedTagsRow}>
              {selectedTags.map((tag) => (
                <TouchableOpacity
                  key={tag.id}
                  style={[styles.tagPill, { backgroundColor: tag.color + '15' }]}
                  onPress={() => removeTag(tag.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                  <Text style={[styles.tagPillText, { color: colors.text }]} numberOfLines={1}>{tag.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 输入框 */}
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.text, backgroundColor: isDark ? '#171717' : '#fafafa' }]}
            value={inputValue}
            onChangeText={setInputValue}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* 现有标签 */}
          {availableTags.length > 0 && (
            <View style={styles.availableTagsContainer}>
              <Text style={[styles.availableTagsLabel, { color: colors.textTertiary }]}>现有标签</Text>
              <View style={styles.availableTagsList}>
                {availableTags.map((tag) => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[styles.availableTag, { backgroundColor: tag.color + '15' }]}
                    onPress={() => selectTag(tag.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.availableTagDot, { backgroundColor: tag.color }]} />
                    <Text style={[styles.availableTagName, { color: colors.text }]} numberOfLines={1}>{tag.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* 预览模式下的已选标签 */}
      {disabled && selectedTags.length > 0 && (
        <View style={styles.previewTags}>
          {selectedTags.map((tag) => (
            <View key={tag.id} style={[styles.previewTag, { backgroundColor: tag.color + '20' }]}>
              <View style={[styles.previewTagDot, { backgroundColor: tag.color }]} />
              <Text style={[styles.previewTagText, { color: colors.text }]}>{tag.name}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  countBadge: {
    fontSize: 11,
    fontWeight: '500',
  },
  expandIcon: {
    transform: [{ rotate: '0deg' }],
  },
  expandIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  expandedContent: {
    paddingTop: 4,
  },
  selectedTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 6,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 80,
  },
  input: {
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  hint: {
    fontSize: 11,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  availableTagsContainer: {
    paddingTop: spacing.xs,
  },
  availableTagsLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  availableTagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  availableTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  availableTagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  availableTagName: {
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 100,
  },
  previewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  previewTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 6,
  },
  previewTagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  previewTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default TagInput;
