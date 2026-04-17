// Toast 通知容器 - 渲染所有通知

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Toast, ToastConfig } from './Toast';
import { useToastStore } from '../stores/toastStore';

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    right: 20,
    left: 20,
    zIndex: 9999,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
});

export default ToastContainer;
