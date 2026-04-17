// 认证相关 API

import client, { setAuthToken, removeAuthToken } from './client';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
}

export interface UpdatePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  two_factor_required?: boolean;
  two_factor_secret?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  two_factor_enabled?: boolean;
  created_at: string;
  updated_at?: string;
}

// 登录
export const login = async (data: LoginRequest): Promise<AuthResponse> => {
  // FastAPI OAuth2 需要使用 form-data 格式
  const formData = new URLSearchParams();
  formData.append('username', data.username);
  formData.append('password', data.password);

  const response = await client.post<AuthResponse>('/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  // 如果需要 2FA 验证，不保存 token，返回给前端处理
  if (response.data.two_factor_required) {
    return response.data;
  }

  // 否则保存 token
  await setAuthToken(response.data.access_token);

  return response.data;
};

// 2FA 登录验证（用于已启用 2FA 的用户）
export const loginWith2FA = async (username: string, code: string, tempToken: string): Promise<AuthResponse> => {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('code', code);

  const response = await client.post<AuthResponse>('/auth/login/2fa', formData, {
    headers: {
      'Authorization': `Bearer ${tempToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  // 保存正式 token
  await setAuthToken(response.data.access_token);

  return response.data;
};

// 注册
export const register = async (data: RegisterRequest): Promise<User> => {
  const response = await client.post<User>('/auth/register', data);
  return response.data;
};

// 获取当前用户信息
export const getCurrentUser = async (): Promise<User> => {
  const response = await client.get<User>('/auth/me');
  return response.data;
};

// 更新用户信息
export const updateProfile = async (data: UpdateProfileRequest): Promise<User> => {
  const response = await client.put<User>('/auth/me', data);
  return response.data;
};

// 修改密码
export const updatePassword = async (data: UpdatePasswordRequest): Promise<{ message: string }> => {
  const response = await client.put<{ message: string }>('/auth/me/password', data);
  return response.data;
};

// 获取安全信息
export const getSecurityInfo = async (): Promise<{
  username: string;
  email: string;
  two_factor_enabled: boolean;
  created_at: string;
}> => {
  const response = await client.get('/auth/me/security');
  return response.data;
};

// 设置 2FA
export const setupTwoFactor = async (password: string): Promise<{
  secret: string;
  qr_code_url: string;
}> => {
  const response = await client.post('/auth/me/two-factor/setup', { password });
  return response.data;
};

// 启用 2FA
export const enableTwoFactor = async (code: string): Promise<{ message: string; two_factor_enabled: boolean }> => {
  const response = await client.post('/auth/me/two-factor/enable', { code });
  return response.data;
};

// 禁用 2FA
export const disableTwoFactor = async (password: string, code: string): Promise<{ message: string; two_factor_enabled: boolean }> => {
  const response = await client.post('/auth/me/two-factor/disable', { password, code });
  return response.data;
};

// 会话管理 API
export interface UserSession {
  id: number;
  user_id: number;
  device_type: string;
  device_name: string;
  browser?: string;
  os?: string;
  ip_address: string;
  location: string;
  is_current: boolean;
  last_active_at: string;
  created_at: string;
}

export const getSessions = async (): Promise<UserSession[]> => {
  const response = await client.get('/auth/me/sessions');
  return response.data;
};

export const revokeSession = async (sessionId: number, password?: string): Promise<{ message: string }> => {
  const response = await client.post(`/auth/me/sessions/${sessionId}/revoke`, { password });
  return response.data;
};

export const revokeAllSessions = async (password: string): Promise<{ message: string; revoked_count: number }> => {
  const response = await client.post('/auth/me/sessions/revoke-all', { password });
  return response.data;
};

// 登出
export const logout = async (): Promise<void> => {
  await removeAuthToken();
};

export default {
  login,
  loginWith2FA,
  register,
  getCurrentUser,
  updateProfile,
  updatePassword,
  getSecurityInfo,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  getSessions,
  revokeSession,
  revokeAllSessions,
  logout,
};
