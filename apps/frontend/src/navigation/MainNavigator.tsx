// 主标签导航

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';

import {
  NotesScreen,
  FragmentsScreen,
  KnowledgeGraphScreen,
  MindmapScreen,
  SettingsScreen,
  TasksScreen,
} from '../screens/main';
import { MainTabParamList } from './types';
import { useWebTheme } from '../hooks/useWebTheme';

const Tab = createBottomTabNavigator<MainTabParamList>();

// 简单的图标组件（后续可替换为 react-native-vector-icons）
const TabIcon: React.FC<{ name: string; focused: boolean; colors: ReturnType<typeof useWebTheme> }> = ({ name, focused, colors }) => {
  const icons: Record<string, string> = {
    Notes: '📝',
    Fragments: '📄',
    KnowledgeGraph: '🔗',
    Mindmap: '🗺️',
    Tasks: '✅',
    Settings: '⚙️',
  };

  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, { color: colors.text }, focused && styles.iconFocused]}>
        {icons[name] || '•'}
      </Text>
    </View>
  );
};

export const MainNavigator: React.FC = () => {
  const colors = useWebTheme();

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
        component={KnowledgeGraphScreen}
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
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
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
