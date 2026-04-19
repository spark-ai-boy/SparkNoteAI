// 根导航

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, View } from 'react-native';

import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { RootStackParamList } from './types';
import { useAuthStore } from '../stores';
import { ThreeColumnLayout } from '../screens/web/WebLayoutScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Web 端页面标题管理
const usePageTitle = (title: string) => {
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = `${title} - SparkNoteAI`;
    }
  }, [title]);
};

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  // 监听认证状态变化，触发重新渲染
  React.useEffect(() => {
    forceUpdate(n => n + 1);
  }, [isAuthenticated]);

  if (isLoading) {
    return null; // 可以添加启动屏
  }

  // Web 端使用三栏布局
  if (Platform.OS === 'web' && isAuthenticated) {
    return <ThreeColumnLayout />;
  }

  return (
    <NavigationContainer
      onStateChange={(state) => {
        // Web 端根据导航状态更新页面标题
        if (Platform.OS === 'web' && state) {
          const currentRoute = state.routes[state.index];
          const titles: Record<string, string> = {
            Auth: '登录',
            Login: '登录',
            Register: '注册',
            Main: '首页',
          };
          const title = titles[currentRoute.name] || 'SparkNoteAI';
          document.title = `${title} - SparkNoteAI`;
        }
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
