// Toast 通知状态管理

import { create } from 'zustand';
import { ToastConfig, ToastType } from '../components/Toast';

interface ToastState {
  toasts: ToastConfig[];

  // 添加通知
  addToast: (toast: Omit<ToastConfig, 'id'>) => string;

  // 移除通知
  removeToast: (id: string) => void;

  // 便捷方法
  showSuccess: (title: string, message?: string, duration?: number) => string;
  showError: (title: string, message?: string, duration?: number) => string;
  showWarning: (title: string, message?: string, duration?: number) => string;
  showInfo: (title: string, message?: string, duration?: number) => string;

  // 清除所有通知
  clearAll: () => void;
}

// 生成唯一 ID
const generateId = (): string => {
  return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toast: Omit<ToastConfig, 'id'>) => {
    const id = generateId();
    const newToast: ToastConfig = {
      id,
      ...toast,
      duration: toast.duration ?? 5000, // 默认 5 秒
    };
    set((state) => ({ toasts: [...state.toasts, newToast] }));
    return id;
  },

  removeToast: (id: string) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  showSuccess: (title: string, message?: string, duration?: number) => {
    return get().addToast({ type: 'success' as ToastType, title, message, duration });
  },

  showError: (title: string, message?: string, duration?: number) => {
    return get().addToast({ type: 'error' as ToastType, title, message, duration });
  },

  showWarning: (title: string, message?: string, duration?: number) => {
    return get().addToast({ type: 'warning' as ToastType, title, message, duration });
  },

  showInfo: (title: string, message?: string, duration?: number) => {
    return get().addToast({ type: 'info' as ToastType, title, message, duration });
  },

  clearAll: () => {
    set({ toasts: [] });
  },
}));

export default useToastStore;
