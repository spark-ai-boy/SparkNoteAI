// 设置页面（手机端）— 使用 SectionList 原生分组列表

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { useAuthStore } from '../../stores';
import { notesApi } from '../../api/note';
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

interface SettingsItemData {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}

interface SettingsSection {
  title: string;
  data: SettingsItemData[];
}

export type SettingsStackParamList = {
  SettingsList: undefined;
  AccountSettings: undefined;
  PrivacySecurity: undefined;
  ServerConfig: undefined;
  InterfaceSettings: undefined;
  NotificationSettings: undefined;
  LLMConfig: undefined;
  ImageStorage: undefined;
  DataManagement: undefined;
  NotesConfig: undefined;
  KnowledgeGraphConfig: undefined;
  AIAssistantConfig: undefined;
  About: undefined;
  Tasks: undefined;
};

type SettingsNavProp = NativeStackNavigationProp<SettingsStackParamList, 'SettingsList'>;

const NAV_MAP: Record<string, keyof SettingsStackParamList> = {
  account: 'AccountSettings',
  privacy: 'PrivacySecurity',
  server: 'ServerConfig',
  appearance: 'InterfaceSettings',
  notification: 'NotificationSettings',
  llm: 'LLMConfig',
  image_storage: 'ImageStorage',
  data: 'DataManagement',
  notes_config: 'NotesConfig',
  knowledge_graph_config: 'KnowledgeGraphConfig',
  ai_assistant_config: 'AIAssistantConfig',
  about: 'About',
  tasks: 'Tasks',
};

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsNavProp>();
  const colors = useWebTheme();
  const { logout } = useAuthStore();

  const handleNavigate = useCallback((page: string) => {
    const screen = NAV_MAP[page];
    if (screen) navigation.navigate(screen);
  }, [navigation]);

  const handleExportNotes = useCallback(async () => {
    try {
      await notesApi.exportNotes();
    } catch (e: any) {
      if (e.response?.status === 404) {
        Alert.alert('提示', '暂无笔记可导出');
      } else {
        Alert.alert('错误', '导出失败，请重试');
      }
    }
  }, []);

  const handleLogout = useCallback(() => {
    const title = '确认退出';
    const message = '确定要退出登录吗？';
    if (Platform.OS === 'ios') {
      Alert.alert(title, message, [
        { text: '取消', style: 'cancel' },
        { text: '退出', style: 'destructive', onPress: () => logout() },
      ]);
    } else {
      Alert.alert(title, message, [
        { text: '取消', style: 'cancel' },
        { text: '退出', onPress: () => logout() },
      ]);
    }
  }, [logout]);

  const iconMap: Record<string, React.ReactNode> = {
    account: <UserIcon size={20} color={colors.textSecondary} />,
    privacy: <LockIcon size={20} color={colors.textSecondary} />,
    server: <ServerIcon size={20} color={colors.textSecondary} />,
    appearance: <PaletteIcon size={20} color={colors.textSecondary} />,
    notification: <BellIcon size={20} color={colors.textSecondary} />,
    llm: <SettingsIcon size={20} color={colors.textSecondary} />,
    image_storage: <ImageIcon size={20} color={colors.textSecondary} />,
    data: <DatabaseIcon size={20} color={colors.textSecondary} />,
    notes_config: <BookIcon size={20} color={colors.textSecondary} />,
    knowledge_graph_config: <NetworkIcon size={20} color={colors.textSecondary} />,
    ai_assistant_config: <SparklesIcon size={20} color={colors.textSecondary} />,
    about: <InfoIcon size={20} color={colors.textSecondary} />,
    export_notes: <DatabaseIcon size={20} color={colors.textSecondary} />,
    logout: <LogOutIcon size={20} color={colors.error} />,
  };

  const sections: SettingsSection[] = [
    {
      title: '用户信息',
      data: [
        { id: 'account', icon: iconMap.account, title: '账号设置', subtitle: '个人资料、密码修改', onPress: () => handleNavigate('account') },
        { id: 'privacy', icon: iconMap.privacy, title: '隐私与安全', subtitle: '两步验证、会话管理', onPress: () => handleNavigate('privacy') },
      ],
    },
    {
      title: '基础设置',
      data: [
        { id: 'server', icon: iconMap.server, title: '服务器配置', subtitle: '服务器信息和版本', onPress: () => handleNavigate('server') },
        { id: 'appearance', icon: iconMap.appearance, title: '界面设置', subtitle: '主题、语言设置', onPress: () => handleNavigate('appearance') },
        { id: 'notification', icon: iconMap.notification, title: '通知设置', subtitle: '任务完成、导入进度通知', onPress: () => handleNavigate('notification') },
        { id: 'llm', icon: iconMap.llm, title: '大模型配置', subtitle: 'AI 大模型 Provider 配置', onPress: () => handleNavigate('llm') },
        { id: 'image_storage', icon: iconMap.image_storage, title: '图片存储', subtitle: '本地存储/图床配置', onPress: () => handleNavigate('image_storage') },
        { id: 'data', icon: iconMap.data, title: '数据管理', subtitle: '数据导出、备份', onPress: () => handleNavigate('data') },
      ],
    },
    {
      title: '场景设置',
      data: [
        { id: 'notes_config', icon: iconMap.notes_config, title: '笔记管理', subtitle: '内容总结、标签提取', onPress: () => handleNavigate('notes_config') },
        { id: 'knowledge_graph_config', icon: iconMap.knowledge_graph_config, title: '知识图谱', subtitle: '知识图谱构建和 AI 配置', onPress: () => handleNavigate('knowledge_graph_config') },
        { id: 'ai_assistant_config', icon: iconMap.ai_assistant_config, title: 'AI 助手', subtitle: 'AI 助手聊天设置', onPress: () => handleNavigate('ai_assistant_config') },
      ],
    },
    {
      title: '系统信息',
      data: [
        { id: 'about', icon: iconMap.about, title: '关于', subtitle: '应用版本、帮助反馈', onPress: () => handleNavigate('about') },
      ],
    },
    {
      title: '快捷操作',
      data: [
        { id: 'export_notes', icon: iconMap.export_notes, title: '导出笔记', onPress: handleExportNotes, showChevron: false },
        { id: 'logout', icon: iconMap.logout, title: '退出登录', destructive: true, onPress: handleLogout },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>设置</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <SettingsItem
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            onPress={item.onPress}
            destructive={item.destructive}
            showChevron={item.showChevron}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{title}</Text>
        )}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
        SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
        stickySectionHeadersEnabled={false}
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
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  separator: {
    height: 1,
    marginLeft: spacing.md + 32,
    marginRight: spacing.md,
  },
  sectionSeparator: {
    height: spacing.md,
  },
});

export default SettingsScreen;
