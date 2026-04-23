// LLM 配置 API 客户端 - 适配统一配置系统

import client, { getAuthToken } from './client';

// 聊天消息类型
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// LLM 集成配置
export interface LLMIntegration {
  id: number;
  integration_type: string;
  config_key: string;
  provider: string;
  name: string;
  config: {
    model?: string;
    api_key?: string;
    endpoint?: string;
    [key: string]: any;
  };
  is_default: boolean;
  is_enabled: boolean;
  has_api_key: boolean;
  created_at: string;
  updated_at?: string;
}

// 创建 LLM 配置请求
export interface CreateLLMIntegrationRequest {
  integration_type: string;
  provider: string;
  name: string;
  config_key?: string;
  config: {
    model?: string;
    api_key?: string;
    endpoint?: string;
    [key: string]: any;
  };
  is_default?: boolean;
}

// 更新 LLM 配置请求
export interface UpdateLLMIntegrationRequest {
  name?: string;
  config?: {
    model?: string;
    api_key?: string;
    endpoint?: string;
    [key: string]: any;
  };
  is_default?: boolean;
  is_enabled?: boolean;
}

// 测试连接请求
export interface TestLLMConnectionRequest {
  integration_type: string;
  config: {
    model?: string;
    api_key?: string;
    endpoint?: string;
    [key: string]: any;
  };
}

// 测试结果
export interface LLMTestResult {
  success: boolean;
  message: string;
}

// 集成类型定义
export interface LLMIntegrationType {
  type: string;
  name: string;
  description: string;
  config_fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    description: string;
    placeholder: string;
    default?: any;
  }>;
  supports_custom_model: boolean;
  supports_model_list: boolean;
}

// 获取所有 LLM 集成配置 - 使用后端 /integrations?integration_type=llm
export const getLLMIntegrations = async (): Promise<LLMIntegration[]> => {
  const response = await client.get('/integrations', {
    params: { integration_type: 'llm', include_config: true }
  });
  return response.data;
};

// 获取单个 LLM 集成配置 - 使用后端 /integrations/{type}/{key}
export const getLLMIntegration = async (configKey: string): Promise<LLMIntegration> => {
  const response = await client.get(`/integrations/llm/${configKey}`);
  return response.data;
};

// 创建 LLM 集成配置 - 使用后端 POST /integrations
export const createLLMIntegration = async (data: CreateLLMIntegrationRequest): Promise<LLMIntegration> => {
  const response = await client.post('/integrations', data);
  return response.data;
};

// 更新 LLM 集成配置 - 使用后端 PUT /integrations/{type}/{key}
export const updateLLMIntegration = async (configKey: string, data: UpdateLLMIntegrationRequest): Promise<LLMIntegration> => {
  const response = await client.put(`/integrations/llm/${configKey}`, data);
  return response.data;
};

// 删除 LLM 集成配置 - 使用后端 DELETE /integrations/{type}/{key}
export const deleteLLMIntegration = async (configKey: string): Promise<void> => {
  await client.delete(`/integrations/llm/${configKey}`);
};

// 设置默认 LLM 配置 - 使用后端 POST /integrations/{type}/{key}/set-default
export const setDefaultLLMIntegration = async (configKey: string): Promise<LLMIntegration> => {
  const response = await client.post(`/integrations/llm/${configKey}/set-default`);
  return response.data;
};

// 测试 LLM 连接 - 使用后端 POST /integrations/{type}/{key}/test
export const testLLMConnection = async (configKey: string): Promise<LLMTestResult> => {
  const response = await client.post(`/integrations/llm/${configKey}/test`);
  return response.data;
};

// 测试临时 LLM 配置（无需先保存）- 使用后端 POST /integrations/{type}/test
export const testLLMConnectionTemp = async (
  provider: string,
  config: {
    model?: string;
    api_key?: string;
    endpoint?: string;
    [key: string]: any;
  }
): Promise<LLMTestResult> => {
  const response = await client.post('/integrations/llm/test', {
    provider,
    config,
  });
  return response.data;
};

// 获取支持的 LLM 集成类型 - 使用后端 GET /integrations/providers?integration_type=llm
export const getLLMIntegrationTypes = async (): Promise<LLMIntegrationType[]> => {
  const response = await client.get('/integrations/providers', {
    params: { integration_type: 'llm' }
  });
  // 后端返回格式：{ llm: { type: 'llm', name: '...', description: '...', providers: [...] } }
  // providers 数组中的对象结构：{ provider_id, provider_name, description, config_fields, ... }
  const data = response.data;
  const providers = data.llm?.providers || [];
  // 转换字段名：provider_id -> type, provider_name -> name
  return providers.map((p: any) => ({
    type: p.provider_id,
    name: p.provider_name,
    description: p.description,
    config_fields: p.config_fields,
    supports_custom_model: p.supports_custom_model,
    supports_model_list: p.supports_model_list,
  }));
};

// 获取指定提供商的 Schema
export const getLLMProviderSchema = async (providerId: string): Promise<any> => {
  const response = await client.get(`/integrations/providers/${providerId}`, {
    params: { integration_type: 'llm' }
  });
  return response.data;
};

// 聊天（流式）- 使用后端 AI 助手 API /features/ai_assistant/chat
export const chatStream = async (
  messages: ChatMessage[],
  onChunk: (content: string) => void,
  onComplete: () => void,
  onError: (error: string) => void
): Promise<AbortController> => {
  const controller = new AbortController();

  const token = await getAuthToken();

  const response = await fetch(`${client.defaults.baseURL}/features/ai_assistant/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`,
    },
    body: JSON.stringify({
      messages,
      stream: true,
    }),
    signal: controller.signal,
  });

  if (!response.ok) {
    const error = await response.text();
    onError(error);
    return controller;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError('Response body is null');
    return controller;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  const pump = async () => {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          onComplete();
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                onChunk(parsed.content);
              }
              if (parsed.error) {
                onError(parsed.error);
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
    } catch (error) {
      if ((error as any).name !== 'AbortError') {
        onError((error as any).message);
      }
    }
  };

  pump();
  return controller;
};

// 兼容旧 API - 已废弃
export const llmConfigApi = {
  getConfigs: getLLMIntegrations,
  getConfig: getLLMIntegration,
  createConfig: createLLMIntegration,
  updateConfig: updateLLMIntegration,
  deleteConfig: deleteLLMIntegration,
  setDefaultConfig: setDefaultLLMIntegration,
  testConnection: testLLMConnection,
  getProviders: getLLMIntegrationTypes,
  getProviderSchema: getLLMProviderSchema,
  chatStream,
};

export default llmConfigApi;
