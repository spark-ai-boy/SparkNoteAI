// 设置列表组件 - 中部栏

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { UserIcon, PaletteIcon, BellIcon, SparklesIcon, LockIcon, DatabaseIcon, InfoIcon, SettingsIcon, BookIcon, NetworkIcon, ImageIcon, ServerIcon, ChevronRightIcon } from '../icons';
import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';

// 设置分类配置
export interface SettingsCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  type?: 'feature_config' | 'page';
}

// 设置分组配置
export interface SettingsGroup {
  id: string;
  label: string;
  categories: SettingsCategory[];
}

// 获取设置分组定义的函数（使用动态颜色）
export const getSettingsGroups = (iconColor: string): SettingsGroup[] => [
  {
    id: 'user_info',
    label: '用户信息',
    categories: [
      {
        id: 'account',
        label: '账号设置',
        icon: <UserIcon size={24} color={iconColor} />,
        description: '个人资料、密码修改',
        type: 'page',
      },
      {
        id: 'privacy',
        label: '隐私与安全',
        icon: <LockIcon size={24} color={iconColor} />,
        description: '会话管理、登录设备',
        type: 'page',
      },
    ],
  },
  {
    id: 'basic',
    label: '基础设置',
    categories: [
      {
        id: 'server',
        label: '服务器配置',
        icon: <ServerIcon size={24} color={iconColor} />,
        description: '查看当前服务器信息和版本',
        type: 'page',
      },
      {
        id: 'appearance',
        label: '界面设置',
        icon: <PaletteIcon size={24} color={iconColor} />,
        description: '主题、语言设置',
        type: 'page',
      },
      {
        id: 'notification',
        label: '通知设置',
        icon: <BellIcon size={24} color={iconColor} />,
        description: '任务完成、导入进度通知',
        type: 'page',
      },
      {
        id: 'llm',
        label: '大模型配置',
        icon: <SettingsIcon size={24} color={iconColor} />,
        description: '配置 AI 大模型 Provider 和 API Key',
        type: 'page',
      },
      {
        id: 'image_storage',
        label: '图片存储',
        icon: <ImageIcon size={24} color={iconColor} />,
        description: '配置导入图片的存储方式（本地/图床）',
        type: 'page',
      },
      {
        id: 'data',
        label: '数据管理',
        icon: <DatabaseIcon size={24} color={iconColor} />,
        description: '数据导出、备份',
        type: 'page',
      },
    ],
  },
  {
    id: 'feature',
    label: '场景设置',
    categories: [
      {
        id: 'notes',
        label: '笔记管理',
        icon: <BookIcon size={24} color={iconColor} />,
        description: '内容总结、标签提取、图片存储配置',
        type: 'feature_config',
      },
      {
        id: 'knowledge_graph',
        label: '知识图谱',
        icon: <NetworkIcon size={24} color={iconColor} />,
        description: '知识图谱构建和 AI 配置',
        type: 'feature_config',
      },
      {
        id: 'ai_assistant',
        label: 'AI 助手',
        icon: <SparklesIcon size={24} color={iconColor} />,
        description: 'AI 助手聊天设置',
        type: 'feature_config',
      },
    ],
  },
  {
    id: 'system',
    label: '系统信息',
    categories: [
      {
        id: 'about',
        label: '关于',
        icon: <InfoIcon size={24} color={iconColor} />,
        description: '应用版本、帮助反馈',
        type: 'page',
      },
    ],
  },
];

// 导出所有分类（用于查找）- 使用默认颜色
export const SETTINGS_CATEGORIES: SettingsCategory[] = getSettingsGroups('#737373').flatMap(g => g.categories);

interface SettingsViewProps {
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
}

// 渲染单个设置项
const CategoryCard: React.FC<{
  category: SettingsCategory;
  isSelected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useWebTheme>;
}> = ({ category, isSelected, onPress, colors }) => (
  <TouchableOpacity
    style={[
      styles.categoryCard,
      { backgroundColor: colors.card, borderColor: colors.border },
      isSelected && { ...styles.categoryCardActive, backgroundColor: colors.backgroundSecondary, borderColor: colors.primary + '30' },
    ]}
    onPress={onPress}
  >
    {isSelected && <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />}
    <View style={styles.categoryLeft}>
      <View style={styles.categoryIconContainer}>{category.icon}</View>
      <View style={styles.categoryTextContainer}>
        <Text style={[styles.categoryLabel, { color: colors.text }]}>
          {category.label}
        </Text>
        <Text style={[styles.categoryDescription, { color: colors.textSecondary }]} numberOfLines={1}>
          {category.description}
        </Text>
      </View>
    </View>
    <ChevronRightIcon size={20} color={colors.textSecondary} />
  </TouchableOpacity>
);

// 渲染分组
const SettingsGroupSection: React.FC<{
  group: SettingsGroup;
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
  colors: ReturnType<typeof useWebTheme>;
}> = ({ group, selectedCategory, onCategorySelect, colors }) => (
  <View style={[styles.groupSection, { marginBottom: spacing.lg }]}>
    <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
      {group.label}
    </Text>
    <View style={[styles.groupContent, { gap: spacing.sm }]}>
      {group.categories.map((category) => (
        <CategoryCard
          key={category.id}
          category={category}
          isSelected={selectedCategory === category.id}
          onPress={() => onCategorySelect(category.id)}
          colors={colors}
        />
      ))}
    </View>
  </View>
);

export const SettingsView: React.FC<SettingsViewProps> = ({
  selectedCategory,
  onCategorySelect,
}) => {
  const colors = useWebTheme();
  const settingsGroups = getSettingsGroups(colors.textSecondary);

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary, borderRightColor: colors.border }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <SettingsIcon size={24} color={colors.text} style={styles.titleIcon} />
          <Text style={[styles.title, { color: colors.text }]}>设置</Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>管理你的个人配置和偏好设置</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {settingsGroups.map((group) => (
          <SettingsGroupSection
            key={group.id}
            group={group}
            selectedCategory={selectedCategory}
            onCategorySelect={onCategorySelect}
            colors={colors}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 320,
    height: '100%',
    borderRightWidth: 1,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  titleIcon: {
    marginRight: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
  },
  content: {
    padding: spacing.sm,
  },
  groupSection: {
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  groupContent: {
  },
  categoryCard: {
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryCardActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 12,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: spacing.md,
    bottom: spacing.md,
    width: 3,
    borderRadius: 2,
  },
});

export default SettingsView;
