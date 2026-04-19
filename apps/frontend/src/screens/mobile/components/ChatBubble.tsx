// 聊天消息气泡

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing } from '../../../theme';
import { useWebTheme } from '../../../hooks/useWebTheme';

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isUser }) => {
  const colors = useWebTheme();

  return (
    <View
      style={[
        styles.bubble,
        isUser
          ? [styles.userBubble, { backgroundColor: colors.primary }]
          : [styles.assistantBubble, { backgroundColor: colors.backgroundSecondary }],
      ]}
    >
      <Text style={[styles.text, { color: isUser ? colors.primaryForeground : colors.text }]}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
    marginVertical: spacing.xs,
  },
  userBubble: {
    alignSelf: 'flex-end',
    marginRight: spacing.md,
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    marginLeft: spacing.md,
    borderBottomLeftRadius: 6,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
});

export default ChatBubble;
