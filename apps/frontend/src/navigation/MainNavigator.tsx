// 主标签导航

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  NotesScreen,
  SettingsScreen,
  KnowledgeGraphScreen,
} from '../screens/mobile';
import { AIAgentScreen } from '../screens/mobile/AIAgentScreen';
import {
  FragmentsScreen,
  MindmapScreen,
  TasksScreen,
} from '../screens/web';
import { KnowledgeGraphScreen as WebKnowledgeGraphScreen } from '../screens/web/KnowledgeGraphScreen';
import { MainTabParamList } from './types';
import { useWebTheme } from '../hooks/useWebTheme';
import { BotIcon, NetworkIcon, BookIcon, SettingsIcon } from '../components/icons';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Web 端 emoji 图标
const TabIcon: React.FC<{ name: string; focused: boolean; colors: ReturnType<typeof useWebTheme> }> = ({ name, focused, colors }) => {
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

// 手机端 Tab 栏自定义渲染（图标 + 文字）
const MobileTabBar: React.FC<{
  state: any;
  descriptors: any;
  navigation: any;
  insets: { bottom: number };
  colors: ReturnType<typeof useWebTheme>;
}> = ({ state, descriptors, navigation, insets, colors }) => {
  const iconMap: Record<string, React.FC<{ focused: boolean; color: string }>> = {
    AIAgent: ({ focused, color }) => <BotIcon size={22} strokeWidth={focused ? 2.5 : 1.5} color={color} />,
    KnowledgeGraph: ({ focused, color }) => <NetworkIcon size={22} strokeWidth={focused ? 2.5 : 1.5} color={color} />,
    Notes: ({ focused, color }) => <BookIcon size={22} strokeWidth={focused ? 2.5 : 1.5} color={color} />,
    Settings: ({ focused, color }) => <SettingsIcon size={22} strokeWidth={focused ? 2.5 : 1.5} color={color} />,
  };

  return (
    <View style={[
      styles.tabBarContainer,
      {
        backgroundColor: colors.background,
        borderTopColor: colors.border,
        paddingBottom: Math.max(insets.bottom, 8),
      },
    ]}>
      {state.routes.map((route: any, index: number) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;

        const tintColor = focused ? colors.primary : colors.textTertiary;

        const IconComponent = iconMap[route.name];

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={() => navigation.navigate(route.name)}
            activeOpacity={0.7}
          >
            {IconComponent && <IconComponent focused={focused} color={tintColor} />}
            <Text style={[styles.tabLabel, { color: tintColor }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export const MainNavigator: React.FC = () => {
  const colors = useWebTheme();
  const insets = useSafeAreaInsets();
  const isMobile = Platform.OS !== 'web';

  // 手机端：AI 助手 | 笔记 | 知识图谱 | 设置
  if (isMobile) {
    return (
      <Tab.Navigator
        initialRouteName="AIAgent"
        screenOptions={{
          headerShown: false,
        }}
        tabBar={(props) => (
          <MobileTabBar
            {...props}
            insets={insets}
            colors={colors}
          />
        )}
      >
        <Tab.Screen
          name="AIAgent"
          component={AIAgentScreen}
          options={{ tabBarLabel: 'AI 助手' }}
        />
        <Tab.Screen
          name="Notes"
          component={NotesScreen}
          options={{ tabBarLabel: '笔记' }}
        />
        <Tab.Screen
          name="KnowledgeGraph"
          component={KnowledgeGraphScreen}
          options={{ tabBarLabel: '图谱' }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ tabBarLabel: '设置' }}
        />
      </Tab.Navigator>
    );
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
  tabBarContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tabBar: {
    borderTopWidth: 1,
    height: 56,
  },
  tabBarLabel: {
    fontSize: 11,
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
