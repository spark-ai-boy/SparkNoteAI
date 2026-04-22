// 设置栈导航 — 启用原生 iOS Header

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { spacing } from '../theme';
import { useTheme } from '../hooks/useTheme';
import { SettingsIcon, ChevronLeftIcon } from '../components/icons';
import { SettingsScreen } from '../screens/mobile/SettingsScreen';
import { LLMConfigScreen } from '../screens/mobile/LLMConfigScreen';
import { LLMConfigFormScreen } from '../screens/mobile/LLMConfigFormScreen';
import { InterfaceSettingsScreen } from '../screens/mobile/InterfaceSettingsScreen';
import { PrivacySecurityScreen } from '../screens/mobile/PrivacySecurityScreen';
import { AccountSettingsScreen } from '../screens/mobile/AccountSettingsScreen';
import { ChangePasswordScreen } from '../screens/mobile/ChangePasswordScreen';
import { TasksScreen } from '../screens/mobile/TasksScreen';
import { AboutScreen } from '../screens/mobile/AboutScreen';
import { ServerConfigScreen } from '../screens/mobile/ServerConfigScreen';
import { NotificationSettingsScreen } from '../screens/mobile/NotificationSettingsScreen';
import { DataManagementScreen } from '../screens/mobile/DataManagementScreen';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

export type SettingsStackParamList = {
  SettingsList: undefined;
  AccountSettings: undefined;
  ChangePassword: undefined;
  PrivacySecurity: undefined;
  ServerConfig: undefined;
  InterfaceSettings: undefined;
  NotificationSettings: undefined;
  LLMConfig: undefined;
  LLMConfigCreate: undefined;
  LLMConfigEdit: { configKey: string };
  ImageStorage: undefined;
  DataManagement: undefined;
  NotesConfig: undefined;
  KnowledgeGraphConfig: undefined;
  AIAssistantConfig: undefined;
  About: undefined;
  Tasks: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsStack: React.FC = () => {
  const colors = useTheme();

  return (
  <Stack.Navigator
    screenOptions={{
      headerTintColor: colors.primary,
      headerTitleStyle: { fontSize: 17, fontWeight: '600' },
      headerBackTitle: '返回',
      headerStyle: { backgroundColor: colors.background },
      animation: 'slide_from_right',
    }}
  >
    <Stack.Screen
      name="SettingsList"
      component={SettingsScreen}
      options={({ navigation }) => ({
        title: '设置',
        headerLeft: () => (
          <TouchableOpacity activeOpacity={0.5} onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', padding: 4, marginRight: 0 }}>
            <ChevronLeftIcon size={22} color={colors.primary} />
          </TouchableOpacity>
        ),
      })}
    />
    <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} options={{ title: '账号设置' }} />
    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: '修改密码' }} />
    <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} options={{ title: '隐私与安全' }} />
    <Stack.Screen name="ServerConfig" component={ServerConfigScreen} options={{ title: '服务器配置' }} />
    <Stack.Screen name="InterfaceSettings" component={InterfaceSettingsScreen} options={{ title: '界面设置' }} />
    <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: '通知设置' }} />
    <Stack.Screen name="LLMConfig" component={LLMConfigScreen} options={{ title: '大模型配置' }} />
    <Stack.Screen name="LLMConfigCreate" component={LLMConfigFormScreen} options={{ title: '添加配置' }} />
    <Stack.Screen name="LLMConfigEdit" component={LLMConfigFormScreen} />
    <Stack.Screen name="ImageStorage" component={LLMConfigScreen} options={{ title: '图片存储' }} />
    <Stack.Screen name="DataManagement" component={DataManagementScreen} options={{ title: '数据管理' }} />
    <Stack.Screen name="NotesConfig" component={FeaturePlaceholderScreen} options={{ title: '笔记管理' }} />
    <Stack.Screen name="KnowledgeGraphConfig" component={FeaturePlaceholderScreen} options={{ title: '知识图谱' }} />
    <Stack.Screen name="AIAssistantConfig" component={FeaturePlaceholderScreen} options={{ title: 'AI 助手' }} />
    <Stack.Screen name="About" component={AboutScreen} options={{ title: '关于' }} />
    <Stack.Screen name="Tasks" component={TasksScreen} options={{ title: '后台任务' }} />
  </Stack.Navigator>
  );
};

// 场景配置占位页面
type PlaceholderScreenProps = {
  route: { name: string };
  navigation: { goBack: () => void };
};

const FeaturePlaceholderScreen: React.FC<PlaceholderScreenProps> = ({ route, navigation }) => {
  const titles: Record<string, { title: string; desc: string }> = {
    NotesConfig: { title: '笔记管理', desc: '内容总结、标签提取' },
    KnowledgeGraphConfig: { title: '知识图谱', desc: '知识图谱构建和 AI 配置' },
    AIAssistantConfig: { title: 'AI 助手', desc: 'AI 助手聊天设置' },
  };

  const info = titles[route.name as keyof typeof titles] || { title: '', desc: '' };
  const colors = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.centerContent}>
        <SettingsIcon size={48} color={colors.textTertiary} />
        <Text style={[styles.placeholderTitle, { color: colors.text }]}>{info.title}</Text>
        <Text style={[styles.placeholderDesc, { color: colors.textSecondary }]}>
          {info.desc}
          {'\n\n'}开发中，敬请期待
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  placeholderTitle: { fontSize: 18, fontWeight: '600', marginTop: spacing.md },
  placeholderDesc: { fontSize: 14, textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 },
});
