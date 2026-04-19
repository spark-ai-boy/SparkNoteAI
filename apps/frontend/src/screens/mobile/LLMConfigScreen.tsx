// LLM 配置管理（手机端）

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { useLLMConfigStore } from '../../stores/llmConfigStore';
import { LLMIntegration } from '../../api/llmConfig';
import { SettingsItem } from './components/SettingsItem';
import { ChevronLeftIcon, PlusIcon, CheckIcon, TrashIcon, SparklesIcon } from '../../components/icons';

interface LLMConfigScreenProps {
  onBack: () => void;
}

const PROVIDER_OPTIONS = [
  { id: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o-mini' },
  { id: 'anthropic', label: 'Anthropic', defaultModel: 'claude-3-5-sonnet-20241022' },
  { id: 'azure_openai', label: 'Azure OpenAI', defaultModel: 'gpt-4o' },
  { id: 'aliyun', label: '阿里云 Code Plan', defaultModel: 'qwen-coder-plus' },
  { id: 'openai_compatible', label: 'OpenAI 兼容', defaultModel: '' },
  { id: 'anthropic_compatible', label: 'Anthropic 兼容', defaultModel: '' },
];

export const LLMConfigScreen: React.FC<LLMConfigScreenProps> = ({ onBack }) => {
  const colors = useWebTheme();
  const { configs, isLoading, fetchConfigs, createConfig, deleteConfig, setDefault, testConnection } = useLLMConfigStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <SettingsItem
            icon={<ChevronLeftIcon size={22} color={colors.text} />}
            title="大模型配置"
            showChevron={false}
            onPress={onBack}
          />
          <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
            <PlusIcon size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : configs.length === 0 ? (
          <View style={styles.center}>
            <SparklesIcon size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂无配置</Text>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={[styles.createButtonText, { color: colors.primaryForeground }]}>添加配置</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
            {configs.map((cfg, i) => (
              <React.Fragment key={cfg.config_key}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
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
                      <TouchableOpacity style={styles.actionBtn} onPress={() => setDefault(cfg.config_key)}>
                        <CheckIcon size={18} color={colors.success} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleTest(cfg.config_key)}>
                      <SparklesIcon size={18} color={colors.blue} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(cfg.config_key)}>
                      <TrashIcon size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </React.Fragment>
            ))}
          </View>
        )}
      </ScrollView>

      {/* 创建配置 Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>添加配置</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <ChevronLeftIcon size={24} color={colors.textSecondary} />
              </TouchableOpacity>
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
    </SafeAreaView>
  );
};

interface CreateConfigFormProps {
  providers: typeof PROVIDER_OPTIONS;
  colors: ReturnType<typeof useWebTheme>;
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
      <Text style={[styles.label, { color: colors.text }]}>配置名称</Text>
      <TextInput style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]} value={name} onChangeText={setName} placeholder="如: 我的 OpenAI" placeholderTextColor={colors.textTertiary} />

      <Text style={[styles.label, { color: colors.text }]}>提供商</Text>
      <View style={styles.providerGrid}>
        {providers.map((p) => (
          <TouchableOpacity key={p.id} style={[styles.providerBtn, { backgroundColor: provider === p.id ? colors.primary : colors.backgroundSecondary, borderColor: provider === p.id ? colors.primary : colors.border }]} onPress={() => handleProviderChange(p.id)}>
            <Text style={{ color: provider === p.id ? colors.primaryForeground : colors.text }}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>模型</Text>
      <TextInput style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]} value={model} onChangeText={setModel} placeholder="模型 ID" placeholderTextColor={colors.textTertiary} />

      <Text style={[styles.label, { color: colors.text }]}>API Key</Text>
      <TextInput style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]} value={apiKey} onChangeText={setApiKey} placeholder="sk-..." secureTextEntry placeholderTextColor={colors.textTertiary} />

      {isCompatible && (
        <>
          <Text style={[styles.label, { color: colors.text }]}>Base URL</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]} value={baseUrl} onChangeText={setBaseUrl} placeholder="http://localhost:11434/v1" placeholderTextColor={colors.textTertiary} />
        </>
      )}
      {isAzure && (
        <>
          <Text style={[styles.label, { color: colors.text }]}>Endpoint</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]} value={endpoint} onChangeText={setEndpoint} placeholder="https://xxx.openai.azure.com" placeholderTextColor={colors.textTertiary} />
        </>
      )}

      <View style={styles.formButtons}>
        <TouchableOpacity style={[styles.formBtn, { backgroundColor: colors.backgroundSecondary }]} onPress={onCancel}>
          <Text style={{ color: colors.text }}>取消</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.formBtn, { backgroundColor: colors.primary }]} onPress={handleSubmit} disabled={saving}>
          <Text style={{ color: colors.primaryForeground }}>{saving ? '保存中...' : '保存'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  addButton: { padding: spacing.xs },
  content: { padding: spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 300 },
  emptyText: { fontSize: 16, marginTop: spacing.md, marginBottom: spacing.xl },
  createButton: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 8 },
  createButtonText: { fontSize: 15, fontWeight: '600' },
  section: { borderRadius: 12, overflow: 'hidden' },
  divider: { height: 1 },
  configItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  configInfo: { flex: 1 },
  configName: { fontSize: 15, fontWeight: '600' },
  configModel: { fontSize: 13, marginTop: 2 },
  defaultBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4, marginTop: spacing.xs },
  defaultBadgeText: { fontSize: 11, fontWeight: '600' },
  configActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { padding: spacing.xs },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  form: { padding: spacing.lg },
  label: { fontSize: 14, fontWeight: '500', marginBottom: spacing.xs, marginTop: spacing.md },
  input: { borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15, minHeight: 44 },
  providerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  providerBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 8, borderWidth: 1 },
  formButtons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  formBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: 8, alignItems: 'center' },
});

export default LLMConfigScreen;
