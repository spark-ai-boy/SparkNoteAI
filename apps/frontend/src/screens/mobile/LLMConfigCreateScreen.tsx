// 大模型配置创建/编辑页（手机端）

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../../navigation/SettingsStack';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { useLLMConfigStore } from '../../stores/llmConfigStore';

const PROVIDER_OPTIONS = [
  { id: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o-mini' },
  { id: 'anthropic', label: 'Anthropic', defaultModel: 'claude-3-5-sonnet-20241022' },
  { id: 'azure_openai', label: 'Azure OpenAI', defaultModel: 'gpt-4o' },
  { id: 'aliyun', label: '阿里云 Code Plan', defaultModel: 'qwen-coder-plus' },
  { id: 'openai_compatible', label: 'OpenAI 兼容', defaultModel: '' },
  { id: 'anthropic_compatible', label: 'Anthropic 兼容', defaultModel: '' },
];

type NavProp = NativeStackNavigationProp<SettingsStackParamList, 'LLMConfigCreate'>;

export const LLMConfigCreateScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const colors = useTheme();
  const { createConfig } = useLLMConfigStore();
  const [name, setName] = useState('');
  const [integrationType, setIntegrationType] = useState('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [saving, setSaving] = useState(false);

  const handleProviderChange = (p: string) => {
    setIntegrationType(p);
    const opt = PROVIDER_OPTIONS.find((o) => o.id === p);
    if (opt?.defaultModel) setModel(opt.defaultModel);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !apiKey.trim()) {
      Alert.alert('提示', '请填写配置名称和 API Key');
      return;
    }
    setSaving(true);
    try {
      await createConfig({
        integration_type: 'llm',
        name: name.trim(),
        config_key: name.trim().toLowerCase().replace(/\s+/g, '_'),
        config: {
          provider: integrationType,
          model,
          api_key: apiKey.trim(),
          ...(baseUrl.trim() && { base_url: baseUrl.trim() }),
          ...(endpoint.trim() && { endpoint: endpoint.trim() }),
        },
        is_default: false,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('创建失败', e.message || '未知错误');
    } finally {
      setSaving(false);
    }
  };

  const isCompatible = integrationType === 'openai_compatible' || integrationType === 'anthropic_compatible';
  const isAzure = integrationType === 'azure_openai';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
          <FormInput label="配置名称" value={name} onChangeText={setName} placeholder="如: 我的 OpenAI" colors={colors} />
          <FormInput label="提供商" value={integrationType} editable={false} colors={colors} />
          <View style={styles.providerGridWrap}>
            <View style={styles.providerGrid}>
              {PROVIDER_OPTIONS.map((p) => (
                <Pressable key={p.id} style={[styles.providerBtn, { backgroundColor: integrationType === p.id ? colors.primary : colors.background, borderColor: integrationType === p.id ? colors.primary : colors.border }]} onPress={() => handleProviderChange(p.id)}>
                  <Text style={{ color: integrationType === p.id ? colors.primaryForeground : colors.text, fontSize: 13 }}>{p.label}</Text>
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
        </View>

        <View style={styles.saveButton}>
          <Pressable style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSubmit} disabled={saving}>
            <Text style={{ color: colors.primaryForeground, fontSize: 15, fontWeight: '600' }}>{saving ? '保存中...' : '保存'}</Text>
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
  editable?: boolean;
  colors: ReturnType<typeof useTheme>;
}> = ({ label, value, onChangeText, placeholder, secureTextEntry, editable = true, colors }) => (
  <View style={styles.formField}>
    <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{label}</Text>
    <View style={[styles.formInputWrap, { backgroundColor: colors.background }]}>
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
  card: { borderRadius: 12, overflow: 'hidden', padding: spacing.md },
  formField: { marginBottom: spacing.md },
  formLabel: { fontSize: 13, marginBottom: spacing.xs },
  formInputWrap: { borderRadius: 10 },
  formInput: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15, minHeight: 44 },
  providerGridWrap: { marginBottom: spacing.md },
  providerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  providerBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 10, borderWidth: 1 },
  saveButton: { marginTop: spacing.lg },
  saveBtn: { paddingVertical: spacing.md, borderRadius: 10, alignItems: 'center' },
});

export default LLMConfigCreateScreen;
