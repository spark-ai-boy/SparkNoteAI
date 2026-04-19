// 设置栈导航

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsScreen } from '../screens/mobile/SettingsScreen';
import { LLMConfigScreen } from '../screens/mobile/LLMConfigScreen';
import { InterfaceSettingsScreen } from '../screens/mobile/InterfaceSettingsScreen';
import { PrivacySecurityScreen } from '../screens/mobile/PrivacySecurityScreen';
import { AccountSettingsScreen } from '../screens/mobile/AccountSettingsScreen';
import { TasksScreen } from '../screens/mobile/TasksScreen';
import { AboutScreen } from '../screens/mobile/AboutScreen';
import { ServerConfigScreen } from '../screens/mobile/ServerConfigScreen';
import { NotificationSettingsScreen } from '../screens/mobile/NotificationSettingsScreen';
import { DataManagementScreen } from '../screens/mobile/DataManagementScreen';

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

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <Stack.Screen name="SettingsList" component={SettingsScreen} />
    <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
    <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
    <Stack.Screen name="ServerConfig" component={ServerConfigScreen} />
    <Stack.Screen name="InterfaceSettings" component={InterfaceSettingsScreen} />
    <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
    <Stack.Screen name="LLMConfig" component={LLMConfigScreen} />
    <Stack.Screen name="ImageStorage" component={LLMConfigScreen} />
    <Stack.Screen name="DataManagement" component={DataManagementScreen} />
    <Stack.Screen name="NotesConfig" component={FeaturePlaceholderScreen} />
    <Stack.Screen name="KnowledgeGraphConfig" component={FeaturePlaceholderScreen} />
    <Stack.Screen name="AIAssistantConfig" component={FeaturePlaceholderScreen} />
    <Stack.Screen name="About" component={AboutScreen} />
    <Stack.Screen name="Tasks" component={TasksScreen} />
  </Stack.Navigator>
);

// 场景配置占位页面
const FeaturePlaceholderScreen: React.FC = ({ route, navigation }) => {
  const titles: Record<string, { title: string; desc: string }> = {
    NotesConfig: { title: '笔记管理', desc: '内容总结、标签提取' },
    KnowledgeGraphConfig: { title: '知识图谱', desc: '知识图谱构建和 AI 配置' },
    AIAssistantConfig: { title: 'AI 助手', desc: 'AI 助手聊天设置' },
  };

  const info = titles[route.name as keyof typeof titles] || { title: '', desc: '' };

  return (
    <FeaturePlaceholder title={info.title} desc={info.desc} onBack={() => navigation.goBack()} />
  );
};

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { SettingsIcon } from '../../components/icons';

const FeaturePlaceholder: React.FC<{ title: string; desc: string; onBack: () => void }> = ({ title, desc, onBack }) => {
  const colors = useWebTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={{ width: 22 }} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        <View style={{ width: 22 }} />
      </View>
      <View style={styles.centerContent}>
        <SettingsIcon size={48} color={colors.textTertiary} />
        <Text style={[styles.placeholderTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.placeholderDesc, { color: colors.textSecondary }]}>
          {desc}
          {'\n\n'}开发中，敬请期待
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 56,
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  placeholderTitle: { fontSize: 18, fontWeight: '600', marginTop: spacing.md },
  placeholderDesc: { fontSize: 14, textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 },
});
