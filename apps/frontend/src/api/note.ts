// 笔记 API

import client from './client';

export interface Note {
  id: number;
  title: string;
  content: string;
  summary: string;
  user_id: number;
  platform: string;  // original, wechat, xiaohongshu, bilibili, youtube, other
  source_url?: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  tag_ids?: number[];
}

export interface NoteCreate {
  title?: string;
  content?: string;
  summary?: string;
  tag_ids?: number[];
}

export interface NoteUpdate {
  title?: string;
  content?: string;
  summary?: string;
  tag_ids?: number[];
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  user_id?: number | null;
}

export interface NoteListResponse {
  items: Note[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export const notesApi = {
  // 获取笔记列表
  getNotes: async (params?: {
    page?: number;
    size?: number;
    search?: string;
    tag?: string;
  }): Promise<NoteListResponse> => {
    const response = await client.get<NoteListResponse>('/notes/', { params });
    return response.data;
  },

  // 获取单个笔记
  getNote: async (noteId: number): Promise<Note> => {
    const response = await client.get<Note>(`/notes/${noteId}`);
    return response.data;
  },

  // 创建笔记
  createNote: async (data: NoteCreate): Promise<Note> => {
    const response = await client.post<Note>('/notes/', data);
    return response.data;
  },

  // 更新笔记
  updateNote: async (noteId: number, data: NoteUpdate): Promise<Note> => {
    const response = await client.put<Note>(`/notes/${noteId}`, data);
    return response.data;
  },

  // 删除笔记
  deleteNote: async (noteId: number): Promise<{ message: string }> => {
    const response = await client.delete<{ message: string }>(`/notes/${noteId}`);
    return response.data;
  },

  // 获取所有标签
  getTags: async (): Promise<Tag[]> => {
    const response = await client.get<Tag[]>('/notes/tags');
    return response.data;
  },

  // 创建标签
  createTag: async (data: { name: string; color?: string }): Promise<Tag> => {
    const response = await client.post<Tag>('/notes/tags', data);
    return response.data;
  },

  // 删除标签
  deleteTag: async (tagId: number): Promise<{ message: string }> => {
    const response = await client.delete<{ message: string }>(`/notes/tags/${tagId}`);
    return response.data;
  },

  // 导出所有笔记
  exportNotes: async (): Promise<Blob> => {
    const response = await client.get('/notes/export', {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default notesApi;
