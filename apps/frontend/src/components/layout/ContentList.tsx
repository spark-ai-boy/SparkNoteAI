// 内容列表组件 - 中间栏

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { Fragment } from '../../mock';
import { Tag } from '../../api/note';
import { SearchIcon } from '../../components/icons';
import {
  MessageSquareIcon,
  FileTextIcon,
  MonitorIcon,
  PlayCircleIcon,
  BookIcon,
  GlobeIcon,
  FileIcon,
} from '../../components/icons';

interface ContentListProps {
  title: string;
  items: Fragment[];
  selectedItem?: string;
  onSelectItem: (item: Fragment) => void;
  onSearch?: (query: string) => void;
  onCreateNew?: () => void;
  searchQuery?: string;
  activeTag?: string | null;
  onClearTag?: () => void;
  createButtonText?: string;
  tags?: Tag[];
  showPlatformFilter?: boolean;
  selectedPlatform?: string;
  onPlatformChange?: (platform: string) => void;
}

// 按日期分组
interface DateGroup {
  date: string;
  dateLabel: string;
  items: Fragment[];
}

const groupByDate = (items: Fragment[]): DateGroup[] => {
  const groups: Map<string, DateGroup> = new Map();

  items.forEach((item) => {
    const date = new Date(item.created_at);
    const dateKey = date.toISOString().split('T')[0];
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateLabel: string;
    if (date.toDateString() === today.toDateString()) {
      dateLabel = '今天';
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateLabel = '昨天';
    } else {
      dateLabel = date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
    }

    if (!groups.has(dateKey)) {
      groups.set(dateKey, { date: dateKey, dateLabel, items: [] });
    }
    groups.get(dateKey)!.items.push(item);
  });

  return Array.from(groups.values()).sort((a, b) => b.date.localeCompare(a.date));
};

export const ContentList: React.FC<ContentListProps> = ({
  title,
  items,
  selectedItem,
  onSelectItem,
  onSearch,
  onCreateNew,
  searchQuery,
  activeTag,
  onClearTag,
  createButtonText = '+ 导入',
  tags = [],
  showPlatformFilter = false,
  selectedPlatform = 'all',
  onPlatformChange,
}) => {
  const colors = useWebTheme();
  const isDark = colors.background === '#0a0a0a' || colors.background === '#171717';
  const [searchFocused, setSearchFocused] = useState(false);
  const groupedItems = groupByDate(items);

  // 平台标识配置
  const PLATFORM_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    wechat: { icon: <MessageSquareIcon size={12} strokeWidth={2} />, color: '#07C160', label: '公众号' },
    xiaohongshu: { icon: <FileTextIcon size={12} strokeWidth={2} />, color: '#FF2442', label: '小红书' },
    bilibili: { icon: <MonitorIcon size={12} strokeWidth={2} />, color: '#00A1D6', label: 'B 站' },
    youtube: { icon: <PlayCircleIcon size={12} strokeWidth={2} />, color: '#FF0000', label: 'YouTube' },
    zhihu: { icon: <BookIcon size={12} strokeWidth={2} />, color: '#0084FF', label: '知乎' },
    other: { icon: <GlobeIcon size={12} strokeWidth={2} />, color: '#666666', label: '其他' },
    original: { icon: null, color: '', label: '' },
    web: { icon: null, color: '', label: '' },
  };

  const getPlatformInfo = (platform: string) => {
    return PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.other;
  };

  // 平台选项（用于筛选）
  const platformOptions = [
    { key: 'all', label: '全部', hasBrandColor: false, getIcon: null as ((selected: boolean) => React.ReactNode) | null },
    { key: 'wechat', label: '公众号', hasBrandColor: true, brandColor: '#07C160', getIcon: (selected: boolean) => <MessageSquareIcon size={14} strokeWidth={2} color={selected ? '#fff' : '#07C160'} /> },
    { key: 'xiaohongshu', label: '小红书', hasBrandColor: true, brandColor: '#FF2442', getIcon: (selected: boolean) => <FileTextIcon size={14} strokeWidth={2} color={selected ? '#fff' : '#FF2442'} /> },
    { key: 'other', label: '其他', hasBrandColor: true, brandColor: '#666666', getIcon: (selected: boolean) => <FileIcon size={14} strokeWidth={2} color={selected ? '#fff' : '#666666'} /> },
  ];

  const getTagColor = (tagName: string): string => {
    const tag = tags.find(t => t.name === tagName);
    return tag?.color || colors.mutedForeground;
  };

  const renderDateGroup = ({ item: group }: { item: DateGroup }) => {
    // 根据平台筛选
    const filteredItems = selectedPlatform === 'all'
      ? group.items
      : group.items.filter(item => item.platform === selectedPlatform);

    if (filteredItems.length === 0) {
      return (
        <View style={styles.dateGroup}>
          <Text style={[styles.dateGroupTitle, { color: colors.textSecondary === '#737373' && (colors.background === '#0a0a0a' || colors.background === '#171717') ? '#a3a3a3' : colors.textSecondary }]}>{group.dateLabel}</Text>
          <View style={[styles.emptyItem, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.emptyItemText, { color: colors.textSecondary === '#737373' && (colors.background === '#0a0a0a' || colors.background === '#171717') ? '#a3a3a3' : colors.textSecondary }]}>暂无内容</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.dateGroup}>
        <Text style={[styles.dateGroupTitle, { color: colors.textSecondary === '#737373' && (colors.background === '#0a0a0a' || colors.background === '#171717') ? '#a3a3a3' : colors.textSecondary }]}>{group.dateLabel}</Text>
        {filteredItems.map((fragment) => {
          const platformInfo = getPlatformInfo(fragment.platform || '');
          const hasPlatform = platformInfo.icon && platformInfo.label;

          return (
          <TouchableOpacity
            key={fragment.id}
            style={[
              styles.itemCard,
              selectedItem === fragment.id
                ? { ...styles.itemCardActive, backgroundColor: isDark ? '#2a2a2a' : '#ebebeb' }
                : {
                    backgroundColor: isDark ? colors.secondary : '#ffffff',
                    borderColor: isDark ? colors.border + '30' : 'rgba(0,0,0,0.06)',
                    borderWidth: 1,
                    ...(Platform.OS === 'web' && !isDark && {
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
                    } as any),
                  },
            ]}
            onPress={() => onSelectItem(fragment)}
          >
            <View style={styles.itemCardContent}>
              <View style={styles.itemLeft}>
                {hasPlatform && (
                  <View style={[styles.platformBadge, { backgroundColor: selectedItem === fragment.id ? (isDark ? 'rgba(255,255,255,0.1)' : platformInfo.color + '20') : platformInfo.color + '15' }]}>
                    <View style={styles.platformIcon}>{React.cloneElement(platformInfo.icon as React.ReactElement, { color: selectedItem === fragment.id ? (isDark ? '#f0f0f0' : platformInfo.color) : platformInfo.color })}</View>
                    <Text style={[styles.platformLabel, { color: selectedItem === fragment.id ? (isDark ? '#f0f0f0' : platformInfo.color) : platformInfo.color }]}>{platformInfo.label}</Text>
                  </View>
                )}
                <Text style={[styles.itemTitle, { color: colors.text }, selectedItem === fragment.id && { color: isDark ? '#f0f0f0' : '#171717' }]} numberOfLines={1}>{fragment.title}</Text>
                {fragment.summary && (
                  <Text
                    style={[
                      styles.itemSummary,
                      { color: selectedItem === fragment.id ? (isDark ? '#b0b0b0' : '#525252') : colors.textSecondary },
                    ]}
                    numberOfLines={2}
                  >
                    {fragment.summary}
                  </Text>
                )}
                {fragment.tags && fragment.tags.length > 0 && (
                  <View style={styles.tagRow}>
                    {fragment.tags.slice(0, 2).map((tag) => {
                      const tagColor = getTagColor(tag);
                      return (
                        <View key={tag} style={[styles.tagBadge, { backgroundColor: tagColor + '20' }]}>
                          <Text style={[styles.tagText, { color: tagColor }]}>#{tag}</Text>
                        </View>
                      );
                    })}
                    {fragment.tags.length > 2 && (
                      <Text style={[styles.tagMore, { color: colors.textTertiary }]}>+{fragment.tags.length - 2}</Text>
                    )}
                  </View>
                )}
              </View>
              <Text style={[styles.itemTime, { color: colors.textSecondary === '#737373' && (colors.background === '#0a0a0a' || colors.background === '#171717') ? '#a3a3a3' : colors.textSecondary }, selectedItem === fragment.id && { color: isDark ? '#b0b0b0' : '#525252' }]}>{new Date(fragment.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            {selectedItem === fragment.id && (
              <View style={[styles.activeIndicator, { backgroundColor: isDark ? '#888' : colors.primary }]} />
            )}
          </TouchableOpacity>
        );
      })}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderRightColor: colors.border }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text === '#171717' && (colors.background === '#0a0a0a' || colors.background === '#171717') ? '#fafafa' : colors.text }]}>{title}</Text>
        <View style={styles.headerActions}>
          {onSearch && (
            <View style={[
              styles.searchContainer,
              { backgroundColor: colors.background, borderColor: colors.border },
              Platform.OS === 'web' && {
                boxShadow: searchFocused
                  ? `0px 4px 16px ${colors.primary}20`
                  : `0px 1px 8px rgba(0,0,0,0.05)`,
              },
              Platform.OS !== 'web' && { shadowColor: colors.primary },
            ]}>
              <View style={styles.searchLeft}>
                <SearchIcon size={18} strokeWidth={2} color={colors.textSecondary} />
              </View>
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="搜索..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={onSearch}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
            </View>
          )}

          {onCreateNew && (
            <TouchableOpacity style={[styles.createButton, { backgroundColor: colors.primary }]} onPress={onCreateNew}>
              <Text style={[styles.createButtonText, { color: colors.cta }]}>{createButtonText}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 活跃标签过滤 */}
        {activeTag && onClearTag && (() => {
          const tagColor = getTagColor(activeTag);
          return (
            <View style={styles.activeTagFilterRow}>
              <Text style={[styles.activeTagFilterText, { color: colors.textSecondary }]}>当前标签：</Text>
              <TouchableOpacity
                style={[styles.activeTagBadge, { backgroundColor: tagColor + '20' }]}
                onPress={onClearTag}
                activeOpacity={0.7}
              >
                <Text style={[styles.activeTagBadgeText, { color: tagColor }]}>#{activeTag}</Text>
                <Text style={[styles.activeTagClose, { color: tagColor }]}>×</Text>
              </TouchableOpacity>
            </View>
          );
        })()}
      </View>

      {/* 平台筛选选项卡 */}
      {showPlatformFilter && (
        <View style={[styles.platformFilterContainer, { borderBottomColor: colors.border }]}>
          {platformOptions.map((platform) => {
            const isSelected = selectedPlatform === platform.key;
            let bgColor: string;
            let textColor: string;

            if (isSelected) {
              if (platform.hasBrandColor) {
                bgColor = platform.brandColor!;
              } else {
                bgColor = isDark ? '#3a3a3a' : '#555555';
              }
              textColor = '#ffffff';
            } else {
              bgColor = colors.secondary;
              textColor = colors.text;
            }

            return (
              <TouchableOpacity
                key={platform.key}
                style={[
                  styles.platformFilterCard,
                  { backgroundColor: bgColor },
                  isSelected && { ...styles.platformFilterCardSelected },
                ]}
                onPress={() => onPlatformChange?.(platform.key)}
              >
                {platform.getIcon ? <View style={styles.platformFilterIcon}>{platform.getIcon(isSelected)}</View> : null}
                <Text
                  style={[
                    styles.platformFilterLabel,
                    { color: textColor },
                    isSelected && styles.platformFilterLabelSelected,
                  ]}
                >
                  {platform.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <FlatList
        data={groupedItems}
        renderItem={renderDateGroup}
        keyExtractor={(group) => group.date}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 360,
    height: '100%',
    borderRightWidth: 1,
  },
  header: {
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    height: 44,
    paddingHorizontal: 12,
  },
  searchLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    height: '100%',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    height: '100%',
    outlineStyle: 'none',
  },
  createButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  platformFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
    paddingLeft: spacing.md,
  },
  platformFilterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    borderWidth: 0,
    height: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  platformFilterCardSelected: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  platformFilterIcon: {
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformFilterLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  platformFilterLabelSelected: {
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.sm,
    paddingBottom: spacing.xl,
  },
  dateGroup: {
    marginBottom: spacing.md,
  },
  dateGroupTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  emptyItem: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyItemText: {
    fontSize: 13,
  },
  itemCard: {
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.xs,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  itemCardActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  itemCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLeft: {
    flex: 1,
    gap: spacing.xs,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemSummary: {
    fontSize: 12,
    lineHeight: 18,
  },
  itemTime: {
    fontSize: 11,
    flexShrink: 0,
    marginLeft: spacing.sm,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  platformIcon: {
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  tagMore: {
    fontSize: 10,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: spacing.md,
    bottom: spacing.md,
    width: 3,
    borderRadius: 2,
  },
  activeTagFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  activeTagFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  activeTagFilterText: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
  },
  activeTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeTagBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeTagClose: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 2,
    lineHeight: 14,
  },
});

export default ContentList;
