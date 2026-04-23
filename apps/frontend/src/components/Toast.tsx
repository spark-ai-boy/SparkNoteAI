// Toast 通知组件 - iOS 原生风格

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import {
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  InfoIcon,
  CloseIcon,
} from './icons';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastConfig {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastConfig;
  onDismiss: (id: string) => void;
}

const getTypeConfig = (type: ToastType, colors: ReturnType<typeof useTheme>) => {
  switch (type) {
    case 'success':
      return { icon: CheckCircleIcon, color: colors.success };
    case 'error':
      return { icon: AlertCircleIcon, color: colors.error };
    case 'warning':
      return { icon: AlertCircleIcon, color: colors.warning };
    case 'info':
      return { icon: InfoIcon, color: colors.blue };
  }
};

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const colors = useTheme();
  const typeConfig = getTypeConfig(toast.type, colors);
  const Icon = typeConfig.icon;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const duration = toast.duration ?? 3000;
    if (duration > 0) {
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => onDismiss(toast.id));
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, toast.id, onDismiss, fadeAnim]);

  const isMobile = Platform.OS !== 'web';
  // iOS 原生风格
  if (isMobile) {
    return (
      <View style={{ width: '100%', alignItems: 'center', marginBottom: 8 }}>
        <View
          style={{
            maxWidth: '80%',
            borderRadius: 14,
            backgroundColor: colors.backgroundSecondary,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
            <View style={{ width: 22, height: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
              <Icon size={22} color={typeConfig.color} />
            </View>
            <Text style={{ marginHorizontal: 12, fontSize: 15, fontWeight: '500', color: colors.text }}>
              {toast.title}
            </Text>
            <TouchableOpacity
              onPress={() => onDismiss(toast.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.5}
            >
              <View style={{ width: 18, height: 18, justifyContent: 'center', alignItems: 'center' }}>
                <CloseIcon size={18} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Web 端 - 卡片风格
  return (
    <Animated.View style={{
      opacity: fadeAnim,
      borderRadius: 12,
      borderWidth: 1,
      borderLeftWidth: 4,
      borderLeftColor: typeConfig.color,
      borderColor: colors.border,
      backgroundColor: colors.background,
      padding: 16,
      marginBottom: 8,
      maxWidth: 400,
      minWidth: 200,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: `${typeConfig.color}15`,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
          flexShrink: 0,
        }}>
          <Icon size={20} color={typeConfig.color} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
            {toast.title}
          </Text>
          {toast.message && (
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }} numberOfLines={3}>
              {toast.message}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={{ padding: 4 }}
          onPress={() => onDismiss(toast.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <CloseIcon size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default Toast;
