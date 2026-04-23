// 根导航

import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, View } from 'react-native';
import * as Linking from 'expo-linking';

import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { RootStackParamList } from './types';
import { useAuthStore, useServerConfigStore } from '../stores';
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
  const { loadConfig } = useServerConfigStore();
  const [, forceUpdate] = useState(0);
  const navigationRef = useRef<any>(null);
  const initialUrlHandled = useRef(false);
  const authRef = useRef(isAuthenticated);
  authRef.current = isAuthenticated;

  useEffect(() => {
    // 先加载服务器配置，再检查认证状态
    const init = async () => {
      if (Platform.OS !== 'web') {
        await loadConfig();
      }
      checkAuth();
    };
    init();
  }, []);

  // 监听认证状态变化，触发重新渲染
  React.useEffect(() => {
    forceUpdate(n => n + 1);
  }, [isAuthenticated]);

  // 处理传入的 URL（来自系统分享）
  const handleIncomingUrl = (incomingUrl: string) => {
    if (!navigationRef.current || !authRef.current) return;

    let shareUrl = '';

    // 处理 sparknoteai:// 自定义 scheme 的分享链接
    if (incomingUrl.startsWith('sparknoteai://')) {
      try {
        const parsed = new URL(incomingUrl);
        shareUrl = parsed.searchParams.get('url') || '';
      } catch {
        return;
      }
    }
    // 处理从其他应用分享过来的 HTTP/HTTPS URL
    else if (incomingUrl.startsWith('http://') || incomingUrl.startsWith('https://')) {
      // 过滤 dev server 和 API 地址
      const parsed = new URL(incomingUrl);
      const isDev = (
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.port === '8081' || // Expo Metro
        parsed.port === '8000' || // 本地后端
        parsed.hostname === '192.168.66.165'
      );
      if (isDev) return;
      shareUrl = incomingUrl;
    } else {
      return; // 不处理的 URL
    }

    if (!shareUrl) return;

    // 导航到导入页面并预填充 URL
    navigationRef.current.navigate('Main' as never);
    setTimeout(() => {
      navigationRef.current.navigate('Import' as never, { url: shareUrl });
    }, 100);
  };

  // 监听来自系统分享的 URL（整个生命周期只注册一次）
  useEffect(() => {
    // 启动时仅处理一次初始 URL
    if (!initialUrlHandled.current) {
      initialUrlHandled.current = true;
      Linking.getInitialURL().then((url) => {
        if (url) {
          // 等待认证完成后再处理
          const waitForAuth = () => {
            if (authRef.current && navigationRef.current) {
              handleIncomingUrl(url);
            } else {
              setTimeout(waitForAuth, 200);
            }
          };
          waitForAuth();
        }
      });
    }

    // 运行时监听新 URL（整个生命周期只注册一次）
    const subscription = Linking.addEventListener('url', (event) => {
      handleIncomingUrl(event.url);
    });

    return () => subscription.remove();
  }, []);

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
