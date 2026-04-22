// LLM 配置管理（手机端）— iOS 分组卡片风格

import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../../navigation/SettingsStack';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { useLLMConfigStore } from '../../stores/llmConfigStore';
import { PlusIcon, CheckIcon, TrashIcon, SparklesIcon } from '../../components/icons';

type NavProp = NativeStackNavigationProp<SettingsStackParamList, 'LLMConfig'>;

export const LLMConfigScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const colors = useTheme();
  const { configs, isLoading, fetchConfigs, createConfig, deleteConfig, setDefault, testConnection } = useLLMConfigStore();

  useEffect(() => {
    fetchConfigs();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('LLMConfigCreate')} style={{ marginRight: 16 }}>
          <PlusIcon size={22} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation, colors.primary]);

  const handleDelete = (configKey: string) => {
    Alert.alert('确认删除', '确定要删除此配置吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => deleteConfig(configKey),
      },
    ]);
  };

  const handleTest = async (configKey: string) => {
    try {
      const result = await testConnection(configKey);
      Alert.alert('测试结果', result.message);
    } catch (e: any) {
      Alert.alert('测试失败', e.message || '未知错误');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {configs.length === 0 && !isLoading ? (
        <View style={styles.center}>
          <SparklesIcon size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂无配置</Text>
          <Pressable
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('LLMConfigCreate')}
          >
            <Text style={[styles.createButtonText, { color: colors.primaryForeground }]}>添加配置</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {isLoading && (
            <View style={styles.loadingRow}><ActivityIndicator size="large" color={colors.primary} /></View>
          )}
          <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
            {configs.map((cfg, i) => {
              const isLast = i === configs.length - 1;
              return (
                <View key={cfg.config_key}>
                  <View style={styles.configItem}>
                    <View style={styles.configInfo}>
                      <Text style={[styles.configName, { color: colors.text }]}>{cfg.name}</Text>
                      <Text style={[styles.configModel, { color: colors.textSecondary }]}>
                        {cfg.provider} · {cfg.config?.model || '未设置'}
                      </Text>
                      {cfg.is_default && (
                        <View style={[styles.defaultBadge, { backgroundColor: colors.primary }]}>
                          <Text style={[styles.defaultBadgeText, { color: colors.primaryForeground }]}>默认</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.configActions}>
                      {!cfg.is_default && (
                        <Pressable style={styles.actionBtn} onPress={() => setDefault(cfg.config_key)}>
                          <CheckIcon size={18} color={colors.success} />
                        </Pressable>
                      )}
                      <Pressable style={styles.actionBtn} onPress={() => handleTest(cfg.config_key)}>
                        <SparklesIcon size={18} color={colors.blue} />
                      </Pressable>
                      <Pressable style={styles.actionBtn} onPress={() => handleDelete(cfg.config_key)}>
                        <TrashIcon size={18} color={colors.error} />
                      </Pressable>
                    </View>
                  </View>
                  {!isLast && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  loadingRow: { paddingVertical: spacing.xl },
  emptyText: { fontSize: 16, marginTop: spacing.md, marginBottom: spacing.xl },
  createButton: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 10 },
  createButtonText: { fontSize: 15, fontWeight: '600' },
  card: { borderRadius: 12, overflow: 'hidden' },
  divider: { height: 0.5, marginLeft: spacing.md },
  configItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  configInfo: { flex: 1 },
  configName: { fontSize: 15, fontWeight: '600' },
  configModel: { fontSize: 13, marginTop: 2 },
  defaultBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4, marginTop: spacing.xs },
  defaultBadgeText: { fontSize: 11, fontWeight: '600' },
  configActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { padding: spacing.xs },
});

export default LLMConfigScreen;
