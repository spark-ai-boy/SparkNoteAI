// Toast 通知组件

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { spacing, typography } from '../theme';
import { useWebTheme } from '../hooks/useWebTheme';
import {
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  InfoIcon,
  CloseIcon,
} from './icons';

// 通知类型
export type ToastType = 'success' | 'error' | 'warning' | 'info';

// Toast 配置
export interface ToastConfig {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // 毫秒，0 表示不自动消失
}

interface ToastProps {
  toast: ToastConfig;
  onDismiss: (id: string) => void;
}

// 获取类型的图标和颜色
const getTypeConfig = (type: ToastType, colors: ReturnType<typeof useWebTheme>) => {
  switch (type) {
    case 'success':
      return {
        icon: CheckCircleIcon,
        color: colors.success,
        bgColor: colors.success + '15',
      };
    case 'error':
      return {
        icon: AlertCircleIcon,
        color: colors.error,
        bgColor: colors.error + '15',
      };
    case 'warning':
      return {
        icon: AlertCircleIcon,
        color: colors.warning,
        bgColor: colors.warning + '15',
      };
    case 'info':
      return {
        icon: InfoIcon,
        color: colors.blue,
        bgColor: colors.blue + '15',
      };
  }
};

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const colors = useWebTheme();
  const typeConfig = getTypeConfig(toast.type, colors);
  const Icon = typeConfig.icon;

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, toast.id, onDismiss]);

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.background, borderColor: colors.border, borderLeftColor: typeConfig.color }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: typeConfig.bgColor }]}>
          <Icon size={20} color={typeConfig.color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{toast.title}</Text>
          {toast.message && (
            <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={3}>
              {toast.message}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={() => onDismiss(toast.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <CloseIcon size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 400,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  title: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.caption,
    lineHeight: 18,
  },
  dismissButton: {
    padding: spacing.xs,
  },
});

export default Toast;
