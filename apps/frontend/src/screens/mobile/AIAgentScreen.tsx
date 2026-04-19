// AI 助手（手机端）

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, typography } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { LogoIcon, SendIcon } from '../../components/icons';
import { aiAssistantApi, type ChatMessage as ApiChatMessage } from '../../api/aiAssistant';
import { ChatBubble } from './components/ChatBubble';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const AIAgentScreen: React.FC = () => {
  const colors = useTheme();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const flatListRef = useRef<FlatList>(null);
  const streamingContentRef = useRef('');

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages, streamingContent]);

  const fetchConfig = async () => {
    try {
      const cfg = await aiAssistantApi.getConfig();
      setConfig(cfg);
    } catch (e) {
      // 配置获取失败不影响聊天
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const trimmed = query.trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setIsTyping(true);
    setStreamingContent('');
    streamingContentRef.current = '';

    const apiMessages: ApiChatMessage[] = [
      ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: trimmed },
    ];

    aiAssistantApi.chat(
      apiMessages,
      (chunk) => {
        streamingContentRef.current += chunk;
        setStreamingContent(streamingContentRef.current);
      },
      () => {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: streamingContentRef.current,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setStreamingContent('');
        streamingContentRef.current = '';
        setIsTyping(false);
      },
      (error) => {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `抱歉，出现了错误：${error}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setStreamingContent('');
        streamingContentRef.current = '';
        setIsTyping(false);
      }
    );
  };

  const handleClear = () => {
    setMessages([]);
    setStreamingContent('');
    streamingContentRef.current = '';
    setIsTyping(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const modelName = config?.model || 'AI 助手';
  const providerName = config?.provider ? ` · ${config.provider}` : '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>AI 助手</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {modelName}{providerName}
          </Text>
        </View>
        {messages.length > 0 && (
          <Pressable onPress={handleClear}>
            <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>清空</Text>
          </Pressable>
        )}
        {messages.length === 0 && <View style={{ width: 32 }} />}
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        {messages.length === 0 && !streamingContent ? (
          <View style={styles.welcomeContainer}>
            <View style={[styles.welcomeIcon, { backgroundColor: colors.backgroundSecondary }]}>
              <LogoIcon size={40} color={colors.primary} />
            </View>
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>你好，我是 SparkNoteAI</Text>
            <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
              可以问我任何问题，或让我帮你总结、创作、分析
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            style={styles.chatContainer}
            contentContainerStyle={styles.chatContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <ChatBubble message={item.content} isUser={item.role === 'user'} />
            )}
            ListFooterComponent={() => (
              <>
                {streamingContent ? (
                  <ChatBubble message={streamingContent} isUser={false} />
                ) : null}
                {isTyping && !streamingContent && (
                  <View style={[styles.typingIndicator, { alignSelf: 'flex-start' }]}>
                    <ActivityIndicator size="small" color={colors.textTertiary} />
                  </View>
                )}
              </>
            )}
          />
        )}

        {/* Input */}
        <View style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder="输入消息..."
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit
          />
          <Pressable
            style={[
              styles.sendButton,
              { backgroundColor: query.trim() ? colors.primary : colors.textTertiary },
            ]}
            onPress={handleSend}
            disabled={!query.trim() || isTyping}
          >
            <SendIcon size={18} color={query.trim() ? colors.primaryForeground : colors.background} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  clearButtonText: {
    fontSize: 14,
  },
  keyboardView: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    paddingVertical: spacing.md,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  welcomeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  welcomeText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  typingIndicator: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AIAgentScreen;
