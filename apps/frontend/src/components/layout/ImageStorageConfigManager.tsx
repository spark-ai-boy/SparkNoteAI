// 图片存储配置管理组件 - 支持多配置

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
} from 'react-native';
import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { useImageStorageStore } from '../../stores/imageStorageStore';
import { useFeatureConfigStore } from '../../stores/featureConfigStore';
import { ImageStorageIntegration, ImageStorageProviderSchema, ConfigField } from '../../api/imageStorage';
import { PlusIcon, TrashIcon, ImageIcon, EditIcon, CheckIcon, CloseIcon, CloudIcon } from '../icons';
import { ConfirmDialog } from './ConfirmDialog';

interface ImageStorageConfigManagerProps {
  onClose?: () => void;
}

// Provider 图标组件获取函数
const getProviderIcon = (providerId: string) => {
  switch (providerId) {
    case 'lskypro':
      return CloudIcon;
    default:
      return ImageIcon;
  }
};

// Provider 名称映射
const PROVIDER_NAMES: Record<string, string> = {
  lskypro: '兰空图床',
};

// Provider 描述映射
const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  lskypro: '图片存储在兰空图床，支持 CDN 加速',
};

// 默认配置值
const DEFAULT_CONFIGS: Record<string, any> = {
  lskypro: {
    api_url: '',
    strategy_id: '',
  },
};

export const ImageStorageConfigManager: React.FC<ImageStorageConfigManagerProps> = ({ onClose }) => {
  const colors = useWebTheme();
  const {
    providers,
    configs,
    isLoading,
    isSaving,
    isTesting,
    fetchProviders,
    fetchConfigs,
    createConfig,
    updateConfig,
    deleteConfig,
    testConnectionTemp,
    setDefault,
  } = useImageStorageStore();

  const { fetchSchemas: fetchFeatureSchemas } = useFeatureConfigStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ImageStorageIntegration | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('lskypro');
  const [pendingDelete, setPendingDelete] = useState<ImageStorageIntegration | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 表单状态 - 动态构建
  const [formName, setFormName] = useState('');
  const [formConfig, setFormConfig] = useState<Record<string, any>>({});
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 加载数据
  useEffect(() => {
    fetchProviders();
    fetchConfigs();
  }, []);

  // 当 providers 加载完成后，默认选中第一个第三方提供商（过滤掉 local）
  useEffect(() => {
    if (providers.length > 0 && !selectedProvider) {
      const thirdPartyProviders = providers.filter(p => p.provider_id !== 'local');
      setSelectedProvider(thirdPartyProviders.length > 0 ? thirdPartyProviders[0].provider_id : 'lskypro');
    }
  }, [providers]);

  // 当打开编辑窗口时，初始化表单状态
  useEffect(() => {
    if (editingConfig) {
      const config = editingConfig;
      setSelectedProvider(config.provider);
      setFormName(config.name || '');
      // 不填充敏感字段（api_token 等）
      setFormConfig({
        ...config.config,
        api_token: '', // 清空敏感字段
      });
      setTestResult(null);
    }
  }, [editingConfig]);

  // 显示反馈
  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  // 处理设为默认
  const handleSetDefault = async (configKey: string) => {
    try {
      await setDefault(configKey);
      showFeedback('success', '已设为默认存储配置');
      await fetchFeatureSchemas();
    } catch (error) {
      console.error('设置默认配置失败:', error);
      showFeedback('error', '设置默认配置失败');
    }
  };

  // 处理删除配置
  const handleDelete = async (configKey: string) => {
    try {
      await deleteConfig(configKey);
      showFeedback('success', '配置已删除');
      await fetchFeatureSchemas();
      setShowDeleteConfirm(false);
      setPendingDelete(null);
    } catch (error) {
      console.error('删除配置失败:', error);
      const errorMessage = (error as any)?.response?.status === 0
        ? '无法连接到后端服务，请检查后端是否正在运行'
        : '删除失败，请重试';
      showFeedback('error', errorMessage);
    }
  };

  // 打开删除确认弹窗
  const openDeleteConfirm = (config: ImageStorageIntegration) => {
    setPendingDelete(config);
    setShowDeleteConfirm(true);
  };

  // 关闭删除确认弹窗
  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setTimeout(() => setPendingDelete(null), 300);
  };

  // 处理测试连接
  const handleTest = async () => {
    setTestResult(null);

    try {
      const result = await testConnectionTemp({
        provider: selectedProvider,
        config: formConfig,
      });

      setTestResult({ type: 'success', message: result.message });
      setTimeout(() => setTestResult(null), 3000);
    } catch (error: any) {
      setTestResult({ type: 'error', message: error.message || '测试失败' });
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  // 处理保存
  const handleSave = async () => {
    const configKey = editingConfig
      ? editingConfig.config_key
      : `${selectedProvider}-${Date.now()}`;

    const saveData: any = {
      name: formName || `${PROVIDER_NAMES[selectedProvider]}配置`,
      config: { ...formConfig },
    };

    // 如果是编辑且 api_token 为空，不更新该字段
    if (editingConfig && !formConfig.api_token?.trim()) {
      delete saveData.config.api_token;
    }

    try {
      if (editingConfig) {
        await updateConfig(editingConfig.config_key, saveData);
        showFeedback('success', '配置已更新');
      } else {
        await createConfig({
          integration_type: 'storage',
          config_key: configKey,
          provider: selectedProvider,
          name: saveData.name,
          config: saveData.config,
          is_default: configs.length === 0,
          is_enabled: true,
        });
        showFeedback('success', '配置已创建');
      }
      await fetchFeatureSchemas();
      setEditingConfig(null);
      setShowCreateModal(false);
    } catch (error) {
      // 错误已在 store 中处理
    }
  };

  // 渲染配置列表 - 只显示第三方图床配置，本地存储由后端统一管理不显示
  const renderConfigList = () => {
    // 过滤掉本地存储配置
    const thirdPartyConfigs = configs.filter((config) => config.provider !== 'local');

    return (
      <View style={styles.configList}>
        {thirdPartyConfigs.map((config) => (
        <TouchableOpacity
          key={config.config_key}
          style={[styles.configCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
          onPress={() => setEditingConfig(config)}
          activeOpacity={0.8}
        >
          {/* 左侧：Provider 图标 */}
          <View style={styles.configCardLeft}>
            <View style={[styles.providerIconLarge, { backgroundColor: colors.background }]}>
              {(() => {
                const IconComponent = getProviderIcon(config.provider);
                return <IconComponent size={32} color={colors.text} strokeWidth={1.5} />;
              })()}
            </View>
          </View>

          {/* 中间：配置信息 */}
          <View style={styles.configCardMiddle}>
            <View style={styles.configCardHeader}>
              <Text style={[styles.configCardName, { color: colors.text }]}>{config.name}</Text>
              {config.is_default && (
                <View style={[styles.defaultBadge, { backgroundColor: colors.success }]}>
                  <Text style={[styles.defaultBadgeText, { color: colors.white }]}>默认</Text>
                </View>
              )}
            </View>
            <View style={styles.configCardMeta}>
              <Text style={[styles.configCardProvider, { color: colors.textSecondary }]}>
                {PROVIDER_NAMES[config.provider] || config.provider}
              </Text>
              <Text style={[styles.configCardDivider, { color: colors.textSecondary }]}>·</Text>
              <Text style={[styles.configCardStatus, { color: config.is_enabled ? colors.success : colors.textSecondary }]}>
                {config.is_enabled ? '已启用' : '已禁用'}
              </Text>
            </View>
          </View>

          {/* 右侧：操作按钮 */}
          <View style={styles.configCardRight}>
            {!config.is_default && (
              <TouchableOpacity
                style={[styles.cardActionButton, { backgroundColor: colors.background }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleSetDefault(config.config_key);
                }}
              >
                <CheckIcon size={18} color={colors.success} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.cardActionButton, { backgroundColor: colors.background }]}
              onPress={(e) => {
                e.stopPropagation();
                setEditingConfig(config);
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
  };

  // 渲染创建/编辑模态框
  const renderConfigModal = () => {
    const isEditing = !!editingConfig;
    const provider = providers.find(p => p.provider_id === selectedProvider);

    return (
      <Modal
        visible={!!editingConfig || showCreateModal}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setEditingConfig(null);
          setShowCreateModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            {/* 头部 */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {isEditing ? '编辑存储配置' : '创建新配置'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setEditingConfig(null);
                  setShowCreateModal(false);
                }}
              >
                <Text style={[styles.modalClose, { color: colors.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={[styles.modalContent, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
              {/* 反馈消息 */}
              {feedback && (
                <View style={[
                  styles.feedbackBox,
                  feedback.type === 'success' ? { backgroundColor: colors.success + '10', borderColor: colors.success } : { backgroundColor: colors.error + '10', borderColor: colors.error },
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

              {/* Provider 选择（仅创建时）- 只显示第三方提供商，本地存储由后端统一管理 */}
              {!isEditing && (
                <View style={styles.formSection}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>存储类型</Text>
                  <Text style={[styles.formHint, { color: colors.textSecondary }]}>(本地存储由后端服务统一管理，此处仅可配置第三方图床)</Text>
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : providers.length === 0 ? (
                    <Text style={[styles.formHint, { color: colors.textSecondary }]}>暂无可用存储类型</Text>
                  ) : (
                    <View style={styles.providerGrid}>
                      {providers
                        .filter((prov) => prov.provider_id !== 'local')
                        .map((prov) => {
                          const isSelected = selectedProvider === prov.provider_id;
                          return (
                            <TouchableOpacity
                              key={prov.provider_id}
                              style={[
                                styles.providerCard,
                                { backgroundColor: colors.background, borderColor: colors.border },
                                isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                              ]}
                              onPress={() => setSelectedProvider(prov.provider_id)}
                            >
                              <View style={styles.providerCardIcon}>
                                {(() => {
                                  const IconComponent = getProviderIcon(prov.provider_id);
                                  return <IconComponent size={24} color={isSelected ? colors.white : colors.text} strokeWidth={1.5} />;
                                })()}
                              </View>
                              <Text style={[styles.providerCardName, { color: isSelected ? colors.white : colors.text }]}>
                                {prov.provider_name}
                              </Text>
                              <Text style={[styles.providerCardDesc, { color: isSelected ? colors.white + 'cc' : colors.textSecondary }]} numberOfLines={2}>
                                {prov.description}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  )}
                </View>
              )}

              {/* Provider 显示（编辑时） */}
              {isEditing && editingConfig && (
                <View style={styles.formSection}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>存储类型</Text>
                  <View style={[styles.providerInfo, { backgroundColor: colors.backgroundSecondary }]}>
                    {(() => {
                      const IconComponent = getProviderIcon(editingConfig.provider);
                      return <IconComponent size={24} color={colors.text} strokeWidth={1.5} />;
                    })()}
                    <Text style={[styles.providerInfoText, { color: colors.text }]}>
                      {PROVIDER_NAMES[editingConfig.provider] || editingConfig.provider}
                    </Text>
                  </View>
                  <Text style={[styles.formHint, { color: colors.textSecondary }]}>存储类型创建后不可更改</Text>
                </View>
              )}

              {/* 配置名称 */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.text }]}>配置名称</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                  placeholder="例如：兰空图床正式环境、兰空图床测试环境"
                  placeholderTextColor={colors.textSecondary}
                  value={formName}
                  onChangeText={setFormName}
                />
              </View>

              {/* 动态配置字段 - 根据 Provider Schema 渲染 */}
              {provider?.config_fields.map((field: ConfigField) => (
                <View key={field.name} style={styles.formSection}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>
                    {field.label}
                    {!field.required && <Text style={{ color: colors.textSecondary }}>（可选）</Text>}
                  </Text>

                  {field.type === 'select' ? (
                    <View style={styles.selectContainer}>
                      {field.options?.map((option: { label: string; value: string }) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.selectOption,
                            { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                            formConfig[field.name] === option.value && { backgroundColor: colors.primary, borderColor: colors.primary },
                          ]}
                          onPress={() => setFormConfig({ ...formConfig, [field.name]: option.value })}
                        >
                          <Text style={[
                            styles.selectOptionText,
                            { color: colors.text },
                            formConfig[field.name] === option.value && { color: colors.background },
                          ]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <TextInput
                      style={[
                        styles.formInput,
                        { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text },
                        field.type === 'password' && styles.passwordInput,
                      ]}
                      placeholder={field.placeholder}
                      placeholderTextColor={colors.textSecondary}
                      value={formConfig[field.name] || ''}
                      onChangeText={(text) => setFormConfig({ ...formConfig, [field.name]: text })}
                      secureTextEntry={field.type === 'password'}
                      autoCapitalize="none"
                      autoCorrect={false}
                      multiline={false}
                    />
                  )}

                  {field.description && (
                    <Text style={[styles.formHint, { color: colors.textSecondary }]}>
                      {field.type === 'password' && formConfig[field.name] ? '💡 已配置，如需更新请输入新值 | ' : ''}
                      {field.description}
                    </Text>
                  )}
                </View>
              ))}

              {/* 测试结果显示 */}
              {testResult && (
                <View style={[
                  styles.testResultBox,
                  testResult.type === 'success' ? { backgroundColor: colors.success + '10', borderColor: colors.success } : { backgroundColor: colors.error + '10', borderColor: colors.error },
                ]}>
                  {testResult.type === 'success' ? (
                    <CheckIcon size={20} color={colors.success} />
                  ) : (
                    <CloseIcon size={20} color={colors.error} />
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
            </ScrollView>

            {/* 底部按钮 */}
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              {isEditing && (
                <TouchableOpacity
                  style={[styles.modalDeleteButton, { backgroundColor: colors.error + '10' }]}
                  onPress={() => editingConfig && openDeleteConfirm(editingConfig)}
                  disabled={isSaving}
                >
                  <TrashIcon size={16} color={colors.error} />
                  <Text style={[styles.modalDeleteButtonText, { color: colors.error }]}>删除</Text>
                </TouchableOpacity>
              )}

              <View style={styles.testButtonContainer}>
                <TouchableOpacity
                  style={[styles.testButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={handleTest}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <Text style={[styles.testButtonText, { color: colors.text }]}>🔌 测试连接</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.modalFooterRight}>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => {
                    setEditingConfig(null);
                    setShowCreateModal(false);
                  }}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text }]}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    { backgroundColor: colors.primary },
                    isSaving && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <Text style={[styles.saveButtonText, { color: colors.background }]}>💾 保存</Text>
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
        <Text style={[styles.title, { color: colors.text }]}>图片存储配置</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>默认使用本地存储，可配置第三方图床进行 CDN 加速</Text>
      </View>

      {/* 操作栏 */}
      <View style={styles.headerActions}>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            const thirdPartyProviders = providers.filter(p => p.provider_id !== 'local');
            setSelectedProvider(thirdPartyProviders.length > 0 ? thirdPartyProviders[0].provider_id : 'lskypro');
            setFormName('');
            setFormConfig(DEFAULT_CONFIGS['lskypro'] || {});
            setTestResult(null);
            setShowCreateModal(true);
          }}
        >
          <PlusIcon size={20} color={colors.white} />
          <Text style={[styles.addButtonText, { color: colors.white }]}>新建配置</Text>
        </TouchableOpacity>
      </View>

      {/* 反馈消息 */}
      {feedback && !editingConfig && !showCreateModal && (
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
      ) : configs.filter((c) => c.provider !== 'local').length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.backgroundSecondary }]}>
            <CloudIcon size={48} color={colors.textSecondary} strokeWidth={1.5} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>暂无图床配置</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>点击右上角按钮创建第三方图床配置</Text>
          <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>默认使用本地存储，可配置兰空图床等第三方服务进行 CDN 加速</Text>
        </View>
      ) : (
        renderConfigList()
      )}

      {/* 创建/编辑模态框 */}
      {renderConfigModal()}

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="删除存储配置"
        message={`确定要删除"${pendingDelete?.name}"吗？${pendingDelete?.is_default ? '删除默认配置后将使用下一个可用配置。' : '此操作不可恢复。'}`}
        confirmText="删除"
        cancelText="取消"
        isDestructive
        onConfirm={() => pendingDelete && handleDelete(pendingDelete.config_key)}
        onCancel={closeDeleteConfirm}
      />
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
  headerTitle: {
    gap: spacing.xs,
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
    borderWidth: 1,
  },
  feedbackContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
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
  emptyHint: {
    fontSize: 12,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  // 配置列表
  configList: {
    padding: spacing.lg,
  },
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
  defaultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
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
  configCardStatus: {
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
  passwordInput: {
  },
  formHint: {
    fontSize: 12,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  providerCard: {
    flex: 1,
    minWidth: '40%',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  providerCardIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerCardName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  providerCardDesc: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
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
  selectContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  selectOption: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  selectOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  testResultText: {
    flex: 1,
    fontSize: 14,
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
  testButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  testButtonContainer: {
    flex: 1,
  },
  modalFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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

export default ImageStorageConfigManager;
