// 主导航 — 手机端：单页栈 + 右上角入口；Web/桌面端：多 Tab

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import {
  NotesScreen,
  SettingsScreen,
  KnowledgeGraphScreen,
  TasksScreen as MobileTasksScreen,
} from '../screens/mobile';
import { AIAgentScreen } from '../screens/mobile/AIAgentScreen';
import { NoteDetailScreen } from '../screens/mobile/NoteDetailScreen';
import { GraphNodeDetailScreen } from '../screens/mobile/GraphNodeDetailScreen';
import { ImportScreen } from '../screens/mobile/ImportScreen';
import { SettingsStack } from './SettingsStack';
import {
  FragmentsScreen,
  MindmapScreen,
  TasksScreen,
} from '../screens/web';
import { KnowledgeGraphScreen as WebKnowledgeGraphScreen } from '../screens/web/KnowledgeGraphScreen';
import { MainTabParamList } from './types';
import { useTheme } from '../hooks/useTheme';
import { BotIcon, NetworkIcon, BookIcon, SettingsIcon, ChevronLeftIcon } from '../components/icons';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Web 端 emoji 图标
const TabIcon: React.FC<{ name: string; focused: boolean; colors: ReturnType<typeof useTheme> }> = ({ name, focused, colors }) => {
  const icons: Record<string, string> = {
    Notes: '📝',
    Fragments: '📄',
    KnowledgeGraph: '🔗',
    Mindmap: '🗺️',
    Tasks: '✅',
    Settings: '⚙️',
    AIAgent: '🤖',
  };

  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, { color: colors.text }, focused && styles.iconFocused]}>
        {icons[name] || '•'}
      </Text>
    </View>
  );
};

// 手机端：笔记栈（笔记为主入口，AI/图谱/设置在右上角）
const MobileNotesStack = createNativeStackNavigator<{
  NotesHome: undefined;
  AIAgent: undefined;
  KnowledgeGraph: undefined;
  Settings: undefined;
  Tasks: undefined;
  NoteDetail: { noteId: number };
  Import: { url?: string };
  GraphNodeDetail: { nodeId: number; nodeName: string; nodeType: string; nodeDescription?: string };
}>();

export const MobileNotesStackScreen: React.FC = () => {
  const colors = useTheme();

  return (
    <MobileNotesStack.Navigator
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { fontSize: 17, fontWeight: '600' },
        animation: 'slide_from_right',
        headerBackTitleVisible: false,
      } as any}
    >
      <MobileNotesStack.Screen
        name="NotesHome"
        component={NotesScreen}
        options={{
          title: 'SparkNote AI',
          headerStyle: { backgroundColor: colors.background },
        }}
      />
      <MobileNotesStack.Screen
        name="NoteDetail"
        component={NoteDetailScreen}
        options={({ navigation }) => ({
          title: '笔记详情',
          headerStyle: { backgroundColor: colors.background },
          headerLeft: () => (
            <TouchableOpacity activeOpacity={0.5} onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', padding: 4 }}>
              <ChevronLeftIcon size={22} color={colors.primary} />
            </TouchableOpacity>
          ),
        })}
      />
      <MobileNotesStack.Screen
        name="Import"
        component={ImportScreen}
        options={({ navigation }) => ({
          title: '导入笔记',
          headerStyle: { backgroundColor: colors.background },
          headerLeft: () => (
            <TouchableOpacity activeOpacity={0.5} onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', padding: 4 }}>
              <ChevronLeftIcon size={22} color={colors.primary} />
            </TouchableOpacity>
          ),
        })}
      />
      <MobileNotesStack.Screen
        name="AIAgent"
        component={AIAgentScreen}
        options={({ navigation }) => ({
          title: 'AI 助手',
          headerStyle: { backgroundColor: colors.background },
          headerLeft: () => (
            <TouchableOpacity activeOpacity={0.5} onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', padding: 4 }}>
              <ChevronLeftIcon size={22} color={colors.primary} />
            </TouchableOpacity>
          ),
        })}
      />
      <MobileNotesStack.Screen
        name="KnowledgeGraph"
        component={KnowledgeGraphScreen}
        options={({ navigation }) => ({
          title: '知识图谱',
          headerStyle: { backgroundColor: colors.background },
          headerLeft: () => (
            <TouchableOpacity activeOpacity={0.5} onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', padding: 4 }}>
              <ChevronLeftIcon size={22} color={colors.primary} />
            </TouchableOpacity>
          ),
        })}
      />
      <MobileNotesStack.Screen
        name="Settings"
        component={SettingsStack}
        options={{ headerShown: false }}
      />
      <MobileNotesStack.Screen
        name="GraphNodeDetail"
        component={GraphNodeDetailScreen}
        options={({ navigation }) => ({
          title: '节点详情',
          headerStyle: { backgroundColor: colors.background },
          headerLeft: () => (
            <TouchableOpacity activeOpacity={0.5} onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', padding: 4 }}>
              <ChevronLeftIcon size={22} color={colors.primary} />
            </TouchableOpacity>
          ),
        })}
      />
      <MobileNotesStack.Screen
        name="Tasks"
        component={MobileTasksScreen}
        options={({ navigation }) => ({
          title: '后台任务',
          headerStyle: { backgroundColor: colors.background },
          headerLeft: () => (
            <TouchableOpacity activeOpacity={0.5} onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', padding: 4 }}>
              <ChevronLeftIcon size={22} color={colors.primary} />
            </TouchableOpacity>
          ),
        })}
      />
    </MobileNotesStack.Navigator>
  );
};

export const MainNavigator: React.FC = () => {
  const colors = useTheme();
  const isMobile = Platform.OS !== 'web';

  // 手机端：单页栈 + 右上角入口
  if (isMobile) {
    return <MobileNotesStackScreen />;
  }

  // Web/Electron 端：原有布局
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} colors={colors} />
        ),
        tabBarActiveTintColor: colors.cta,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: [styles.tabBar, { backgroundColor: colors.secondary, borderTopColor: colors.border }],
        tabBarLabelStyle: styles.tabBarLabel,
      })}
    >
      <Tab.Screen
        name="Notes"
        component={NotesScreen}
        options={{ tabBarLabel: '笔记' }}
      />
      <Tab.Screen
        name="Fragments"
        component={FragmentsScreen}
        options={{ tabBarLabel: '碎片' }}
      />
      <Tab.Screen
        name="KnowledgeGraph"
        component={WebKnowledgeGraphScreen}
        options={{ tabBarLabel: '图谱' }}
      />
      <Tab.Screen
        name="Mindmap"
        component={MindmapScreen}
        options={{ tabBarLabel: '导图' }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{ tabBarLabel: '任务' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: '设置' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    height: 44,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
    opacity: 0.6,
  },
  iconFocused: {
    opacity: 1,
  },
});

export default MainNavigator;
