// 认证导航栈

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LoginScreen, RegisterScreen, AuthServerConfigScreen } from '../screens/auth';
import { AuthStackParamList } from './types';
import { useTheme } from '../hooks/useTheme';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  const colors = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen
        name="ServerConfig"
        component={AuthServerConfigScreen}
        options={{
          headerShown: true,
          headerTitle: '',
          headerBackTitle: '返回',
          headerTintColor: colors.primary,
          headerStyle: { backgroundColor: colors.background },
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
