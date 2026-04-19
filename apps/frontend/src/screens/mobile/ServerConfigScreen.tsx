// 服务器配置（手机端）

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { useServerConfigStore } from '../../stores/serverConfigStore';
import { useAuthStore } from '../../stores/authStore';
import { SettingsItem } from './components/SettingsItem';
import { ChevronLeftIcon, ServerIcon, GlobeIcon } from '../../components/icons';
import apiClient from '../../api/client';

interface ServerConfigScreenProps {
  onBack: () => void;
}

export const ServerConfigScreen: React.FC<ServerConfigScreenProps> = ({ onBack }) => {
  const colors = useWebTheme();
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const versions = serverInfo?.compatible_client_versions || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <SettingsItem
          icon={<ChevronLeftIcon size={22} color={colors.text} />}
          title="服务器配置"
          showChevron={false}
          onPress={onBack}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 服务器信息 */}
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.sectionHeader}>
            <ServerIcon size={20} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>服务器信息</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>服务器地址</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{baseUrl}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>后端版本</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{serverInfo?.version || '未知'}</Text>
          </View>
        </View>

        {/* 兼容客户端版本 */}
        {versions.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={styles.sectionHeader}>
              <GlobeIcon size={20} color={colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>兼容客户端版本</Text>
            </View>
            {versions.map((v: string, i: number) => (
              <React.Fragment key={v}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                <View style={styles.versionRow}>
                  <Text style={[styles.versionText, { color: colors.text }]}>{v}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        )}

        {/* 操作 */}
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
          <SettingsItem
            icon={<ServerIcon size={20} color={colors.textSecondary} />}
            title="更换服务器"
            onPress={() => logout()}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsItem
            icon={<GlobeIcon size={20} color={colors.textSecondary} />}
            title="重新加载配置"
            onPress={loadData}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { borderRadius: 12, overflow: 'hidden', marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  infoRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  infoLabel: { fontSize: 13, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '500' },
  divider: { height: 1 },
  versionRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  versionText: { fontSize: 14 },
});

export default ServerConfigScreen;
