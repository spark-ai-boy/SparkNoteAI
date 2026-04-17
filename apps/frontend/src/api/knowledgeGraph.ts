// 知识图谱 API 客户端

import client from './client';

export interface GraphNode {
  id: number;
  name: string;
  node_type: 'concept' | 'topic' | 'entity';
  description?: string;
  source_note_ids?: string[];
}

export interface GraphEdge {
  id: number;
  source_node_id: number;
  target_node_id: number;
  edge_type: 'related' | 'hierarchical' | 'sequential';
  description?: string;
  strength: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface KnowledgeGraphStatus {
  has_llm_config: boolean;
  graph_exists: boolean;
  node_count: number;
  edge_count: number;
  is_building: boolean;
  building_progress: number;
  is_full_build?: boolean; // 当前进行中的任务是否为全量构建
  last_built_at?: string;
}

export interface BuildGraphProgress {
  status: 'idle' | 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  stats?: Record<string, any>;
}

export const knowledgeGraphApi = {
  // 获取图谱状态
  getStatus: async (): Promise<KnowledgeGraphStatus> => {
    const response = await client.get('/knowledge-graph/status');
    return response.data;
  },

  // 获取图谱数据
  getData: async (): Promise<GraphData> => {
    const response = await client.get('/knowledge-graph/data');
    return response.data;
  },

  // 构建图谱（创建任务）
  buildGraph: async (rebuild: boolean = false): Promise<any> => {
    console.log('[knowledgeGraphApi] buildGraph 调用, rebuild:', rebuild);
    const response = await client.post('/tasks', {
      task_type: 'knowledge_graph_build',
      title: rebuild ? '重新构建知识图谱' : '构建知识图谱',
      description: rebuild ? '清空现有数据并重新构建知识图谱' : '从笔记中提取概念构建知识图谱',
      metadata_json: JSON.stringify({ rebuild }),
    });
    console.log('[knowledgeGraphApi] buildGraph 响应:', response.data);
    return response.data;
  },

  // 获取构建进度（通过任务详情获取）
  getBuildProgress: async (taskId: number): Promise<any> => {
    const response = await client.get(`/tasks/${taskId}`);
    return response.data;
  },

  // 清空图谱
  clearGraph: async (): Promise<void> => {
    await client.delete('/knowledge-graph/data');
  },

  // 获取所有节点
  getNodes: async (): Promise<GraphNode[]> => {
    const response = await client.get('/knowledge-graph/nodes');
    return response.data;
  },

  // 获取所有边
  getEdges: async (): Promise<GraphEdge[]> => {
    const response = await client.get('/knowledge-graph/edges');
    return response.data;
  },

  // 删除节点
  deleteNode: async (nodeId: number): Promise<void> => {
    await client.delete(`/knowledge-graph/nodes/${nodeId}`);
  },

  // 删除边
  deleteEdge: async (edgeId: number): Promise<void> => {
    await client.delete(`/knowledge-graph/edges/${edgeId}`);
  },
};
