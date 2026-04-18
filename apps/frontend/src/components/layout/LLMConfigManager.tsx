// LLM 配置管理组件 - 支持多配置

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
  Image,
} from 'react-native';
import { colors, spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { useLLMConfigStore } from '../../stores/llmConfigStore';
import { useFeatureConfigStore } from '../../stores/featureConfigStore';
import { LLMIntegration, LLMIntegrationType } from '../../api/llmConfig';
import { PlusIcon, TrashIcon, SparklesIcon, EditIcon, CheckIcon, CloseIcon } from '../icons';

interface LLMConfigManagerProps {
  onClose?: () => void;
}

// Provider 图标映射
const PROVIDER_ICONS: Record<string, any> = {
  openai: require('@/assets/provider-icons/openai.png'),
  anthropic: require('@/assets/provider-icons/anthropic.png'),
  azure_openai: require('@/assets/provider-icons/azure_openai.png'),
  aliyun: require('@/assets/provider-icons/aliyun_codeplan.png'),
  openai_compatible: require('@/assets/provider-icons/openai.png'),
  anthropic_compatible: require('@/assets/provider-icons/anthropic.png'),
};

// Provider 名称映射
const PROVIDER_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  azure_openai: 'Azure OpenAI',
  aliyun: '阿里云 Code Plan',
  openai_compatible: 'OpenAI 兼容',
  anthropic_compatible: 'Anthropic 兼容',
};

// 默认模型
const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-sonnet-20241022',
  azure_openai: 'gpt-4o',
  aliyun: 'qwen-coder-plus',
  openai_compatible: '',
  anthropic_compatible: '',
};

export const LLMConfigManager: React.FC<LLMConfigManagerProps> = ({ onClose }) => {
  const colors = useWebTheme();
  const {
    types,
    configs,
    isLoading,
    isSaving,
    fetchTypes,
    fetchConfigs,
    createConfig,
    updateConfig,
    deleteConfig,
    testConnection,
    testConnectionTemp,
  } = useLLMConfigStore();

  const { fetchSchemas: fetchFeatureSchemas } = useFeatureConfigStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<LLMIntegration | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LLMIntegration | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  // 表单状态（移到外层，避免每次渲染重新创建）
  const [formName, setFormName] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formEndpoint, setFormEndpoint] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [isTestingLocal, setIsTestingLocal] = useState(false);

  // 加载数据
  useEffect(() => {
    fetchTypes();
    fetchConfigs();
  }, []);

  // 当 types 加载完成后，默认选中第一个 provider
  useEffect(() => {
    if (types.length > 0 && !selectedProvider) {
      setSelectedProvider(types[0].type);
    }
  }, [types]);

  // 当打开编辑窗口时，初始化表单状态
  useEffect(() => {
    if (editingIntegration) {
      const config = editingIntegration;
      const provider = config.provider;
      setSelectedProvider(provider);
      setFormName(config.name || '');
      setFormModel(config.config?.model || DEFAULT_MODELS[provider] || '');
      setFormApiKey(''); // 不显示已有 API Key
      setFormEndpoint(config.config?.endpoint || '');
      setFormBaseUrl(config.config?.base_url || '');
      setIsTestingLocal(false);
    }
  }, [editingIntegration, DEFAULT_MODELS]);

  // 显示反馈
  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  // 处理删除配置 - 使用 config_key
  const handleDelete = async (configKey: string) => {
    try {
      await deleteConfig(configKey);
      showFeedback('success', '配置已删除');
      // 刷新场景配置的 schemas，更新大模型配置选项
      await fetchFeatureSchemas();
      setIsDeleteModalVisible(false);
      setPendingDelete(null);
    } catch (error) {
      console.error('删除配置失败:', error);
      // 网络错误时显示更友好的提示
      const errorMessage = (error as any)?.response?.status === 0
        ? '无法连接到后端服务，请检查后端是否正在运行'
        : '删除失败，请重试';
      showFeedback('error', errorMessage);
    }
  };

  // 打开删除确认弹窗
  const openDeleteConfirm = (config: LLMIntegration) => {
    setPendingDelete(config);
    setIsDeleteModalVisible(true);
  };

  // 关闭删除确认弹窗
  const closeDeleteConfirm = () => {
    setIsDeleteModalVisible(false);
    setTimeout(() => setPendingDelete(null), 300); // 等动画结束后清空数据
  };

  // 渲染配置列表
  const renderConfigList = () => (
    <View style={styles.configList}>
      {configs.map((config) => (
        <TouchableOpacity
          key={config.config_key}
          style={[styles.configCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
          onPress={() => setEditingIntegration(config)}
          activeOpacity={0.8}
        >
          {/* 左侧：Provider 图标 */}
          <View style={styles.configCardLeft}>
            <View style={[styles.providerIconLarge, { backgroundColor: colors.background }]}>
              {Platform.OS === 'web' ? (
                <img
                  src={PROVIDER_ICONS[config.provider]?.uri || PROVIDER_ICONS[config.provider]}
                  alt={config.provider}
                  style={{ width: 32, height: 32, objectFit: 'contain' }}
                />
              ) : (
                <Image
                  source={PROVIDER_ICONS[config.provider]}
                  style={{ width: 32, height: 32 }}
                  resizeMode="contain"
                />
              )}
            </View>
          </View>

          {/* 中间：配置信息 */}
          <View style={styles.configCardMiddle}>
            <View style={styles.configCardHeader}>
              <Text style={[styles.configCardName, { color: colors.text }]}>{config.name}</Text>
            </View>
            <View style={styles.configCardMeta}>
              <Text style={[styles.configCardProvider, { color: colors.textSecondary }]}>{PROVIDER_NAMES[config.provider] || config.provider}</Text>
              <Text style={[styles.configCardDivider, { color: colors.textSecondary }]}>·</Text>
              <Text style={[styles.configCardModel, { color: colors.textSecondary }]}>{config.config?.model || '未设置模型'}</Text>
            </View>
          </View>

          {/* 右侧：操作按钮 */}
          <View style={styles.configCardRight}>
            <TouchableOpacity
              style={[styles.cardActionButton, { backgroundColor: colors.background }]}
              onPress={(e) => {
                e.stopPropagation();
                setEditingIntegration(config);
              }}
            >
              <EditIcon size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cardActionButton, { backgroundColor: colors.background }]}
              onPress={(e) => {
                e.stopPropagation();
                openDeleteConfirm(config);
              }}
              disabled={isSaving}
            >
              <TrashIcon size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  // 渲染创建/编辑模态框
  const renderConfigModal = () => {
    const isEditing = !!editingIntegration;
    const config = editingIntegration;

    const handleTest = async () => {
      if (!formApiKey.trim() && !config?.has_api_key) {
        setTestResult({ type: 'error', message: '请输入 API Key' });
        return;
      }

      setIsTestingLocal(true);
      setTestResult(null);

      let result;
      if (isEditing && config) {
        // 编辑已有配置
        if (formApiKey.trim()) {
          // 如果输入了新 API Key，使用临时测试（包含新 API Key）
          result = await testConnectionTemp(selectedProvider, {
            model: formModel,
            api_key: formApiKey,
            endpoint: formEndpoint || undefined,
            base_url: formBaseUrl || undefined,
          });
        } else {
          // 没有输入新 API Key，使用已有配置测试
          result = await testConnection(config.config_key);
        }
      } else {
        // 创建新配置：使用临时配置测试
        result = await testConnectionTemp(selectedProvider, {
          model: formModel,
          api_key: formApiKey,
          endpoint: formEndpoint || undefined,
          base_url: formBaseUrl || undefined,
        });
      }

      setIsTestingLocal(false);

      if (result.success) {
        setTestResult({ type: 'success', message: result.message });
      } else {
        setTestResult({ type: 'error', message: result.message });
      }

      // 3 秒后清除测试结果
      setTimeout(() => setTestResult(null), 3000);
    };

    const handleSave = async () => {
      // 确保已选择 provider
      if (!selectedProvider) {
        showFeedback('error', '请选择服务提供商');
        return;
      }

      // 生成 config_key：使用 provider + 时间戳
      const configKey = `${selectedProvider}-${Date.now()}`;

      const saveData: any = {
        integration_type: 'llm',
        config_key: configKey,
        provider: selectedProvider,
        name: formName || `${PROVIDER_NAMES[selectedProvider] || selectedProvider} 配置`,
        config: {
          model: formModel,
          api_key: formApiKey,
          endpoint: formEndpoint || undefined,
          base_url: formBaseUrl || undefined,
        },
        is_default: false,
        is_enabled: true,
        tags: [],
      };

      try {
        if (isEditing && config) {
          // 编辑时不更新 provider 和 config_key
          delete saveData.provider;
          delete saveData.integration_type;
          delete saveData.config_key;
          // 如果没有输入新 API Key，不传递该字段
          if (!formApiKey.trim()) {
            delete saveData.config.api_key;
          }
          await updateConfig(config.config_key, saveData);
          showFeedback('success', '配置已更新');
        } else {
          await createConfig(saveData);
          showFeedback('success', '配置已创建');
        }
        // 刷新场景配置的 schemas，更新大模型配置选项
        await fetchFeatureSchemas();
        setEditingIntegration(null);
        setShowCreateModal(false);
      } catch (error) {
        // 错误已在 store 中处理
      }
    };

    return (
      <Modal
        visible={!!editingIntegration || showCreateModal}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setEditingIntegration(null);
          setShowCreateModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* 头部 */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {isEditing ? '编辑配置' : '创建新配置'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setEditingIntegration(null);
                  setShowCreateModal(false);
                }}
              >
                <Text style={[styles.modalClose, { color: colors.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={[styles.modalContent, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
              {/* 模态框内反馈消息 */}
              {feedback && (
                <View style={[
                  styles.feedbackBox,
                  feedback.type === 'success' ? { backgroundColor: colors.success + '10', borderColor: colors.success } : { backgroundColor: colors.error + '10', borderColor: colors.error },
                  { marginBottom: spacing.md },
                ]}>
                  <View style={styles.feedbackContent}>
                    {feedback.type === 'success' ? (
                      <CheckIcon size={20} color={colors.success} />
                    ) : (
                      <CloseIcon size={20} color={colors.error} />
                    )}
                    <Text style={[
                      styles.feedbackText,
                      { color: colors.text },
                      feedback.type === 'success' ? styles.feedbackTextSuccess : styles.feedbackTextError,
                    ]}>
                      {feedback.message}
                    </Text>
                  </View>
                </View>
              )}

              {/* Provider 选择（仅创建时） */}
              {!isEditing && (
                <View style={styles.formSection}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>服务提供商</Text>
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : types.length === 0 ? (
                    <Text style={[styles.formHint, { color: colors.textSecondary }]}>暂无可用提供商</Text>
                  ) : (
                    <View style={styles.providerGrid}>
                      {types.map((provider) => (
                        <TouchableOpacity
                          key={provider.type}
                          style={[
                            styles.providerCard,
                            { backgroundColor: colors.background, borderColor: colors.border },
                            selectedProvider === provider.type && { backgroundColor: colors.primary, borderColor: colors.primary },
                          ]}
                          onPress={() => setSelectedProvider(provider.type)}
                        >
                          <View style={styles.providerCardIcon}>
                            {Platform.OS === 'web' ? (
                              <img
                                src={PROVIDER_ICONS[provider.type]?.uri || PROVIDER_ICONS[provider.type]}
                                alt={provider.type}
                                style={{ width: 24, height: 24, objectFit: 'contain' }}
                              />
                            ) : (
                              <Image
                                source={PROVIDER_ICONS[provider.type]}
                                style={{ width: 24, height: 24 }}
                                resizeMode="contain"
                              />
                            )}
                          </View>
                          <Text style={[styles.providerCardName, { color: colors.text }, selectedProvider === provider.type && { color: colors.primaryForeground }]}>
                            {provider.name || provider.type}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Provider 显示（编辑时） */}
              {isEditing && config && (
                <View style={styles.formSection}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>服务提供商</Text>
                  <View style={[styles.providerInfo, { backgroundColor: colors.backgroundSecondary }]}>
                    {Platform.OS === 'web' ? (
                      <img
                        src={PROVIDER_ICONS[config.provider]?.uri || PROVIDER_ICONS[config.provider]}
                        alt={config.provider}
                        style={{ width: 24, height: 24, objectFit: 'contain' }}
                      />
                    ) : (
                      <Image
                        source={PROVIDER_ICONS[config.provider]}
                        style={{ width: 24, height: 24 }}
                        resizeMode="contain"
                      />
                    )}
                    <Text style={[styles.providerInfoText, { color: colors.text }]}>
                      {PROVIDER_NAMES[config.provider] || config.provider}
                    </Text>
                  </View>
                  <Text style={[styles.formHint, { color: colors.textSecondary }]}>提供商一旦创建后不可更改</Text>
                </View>
              )}

              {/* 配置名称 */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.text }]}>配置名称</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                  placeholder="例如：OpenAI 默认配置"
                  placeholderTextColor={colors.textSecondary}
                  value={formName}
                  onChangeText={setFormName}
                />
              </View>

              {/* 模型 */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.text }]}>模型名称</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                  placeholder="例如：gpt-4o-mini"
                  placeholderTextColor={colors.textSecondary}
                  value={formModel}
                  onChangeText={setFormModel}
                  autoCapitalize="none"
                />
                <Text style={[styles.formHint, { color: colors.textSecondary }]}>
                  常用模型：gpt-4o-mini, claude-3-5-sonnet-20241022
                </Text>
              </View>

              {/* API Key */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.text }]}>API Key</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                  placeholder={config?.has_api_key ? '已配置，如需更改请输入新密钥' : '输入你的 API Key'}
                  placeholderTextColor={colors.textSecondary}
                  value={formApiKey}
                  onChangeText={(text) => {
                    setFormApiKey(text);
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              {/* Azure 专用 Endpoint */}
              {selectedProvider === 'azure_openai' && (
                <View style={styles.formSection}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Azure Endpoint</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                    placeholder="https://your-resource.openai.azure.com"
                    placeholderTextColor={colors.textSecondary}
                    value={formEndpoint}
                    onChangeText={setFormEndpoint}
                    autoCapitalize="none"
                  />
                </View>
              )}

              {/* 兼容协议专用 API 地址 */}
              {(selectedProvider === 'openai_compatible' || selectedProvider === 'anthropic_compatible') && (
                <View style={styles.formSection}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>API 地址</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                    placeholder={selectedProvider === 'openai_compatible' ? 'http://localhost:11434/v1' : 'http://localhost:8080/v1'}
                    placeholderTextColor={colors.textSecondary}
                    value={formBaseUrl}
                    onChangeText={setFormBaseUrl}
                    autoCapitalize="none"
                  />
                  <Text style={[styles.formHint, { color: colors.textSecondary }]}>
                    兼容协议的 API 基础地址，如 Ollama (http://localhost:11434/v1)
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* 底部按钮 */}
            <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
              {isEditing && (
                <TouchableOpacity
                  style={[styles.modalDeleteButton, { backgroundColor: colors.error + '10' }]}
                  onPress={() => {
                    if (config) {
                      handleDelete(config.config_key);
                      setEditingIntegration(null);
                    }
                  }}
                  disabled={isSaving}
                >
                  <TrashIcon size={16} color={colors.error} />
                  <Text style={[styles.modalDeleteButtonText, { color: colors.error }]}>删除</Text>
                </TouchableOpacity>
              )}
              <View style={styles.testButtonContainer}>
                <TouchableOpacity
                  style={[
                    styles.testButton,
                    { backgroundColor: colors.backgroundSecondary },
                    (!formApiKey.trim() && !config?.has_api_key) && styles.testButtonDisabled,
                  ]}
                  onPress={handleTest}
                  disabled={isTestingLocal || (!formApiKey.trim() && !config?.has_api_key)}
                >
                  {isTestingLocal ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <>
                      <Text style={[
                        styles.testButtonText,
                        { color: colors.text },
                        (!formApiKey.trim() && !config?.has_api_key) && styles.testButtonTextDisabled,
                      ]}>测试连接</Text>
                    </>
                  )}
                </TouchableOpacity>
                {/* 测试结果显示在按钮旁边 */}
                {testResult && (
                  <View style={styles.testResultContainer}>
                    {testResult.type === 'success' ? (
                      <CheckIcon size={16} color={colors.success} />
                    ) : (
                      <CloseIcon size={16} color={colors.error} />
                    )}
                    <Text style={[
                      styles.testResultText,
                      { color: colors.text },
                      testResult.type === 'success' ? styles.testResultTextSuccess : styles.testResultTextError,
                    ]}>
                      {testResult.message}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.modalFooterRight}>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => {
                    setEditingIntegration(null);
                    setShowCreateModal(false);
                  }}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text }]}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    { backgroundColor: colors.primary },
                    (isSaving || (!formApiKey.trim() && !config?.has_api_key)) && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={isSaving || (!formApiKey.trim() && !config?.has_api_key)}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <Text style={[styles.saveButtonText, { color: colors.background }]}>保存</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 头部 */}
      <View style={[styles.header, { backgroundColor: colors.textSecondary + '10' }]}>
        <Text style={[styles.title, { color: colors.text }]}>大模型配置</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>管理你的 AI 模型配置</Text>
      </View>

      {/* 操作栏 */}
      <View style={styles.headerActions}>
        {onClose && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            setSelectedProvider(types.length > 0 ? types[0].type : 'openai');
            setFormName('');
            setFormModel('');
            setFormApiKey('');
            setFormEndpoint('');
            setFormBaseUrl('');
            setIsTestingLocal(false);
            setShowCreateModal(true);
          }}
        >
          <PlusIcon size={20} color={colors.white} />
          <Text style={[styles.addButtonText, { color: colors.white }]}>新建配置</Text>
        </TouchableOpacity>
      </View>

      {/* 反馈消息 - 仅在模态框关闭时显示 */}
      {feedback && !editingIntegration && !showCreateModal && (
        <View style={[styles.feedbackBox, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.feedbackContent}>
            {feedback.type === 'success' ? (
              <CheckIcon size={20} color={colors.success} />
            ) : (
              <CloseIcon size={20} color={colors.error} />
            )}
            <Text style={[
              styles.feedbackText,
              feedback.type === 'success' ? styles.feedbackTextSuccess : styles.feedbackTextError,
            ]}>
              {feedback.message}
            </Text>
          </View>
        </View>
      )}

      {/* 配置列表 */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>加载中...</Text>
        </View>
      ) : configs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🤖</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>暂无配置</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>点击右上角按钮创建你的第一个大模型配置</Text>
        </View>
      ) : (
        renderConfigList()
      )}

      {/* 创建/编辑模态框 */}
      {renderConfigModal()}

      {/* 删除确认弹窗 */}
      <Modal
        visible={isDeleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteConfirm}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={[styles.deleteModalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.deleteModalIcon, { backgroundColor: colors.error + '10' }]}>
              <TrashIcon size={40} color={colors.error} />
            </View>
            <Text style={[styles.deleteModalTitle, { color: colors.text }]}>确认删除</Text>
            <Text style={[styles.deleteModalMessage, { color: colors.textSecondary }]}>
              确定要删除"{pendingDelete?.name}"吗？此操作不可恢复。
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalCancelButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={closeDeleteConfirm}
              >
                <Text style={[styles.deleteModalCancelButtonText, { color: colors.text }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalConfirmButton, { backgroundColor: colors.error }]}
                onPress={() => pendingDelete && handleDelete(pendingDelete.config_key)}
              >
                <Text style={[styles.deleteModalConfirmButtonText, { color: colors.white }]}>删除</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderRadius: 12,
    padding: spacing.lg,
    margin: spacing.lg,
    marginBottom: spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    fontSize: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  feedbackBox: {
    margin: spacing.lg,
    marginBottom: 0,
    padding: spacing.md,
    borderRadius: 8,
  },
  feedbackContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  feedbackSuccess: {
    borderWidth: 1,
  },
  feedbackError: {
    borderWidth: 1,
  },
  feedbackText: {
    fontSize: 14,
  },
  feedbackTextSuccess: {
  },
  feedbackTextError: {
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  // 删除确认弹窗
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  deleteModalContent: {
    borderRadius: 16,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  deleteModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  deleteModalMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    justifyContent: 'center',
  },
  deleteModalCancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100,
  },
  deleteModalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteModalConfirmButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100,
  },
  deleteModalConfirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // 配置列表
  configList: {
    padding: spacing.lg,
  },
  // 配置卡片样式
  configCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  configCardLeft: {
    marginRight: spacing.md,
  },
  providerIconLarge: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  configCardMiddle: {
    flex: 1,
  },
  configCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  configCardName: {
    fontSize: 16,
    fontWeight: '600',
  },
  configCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  configCardProvider: {
    fontSize: 13,
  },
  configCardDivider: {
    fontSize: 13,
  },
  configCardModel: {
    fontSize: 13,
  },
  configCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: spacing.md,
  },
  cardActionButton: {
    padding: spacing.sm,
    borderRadius: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalClose: {
    fontSize: 24,
    width: 32,
    height: 32,
    textAlign: 'center',
    lineHeight: 32,
  },
  modalContent: {
    padding: spacing.lg,
  },
  formSection: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  formInput: {
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 14,
    borderWidth: 1,
  },
  formHint: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  providerCardActive: {
  },
  providerCardIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerCardName: {
    fontSize: 14,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 8,
  },
  providerInfoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    minWidth: 80,
  },
  testButtonDisabled: {
    opacity: 0.4,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  testButtonTextDisabled: {
  },
  testButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  testResultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  testResultText: {
    fontSize: 13,
    flex: 1,
  },
  testResultTextSuccess: {
  },
  testResultTextError: {
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  modalFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  modalDeleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LLMConfigManager;
