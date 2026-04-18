// 场景配置详情组件 - 支持分组渲染（优化版）

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {
  ThermometerIcon,
  DatabaseIcon,
  CheckIcon,
  ChevronDownIcon,
} from '../icons';
import { GroupIcon } from '../common/GroupIcon';
import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { useFeatureConfigStore } from '../../stores/featureConfigStore';
import { FeatureSchema, type ConfigField } from '../../api/featureConfig';

interface FeatureConfigDetailProps {
  featureId: string;
}

// 渲染单个配置字段
const ConfigFieldInput: React.FC<{
  field: ConfigField;
  value: any;
  onChange: (value: any) => void;
  colors: ReturnType<typeof useWebTheme>;
}> = ({ field, value, onChange, colors }) => {
  const displayValue = value ?? field.default;
  const [showSelectModal, setShowSelectModal] = useState(false);

  // 获取当前选中项的标签
  const selectedLabel = field.options?.find(opt => opt.value === displayValue)?.label ||
    field.placeholder ||
    '请选择...';

  // 渲染选择弹窗
  const renderSelectModal = () => (
    <Modal
      visible={showSelectModal}
      animationType="fade"
      transparent
      onRequestClose={() => setShowSelectModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{field.label}</Text>
            <TouchableOpacity onPress={() => setShowSelectModal(false)}>
              <Text style={[styles.modalClose, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {field.options && field.options.length > 0 ? (
              field.options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.selectModalOption,
                    { backgroundColor: colors.backgroundSecondary },
                    displayValue === option.value && styles.selectModalOptionActive,
                  ]}
                  onPress={() => {
                    onChange(option.value);
                    setShowSelectModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.selectModalOptionText,
                      { color: colors.text },
                      displayValue === option.value && styles.selectModalOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {displayValue === option.value && (
                    <CheckIcon size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyOptionsContainer}>
                <Text style={[styles.emptyOptionsText, { color: colors.textSecondary }]}>
                  {field.placeholder || '暂无可用选项'}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  switch (field.type) {
    case 'boolean':
      return (
        <View style={styles.booleanContainer}>
          <Switch
            value={!!displayValue}
            onValueChange={onChange}
            trackColor={{ false: colors.border, true: colors.primary + '50' }}
            thumbColor={displayValue ? colors.primary : colors.textSecondary}
          />
        </View>
      );

    case 'number':
      return (
        <View style={styles.numberInputContainer}>
          <TextInput
            style={[styles.numberInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            value={String(displayValue ?? '')}
            onChangeText={(text) => {
              const num = parseFloat(text);
              onChange(isNaN(num) ? text : num);
            }}
            keyboardType="numeric"
            placeholder={field.placeholder}
            placeholderTextColor={colors.textSecondary}
          />
          {field.name === 'temperature' && (
            <View style={styles.temperatureIndicator}>
              <ThermometerIcon size={16} color={getTemperatureColor(displayValue)} />
              <Text style={[styles.temperatureText, { color: getTemperatureColor(displayValue) }]}>
                {getTemperatureLabel(displayValue)}
              </Text>
            </View>
          )}
        </View>
      );

    case 'select':
      return (
        <>
          <TouchableOpacity
            style={[styles.selectTrigger, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => setShowSelectModal(true)}
          >
            <Text style={[styles.selectTriggerText, { color: colors.text }]} numberOfLines={1}>
              {selectedLabel}
            </Text>
            <ChevronDownIcon size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          {renderSelectModal()}
        </>
      );

    case 'password':
      return (
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
          value={displayValue || ''}
          onChangeText={onChange}
          placeholder={field.placeholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
        />
      );

    default: // text, url
      return (
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
          value={displayValue || ''}
          onChangeText={onChange}
          placeholder={field.placeholder}
          placeholderTextColor={colors.textSecondary}
        />
      );
  }
};

// 获取温度颜色
const getTemperatureColor = (value: number): string => {
  if (value <= 0.3) return '#3b82f6'; // 蓝色 - 稳定
  if (value <= 0.7) return '#f59e0b'; // 橙色 - 平衡
  return '#ef4444'; // 红色 - 创造性
};

// 获取温度标签
const getTemperatureLabel = (value: number): string => {
  if (value <= 0.3) return '稳定';
  if (value <= 0.7) return '平衡';
  return '创造性';
};

// 渲染分组
const ConfigGroupSection: React.FC<{
  groupId: string;
  groupLabel: string;
  groupIcon: string;
  fields: ConfigField[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  colors: ReturnType<typeof useWebTheme>;
}> = ({ groupId, groupLabel, groupIcon, fields, values, onChange, colors }) => {
  return (
    <View style={[styles.groupCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
      {/* 分组头部 */}
      <View style={[styles.groupHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.groupIconContainer, { backgroundColor: colors.primary + '10' }]}>
          <GroupIcon name={groupIcon} size={16} color={colors.primary} />
        </View>
        <View style={styles.groupTitleContainer}>
          <Text style={[styles.groupTitle, { color: colors.text }]}>{groupLabel}</Text>
          <Text style={[styles.groupFieldCount, { color: colors.textSecondary }]}>{fields.length} 项配置</Text>
        </View>
      </View>

      {/* 分组内容 */}
      <View style={styles.groupContent}>
        {fields.map((field, index) => (
          <View
            key={field.name}
            style={[
              styles.fieldRow,
              { borderBottomColor: colors.border },
              index === fields.length - 1 && styles.fieldRowLast,
            ]}
          >
            {/* 字段左侧：标签和描述 */}
            <View style={styles.fieldInfo}>
              <View style={styles.fieldLabelRow}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>{field.label}</Text>
                {field.required && <Text style={[styles.requiredBadge, { backgroundColor: colors.error + '10', color: colors.error }]}>必填</Text>}
              </View>
              {field.description && (
                <Text style={[styles.fieldDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                  {field.description}
                </Text>
              )}
            </View>

            {/* 字段右侧：输入控件 */}
            <View style={styles.fieldInput}>
              <ConfigFieldInput
                field={field}
                value={values[field.name]}
                onChange={(value) => onChange(field.name, value)}
                colors={colors}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export const FeatureConfigDetail: React.FC<FeatureConfigDetailProps> = ({ featureId }) => {
  const colors = useWebTheme();
  const {
    schemasMap,
    settings,
    isLoadingSchemas,
    isLoadingSettings,
    isSaving,
    error,
    fetchSchemas,
    fetchSetting,
    saveSetting,
    resetSetting,
    clearError,
  } = useFeatureConfigStore();

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const schema = schemasMap.get(featureId);
  const currentSetting = settings.get(featureId);

  // 切换场景时重置编辑状态
  useEffect(() => {
    setHasChanges(false);
    setSaveSuccess(false);
    setResetSuccess(false);
    setShowResetConfirm(false);
  }, [featureId]);

  useEffect(() => {
    if (!schema) {
      fetchSchemas();
    }
    fetchSetting(featureId);
  }, [featureId]);

  useEffect(() => {
    if (!currentSetting && !schema) {
      return;
    }

    // 合并 integration_refs 和 custom_settings 到 formValues
    const newFormValues: Record<string, any> = {};

    // 从 schema 中的默认值开始
    if (schema?.default_config) {
      Object.assign(newFormValues, schema.default_config);
    }

    // 从 integration_refs 中读取 (如 llm_config_id -> integration_refs.llm)
    if (currentSetting?.integration_refs) {
      for (const [refType, value] of Object.entries(currentSetting.integration_refs)) {
        const fieldName = `${refType}_config_id`;
        if (value) {
          newFormValues[fieldName] = value;
        }
      }
    }

    // 从 custom_settings 中读取
    if (currentSetting?.custom_settings) {
      Object.assign(newFormValues, currentSetting.custom_settings);
    }

    setFormValues(newFormValues);
  }, [currentSetting, schema]);

  const handleFieldChange = (name: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    try {
      await saveSetting(featureId, formValues);
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      // 错误已在 store 中处理
    }
  };

  const handleReset = async () => {
    try {
      await resetSetting(featureId);
      // 重置表单值为默认值
      setFormValues(schema?.default_config || {});
      setHasChanges(false);
      setResetSuccess(true);
      setShowResetConfirm(false);
      setTimeout(() => setResetSuccess(false), 3000);
    } catch (err) {
      // 错误已在 store 中处理
    }
  };

  const getGroupedFields = () => {
    if (!schema) return [];

    const groups = schema.config_groups || [];
    const groupMap = new Map(groups.map(g => [g.id, g]));

    const grouped: { groupId: string; groupLabel: string; groupIcon: string; fields: ConfigField[] }[] = [];
    const ungrouped: ConfigField[] = [];

    for (const field of schema.config_fields) {
      if (field.group && groupMap.has(field.group)) {
        const existing = grouped.find(g => g.groupId === field.group);
        if (existing) {
          existing.fields.push(field);
        } else {
          const group = groupMap.get(field.group)!;
          grouped.push({
            groupId: group.id,
            groupLabel: group.label,
            groupIcon: group.icon,
            fields: [field],
          });
        }
      } else {
        ungrouped.push(field);
      }
    }

    const ordered = groups
      .map(g => grouped.find(item => item.groupId === g.id))
      .filter(Boolean) as { groupId: string; groupLabel: string; groupIcon: string; fields: ConfigField[] }[];

    if (ungrouped.length > 0) {
      ordered.push({
        groupId: 'default',
        groupLabel: '其他设置',
        groupIcon: 'settings',
        fields: ungrouped,
      });
    }

    return ordered;
  };

  if (isLoadingSchemas || isLoadingSettings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>加载配置中...</Text>
      </View>
    );
  }

  if (!schema) {
    return (
      <View style={styles.errorContainer}>
        <DatabaseIcon size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>配置不存在</Text>
      </View>
    );
  }

  const groupedFields = getGroupedFields();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 头部 */}
      <View style={[styles.header, { backgroundColor: colors.textSecondary + '10' }]}>
        <Text style={[styles.title, { color: colors.text }]}>{schema.feature_name}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{schema.description}</Text>
      </View>

      {/* 状态提示 */}
      {saveSuccess && (
        <View style={[styles.successBanner, { backgroundColor: colors.success + '15', borderColor: colors.success + '30' }]}>
          <CheckIcon size={16} color={colors.success} />
          <Text style={[styles.successText, { color: colors.success }]}>配置已保存</Text>
        </View>
      )}
      {resetSuccess && (
        <View style={[styles.successBanner, { backgroundColor: colors.success + '15', borderColor: colors.success + '30' }]}>
          <CheckIcon size={16} color={colors.success} />
          <Text style={[styles.successText, { color: colors.success }]}>已恢复默认配置</Text>
        </View>
      )}
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.error + '15', borderColor: colors.error + '30' }]}>
          <Text style={[styles.errorBannerText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      {/* 表单内容 */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {groupedFields.map((group) => (
          <ConfigGroupSection
            key={group.groupId}
            groupId={group.groupId}
            groupLabel={group.groupLabel}
            groupIcon={group.groupIcon}
            fields={group.fields}
            values={formValues}
            onChange={handleFieldChange}
            colors={colors}
          />
        ))}
      </ScrollView>

      {/* 底部操作栏 */}
      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <View style={styles.footerLeft}>
          {!schema?.is_required && (
            <TouchableOpacity
              style={[styles.resetButton, { backgroundColor: colors.background, borderColor: colors.primary + '40' }]}
              onPress={() => setShowResetConfirm(true)}
              disabled={isSaving}
            >
              <Text style={[styles.resetButtonText, { color: colors.primary }]}>恢复默认</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.footerRight}>
          {hasChanges && (
            <Text style={[styles.unsavedHint, { color: colors.primary }]}>有未保存的更改</Text>
          )}
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: colors.primary },
              (!hasChanges || isSaving) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>保存配置</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 重置确认弹窗 */}
      {showResetConfirm && (
        <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.confirmDialog, { backgroundColor: colors.background }]}>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>恢复默认配置</Text>
            <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
              确定要将 {schema?.feature_name} 的配置恢复为默认值吗？此操作不可撤销。
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => setShowResetConfirm(false)}
              >
                <Text style={[styles.confirmCancelText, { color: colors.textSecondary }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: colors.error }]}
                onPress={handleReset}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.confirmResetText}>确认恢复</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  errorText: {
    fontSize: 16,
  },
  header: {
    borderRadius: 12,
    padding: spacing.lg,
    margin: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  successText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorBannerText: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.lg,
  },
  // 分组卡片样式
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  groupIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupTitleContainer: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  groupFieldCount: {
    fontSize: 11,
    marginTop: 2,
  },
  groupContent: {
    paddingVertical: spacing.sm,
  },
  // 字段行样式
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    minHeight: 72,
  },
  fieldRowLast: {
    borderBottomWidth: 0,
  },
  fieldInfo: {
    flex: 1,
    paddingRight: spacing.md,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  requiredBadge: {
    fontSize: 10,
    fontWeight: '500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fieldDescription: {
    fontSize: 12,
    lineHeight: 18,
  },
  fieldInput: {
    minWidth: 140,
    alignItems: 'flex-end',
  },
  // 输入控件样式
  textInput: {
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    minWidth: 200,
    textAlign: 'right',
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  numberInput: {
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    width: 80,
    textAlign: 'center',
  },
  temperatureIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  temperatureText: {
    fontSize: 12,
    fontWeight: '500',
  },
  booleanContainer: {
    justifyContent: 'center',
  },
  // Select 样式
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    minWidth: 140,
    borderWidth: 1,
  },
  selectTriggerText: {
    fontSize: 14,
    flex: 1,
  },
  // Select Modal 样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: 16,
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
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 20,
    padding: spacing.xs,
  },
  modalContent: {
    padding: spacing.md,
  },
  selectModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  selectModalOptionActive: {
    borderWidth: 1,
  },
  selectModalOptionText: {
    fontSize: 15,
  },
  selectModalOptionTextActive: {
    fontWeight: '600',
  },
  emptyOptionsContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyOptionsText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  // 底部样式
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  resetButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  unsavedHint: {
    fontSize: 13,
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonIcon: {
    marginRight: 2,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // 确认弹窗样式
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  confirmDialog: {
    borderRadius: 16,
    padding: spacing.lg,
    width: '80%',
    maxWidth: 320,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  confirmMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  confirmCancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  confirmCancelText: {
    fontSize: 14,
  },
  confirmButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  confirmResetButton: {
  },
  confirmResetText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FeatureConfigDetail;
