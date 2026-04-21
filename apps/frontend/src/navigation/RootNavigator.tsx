// 根导航

import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, View } from 'react-native';
import * as Linking from 'expo-linking';

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
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  // 监听认证状态变化，触发重新渲染
  React.useEffect(() => {
    forceUpdate(n => n + 1);
  }, [isAuthenticated]);

  // 处理传入的 URL（来自系统分享）
  const handleIncomingUrl = (incomingUrl: string) => {
    if (!navigationRef.current || !isAuthenticated) return;

    // 提取 URL（支持 sparknoteai://import?url=xxx 格式，也支持直接传入的 http/https 链接）
    let shareUrl = incomingUrl;
    try {
      const parsed = new URL(incomingUrl);
      // 如果是自定义 scheme，提取 url 参数
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        shareUrl = parsed.searchParams.get('url') || '';
      }
    } catch {
      return; // 无效 URL
    }

    if (!shareUrl) return;

    // 导航到导入页面并预填充 URL
    // 移动端直接 navigate 到 Import（在 MobileNotesStackScreen 中）
    navigationRef.current.navigate('Main' as never);
    setTimeout(() => {
      navigationRef.current.navigate('Import' as never, { url: shareUrl });
    }, 100);
  };

  // 监听来自系统分享的 URL
  useEffect(() => {
    if (!isAuthenticated) return;

    // 启动时检查初始 URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        // 延迟处理，确保导航树已就绪
        setTimeout(() => handleIncomingUrl(url), 500);
      }
    });

    // 监听运行时传入的 URL
    const subscription = Linking.addEventListener('url', (event) => {
      handleIncomingUrl(event.url);
    });

    return () => subscription.remove();
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
      ref={navigationRef}
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
