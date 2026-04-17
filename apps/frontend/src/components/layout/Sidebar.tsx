// 侧边栏组件 - Web 端专用

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Linking,
  Image,
} from 'react-native';
import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { useInterfaceSettingsStore } from '../../stores/interfaceSettingsStore';
import {
  SparklesIcon,
  BookIcon,
  FileIcon,
  DownloadIcon,
  NetworkIcon,
  PlugIcon,
  SettingsIcon,
  LogoIcon,
  UserIcon,
  TaskIcon,
  TrashIcon,
  LogOutIcon,
  SunIcon,
  MoonIcon,
  GlobeIcon,
  FileTextIcon,
} from '../../components/icons';
import { Tag } from '../../api/note';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onTagClick?: (tag: string) => void;
  user?: {
    name: string;
    email: string;
  };
  onSettingsClick?: () => void;
  onLogoutClick?: () => void;
  runningTaskCount?: number;
  tags?: Tag[];
  onDeleteTag?: (tagId: number, tagName: string) => void;
  noteCount?: number;
  importCount?: number;
  allCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, onTagClick, user, onSettingsClick, onLogoutClick, runningTaskCount = 0, tags = [], onDeleteTag, noteCount = 0, importCount = 0, allCount = 0 }) => {
  const [isManagingTags, setIsManagingTags] = useState(false);
  const colors = useWebTheme();
  const theme = useInterfaceSettingsStore((s) => s.theme);
  const setTheme = useInterfaceSettingsStore((s) => s.setTheme);
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (theme === 'system') {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setEffectiveTheme(isDark ? 'dark' : 'light');
      } else {
        setEffectiveTheme('light');
      }
    } else {
      setEffectiveTheme(theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(effectiveTheme === 'dark' ? 'light' : 'dark');
  };

  const navItems: NavItem[] = [
    { id: 'ai', label: 'AI 助手', icon: <SparklesIcon size={18} strokeWidth={2} /> },
    { id: 'graph', label: '知识图谱', icon: <NetworkIcon size={18} strokeWidth={2} /> },
    { id: 'note', label: '笔记', icon: <FileIcon size={18} strokeWidth={2} />, count: noteCount },
    { id: 'import', label: '导入', icon: <DownloadIcon size={18} strokeWidth={2} />, count: importCount },
    { id: 'all', label: '全部知识', icon: <BookIcon size={18} strokeWidth={2} />, count: allCount },
    // { id: 'plugins', label: '插件', icon: <PlugIcon size={18} strokeWidth={2} /> },
    { id: 'tasks', label: '后台任务', icon: <TaskIcon size={18} strokeWidth={2} />, count: runningTaskCount },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderRightColor: colors.border }]}>
      <View style={[styles.logo, { borderBottomColor: colors.borderLight }]}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIconWrapper}>
            <LogoIcon size={22} strokeWidth={2} />
          </View>
          <View style={styles.logoTextContainer}>
            <Text style={[styles.logoText, { color: colors.text }]}>SparkNoteAI</Text>
            <Text style={[styles.logoSubtitle, { color: colors.textSecondary }]}>知语拾光</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.navContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.navSection}>
          {navItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.navItem,
                { backgroundColor: activeTab === item.id ? colors.backgroundSecondary : 'transparent' },
              ]}
              onPress={() => onTabChange(item.id)}
            >
              <View style={styles.navIconWrapper}>
                {item.icon}
              </View>
              <Text
                style={[
                  styles.navLabel,
                  { color: colors.text, fontWeight: activeTab === item.id ? '600' : '500' },
                ]}
              >
                {item.label}
              </Text>
              {item.count !== undefined && item.count !== null && (
                <Text style={[styles.navCount, { color: colors.textSecondary, backgroundColor: colors.backgroundSecondary }]}>{item.count}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

        <View style={styles.tagSection}>
          <View style={styles.tagSectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>标签</Text>
            <TouchableOpacity onPress={() => setIsManagingTags(!isManagingTags)}>
              <Text style={[styles.manageTagsButton, { color: colors.primary }]}>
                {isManagingTags ? '完成' : '管理'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tagScrollContainer}>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.tagScrollView}>
              {tags.length > 0 ? (
                tags.map((tag) => (
                  <View
                    key={tag.id}
                    style={styles.tagItem}
                  >
                    <TouchableOpacity
                      style={styles.tagItemTouch}
                      onPress={() => {
                        if (isManagingTags) {
                          // 在管理模式下，点击标签本身不触发任何操作
                        } else {
                          onTagClick?.(tag.name);
                        }
                      }}
                    >
                      <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                      <Text style={[styles.tagLabel, { color: colors.text }]} numberOfLines={1}>{tag.name}</Text>
                    </TouchableOpacity>
                    {isManagingTags && (
                      <TouchableOpacity
                        style={styles.deleteTagButton}
                        hitSlop={styles.deleteTagButtonHitSlop}
                        onPress={() => {
                          console.log('删除按钮被点击，tag.id:', tag.id, 'tag.name:', tag.name);
                          console.log('onDeleteTag 函数:', onDeleteTag);
                          if (onDeleteTag) {
                            onDeleteTag(tag.id, tag.name);
                          }
                        }}
                      >
                        <TrashIcon size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              ) : (
                <Text style={[styles.noTagsText, { color: colors.textSecondary }]}>暂无标签</Text>
              )}
            </ScrollView>
            {tags.length > 5 && !isManagingTags && (
              <Text style={[styles.tagSectionFooterHint, { color: colors.textSecondary }]}>↓ 滑动查看更多</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
        {user ? (
          <View style={styles.userInfo}>
            <View style={[styles.userAvatar, { backgroundColor: colors.backgroundSecondary }]}>
              <UserIcon size={16} strokeWidth={2} />
            </View>
            <View style={styles.userDetails}>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{user.name}</Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>{user.email}</Text>
            </View>
            <TouchableOpacity style={styles.footerButton} onPress={toggleTheme}>
              {effectiveTheme === 'dark' ? (
                <SunIcon size={16} strokeWidth={2} color={colors.textSecondary} />
              ) : (
                <MoonIcon size={16} strokeWidth={2} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerButton} onPress={onLogoutClick}>
              <LogOutIcon size={16} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={[styles.footerLinks, { borderTopColor: colors.borderLight }]}>
          <TouchableOpacity
            style={styles.footerLink}
            onPress={() => Linking.openURL('https://github.com/sparknoteai/SparkNoteAI')}
          >
            <Image
              source={effectiveTheme === 'dark' ? require('../../../assets/images/github-dark.png') : require('../../../assets/images/github-light.png')}
              style={styles.githubIcon}
              resizeMode="contain"
            />
            <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>GitHub</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.footerLink}
            onPress={() => Linking.openURL('https://sparknoteai.github.io')}
          >
            <GlobeIcon size={14} strokeWidth={2} color={colors.textSecondary} />
            <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>文档</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.footerLink}
            onPress={onSettingsClick}
          >
            <SettingsIcon size={14} strokeWidth={2} color={colors.textSecondary} />
            <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>设置</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 260,
    height: '100%',
    borderRightWidth: 1,
    flexDirection: 'column',
  },
  logo: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoIconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.md,
  },
  logoTextContainer: {
    paddingTop: spacing.md,
    borderRadius: 6,
    flexDirection: 'column',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: 6,
  },
  footerLinkText: {
    fontSize: 13,
    fontWeight: '500',
  },
  githubIcon: {
    width: 16,
    height: 16,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  logoSubtitle: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 1,
    letterSpacing: 0.3,
  },
  navContainer: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  navSection: {
    paddingVertical: spacing.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs,
    borderRadius: 6,
  },
  navIconWrapper: {
    marginRight: spacing.sm,
  },
  navLabel: {
    flex: 1,
    fontSize: 14,
  },
  navCount: {
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
  },
  tagSection: {
    marginTop: spacing.xs,
  },
  tagScrollContainer: {
    maxHeight: 300,
  },
  tagScrollView: {
    maxHeight: 300,
  },
  noTagsText: {
    fontSize: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tagSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  tagSectionFooterHint: {
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs,
    borderRadius: 6,
  },
  tagItemTouch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  tagLabel: {
    flex: 1,
    fontSize: 13,
  },
  manageTagsButton: {
    fontSize: 11,
    fontWeight: '500',
  },
  deleteTagButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
    borderRadius: 6,
  },
  deleteTagButtonHitSlop: {
    top: 8,
    right: 8,
    bottom: 8,
    left: 8,
  },
  footer: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 11,
    marginTop: 1,
  },
  footerButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Sidebar;
