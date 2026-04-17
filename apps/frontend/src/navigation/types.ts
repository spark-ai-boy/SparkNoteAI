// 导航类型定义

import { NavigatorScreenParams } from '@react-navigation/native';

// 认证栈导航参数类型
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

// 主标签导航参数类型
export type MainTabParamList = {
  Notes: undefined;
  Fragments: undefined;
  KnowledgeGraph: undefined;
  Mindmap: undefined;
  Tasks: undefined;       // 后台任务
  Settings: undefined;
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
