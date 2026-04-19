// LLM 配置管理（手机端）— iOS 分组卡片风格

import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../../navigation/SettingsStack';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { useLLMConfigStore } from '../../stores/llmConfigStore';
import { LLMIntegration } from '../../api/llmConfig';
import { PlusIcon, CheckIcon, TrashIcon, SparklesIcon, CloseIcon } from '../../components/icons';

const PROVIDER_OPTIONS = [
  { id: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o-mini' },
  { id: 'anthropic', label: 'Anthropic', defaultModel: 'claude-3-5-sonnet-20241022' },
  { id: 'azure_openai', label: 'Azure OpenAI', defaultModel: 'gpt-4o' },
  { id: 'aliyun', label: '阿里云 Code Plan', defaultModel: 'qwen-coder-plus' },
  { id: 'openai_compatible', label: 'OpenAI 兼容', defaultModel: '' },
  { id: 'anthropic_compatible', label: 'Anthropic 兼容', defaultModel: '' },
];

type NavProp = NativeStackNavigationProp<SettingsStackParamList, 'LLMConfig'>;

export const LLMConfigScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const colors = useTheme();
  const { configs, isLoading, fetchConfigs, createConfig, deleteConfig, setDefault, testConnection } = useLLMConfigStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => setShowCreateModal(true)} style={{ marginRight: 16 }}>
          <PlusIcon size={22} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation, colors.primary]);

  const handleCreate = async (data: any) => {
    try {
      await createConfig(data);
      setShowCreateModal(false);
    } catch (e: any) {
      Alert.alert('创建失败', e.message || '未知错误');
    }
  };

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
            onPress={() => setShowCreateModal(true)}
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

      {/* 创建配置 Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>添加配置</Text>
              <Pressable onPress={() => setShowCreateModal(false)}>
                <CloseIcon size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <CreateConfigForm
              providers={PROVIDER_OPTIONS}
              colors={colors}
              onSubmit={handleCreate}
              onCancel={() => setShowCreateModal(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

interface CreateConfigFormProps {
  providers: typeof PROVIDER_OPTIONS;
  colors: ReturnType<typeof useTheme>;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const CreateConfigForm: React.FC<CreateConfigFormProps> = ({ providers, colors, onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [saving, setSaving] = useState(false);

  const handleProviderChange = (p: string) => {
    setProvider(p);
    const opt = providers.find((o) => o.id === p);
    if (opt?.defaultModel) setModel(opt.defaultModel);
  };

  const handleSubmit = async () => {
    if (!name || !apiKey) {
      Alert.alert('提示', '请填写配置名称和 API Key');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        name,
        provider,
        model,
        api_key: apiKey,
        ...(baseUrl && { base_url: baseUrl }),
        ...(endpoint && { endpoint }),
        is_default: false,
        config_key: name.toLowerCase().replace(/\s+/g, '_'),
      });
    } finally {
      setSaving(false);
    }
  };

  const isCompatible = provider === 'openai_compatible' || provider === 'anthropic_compatible';
  const isAzure = provider === 'azure_openai';

  return (
    <ScrollView style={styles.form}>
      <FormInput label="配置名称" value={name} onChangeText={setName} placeholder="如: 我的 OpenAI" colors={colors} />
      <FormInput label="提供商" value={provider} editable={false} colors={colors} />
      <View style={styles.providerGridWrap}>
        <View style={styles.providerGrid}>
          {providers.map((p) => (
            <Pressable key={p.id} style={[styles.providerBtn, { backgroundColor: provider === p.id ? colors.primary : colors.backgroundSecondary, borderColor: provider === p.id ? colors.primary : colors.border }]} onPress={() => handleProviderChange(p.id)}>
              <Text style={{ color: provider === p.id ? colors.primaryForeground : colors.text, fontSize: 13 }}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <FormInput label="模型" value={model} onChangeText={setModel} placeholder="模型 ID" colors={colors} />
      <FormInput label="API Key" value={apiKey} onChangeText={setApiKey} placeholder="sk-..." secureTextEntry colors={colors} />
      {isCompatible && (
        <FormInput label="Base URL" value={baseUrl} onChangeText={setBaseUrl} placeholder="http://localhost:11434/v1" colors={colors} />
      )}
      {isAzure && (
        <FormInput label="Endpoint" value={endpoint} onChangeText={setEndpoint} placeholder="https://xxx.openai.azure.com" colors={colors} />
      )}

      <View style={styles.formButtons}>
        <Pressable style={[styles.formBtn, { backgroundColor: colors.backgroundSecondary }]} onPress={onCancel}>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>取消</Text>
        </Pressable>
        <Pressable style={[styles.formBtn, { backgroundColor: colors.primary }]} onPress={handleSubmit} disabled={saving}>
          <Text style={{ color: colors.primaryForeground, fontSize: 15, fontWeight: '600' }}>{saving ? '保存中...' : '保存'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const FormInput: React.FC<{
  label: string;
  value: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  editable?: boolean;
  colors: ReturnType<typeof useTheme>;
}> = ({ label, value, onChangeText, placeholder, secureTextEntry, editable = true, colors }) => (
  <View style={styles.formField}>
    <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{label}</Text>
    <View style={[styles.formInputWrap, { backgroundColor: colors.backgroundSecondary }]}>
      <TextInput
        style={[styles.formInput, { color: editable ? colors.text : colors.textSecondary }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        editable={editable}
        placeholderTextColor={colors.textTertiary}
      />
    </View>
  </View>
);

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

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContainer: { borderRadius: 16, margin: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  form: { padding: spacing.lg },
  formField: { marginBottom: spacing.md },
  formLabel: { fontSize: 13, marginBottom: spacing.xs },
  formInputWrap: { borderRadius: 10 },
  formInput: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15, minHeight: 44 },
  providerGridWrap: { marginBottom: spacing.md },
  providerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  providerBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 10, borderWidth: 1 },
  formButtons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  formBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: 10, alignItems: 'center' },
});

export default LLMConfigScreen;
