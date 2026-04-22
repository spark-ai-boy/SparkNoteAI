// 图片存储配置创建/编辑页（手机端）

import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../../navigation/SettingsStack';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { useImageStorageStore } from '../../stores/imageStorageStore';
import type { ImageStorageProviderSchema, ConfigField } from '../../api/imageStorage';
import { CloudIcon, ImageIcon } from '../../components/icons';

type NavProp = any;
type ScreenRoute = any;

const PROVIDER_ICONS: Record<string, typeof ImageIcon> = {
  lskypro: CloudIcon,
};
const PROVIDER_NAMES: Record<string, string> = {
  lskypro: '兰空图床',
};

export const ImageStorageFormScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ScreenRoute>();
  const colors = useTheme();
  const {
    createConfig,
    updateConfig,
    testConnectionTemp,
    configs,
    fetchConfigs,
    providers,
    fetchProviders,
  } = useImageStorageStore();
  const configKey = route.params?.configKey ?? '';
  const isEdit = !!configKey;

  const [name, setName] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('lskypro');
  const [formConfig, setFormConfig] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    fetchProviders();
    if (isEdit) {
      fetchConfigs();
    }
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit || configs.length === 0) return;
    const cfg = configs.find((c: any) => c.config_key === configKey);
    if (cfg) {
      setName(cfg.name);
      setSelectedProvider(cfg.provider);
      // 不填充敏感字段
      setFormConfig({
        ...cfg.config,
        api_token: '',
        api_key: '',
      });
      setLoading(false);
    }
  }, [isEdit, configs, configKey]);

  // 选择提供商时初始化默认值
  useEffect(() => {
    if (!providers.length) return;
    const provider = providers.find((p: ImageStorageProviderSchema) => p.provider_id === selectedProvider);
    if (provider) {
      const defaults: Record<string, any> = {};
      provider.config_fields.forEach((f: ConfigField) => {
        if (f.default !== undefined) defaults[f.name] = f.default;
      });
      if (!isEdit) {
        setFormConfig((prev) => ({ ...defaults, ...prev }));
      }
    }
  }, [selectedProvider, providers]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEdit ? '编辑图片存储配置' : '添加图床配置',
    });
  }, [isEdit]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('提示', '请填写配置名称');
      return;
    }
    setSaving(true);
    try {
      const data: any = {
        integration_type: 'storage',
        name: name.trim(),
        config_key: isEdit ? configKey : `${selectedProvider}-${Date.now()}`,
        provider: selectedProvider,
        config: { ...formConfig },
        is_enabled: true,
        is_default: configs.filter((c: any) => c.provider !== 'local').length === 0,
      };
      // 编辑时不传空值的敏感字段
      if (isEdit) {
        delete data.config.api_token;
        delete data.config.api_key;
        if (formConfig.api_token?.trim()) {
          data.config.api_token = formConfig.api_token.trim();
        }
        if (formConfig.api_key?.trim()) {
          data.config.api_key = formConfig.api_key.trim();
        }
        await updateConfig(configKey, {
          name: data.name,
          config: data.config,
          is_default: data.is_default,
          is_enabled: data.is_enabled,
        });
      } else {
        await createConfig(data);
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert(isEdit ? '更新失败' : '创建失败', e.message || '未知错误');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!name.trim()) {
      Alert.alert('提示', '请先填写配置名称');
      return;
    }
    setTesting(true);
    try {
      const result = await testConnectionTemp({
        provider: selectedProvider,
        config: { ...formConfig },
      });
      Alert.alert('测试结果', result.message);
    } catch (e: any) {
      Alert.alert('测试失败', e.message || '未知错误');
    } finally {
      setTesting(false);
    }
  };

  const provider = providers.find((p: ImageStorageProviderSchema) => p.provider_id === selectedProvider);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
          <FormInput label="配置名称" value={name} onChangeText={setName} placeholder="如: 兰空图床正式环境" colors={colors} />

          {/* 编辑模式下显示只读的提供商 */}
          {isEdit && (
            <View style={styles.providerInfoRow}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>存储类型</Text>
              <Text style={[styles.providerInfoText, { color: colors.text }]}>
                {PROVIDER_NAMES[selectedProvider] || selectedProvider}
              </Text>
            </View>
          )}

          {/* 创建模式下显示提供商选择 */}
          {!isEdit && providers.length > 0 && (
            <View>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>存储类型</Text>
              <View style={styles.providerGrid}>
                {providers
                  .filter((p: ImageStorageProviderSchema) => p.provider_id !== 'local')
                  .map((p: ImageStorageProviderSchema) => {
                    const IconComp = PROVIDER_ICONS[p.provider_id] || ImageIcon;
                    const isSelected = selectedProvider === p.provider_id;
                    return (
                      <Pressable
                        key={p.provider_id}
                        style={[styles.providerBtn, {
                          backgroundColor: isSelected ? colors.primary : colors.background,
                          borderColor: isSelected ? colors.primary : colors.border,
                        }]}
                        onPress={() => setSelectedProvider(p.provider_id)}
                      >
                        <IconComp size={20} color={isSelected ? colors.primaryForeground : colors.text} />
                        <Text style={{
                          color: isSelected ? colors.primaryForeground : colors.text,
                          fontSize: 13,
                          fontWeight: '600',
                        }}>{p.provider_name}</Text>
                      </Pressable>
                    );
                  })}
              </View>
            </View>
          )}

          {/* 动态渲染配置字段 */}
          {provider?.config_fields.map((field: ConfigField) => (
            <View key={field.name}>
              <FormInput
                label={field.label}
                value={formConfig[field.name] || ''}
                onChangeText={(text: string) => setFormConfig((prev) => ({ ...prev, [field.name]: text }))}
                placeholder={field.placeholder}
                secureTextEntry={field.type === 'password'}
                colors={colors}
                description={field.description}
              />
            </View>
          ))}
        </View>

        <View style={styles.actionButtons}>
          <Pressable style={[styles.actionBtn, { backgroundColor: colors.backgroundSecondary }]} onPress={handleTest} disabled={testing}>
            {testing ? (
              <ActivityIndicator size="small" color={colors.blue} />
            ) : (
              <Text style={[styles.actionBtnText, { color: colors.blue }]}>测试连接</Text>
            )}
          </Pressable>
          <Pressable style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSubmit} disabled={saving}>
            <Text style={{ color: colors.primaryForeground, fontSize: 15, fontWeight: '600' }}>
              {saving ? '保存中...' : (isEdit ? '保存' : '创建')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

const FormInput: React.FC<{
  label: string;
  value: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  colors: ReturnType<typeof useTheme>;
  description?: string;
}> = ({ label, value, onChangeText, placeholder, secureTextEntry, colors, description }) => (
  <View style={styles.formField}>
    <Text style={[styles.formLabel, { color: colors.text }]}>{label}</Text>
    <View style={[styles.formInputWrap, { backgroundColor: colors.background }]}>
      <TextInput
        style={[styles.formInput, { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        placeholderTextColor={colors.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
    {description && <Text style={[styles.formHint, { color: colors.textSecondary }]}>{description}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 12, overflow: 'hidden', padding: spacing.md },
  formField: { marginBottom: spacing.md },
  formLabel: { fontSize: 13, marginBottom: spacing.xs, fontWeight: '500' },
  formInputWrap: { borderRadius: 10 },
  formInput: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15, minHeight: 44 },
  formHint: { fontSize: 12, marginTop: spacing.xs, lineHeight: 16 },
  providerGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  providerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
  },
  providerInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  providerInfoText: { fontSize: 15, fontWeight: '500' },
  actionButtons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: 10 },
  actionBtnText: { fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: 10, alignItems: 'center' },
});

export default ImageStorageFormScreen;
