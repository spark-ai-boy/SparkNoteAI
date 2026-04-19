// AI 助手 API 客户端 - 使用场景配置

import client, { getAuthToken } from './client';

// 聊天消息类型
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// AI 助手配置（从 runtime-config 获取）
export interface AIAssistantConfig {
  feature_id: string;
  provider?: string | null;
  model?: string | null;
  temperature?: number;
  max_history?: number;
  system_prompt?: string;
  is_enabled: boolean;
}

// 流式聊天
export const chatWithAIAssistant = async (
  messages: ChatMessage[],
  onChunk: (content: string) => void,
  onComplete: () => void,
  onError: (error: string) => void
): Promise<AbortController> => {
  const controller = new AbortController();

  const token = await getAuthToken();

  try {
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
      const errorText = await response.text();
      onError(errorText || '请求失败');
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
                  return;
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
  } catch (error: any) {
    onError(error.message || '网络请求失败');
  }

  return controller;
};

// 非流式聊天
export const chatWithAIAssistantNonStream = async (
  messages: ChatMessage[]
): Promise<{ content: string }> => {
  const response = await client.post('/features/ai_assistant/chat/non-stream', {
    messages,
    stream: false,
  });
  return response.data;
};

// 获取 AI 助手配置（从场景设置获取）
export const getAIAssistantConfig = async (): Promise<any> => {
  const response = await client.get('/features/ai_assistant/runtime-config');
  return response.data;
};

// 更新 AI 助手配置（通过场景配置 API）
export const updateAIAssistantConfig = async (config: {
  integration_refs?: { llm?: string };
  use_default_llm?: boolean;
  custom_settings?: {
    temperature?: number;
    max_history?: number;
    system_prompt?: string;
  };
  is_enabled?: boolean;
}): Promise<any> => {
  const response = await client.put('/features/ai_assistant/settings', config);
  return response.data;
};

export default {
  chat: chatWithAIAssistant,
  chatNonStream: chatWithAIAssistantNonStream,
  getConfig: getAIAssistantConfig,
  updateConfig: updateAIAssistantConfig,
};

// 同时提供具名导出
export const aiAssistantApi = {
  chat: chatWithAIAssistant,
  chatNonStream: chatWithAIAssistantNonStream,
  getConfig: getAIAssistantConfig,
  updateConfig: updateAIAssistantConfig,
};
