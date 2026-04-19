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
          <InfoRow label="服务器地址" value={baseUrl} isLast={versions.length === 0} colors={colors} />
          {versions.length === 0 && null}
        </View>

        {versions.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
            <InfoRow label="后端版本" value={serverInfo?.version || '未知'} isLast={true} colors={colors} />
          </View>
        )}

        {versions.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>兼容客户端版本</Text>
            {versions.map((v: string, i: number) => {
              const isLast = i === versions.length - 1;
              return (
                <View key={v}>
                  {!isLast && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  <Text style={[styles.versionText, { color: colors.text }]}>{v}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* 操作 */}
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
          <PressableRow title="更换服务器" onPress={() => logout()} isLast={false} colors={colors} />
          <PressableRow title="重新加载配置" onPress={loadData} isLast={true} colors={colors} />
        </View>
      </ScrollView>
    </View>
  );
};

const InfoRow: React.FC<{ label: string; value: string; isLast: boolean; colors: ReturnType<typeof useTheme> }> = ({ label, value, isLast, colors }) => (
  <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    {!isLast && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
  </View>
);

const PressableRow: React.FC<{ title: string; onPress: () => void; isLast: boolean; colors: ReturnType<typeof useTheme> }> = ({ title, onPress, isLast, colors }) => (
  <View>
    <Pressable style={styles.actionRow} onPress={onPress}>
      <Text style={[styles.actionText, { color: colors.text }]}>{title}</Text>
    </Pressable>
    {!isLast && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 12, overflow: 'hidden', marginBottom: spacing.md },
  groupLabel: {
    fontSize: 13,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  divider: { height: 0.5, marginLeft: spacing.md },
  infoLabel: { fontSize: 13, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '500' },
  versionText: { fontSize: 14, paddingVertical: spacing.sm },
  actionRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  actionText: { fontSize: 17 },
});

export default ServerConfigScreen;
