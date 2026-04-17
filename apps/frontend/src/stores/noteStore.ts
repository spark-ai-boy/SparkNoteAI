// 笔记状态管理

import { create } from 'zustand';
import { notesApi, type Note, type NoteCreate, type Tag } from '../api/note';

interface NoteState {
  // 数据
  notes: Note[];
  tags: Tag[];
  currentNote: Note | null;

  // 状态
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // 分页
  pagination: {
    page: number;
    size: number;
    total: number;
    pages: number;
  };

  // 动作
  fetchNotes: (params?: { page?: number; size?: number; search?: string; tag?: string }) => Promise<void>;
  fetchNote: (noteId: number) => Promise<void>;
  createNote: (data: NoteCreate) => Promise<Note>;
  updateNote: (noteId: number, data: NoteCreate) => Promise<void>;
  deleteNote: (noteId: number) => Promise<void>;
  fetchTags: () => Promise<void>;
  deleteTag: (tagId: number) => Promise<void>;
  setCurrentNote: (note: Note | null) => void;
  clearError: () => void;
}

const initialState = {
  notes: [],
  tags: [],
  currentNote: null,
  isLoading: false,
  isSaving: false,
  error: null,
  pagination: {
    page: 1,
    size: 20,
    total: 0,
    pages: 0,
  },
};

export const useNoteStore = create<NoteState>((set, get) => ({
  ...initialState,

  fetchNotes: async (params?: { page?: number; size?: number; search?: string }) => {
    set({ isLoading: true, error: null });
    try {
      const response = await notesApi.getNotes(params);
      set({
        notes: response.items,
        pagination: {
          page: response.page,
          size: response.size,
          total: response.total,
          pages: response.pages,
        },
        isLoading: false,
      });
    } catch (error) {
      console.error('noteStore: 获取笔记列表失败:', error);
      set({
        error: '获取笔记列表失败',
        isLoading: false,
      });
    }
  },

  fetchNote: async (noteId: number) => {
    set({ isLoading: true, error: null });
    try {
      const note = await notesApi.getNote(noteId);
      set({ currentNote: note, isLoading: false });
    } catch (error) {
      console.error('获取笔记详情失败:', error);
      set({
        error: '获取笔记详情失败',
        isLoading: false,
      });
    }
  },

  createNote: async (data: NoteCreate) => {
    set({ isSaving: true, error: null });
    try {
      const note = await notesApi.createNote(data);
      set((state) => ({
        notes: [note, ...state.notes],
        currentNote: note,
        isSaving: false,
      }));
      return note;
    } catch (error) {
      console.error('创建笔记失败:', error);
      set({
        error: '创建笔记失败',
        isSaving: false,
      });
      throw error;
    }
  },

  updateNote: async (noteId: number, data: NoteCreate) => {
    set({ isSaving: true, error: null });
    try {
      const note = await notesApi.updateNote(noteId, data);
      set((state) => ({
        notes: state.notes.map((n) => (n.id === noteId ? note : n)),
        currentNote: note,
        isSaving: false,
      }));
    } catch (error) {
      console.error('更新笔记失败:', error);
      set({
        error: '更新笔记失败',
        isSaving: false,
      });
      throw error;
    }
  },

  deleteNote: async (noteId: number) => {
    set({ isSaving: true, error: null });
    try {
      await notesApi.deleteNote(noteId);
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== noteId),
        currentNote: state.currentNote?.id === noteId ? null : state.currentNote,
        isSaving: false,
      }));
    } catch (error) {
      console.error('删除笔记失败:', error);
      set({
        error: '删除笔记失败',
        isSaving: false,
      });
      throw error;
    }
  },

  fetchTags: async () => {
    try {
      const tags = await notesApi.getTags();
      set({ tags });
    } catch (error) {
      console.error('获取标签失败:', error);
    }
  },

  createTag: async (data: { name: string; color?: string }) => {
    try {
      const newTag = await notesApi.createTag(data);
      // 直接将新标签添加到列表
      set((state) => ({
        tags: [...state.tags, newTag],
      }));
      return newTag;
    } catch (error) {
      console.error('创建标签失败:', error);
      throw error;
    }
  },

  deleteTag: async (tagId: number) => {
    try {
      await notesApi.deleteTag(tagId);
      // 删除成功后重新获取标签
      const tags = await notesApi.getTags();
      set({ tags });
      // 同时更新 notes 列表中所有包含该标签的笔记
      const { notes, currentNote } = get();
      set({
        notes: notes.map((note) => {
          if (note.tag_ids?.includes(tagId)) {
            return {
              ...note,
              tag_ids: note.tag_ids.filter((id) => id !== tagId),
              tags: note.tags.filter((_, index) => {
                // tags 是字符串数组，需要根据 tag_ids 同步过滤
                const correspondingId = note.tag_ids?.[index];
                return correspondingId !== tagId;
              }),
            };
          }
          return note;
        }),
        currentNote: currentNote && currentNote.tag_ids?.includes(tagId)
          ? {
              ...currentNote,
              tag_ids: currentNote.tag_ids.filter((id) => id !== tagId),
              tags: currentNote.tags.filter((_, index) => {
                const correspondingId = currentNote.tag_ids?.[index];
                return correspondingId !== tagId;
              }),
            }
          : currentNote,
      });
    } catch (error) {
      console.error('删除标签失败:', error);
      throw error;
    }
  },

  setCurrentNote: (note: Note | null) => {
    set({ currentNote: note });
  },

  clearError: () => {
    set({ error: null });
  },
}));

export default useNoteStore;
