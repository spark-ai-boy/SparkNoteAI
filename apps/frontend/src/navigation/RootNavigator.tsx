// 根导航

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, View } from 'react-native';

import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { RootStackParamList } from './types';
import { useAuthStore } from '../stores';
import { ThreeColumnLayout } from '../components/layout';

const Stack = createNativeStackNavigator<RootStackParamList>();

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
    <NavigationContainer>
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
