// 共享类型定义

// 用户类型
export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  two_factor_enabled?: boolean;
  created_at: string;
  updated_at?: string;
}

// 笔记类型
export interface Note {
  id: number;
  title: string;
  content: string;
  user_id: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// 碎片化内容类型
export interface Fragment {
  id: number;
  title: string;
  content: string;
  platform: Platform;
  url: string;
  user_id: number;
  created_at: string;
  updated_at: string;
}

// 知识图谱节点类型
export interface KnowledgeGraphNode {
  id: number;
  name: string;
  type: string;
  content: string;
  user_id: number;
  created_at: string;
}

// 知识图谱边类型
export interface KnowledgeGraphEdge {
  id: number;
  source_id: number;
  target_id: number;
  relationship: string;
  user_id: number;
  created_at: string;
}

// 思维导图类型
export interface Mindmap {
  id: number;
  title: string;
  data: string;
  user_id: number;
  created_at: string;
  updated_at: string;
}

// 平台类型
export type Platform = 
  | 'wechat'
  | 'xiaohongshu'
  | 'bilibili'
  | 'youtube'
  | 'web'
  | 'other';

// API 响应类型
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// 分页响应类型
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// 认证响应
export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// 登录请求
export interface LoginRequest {
  username: string;
  password: string;
}

// 注册请求
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}
