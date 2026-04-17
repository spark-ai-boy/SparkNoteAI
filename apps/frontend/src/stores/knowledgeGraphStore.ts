// 知识图谱状态管理

import { create } from 'zustand';
import { knowledgeGraphApi, type GraphData, type KnowledgeGraphStatus } from '../api/knowledgeGraph';
import { useImportTaskStore } from './importTaskStore';

interface KnowledgeGraphState {
  // 状态
  status: KnowledgeGraphStatus | null;
  graphData: GraphData | null;

  // 加载状态
  isLoadingStatus: boolean;
  isLoadingData: boolean;
  error: string | null;

  // 操作
  fetchStatus: () => Promise<void>;
  fetchData: () => Promise<void>;
  startBuild: (rebuild?: boolean) => Promise<void>;
  clearGraph: () => Promise<void>;
  resetState: () => void;
}

let progressPollingInterval: NodeJS.Timeout | null = null;

const clearProgressPolling = () => {
  if (progressPollingInterval) {
    clearInterval(progressPollingInterval);
    progressPollingInterval = null;
  }
};

const startProgressPolling = (fetchStatus: () => Promise<void>) => {
  clearProgressPolling();
  progressPollingInterval = setInterval(() => {
    fetchStatus();
  }, 2000);
};

export const useKnowledgeGraphStore = create<KnowledgeGraphState>((set, get) => ({
  status: null,
  graphData: null,
  isLoadingStatus: false,
  isLoadingData: false,
  error: null,

  fetchStatus: async () => {
    set({ isLoadingStatus: true, error: null });
    try {
      const status = await knowledgeGraphApi.getStatus();
      const prevState = get();

      // 如果之前构建中，现在完成，自动刷新数据
      if (prevState.status?.is_building && !status.is_building) {
        console.log('[KnowledgeGraphStore] 构建完成，自动刷新图谱数据');
        clearProgressPolling();
        // 刷新数据
        const data = await knowledgeGraphApi.getData();
        set({
          status,
          graphData: data,
          isLoadingStatus: false,
          isLoadingData: false,
        });
        return;
      }

      set({ status, isLoadingStatus: false });

      // 如果构建中，开始轮询
      if (status.is_building) {
        startProgressPolling(get().fetchStatus);
      } else {
        clearProgressPolling();
      }
    } catch (error: any) {
      set({ error: error.message, isLoadingStatus: false });
      clearProgressPolling();
    }
  },

  fetchData: async () => {
    set({ isLoadingData: true, error: null });
    try {
      const data = await knowledgeGraphApi.getData();
      set({ graphData: data, isLoadingData: false });
    } catch (error: any) {
      set({ error: error.message, isLoadingData: false });
    }
  },

  startBuild: async (rebuild = false) => {
    console.log('[KnowledgeGraphStore] startBuild 调用, rebuild:', rebuild);
    set({ error: null });
    try {
      // 如果是重建，立即清空图谱数据并标记构建中
      if (rebuild) {
        console.log('[KnowledgeGraphStore] 重建模式，清空图谱数据');
        clearProgressPolling();
        set({
          graphData: null,
          status: {
            has_llm_config: true,  // 保持 LLM 配置状态
            graph_exists: false,
            node_count: 0,
            edge_count: 0,
            is_building: true,
            building_progress: 0,
          },
          isLoadingStatus: false,
          isLoadingData: false,
        });
      }
      // 创建构建任务
      console.log('[KnowledgeGraphStore] 调用 knowledgeGraphApi.buildGraph...');
      const task = await knowledgeGraphApi.buildGraph(rebuild);
      console.log('[KnowledgeGraphStore] 创建知识图谱任务:', task);
      // 刷新任务列表
      await useImportTaskStore.getState().fetchTasks();
      // 开始轮询状态
      startProgressPolling(get().fetchStatus);
    } catch (error: any) {
      console.error('[KnowledgeGraphStore] startBuild 错误:', error);
      console.error('[KnowledgeGraphStore] 错误响应:', error.response?.data);
      // 处理全量构建进行中的错误
      if (error.response?.status === 400 && error.response?.data?.detail?.includes('全量构建')) {
        set({ error: '已有全量构建任务正在进行中，请等待完成后再试' });
      } else {
        set({ error: error.message || '构建任务创建失败' });
      }
    }
  },

  clearGraph: async () => {
    set({ error: null });
    try {
      await knowledgeGraphApi.clearGraph();
      set({ graphData: null, status: null });
      setTimeout(() => {
        get().fetchStatus();
      }, 500);
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  resetState: () => {
    clearProgressPolling();
    set({
      status: null,
      graphData: null,
      isLoadingStatus: false,
      isLoadingData: false,
      error: null,
    });
  },
}));

export default useKnowledgeGraphStore;
