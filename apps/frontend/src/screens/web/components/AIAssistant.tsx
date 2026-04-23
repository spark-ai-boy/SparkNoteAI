// AI 助手页面组件

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { spacing } from '../../../theme';
import { useWebTheme } from '../../../hooks/useWebTheme';
import { LogoIcon } from '../../../components/icons';
import {
  aiAssistantApi,
  type ChatMessage,
  type AIAssistantConfig,
} from '../../../api/aiAssistant';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  onSearch?: (query: string) => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ onSearch }) => {
  const colors = useWebTheme();
  const [query, setQuery] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [config, setConfig] = useState<AIAssistantConfig | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const streamingContentRef = useRef('');

  // 获取 AI 助手配置
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const cfg = await aiAssistantApi.getConfig();
      setConfig(cfg);
    } catch (error) {
      console.error('获取 AI 助手配置失败:', error);
    }
  };

  // 格式化 Provider 显示名称
  const formatProviderName = (providerId: string | null | undefined): string => {
    if (!providerId) return '未配置';
    const providerNames: Record<string, string> = {
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      azure_openai: 'Azure OpenAI',
      aliyun: '阿里百炼',
      aliyun_codeplan: '阿里云 CodePlan',
    };
    return providerNames[providerId] || providerId;
  };

  const displayProvider = formatProviderName(config?.provider);
  const displayModel = config?.model || '请选择模型';
  const isEnabled = config?.is_enabled !== false;

  const handleSubmit = async (text: string = query) => {
    if (!text.trim()) return;

    if (!isEnabled) {
      const errorMessage: Message = {
        id: String(Date.now()),
        role: 'assistant',
        content: 'AI 助手功能已禁用，请在设置中启用。',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    if (!config?.provider) {
      const errorMessage: Message = {
        id: String(Date.now()),
        role: 'assistant',
        content: '未配置 LLM，请先前往设置 > 场景配置 > AI 助手中配置大模型。',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = {
      id: String(Date.now()),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery('');
    setIsTyping(true);
    setStreamingContent('');
    streamingContentRef.current = '';

    // 准备聊天消息
    const chatMessages: ChatMessage[] = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));
    chatMessages.push({ role: 'user', content: text });

    try {
      // 调用流式聊天 API（使用场景配置）
      await aiAssistantApi.chat(
        chatMessages,
        // onChunk
        (content: string) => {
          setStreamingContent((prev) => {
            const newContent = prev + content;
            streamingContentRef.current = newContent;
            return newContent;
          });
        },
        // onComplete
        () => {
          if (streamingContentRef.current) {
            const aiMessage: Message = {
              id: String(Date.now()),
              role: 'assistant',
              content: streamingContentRef.current,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
          }
          setIsTyping(false);
          setStreamingContent('');
          streamingContentRef.current = '';
        },
        // onError
        (error: string) => {
          const errorMessage: Message = {
            id: String(Date.now()),
            role: 'assistant',
            content: `抱歉，发生错误：${error}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
          setIsTyping(false);
          setStreamingContent('');
          streamingContentRef.current = '';
        }
      );
    } catch (error: any) {
      const errorMessage: Message = {
        id: String(Date.now()),
        role: 'assistant',
        content: `抱歉，发生错误：${error.message || '请求失败'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsTyping(false);
      setStreamingContent('');
      streamingContentRef.current = '';
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  // 渲染聊天界面
  const renderChat = () => {
    console.log('renderChat - messages.length:', messages.length);

    if (messages.length === 0) {
      // 欢迎界面
      return (
        <>
          {/* 顶部模型信息栏 */}
          <View style={[styles.modelHeader, { borderBottomColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
            <View style={styles.modelInfo}>
              <Text style={[styles.modelProvider, { color: colors.text }]}>
                {displayProvider}
              </Text>
              <Text style={[styles.modelDivider, { color: colors.textTertiary }]}>•</Text>
              <Text style={[styles.modelName, { color: colors.textSecondary }]}>
                {displayModel}
              </Text>
            </View>
          </View>

          <View style={styles.welcomeSection}>
            <View style={styles.welcomeContent}>
              {/* Logo 和标题 */}
              <View style={styles.logoWrapper}>
                <LogoIcon size={48} strokeWidth={1.5} color={colors.text} style={styles.logoIcon} />
              </View>
              <Text style={[styles.welcomeTitle, { color: colors.text }]}>知语拾光</Text>
              <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>SparkNoteAI AI Assistant</Text>

              {/* 文艺文案 */}
              <View style={styles.poeticContainer}>
                <Text style={[styles.poeticText, { color: colors.textTertiary }]}>在这里，文字被赋予新的意义</Text>
                <Text style={[styles.poeticText, { color: colors.textTertiary }]}>每一个问题，都是一次探索的开始</Text>
                <Text style={[styles.poeticText, { color: colors.textTertiary }]}>让知识如光般照亮你的世界</Text>
              </View>
            </View>
          </View>
          {/* 底部输入框 - 欢迎界面 */}
          <View style={[styles.chatInputContainer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <View style={[
              styles.chatInputBox,
              { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
              Platform.OS === 'web' && {
                boxShadow: inputFocused
                  ? `0px 4px 16px ${colors.primary}20`
                  : '0px 1px 8px rgba(0,0,0,0.05)',
              },
            ]}>
              <TextInput
                placeholder="在这里输入消息，按 Enter 发送"
                placeholderTextColor={colors.textTertiary}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => handleSubmit()}
                onKeyPress={(e) => {
                  if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                multiline
                returnKeyType="send"
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                // @ts-ignore - Web only style
                style={[styles.chatInput, { color: colors.text, outlineStyle: 'none', outlineWidth: 0 }]}
              />

              {/* 底部工具栏 */}
              <View style={styles.inputFooter}>
                <TouchableOpacity
                  style={[
                    styles.chatSendButton,
                    { backgroundColor: colors.primary },
                    !query.trim() && { backgroundColor: colors.border },
                  ]}
                  onPress={() => handleSubmit()}
                  disabled={!query.trim()}
                >
                  <Text style={[styles.chatSendButtonText, { color: query.trim() ? colors.cta : colors.textTertiary }]}>↑</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </>
      );
    }

    // 聊天消息列表
    return (
      <>
        {/* 顶部模型信息栏 */}
        <View style={[styles.modelHeader, { borderBottomColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.modelInfo}>
            <Text style={[styles.modelProvider, { color: colors.text }]}>
              {displayProvider}
            </Text>
            <Text style={[styles.modelDivider, { color: colors.textTertiary }]}>•</Text>
            <Text style={[styles.modelName, { color: colors.textSecondary }]}>
              {displayModel}
            </Text>
          </View>
        </View>

        {/* 聊天消息和输入框 */}
        <View style={styles.chatContentWrapper}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatScrollView}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
          >

          {messages.map((message) => (
            <View
              key={message.id}
              style={message.role === 'user' ? styles.messageRowUser : styles.messageRow}
            >
              {message.role === 'assistant' && (
                /* AI 头像（左侧）*/
                <View style={styles.avatarContainer}>
                  <View style={[styles.aiAvatarGradient, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={styles.aiAvatarText}>✨</Text>
                  </View>
                </View>
              )}

              {/* 消息内容 */}
              <View style={message.role === 'user' ? styles.messageContentWrapperUser : styles.messageContentWrapper}>
                {/* 消息头部 */}
                <View style={styles.messageHeader}>
                  {message.role === 'assistant' && (
                    <Text style={[styles.messageSenderName, { color: colors.text }]}>知语拾光 AI</Text>
                  )}
                  {message.role === 'user' && (
                    <Text style={[styles.messageSenderName, { color: colors.text }]}>我</Text>
                  )}
                  <Text style={[styles.messageTimestamp, { color: colors.textTertiary }]}>
                    {message.timestamp.toLocaleString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>

                {/* 消息正文 */}
                <View style={[
                  styles.messageBubble,
                  message.role === 'user' ? { ...styles.userMessageBubble, backgroundColor: colors.primary, borderColor: colors.primary } : { ...styles.aiMessageBubble, backgroundColor: colors.backgroundSecondary, borderColor: colors.border }
                ]}>
                  <Text style={message.role === 'user' ? [styles.userMessageText, { color: colors.white }] : [styles.messageText, { color: colors.text }]}>
                    {message.content}
                  </Text>
                </View>

                {/* Token 统计 */}
                {message.role === 'assistant' && (
                  <Text style={[styles.tokenCount, { color: colors.textTertiary }]}>Tokens: {message.content.length}</Text>
                )}
              </View>

              {message.role === 'user' && (
                /* 用户头像（右侧）*/
                <View style={styles.avatarContainerUser}>
                  <View style={[styles.userAvatar, { backgroundColor: '#10b981' }]}>
                    <Text style={styles.avatarText}>👤</Text>
                  </View>
                </View>
              )}
            </View>
          ))}

          {isTyping && streamingContent === '' && (
            <View style={styles.messageRow}>
              <View style={styles.aiAvatar}>
                <View style={[styles.aiAvatarGradient, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={styles.aiAvatarText}>✨</Text>
                </View>
              </View>
              <View style={styles.messageContentWrapper}>
                <View style={styles.messageHeader}>
                  <Text style={[styles.messageSenderName, { color: colors.text }]}>知语拾光 AI</Text>
                </View>
                <View style={[styles.messageBubble, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                  <View style={styles.typingIndicator}>
                    <Text style={[styles.typingDot, { color: colors.textSecondary }]}>●</Text>
                    <Text style={[styles.typingDot, { color: colors.textSecondary }]}>●</Text>
                    <Text style={[styles.typingDot, { color: colors.textSecondary }]}>●</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* 流式输出内容 */}
          {streamingContent !== '' && (
            <View style={styles.messageRow}>
              <View style={styles.aiAvatar}>
                <View style={[styles.aiAvatarGradient, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={styles.aiAvatarText}>✨</Text>
                </View>
              </View>
              <View style={styles.messageContentWrapper}>
                <View style={styles.messageHeader}>
                  <Text style={[styles.messageSenderName, { color: colors.text }]}>知语拾光 AI</Text>
                </View>
                <View style={[styles.messageBubble, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                  <Text style={[styles.messageText, { color: colors.text }]}>{streamingContent}</Text>
                </View>
              </View>
            </View>
          )}
          </ScrollView>

          {/* 底部输入框 - 仿参考设计 */}
          <View style={[styles.chatInputContainer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <View style={[
              styles.chatInputBox,
              { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
              Platform.OS === 'web' && {
                boxShadow: inputFocused
                  ? `0px 4px 16px ${colors.primary}20`
                  : '0px 1px 8px rgba(0,0,0,0.05)',
              },
            ]}>
              <TextInput
                placeholder="在这里输入消息，按 Enter 发送"
                placeholderTextColor={colors.textTertiary}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => handleSubmit()}
                onKeyPress={(e) => {
                  if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                multiline
                returnKeyType="send"
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                // @ts-ignore - Web only style
                style={[styles.chatInput, { color: colors.text, outlineStyle: 'none', outlineWidth: 0 }]}
              />

              {/* 底部工具栏 */}
              <View style={styles.inputFooter}>
                <TouchableOpacity
                  style={[
                    styles.chatSendButton,
                    { backgroundColor: colors.primary },
                    !query.trim() && { backgroundColor: colors.border },
                  ]}
                  onPress={() => handleSubmit()}
                  disabled={!query.trim()}
                >
                  <Text style={[styles.chatSendButtonText, { color: query.trim() ? colors.cta : colors.textTertiary }]}>↑</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderChat()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // 聊天界面
  chatContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  // 顶部模型信息栏
  modelHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modelProvider: {
    fontSize: 13,
    fontWeight: '600',
  },
  modelDivider: {
    fontSize: 12,
    marginHorizontal: spacing.sm,
  },
  modelName: {
    fontSize: 13,
  },
  chatScrollView: {
    flex: 1,
  },
  chatContent: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  chatContentWrapper: {
    flex: 1,
    flexDirection: 'column',
  },
  // 欢迎区域
  welcomeSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeContent: {
    alignItems: 'center',
    maxWidth: 600,
    paddingHorizontal: spacing.lg,
  },
  logoWrapper: {
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    opacity: 0.9,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  poeticContainer: {
    marginBottom: spacing.xl,
  },
  poeticText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: spacing.xs,
  },
  // 消息行布局
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  messageRowUser: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  // 头像
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    shrink: 0,
  },
  avatarContainerUser: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
    marginRight: 0,
    shrink: 0,
  },
  userAvatar: {
    backgroundColor: '#10b981',
  },
  aiAvatar: {
    overflow: 'hidden',
  },
  aiAvatarGradient: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
  },
  aiAvatarText: {
    fontSize: 18,
  },
  // 消息内容包装器
  messageContentWrapper: {
    paddingTop: spacing.xs,
    maxWidth: '80%',
  },
  messageContentWrapperUser: {
    paddingTop: spacing.xs,
    alignItems: 'flex-end',
    maxWidth: '80%',
    marginLeft: 'auto',
  },
  // 消息头部（发送者 + 时间）
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  messageSenderName: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  messageTimestamp: {
    fontSize: 11,
  },
  // 消息气泡
  messageBubble: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.xs,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  userMessageBubble: {
    borderWidth: 1,
    alignSelf: 'flex-end',
    maxWidth: '100%',
  },
  aiMessageBubble: {
    borderWidth: 1,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  userMessageText: {
    fontSize: 15,
    lineHeight: 24,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 24,
  },
  tokenCount: {
    fontSize: 10,
    marginTop: spacing.xs,
  },
  // 打字动画
  typingIndicator: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: spacing.sm,
  },
  typingDot: {
    fontSize: 16,
  },
  // 底部输入框
  chatInputContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
  },
  chatInputBox: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chatInput: {
    flex: 1,
    fontSize: 15,
    minHeight: 40,
    maxHeight: 120,
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  chatSendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendButtonDisabled: {
  },
  chatSendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: -2,
  },
});

export default AIAssistant;
