// Mock 服务层

import { Fragment, MOCK_FRAGMENTS } from './data';

export const fragmentService = {
  // 获取所有片段
  getAll: async (): Promise<Fragment[]> => {
    await simulateDelay();
    return MOCK_FRAGMENTS;
  },

  // 按类型筛选
  getByType: async (type: 'note' | 'import'): Promise<Fragment[]> => {
    await simulateDelay();
    return MOCK_FRAGMENTS.filter((f) => f.type === type);
  },

  // 按来源筛选
  getBySource: async (sourceType: string): Promise<Fragment[]> => {
    await simulateDelay();
    return MOCK_FRAGMENTS.filter((f) => f.source_type === sourceType);
  },

  // 按标签筛选
  getByTag: async (tag: string): Promise<Fragment[]> => {
    await simulateDelay();
    return MOCK_FRAGMENTS.filter((f) => f.tags.includes(tag));
  },

  // 获取单个片段
  getById: async (id: string): Promise<Fragment | undefined> => {
    await simulateDelay();
    return MOCK_FRAGMENTS.find((f) => f.id === id);
  },

  // 创建片段
  create: async (fragment: Omit<Fragment, 'id' | 'created_at' | 'updated_at'>): Promise<Fragment> => {
    await simulateDelay();
    const newFragment: Fragment = {
      ...fragment,
      id: String(Date.now()),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_FRAGMENTS.unshift(newFragment);
    return newFragment;
  },

  // 更新片段
  update: async (id: string, updates: Partial<Fragment>): Promise<Fragment | undefined> => {
    await simulateDelay();
    const index = MOCK_FRAGMENTS.findIndex((f) => f.id === id);
    if (index === -1) return undefined;

    MOCK_FRAGMENTS[index] = {
      ...MOCK_FRAGMENTS[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return MOCK_FRAGMENTS[index];
  },

  // 删除片段
  delete: async (id: string): Promise<boolean> => {
    await simulateDelay();
    const index = MOCK_FRAGMENTS.findIndex((f) => f.id === id);
    if (index === -1) return false;

    MOCK_FRAGMENTS.splice(index, 1);
    return true;
  },

  // 搜索
  search: async (query: string): Promise<Fragment[]> => {
    await simulateDelay(300);
    const lowerQuery = query.toLowerCase();
    return MOCK_FRAGMENTS.filter(
      (f) =>
        f.title.toLowerCase().includes(lowerQuery) ||
        f.content.toLowerCase().includes(lowerQuery) ||
        f.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  },
};

// 模拟网络延迟
const simulateDelay = (ms: number = 100): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
