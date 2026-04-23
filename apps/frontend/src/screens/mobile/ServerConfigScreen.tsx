// 服务器配置（手机端）— iOS 分组卡片风格

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../../navigation/SettingsStack';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { useServerConfigStore } from '../../stores/serverConfigStore';
import { useAuthStore } from '../../stores/authStore';
import apiClient from '../../api/client';
import { ServerIcon, RefreshCwIcon, GlobeIcon, ChevronRightIcon } from '../../components/icons';

type NavProp = NativeStackNavigationProp<SettingsStackParamList, 'ServerConfig'>;

export const ServerConfigScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const colors = useTheme();
  const { baseUrl, serverInfo, loadConfig } = useServerConfigStore();
  const { logout } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await loadConfig();
    try {
      const response = await apiClient.get('/version');
      if (response.data) {
        useServerConfigStore.setState({
          serverInfo: {
            version: response.data.version,
            compatible_client_versions: response.data.compatible_client_versions || [],
          },
        });
      }
    } catch {
      // 忽略
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  const versions = serverInfo?.compatible_client_versions || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 服务器信息 */}
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.infoHeader}>
            <ServerIcon size={20} color={colors.textSecondary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>服务器信息</Text>
          </View>
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={styles.rowLeft}>
              <GlobeIcon size={18} color={colors.textTertiary} />
              <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>服务器地址</Text>
            </View>
            <Text style={[styles.rowValue, { color: colors.text }]} numberOfLines={1}>{baseUrl}</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={{ fontSize: 16, lineHeight: 18, fontWeight: '600' }}>v</Text>
              <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>后端版本</Text>
            </View>
            <Text style={[styles.rowValue, { color: colors.text }]}>{serverInfo?.version || '未知'}</Text>
          </View>
        </View>

        {/* 兼容版本 */}
        {versions.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={styles.infoHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>兼容客户端版本</Text>
            </View>
            {versions.map((v: string, i: number) => {
              const isLast = i === versions.length - 1;
              return (
                <View key={v}>
                  {!isLast && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  <View style={styles.versionRow}>
                    <View style={[styles.versionDot, { backgroundColor: colors.success }]} />
                    <Text style={[styles.versionText, { color: colors.text }]}>{v}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* 操作 */}
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
          <Pressable style={styles.actionRow} onPress={loadData}>
            <RefreshCwIcon size={20} color={colors.textSecondary} />
            <Text style={[styles.actionText, { color: colors.text }]}>重新加载配置</Text>
            <ChevronRightIcon size={16} color={colors.textTertiary} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable style={[styles.actionRow, styles.dangerRow]} onPress={() => logout()}>
            <Text style={[styles.actionText, { color: colors.error }]}>更换服务器</Text>
            <ChevronRightIcon size={16} color={colors.error} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // 卡片
  card: { borderRadius: 12, overflow: 'hidden', marginBottom: spacing.md },

  // 卡片标题
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '400',
  },

  // 信息行
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowLabel: {
    fontSize: 15,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 200,
  },

  // 版本行
  divider: { height: 0.5, marginLeft: spacing.md + spacing.xs + 18 },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  versionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  versionText: {
    fontSize: 14,
  },

  // 操作行
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dangerRow: {
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    fontSize: 17,
  },
});

export default ServerConfigScreen;
