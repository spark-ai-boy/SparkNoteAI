// AI 助手（手机端）

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { spacing, typography } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { LogoIcon, SendIcon } from '../../components/icons';
import { aiAssistantApi, type ChatMessage as ApiChatMessage } from '../../api/aiAssistant';
import { ChatBubble } from './components/ChatBubble';

type MobileNotesStackParamList = {
  NotesHome: undefined;
  AIAgent: undefined;
  KnowledgeGraph: undefined;
  Settings: undefined;
  Tasks: undefined;
  NoteDetail: { noteId: number };
  Import: { url?: string };
};
type NavProp = NativeStackNavigationProp<MobileNotesStackParamList, 'AIAgent'>;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const AIAgentScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
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

  // 动态设置导航栏标题（自定义组件实现模型名+灰色供应商）
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => {
        const modelName = config?.model || 'AI 助手';
        const providerName = config?.provider ? ` · ${config.provider}` : '';
        return (
          <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>
            {modelName}{providerName}
          </Text>
        );
      },
    });
  }, [navigation, config]);

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

    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const userMsg: Message = {
      id,
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
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
        <View style={[styles.inputContainer, { backgroundColor: colors.background }]}>
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
          {messages.length > 0 && (
            <Pressable onPress={handleClear} style={[styles.clearButton, { marginRight: spacing.xs }]}>
              <Text style={[styles.clearButtonText, { color: colors.textTertiary }]}>清空</Text>
            </Pressable>
          )}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
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
  clearButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clearButtonText: {
    fontSize: 14,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AIAgentScreen;
