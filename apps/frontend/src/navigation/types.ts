// 导航类型定义

import { NavigatorScreenParams } from '@react-navigation/native';

// 认证栈导航参数类型
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ServerConfig: undefined;
};

// 主标签导航参数类型
export type MainTabParamList = {
  AIAgent: undefined;
  KnowledgeGraph: undefined;
  Notes: undefined;
  Settings: undefined;
  Fragments: undefined;       // Web 端使用
  Mindmap: undefined;         // Web 端使用
  Tasks: undefined;           // Web 端使用
};

// 笔记栈导航参数类型
export type NotesStackParamList = {
  NotesList: undefined;
  NoteDetail: { noteId: number };
  NoteEdit: { noteId?: number };
};

// 根栈导航参数类型
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

// 声明全局导航类型
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
