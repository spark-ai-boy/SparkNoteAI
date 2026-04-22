// 图片存储配置（手机端）— iOS 分组卡片风格

import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
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
import { useImageStorageStore } from '../../stores/imageStorageStore';
import { PlusIcon, CheckIcon, TrashIcon, EditIcon, CloudIcon, ImageIcon } from '../../components/icons';

const PROVIDER_ICONS: Record<string, typeof ImageIcon> = {
  lskypro: CloudIcon,
};
const PROVIDER_NAMES: Record<string, string> = {
  lskypro: '兰空图床',
};

type NavProp = NativeStackNavigationProp<SettingsStackParamList, 'ImageStorage'>;

export const ImageStorageScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const colors = useTheme();
  const { configs, isLoading, fetchConfigs, deleteConfig, setDefault, unsetDefault, providers, fetchProviders } = useImageStorageStore();

  useEffect(() => {
    fetchConfigs();
    fetchProviders();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('ImageStorageCreate')} style={{ marginRight: 16 }}>
          <PlusIcon size={22} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation, colors.primary]);

  const handleDelete = (configKey: string, name: string) => {
    Alert.alert('确认删除', `确定要删除「${name}」吗？此操作不可恢复。`, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => deleteConfig(configKey) },
    ]);
  };

  const thirdPartyConfigs = configs.filter((c) => c.provider !== 'local');
  const defaultConfig = configs.find((c) => c.is_default);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 提示头 */}
      <View style={[styles.infoCard, { backgroundColor: colors.backgroundSecondary }]}>
        <CloudIcon size={24} color={colors.blue} />
        <View style={styles.infoText}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>图片存储</Text>
          <Text style={[styles.infoDesc, { color: colors.textSecondary }]}>
            默认使用本地存储，可配置第三方图床进行 CDN 加速
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : thirdPartyConfigs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconBox, { backgroundColor: colors.backgroundSecondary }]}>
            <ImageIcon size={48} color={colors.textTertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>暂无图床配置</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            点击右上角 + 创建第三方图床配置
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
            {thirdPartyConfigs.map((cfg, i) => {
              const isLast = i === thirdPartyConfigs.length - 1;
              const IconComp = PROVIDER_ICONS[cfg.provider] || ImageIcon;
              const providerLabel = PROVIDER_NAMES[cfg.provider] || cfg.provider;

              return (
                <View key={cfg.config_key}>
                  <Pressable
                    style={styles.configItem}
                    onPress={() => navigation.navigate('ImageStorageEdit', { configKey: cfg.config_key } as any)}
                  >
                    <View style={styles.configLeft}>
                      <View style={[styles.iconBox, { backgroundColor: colors.background }]}>
                        <IconComp size={20} color={colors.text} />
                      </View>
                      <View style={styles.configText}>
                        <Text style={[styles.configName, { color: colors.text }]}>{cfg.name}</Text>
                        <Text style={[styles.configMeta, { color: colors.textSecondary }]}>
                          {providerLabel} · <Text style={{ color: cfg.is_enabled ? colors.success : colors.textSecondary }}>{cfg.is_enabled ? '已启用' : '已禁用'}</Text>
                        </Text>
                      </View>
                    </View>
                    <View style={styles.configRight}>
                      {cfg.is_default ? (
                        <Pressable
                          style={[styles.tagDefault, { borderColor: colors.success }]}
                          onPress={(e) => { e.stopPropagation(); unsetDefault(cfg.config_key); }}
                        >
                          <Text style={[styles.tagDefaultText, { color: colors.success }]}>默认</Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          style={styles.actionBtn}
                          onPress={(e) => { e.stopPropagation(); setDefault(cfg.config_key); }}
                        >
                          <CheckIcon size={18} color={colors.success} />
                        </Pressable>
                      )}
                      <Pressable style={styles.actionBtn} onPress={() => navigation.navigate('ImageStorageEdit', { configKey: cfg.config_key } as any)}>
                        <EditIcon size={18} color={colors.textSecondary} />
                      </Pressable>
                      <Pressable style={styles.actionBtn} onPress={() => handleDelete(cfg.config_key, cfg.name)}>
                        <TrashIcon size={18} color={colors.error} />
                      </Pressable>
                    </View>
                  </Pressable>
                  {!isLast && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                </View>
              );
            })}
          </View>

          {/* 本地存储信息 */}
          <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={styles.localRow}>
              <View style={styles.configLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.background }]}>
                  <ImageIcon size={20} color={colors.text} />
                </View>
                <View style={styles.configText}>
                  <Text style={[styles.configName, { color: colors.text }]}>本地存储</Text>
                  <Text style={[styles.configMeta, { color: colors.textSecondary }]}>图片存储在服务器本地</Text>
                </View>
              </View>
              {!defaultConfig && (
                <View style={[styles.localTag, { backgroundColor: colors.success + '18' }]}>
                  <Text style={[styles.localTagText, { color: colors.success }]}>默认</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // 提示头
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
  },
  infoText: { flex: 1 },
  infoTitle: { fontSize: 15, fontWeight: '600' },
  infoDesc: { fontSize: 13, marginTop: 2, lineHeight: 18 },

  // 卡片
  card: { borderRadius: 12, overflow: 'hidden', marginBottom: spacing.md },
  divider: { height: 0.5, marginLeft: spacing.md },

  // 配置项
  configItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  configLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  configText: { flex: 1 },
  configName: { fontSize: 15, fontWeight: '600' },
  configMeta: { fontSize: 13, marginTop: 1 },
  configRight: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { padding: spacing.xs },
  tagDefault: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagDefaultText: { fontSize: 11, fontWeight: '600' },

  // 本地存储
  localRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  localTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  localTagText: { fontSize: 11, fontWeight: '600' },

  // 空状态
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyIconBox: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: spacing.sm },
  emptyText: { fontSize: 14, textAlign: 'center' },
});

export default ImageStorageScreen;
