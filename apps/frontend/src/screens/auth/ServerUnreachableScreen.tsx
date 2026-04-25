// 服务器连接失败界面

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { WifiOffIcon, RefreshCwIcon, LogOutIcon } from '../../components/icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore, useServerConfigStore } from '../../stores';

const ServerUnreachableScreen: React.FC = () => {
  const colors = useTheme();
  const { isServerUnreachable, isLoading, retryConnection } = useAuthStore();
  const { baseUrl } = useServerConfigStore();

  const handleBackToLogin = () => {
    useAuthStore.setState({ isServerUnreachable: false, isLoading: false });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.card }]}>
          <WifiOffIcon size={48} color={colors.textSecondary} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>无法连接到服务器</Text>

        <Text style={[styles.description, { color: colors.textSecondary }]}>
          请检查网络连接或服务器状态
        </Text>

        {baseUrl && !baseUrl.includes('localhost') && (
          <Text style={[styles.serverUrl, { color: colors.textTertiary }]}>
            服务器地址：{baseUrl}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={retryConnection}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <RefreshCwIcon size={20} color="#fff" />
              <Text style={styles.retryButtonText}>重新连接</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={handleBackToLogin}
        >
          <LogOutIcon size={20} color={colors.textSecondary} />
          <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
            返回登录
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  serverUrl: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    minWidth: 180,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    minWidth: 180,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ServerUnreachableScreen;
