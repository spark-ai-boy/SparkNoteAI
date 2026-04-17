// 认证状态管理

import { create } from 'zustand';
import { User } from '../types';
import * as authApi from '../api/auth';
import { getAuthToken } from '../api/client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  // 2FA 相关状态
  twoFactorRequired: boolean;
  twoFactorSecret: string | null;
  tempToken: string | null;

  // 操作
  login: (username: string, password: string) => Promise<void>;
  loginWith2FA: (code: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  clear2FAState: () => void;
  updateUser: (data: { username?: string; email?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  twoFactorRequired: false,
  twoFactorSecret: null,
  tempToken: null,

  login: async (username: string, password: string, tempToken?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login({ username, password });

      // 检查是否需要 2FA 验证
      if (response.two_factor_required) {
        set({
          twoFactorRequired: true,
          twoFactorSecret: response.two_factor_secret || null,
          tempToken: response.access_token,
          isLoading: false,
          user: { username, email: '' as any, id: 0, is_active: true, created_at: '' as any }
        });
        return;
      }

      // 不需要 2FA，直接获取用户信息
      const user = await authApi.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      // 处理 422 验证错误
      const errors = error.response?.data?.detail;
      let message = '登录失败，请检查用户名和密码';

      if (Array.isArray(errors)) {
        message = errors.map((e: any) => e.msg).join('; ') || message;
      } else if (typeof errors === 'string') {
        message = errors;
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      }

      set({ error: message, isLoading: false });
      throw error;
    }
  },

  loginWith2FA: async (code: string) => {
    const state = get();
    if (!state.tempToken) {
      throw new Error('登录状态无效，请重新登录');
    }

    set({ isLoading: true, error: null });
    try {
      const username = state.user?.username || '';
      const response = await authApi.loginWith2FA(username, code, state.tempToken);
      const user = await authApi.getCurrentUser();
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        twoFactorRequired: false,
        twoFactorSecret: null,
        tempToken: null
      });
    } catch (error: any) {
      // 处理 422 验证错误
      const errors = error.response?.data?.detail;
      let message = '验证码不正确';

      if (Array.isArray(errors)) {
        message = errors.map((e: any) => e.msg).join('; ') || message;
      } else if (typeof errors === 'string') {
        message = errors;
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      }

      set({ error: message, isLoading: false });
      throw error;
    }
  },

  register: async (username: string, email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.register({ username, email, password });
      // 注册成功后自动登录
      await authApi.login({ username, password });
      const user = await authApi.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      console.error('注册错误:', error);
      console.error('错误响应:', error.response?.data);
      const message = error.response?.data?.detail || '注册失败，请重试';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authApi.logout();
      set({ user: null, isAuthenticated: false, isLoading: false });
    } catch (error) {
      // 即使出错也清除本地状态
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await getAuthToken();
      if (token) {
        const user = await authApi.getCurrentUser();
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  clear2FAState: () => {
    set({
      twoFactorRequired: false,
      twoFactorSecret: null,
      tempToken: null,
      error: null,
      isLoading: false
    });
  },

  updateUser: async (data: { username?: string; email?: string }) => {
    try {
      const user = await authApi.updateProfile(data);
      set({ user });
    } catch (error: any) {
      const message = error.response?.data?.detail || '更新失败，请重试';
      throw new Error(message);
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    try {
      await authApi.updatePassword({ current_password: currentPassword, new_password: newPassword });
    } catch (error: any) {
      const message = error.response?.data?.detail || '密码修改失败，请检查当前密码是否正确';
      throw new Error(message);
    }
  },
}));

export default useAuthStore;
