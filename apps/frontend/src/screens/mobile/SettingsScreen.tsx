// 设置页面（手机端）— iOS 原生风格分组卡片

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores';
import { useFeatureConfigStore } from '../../stores/featureConfigStore';
import { notesApi } from '../../api/note';
import { ChevronRightIcon } from '../../components/icons';
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

interface SettingsSectionItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}

interface SettingsSection {
  title: string;
  data: SettingsSectionItem[];
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
  about: 'About',
  tasks: 'Tasks',
};

// feature_id → 导航 key 映射
const FEATURE_NAV_MAP: Record<string, keyof SettingsStackParamList> = {
  notes: 'NotesConfig',
  knowledge_graph: 'KnowledgeGraphConfig',
  ai_assistant: 'AIAssistantConfig',
};

// 图标名 → 组件映射
const ICON_MAP: Record<string, (color: string) => React.ReactNode> = {
  book: (c) => <BookIcon size={20} color={c} />,
  network: (c) => <NetworkIcon size={20} color={c} />,
  'message-square': (c) => <SparklesIcon size={20} color={c} />,
  // fallback
  settings: (c) => <SettingsIcon size={20} color={c} />,
};

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsNavProp>();
  const colors = useTheme();
  const { logout } = useAuthStore();
  const { schemas, fetchSchemas, isLoadingSchemas } = useFeatureConfigStore();
  const [featuresLoaded, setFeaturesLoaded] = useState(false);

  useEffect(() => {
    if (schemas.length === 0 && !isLoadingSchemas) {
      fetchSchemas().finally(() => setFeaturesLoaded(true));
    } else {
      setFeaturesLoaded(true);
    }
  }, []);

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

  // 静态设置项
  const staticIconMap: Record<string, React.ReactNode> = {
    account: <UserIcon size={20} color={colors.textSecondary} />,
    privacy: <LockIcon size={20} color={colors.textSecondary} />,
    server: <ServerIcon size={20} color={colors.textSecondary} />,
    appearance: <PaletteIcon size={20} color={colors.textSecondary} />,
    notification: <BellIcon size={20} color={colors.textSecondary} />,
    llm: <SettingsIcon size={20} color={colors.textSecondary} />,
    image_storage: <ImageIcon size={20} color={colors.textSecondary} />,
    data: <DatabaseIcon size={20} color={colors.textSecondary} />,
    about: <InfoIcon size={20} color={colors.textSecondary} />,
    export_notes: <DatabaseIcon size={20} color={colors.textSecondary} />,
    logout: <LogOutIcon size={20} color={colors.error} />,
  };

  // 动态场景设置项
  const featureItems: SettingsSectionItem[] = featuresLoaded
    ? schemas.map((schema) => {
        const iconFn = ICON_MAP[schema.icon] || ICON_MAP.settings;
        const navKey = FEATURE_NAV_MAP[schema.feature_id];
        return {
          id: schema.feature_id,
          icon: iconFn(colors.textSecondary),
          title: schema.feature_name,
          onPress: navKey ? () => navigation.navigate(navKey) : undefined,
        };
      })
    : [
        // fallback 占位
        { id: 'notes', icon: <BookIcon size={20} color={colors.textSecondary} />, title: '笔记管理', onPress: () => navigation.navigate('NotesConfig') },
        { id: 'knowledge_graph', icon: <NetworkIcon size={20} color={colors.textSecondary} />, title: '知识图谱', onPress: () => navigation.navigate('KnowledgeGraphConfig') },
        { id: 'ai_assistant', icon: <SparklesIcon size={20} color={colors.textSecondary} />, title: 'AI 助手', onPress: () => navigation.navigate('AIAssistantConfig') },
      ];

  const sections: SettingsSection[] = [
    {
      title: '用户信息',
      data: [
        { id: 'account', icon: staticIconMap.account, title: '账号设置', onPress: () => handleNavigate('account') },
        { id: 'privacy', icon: staticIconMap.privacy, title: '隐私与安全', onPress: () => handleNavigate('privacy') },
      ],
    },
    {
      title: '基础设置',
      data: [
        { id: 'server', icon: staticIconMap.server, title: '服务器配置', onPress: () => handleNavigate('server') },
        { id: 'appearance', icon: staticIconMap.appearance, title: '界面设置', onPress: () => handleNavigate('appearance') },
        { id: 'notification', icon: staticIconMap.notification, title: '通知设置', onPress: () => handleNavigate('notification') },
        { id: 'llm', icon: staticIconMap.llm, title: '大模型配置', onPress: () => handleNavigate('llm') },
        { id: 'image_storage', icon: staticIconMap.image_storage, title: '图片存储', onPress: () => handleNavigate('image_storage') },
        { id: 'data', icon: staticIconMap.data, title: '数据管理', onPress: () => handleNavigate('data') },
      ],
    },
    {
      title: '场景设置',
      data: featureItems,
    },
    {
      title: '系统信息',
      data: [
        { id: 'about', icon: staticIconMap.about, title: '关于', onPress: () => handleNavigate('about') },
      ],
    },
    {
      title: '快捷操作',
      data: [
        { id: 'export_notes', icon: staticIconMap.export_notes, title: '导出笔记', onPress: handleExportNotes, showChevron: false },
        { id: 'logout', icon: staticIconMap.logout, title: '退出登录', destructive: true, onPress: handleLogout },
      ],
    },
  ];

  // 渲染分组卡片内的每一行
  const renderRow = (item: SettingsSectionItem, index: number, total: number) => {
    const showChevron = item.showChevron !== false && !!item.onPress;
    const textColor = item.destructive ? colors.error : colors.text;
    const isLast = index === total - 1;

    return (
      <View>
        <Pressable
          style={styles.row}
          onPress={item.onPress}
        >
          <View style={styles.rowIcon}>{item.icon}</View>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: textColor }]}>{item.title}</Text>
          </View>
          {showChevron && (
            <View style={styles.chevronWrapper}>
              <ChevronRightIcon size={14} color="#C7C7CC" />
            </View>
          )}
        </Pressable>
        {!isLast && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {sections.map((section: SettingsSection) => (
          <View key={section.title} style={styles.sectionGroup}>
            {/* 分组标题 */}
            {section.title && (
              <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
                {section.title}
              </Text>
            )}
            {/* 分组卡片 */}
            <View style={[styles.sectionCard, { backgroundColor: colors.backgroundSecondary }]}>
              {section.data.map((item: SettingsSectionItem, i: number) => renderRow(item, i, section.data.length))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  sectionGroup: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '400',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionCard: {
    borderRadius: 12,
    marginHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    position: 'relative',
  },
  rowIcon: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rowText: {
    flex: 1,
    paddingRight: 20,
  },
  chevronWrapper: {
    width: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 17,
  },
  separator: {
    height: 0.5,
    marginLeft: spacing.lg,
    marginRight: spacing.md,
  },
});

export default SettingsScreen;
