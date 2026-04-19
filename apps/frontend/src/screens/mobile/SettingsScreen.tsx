// 设置页面（手机端）

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { useAuthStore } from '../../stores';
import { useToast } from '../../hooks/useToast';
import { notesApi } from '../../api/note';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { SettingsItem } from './components/SettingsItem';
import {
  UserIcon,
  LockIcon,
  ServerIcon,
  PaletteIcon,
  BellIcon,
  SettingsIcon,
  ImageIcon,
  DatabaseIcon,
  BookIcon,
  NetworkIcon,
  SparklesIcon,
  InfoIcon,
  LogOutIcon,
} from '../../components/icons';

import { LLMConfigScreen } from './LLMConfigScreen';
import { InterfaceSettingsScreen } from './InterfaceSettingsScreen';
import { PrivacySecurityScreen } from './PrivacySecurityScreen';
import { AccountSettingsScreen } from './AccountSettingsScreen';
import { TasksScreen } from './TasksScreen';
import { AboutScreen } from './AboutScreen';
import { ServerConfigScreen } from './ServerConfigScreen';
import { NotificationSettingsScreen } from './NotificationSettingsScreen';
import { DataManagementScreen } from './DataManagementScreen';

type SettingsSubPage =
  | null
  | 'account'
  | 'privacy'
  | 'server'
  | 'appearance'
  | 'notification'
  | 'llm'
  | 'image_storage'
  | 'data'
  | 'notes_config'
  | 'knowledge_graph_config'
  | 'ai_assistant_config'
  | 'about'
  | 'tasks';

export const SettingsScreen: React.FC = () => {
  const colors = useWebTheme();
  const toast = useToast();
  const { logout } = useAuthStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [subPage, setSubPage] = useState<SettingsSubPage>(null);

  const handleExportNotes = async () => {
    try {
      await notesApi.exportNotes();
      toast.success('笔记导出成功');
    } catch (e: any) {
      if (e.response?.status === 404) {
        toast.error('暂无笔记可导出');
      } else {
        toast.error('导出失败，请重试');
      }
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  // 渲染子页面
  if (subPage === 'llm') {
    return <LLMConfigScreen onBack={() => setSubPage(null)} />;
  }
  if (subPage === 'image_storage') {
    // 大模型配置页也包含图床配置，复用即可
    return <LLMConfigScreen onBack={() => setSubPage(null)} />;
  }
  if (subPage === 'appearance') {
    return <InterfaceSettingsScreen onBack={() => setSubPage(null)} />;
  }
  if (subPage === 'privacy') {
    return <PrivacySecurityScreen onBack={() => setSubPage(null)} />;
  }
  if (subPage === 'account') {
    return <AccountSettingsScreen onBack={() => setSubPage(null)} />;
  }
  if (subPage === 'tasks') {
    return <TasksScreen onBack={() => setSubPage(null)} />;
  }
  if (subPage === 'about') {
    return <AboutScreen onBack={() => setSubPage(null)} />;
  }
  if (subPage === 'server') {
    return <ServerConfigScreen onBack={() => setSubPage(null)} />;
  }
  if (subPage === 'notification') {
    return <NotificationSettingsScreen onBack={() => setSubPage(null)} />;
  }
  if (subPage === 'data') {
    return <DataManagementScreen onBack={() => setSubPage(null)} />;
  }

  // 场景配置占位
  const renderFeaturePlaceholder = (title: string, desc: string) => (
    <View style={styles.centerContent}>
      <SettingsIcon size={48} color={colors.textTertiary} />
      <Text style={[styles.placeholderTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.placeholderDesc, { color: colors.textSecondary }]}>{desc}</Text>
      <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.primary }]} onPress={() => setSubPage(null)}>
        <Text style={[styles.backButtonText, { color: colors.primaryForeground }]}>返回设置</Text>
      </TouchableOpacity>
    </View>
  );

  if (subPage === 'notes_config') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setSubPage(null)}><SettingsIcon size={22} color={colors.text} /></TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>笔记管理</Text>
          <View style={{ width: 22 }} />
        </View>
        {renderFeaturePlaceholder('笔记管理', '内容总结、标签提取、图片存储配置\n开发中，敬请期待')}
      </SafeAreaView>
    );
  }
  if (subPage === 'knowledge_graph_config') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setSubPage(null)}><SettingsIcon size={22} color={colors.text} /></TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>知识图谱</Text>
          <View style={{ width: 22 }} />
        </View>
        {renderFeaturePlaceholder('知识图谱', '知识图谱构建和 AI 配置\n开发中，敬请期待')}
      </SafeAreaView>
    );
  }
  if (subPage === 'ai_assistant_config') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setSubPage(null)}><SettingsIcon size={22} color={colors.text} /></TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>AI 助手</Text>
          <View style={{ width: 22 }} />
        </View>
        {renderFeaturePlaceholder('AI 助手', 'AI 助手聊天设置\n开发中，敬请期待')}
      </SafeAreaView>
    );
  }

  // 分组定义（与 web 端一致）
  const groups = [
    {
      id: 'user_info',
      label: '用户信息',
      items: [
        { id: 'account', icon: <UserIcon size={20} color={colors.textSecondary} />, title: '账号设置', subtitle: '个人资料、密码修改' },
        { id: 'privacy', icon: <LockIcon size={20} color={colors.textSecondary} />, title: '隐私与安全', subtitle: '两步验证、会话管理' },
      ],
    },
    {
      id: 'basic',
      label: '基础设置',
      items: [
        { id: 'server', icon: <ServerIcon size={20} color={colors.textSecondary} />, title: '服务器配置', subtitle: '服务器信息和版本' },
        { id: 'appearance', icon: <PaletteIcon size={20} color={colors.textSecondary} />, title: '界面设置', subtitle: '主题、语言设置' },
        { id: 'notification', icon: <BellIcon size={20} color={colors.textSecondary} />, title: '通知设置', subtitle: '任务完成、导入进度通知' },
        { id: 'llm', icon: <SettingsIcon size={20} color={colors.textSecondary} />, title: '大模型配置', subtitle: 'AI 大模型 Provider 配置' },
        { id: 'image_storage', icon: <ImageIcon size={20} color={colors.textSecondary} />, title: '图片存储', subtitle: '本地存储/图床配置' },
        { id: 'data', icon: <DatabaseIcon size={20} color={colors.textSecondary} />, title: '数据管理', subtitle: '数据导出、备份' },
      ],
    },
    {
      id: 'feature',
      label: '场景设置',
      items: [
        { id: 'notes_config', icon: <BookIcon size={20} color={colors.textSecondary} />, title: '笔记管理', subtitle: '内容总结、标签提取' },
        { id: 'knowledge_graph_config', icon: <NetworkIcon size={20} color={colors.textSecondary} />, title: '知识图谱', subtitle: '知识图谱构建和 AI 配置' },
        { id: 'ai_assistant_config', icon: <SparklesIcon size={20} color={colors.textSecondary} />, title: 'AI 助手', subtitle: 'AI 助手聊天设置' },
      ],
    },
    {
      id: 'system',
      label: '系统信息',
      items: [
        { id: 'about', icon: <InfoIcon size={20} color={colors.textSecondary} />, title: '关于', subtitle: '应用版本、帮助反馈' },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>设置</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 分组设置项 */}
        {groups.map((group) => (
          <View key={group.id}>
            <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>{group.label}</Text>
            <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
              {group.items.map((item, i) => (
                <React.Fragment key={item.id}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  <SettingsItem
                    icon={item.icon}
                    title={item.title}
                    subtitle={item.subtitle}
                    onPress={() => setSubPage(item.id as SettingsSubPage)}
                  />
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        {/* 快捷操作 */}
        <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>快捷操作</Text>
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
          <SettingsItem
            icon={<DatabaseIcon size={20} color={colors.textSecondary} />}
            title="导出笔记"
            onPress={handleExportNotes}
            showChevron={false}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsItem
            icon={<LogOutIcon size={20} color={colors.error} />}
            title="退出登录"
            destructive
            onPress={handleLogout}
          />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={showLogoutConfirm}
        title="确认退出"
        message="确定要退出登录吗？"
        confirmText="确定"
        cancelText="取消"
        isDestructive
        onConfirm={() => logout()}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  section: {
    marginHorizontal: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  divider: { height: 1 },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  placeholderDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    lineHeight: 22,
    color: '#a3a3a3',
  },
  backButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SettingsScreen;
