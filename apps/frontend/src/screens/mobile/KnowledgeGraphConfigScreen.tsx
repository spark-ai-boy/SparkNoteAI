// 知识图谱设置（手机端）— iOS 分组卡片风格

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  Alert,
  Animated,
} from 'react-native';
import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { useFeatureConfigStore } from '../../stores/featureConfigStore';
import type { ConfigField } from '../../api/featureConfig';
import {
  ChevronDownIcon,
  CheckIcon,
  NetworkIcon,
  ThermometerIcon,
} from '../../components/icons';
import { GroupIcon } from '../../components/common/GroupIcon';

const getTemperatureColor = (value: number): string => {
  if (value <= 0.3) return '#3b82f6';
  if (value <= 0.7) return '#f59e0b';
  return '#ef4444';
};

const getTemperatureLabel = (value: number): string => {
  if (value <= 0.3) return '稳定';
  if (value <= 0.7) return '平衡';
  return '创造性';
};

// ---- 底部弹出选择器 ----

const SelectBottomSheet: React.FC<{
  field: ConfigField;
  value: any;
  onChange: (value: any) => void;
  visible: boolean;
  onClose: () => void;
  colors: ReturnType<typeof useTheme>;
}> = ({ field, value, onChange, visible, onClose, colors }) => {
  const displayValue = value ?? field.default;
  const translateY = useRef(new Animated.Value(300)).current;
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      translateY.setValue(300);
      requestAnimationFrame(() => {
        Animated.spring(translateY, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }).start();
      });
    } else if (showModal) {
      Animated.timing(translateY, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowModal(false);
      });
    }
  }, [visible]);

  if (!showModal) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Animated.View
          style={[styles.sheetContainer, { backgroundColor: colors.backgroundSecondary, transform: [{ translateY }] }]}
        >
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{field.label}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={[styles.sheetClose, { color: colors.textSecondary }]}>取消</Text>
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: spacing.sm }}>
            {field.options?.map((opt) => (
              <Pressable
                key={opt.value}
                style={styles.sheetOption}
                onPress={() => { onChange(opt.value); onClose(); }}
              >
                <Text style={[styles.sheetOptionText, { color: colors.text }]}>{opt.label}</Text>
                {displayValue === opt.value && <CheckIcon size={18} color={colors.primary} />}
              </Pressable>
            ))}
            {displayValue != null && displayValue !== '' && (
              <Pressable
                style={[styles.sheetClear, { borderTopColor: colors.border }]}
                onPress={() => { onChange(null); onClose(); }}
              >
                <Text style={[styles.sheetClearText, { color: colors.error }]}>清空</Text>
              </Pressable>
            )}
          </ScrollView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

// ---- 配置字段输入 ----

const ConfigFieldInput: React.FC<{
  field: ConfigField;
  value: any;
  onChange: (value: any) => void;
  colors: ReturnType<typeof useTheme>;
  onOpenSelect?: (field: ConfigField) => void;
}> = ({ field, value, onChange, colors, onOpenSelect }) => {
  const displayValue = value ?? field.default;

  const selectedLabel = field.options?.find((opt) => opt.value === displayValue)?.label ||
    field.placeholder ||
    '请选择...';

  switch (field.type) {
    case 'boolean':
      return (
        <Switch
          value={!!displayValue}
          onValueChange={onChange}
          trackColor={{ false: colors.border, true: colors.primary + '40' }}
          thumbColor={displayValue ? colors.primary : colors.textTertiary}
        />
      );

    case 'number':
      return (
        <View style={styles.numberInputWrap}>
          <TextInput
            style={[styles.numberInput, { backgroundColor: colors.background, color: colors.text }]}
            value={String(displayValue ?? '')}
            onChangeText={(text) => {
              const num = parseFloat(text);
              onChange(isNaN(num) ? '' : num);
            }}
            keyboardType="decimal-pad"
            placeholder={field.placeholder}
            placeholderTextColor={colors.textTertiary}
          />
          {field.name === 'temperature' && typeof displayValue === 'number' && (
            <View style={styles.tempIndicator}>
              <ThermometerIcon size={14} color={getTemperatureColor(displayValue)} />
              <Text style={[styles.tempText, { color: getTemperatureColor(displayValue) }]}>
                {getTemperatureLabel(displayValue)}
              </Text>
            </View>
          )}
        </View>
      );

    case 'select':
      return (
        <Pressable
          style={[styles.selectTrigger, { backgroundColor: colors.background }]}
          onPress={() => onOpenSelect?.(field)}
        >
          <Text style={[styles.selectText, { color: displayValue ? colors.text : colors.textTertiary }]} numberOfLines={1}>
            {selectedLabel}
          </Text>
          <ChevronDownIcon size={16} color={colors.textSecondary} />
        </Pressable>
      );

    case 'password':
      return (
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.background, color: colors.text }]}
          value={displayValue || ''}
          onChangeText={onChange}
          placeholder={field.placeholder}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry
        />
      );

    default:
      return (
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.background, color: colors.text }]}
          value={displayValue || ''}
          onChangeText={onChange}
          placeholder={field.placeholder}
          placeholderTextColor={colors.textTertiary}
        />
      );
  }
};

// ---- 分组渲染 ----

const ConfigGroupSection: React.FC<{
  groupLabel: string;
  groupIcon: string;
  fields: ConfigField[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  colors: ReturnType<typeof useTheme>;
  onOpenSelect: (field: ConfigField) => void;
}> = ({ groupLabel, groupIcon, fields, values, onChange, colors, onOpenSelect }) => {
  return (
    <View style={[styles.groupCard, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={[styles.groupHeader, { borderBottomColor: colors.border }]}>
        <GroupIcon name={groupIcon} size={18} color={colors.primary} />
        <Text style={[styles.groupTitle, { color: colors.text }]}>{groupLabel}</Text>
      </View>

      {fields.map((field, index) => {
        const isLast = index === fields.length - 1;
        return (
          <View key={field.name}>
            <View style={[styles.fieldRow, !isLast && { borderBottomColor: colors.border }]}>
              <View style={styles.fieldInfo}>
                <View style={styles.fieldLabelRow}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>{field.label}</Text>
                  {field.required && (
                    <View style={[styles.requiredBadge, { backgroundColor: colors.error + '18' }]}>
                      <Text style={[styles.requiredBadgeText, { color: colors.error }]}>必填</Text>
                    </View>
                  )}
                </View>
                {field.description && (
                  <Text style={[styles.fieldDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {field.description}
                  </Text>
                )}
              </View>
              <View style={styles.fieldInputWrap}>
                <ConfigFieldInput
                  field={field}
                  value={values[field.name]}
                  onChange={(val) => onChange(field.name, val)}
                  colors={colors}
                  onOpenSelect={onOpenSelect}
                />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// ---- 主组件 ----

export const KnowledgeGraphConfigScreen: React.FC = () => {
  const colors = useTheme();
  const featureId = 'knowledge_graph';
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
  } = useFeatureConfigStore();

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // 底部选择器状态
  const [selectField, setSelectField] = useState<ConfigField | null>(null);

  const schema = schemasMap.get(featureId);
  const currentSetting = settings.get(featureId);

  useEffect(() => {
    if (!schema) fetchSchemas();
    fetchSetting(featureId);
  }, []);

  useEffect(() => {
    if (!currentSetting && !schema) return;

    const newValues: Record<string, any> = {};
    if (schema?.default_config) {
      Object.assign(newValues, schema.default_config);
    }
    if (currentSetting?.integration_refs) {
      for (const [refType, val] of Object.entries(currentSetting.integration_refs)) {
        if (val) newValues[`${refType}_config_id`] = val;
      }
    }
    if (currentSetting?.custom_settings) {
      Object.assign(newValues, currentSetting.custom_settings);
    }
    setFormValues(newValues);
  }, [currentSetting, schema]);

  const handleFieldChange = useCallback((name: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setHasChanges(true);
  }, []);

  const handleOpenSelect = useCallback((field: ConfigField) => {
    setSelectField(field);
  }, []);

  const handleCloseSelect = useCallback(() => {
    setSelectField(null);
  }, []);

  const handleSave = async () => {
    try {
      await saveSetting(featureId, formValues);
      setHasChanges(false);
      Alert.alert('保存成功', '知识图谱配置已保存');
    } catch (e: any) {
      Alert.alert('保存失败', e.message || error || '未知错误');
    }
  };

  const handleReset = async () => {
    setShowResetConfirm(false);
    try {
      await resetSetting(featureId);
      setFormValues(schema?.default_config || {});
      setHasChanges(false);
    } catch (e: any) {
      Alert.alert('重置失败', e.message || error || '未知错误');
    }
  };

  const getGroupedFields = useCallback(() => {
    if (!schema) return [];

    const groups = schema.config_groups || [];
    const groupMap = new Map(groups.map((g) => [g.id, g]));

    const grouped: { groupId: string; groupLabel: string; groupIcon: string; fields: ConfigField[] }[] = [];
    const ungrouped: ConfigField[] = [];

    for (const field of schema.config_fields) {
      if (field.group && groupMap.has(field.group)) {
        const existing = grouped.find((g) => g.groupId === field.group);
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
      .map((g) => grouped.find((item) => item.groupId === g.id))
      .filter(Boolean) as typeof grouped;

    if (ungrouped.length > 0) {
      ordered.push({
        groupId: 'default',
        groupLabel: '其他设置',
        groupIcon: 'settings',
        fields: ungrouped,
      });
    }

    return ordered;
  }, [schema]);

  if (isLoadingSchemas || isLoadingSettings) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.centerText, { color: colors.textSecondary }]}>加载配置中...</Text>
      </View>
    );
  }

  if (!schema) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <NetworkIcon size={48} color={colors.textTertiary} />
        <Text style={[styles.centerText, { color: colors.textSecondary }]}>配置不存在</Text>
      </View>
    );
  }

  const groupedFields = getGroupedFields();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 描述头 */}
      <View style={[styles.infoCard, { backgroundColor: colors.backgroundSecondary }]}>
        <NetworkIcon size={24} color={colors.blue} />
        <View style={styles.infoText}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>{schema.feature_name}</Text>
          <Text style={[styles.infoDesc, { color: colors.textSecondary }]}>{schema.description}</Text>
        </View>
      </View>

      {error && (
        <View style={[styles.errorBar, { backgroundColor: colors.error + '15' }]}>
          <Text style={[styles.errorBarText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {groupedFields.map((group) => (
          <ConfigGroupSection
            key={group.groupId}
            groupLabel={group.groupLabel}
            groupIcon={group.groupIcon}
            fields={group.fields}
            values={formValues}
            onChange={handleFieldChange}
            colors={colors}
            onOpenSelect={handleOpenSelect}
          />
        ))}
      </ScrollView>

      {/* 底部操作栏 */}
      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        {!schema.is_required && (
          <Pressable
            style={[styles.resetBtn, { borderColor: colors.border }]}
            onPress={() => setShowResetConfirm(true)}
            disabled={isSaving}
          >
            <Text style={[styles.resetBtnText, { color: colors.textSecondary }]}>恢复默认</Text>
          </Pressable>
        )}
        <View style={styles.footerRight}>
          {hasChanges && (
            <Text style={[styles.unsavedText, { color: colors.primary }]}>有未保存的更改</Text>
          )}
          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.primary }, (!hasChanges || isSaving) && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>保存配置</Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* 底部弹出选择器 */}
      {selectField && (
        <SelectBottomSheet
          field={selectField}
          value={formValues[selectField.name]}
          onChange={(val) => handleFieldChange(selectField.name, val)}
          visible={!!selectField}
          onClose={handleCloseSelect}
          colors={colors}
        />
      )}

      {/* 重置确认弹窗 */}
      <Modal
        visible={showResetConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetConfirm(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowResetConfirm(false)}>
          <Pressable style={[styles.dialog, { backgroundColor: colors.backgroundSecondary }]} onPress={() => {}}>
            <Text style={[styles.dialogTitle, { color: colors.text }]}>恢复默认配置</Text>
            <Text style={[styles.dialogMsg, { color: colors.textSecondary }]}>
              确定要将知识图谱配置恢复为默认值吗？此操作不可撤销。
            </Text>
            <View style={styles.dialogBtns}>
              <Pressable style={styles.dialogCancel} onPress={() => setShowResetConfirm(false)}>
                <Text style={[styles.dialogCancelText, { color: colors.textSecondary }]}>取消</Text>
              </Pressable>
              <Pressable style={[styles.dialogConfirm, { backgroundColor: colors.error }]} onPress={handleReset}>
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.dialogConfirmText}>确认恢复</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerText: { fontSize: 14, marginTop: spacing.md },

  // 描述头
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

  // 错误条
  errorBar: { marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.sm, borderRadius: 8 },
  errorBarText: { fontSize: 13 },

  // 内容区
  content: { padding: spacing.md, paddingBottom: spacing.xl },

  // 分组卡片
  groupCard: { borderRadius: 12, overflow: 'hidden', marginBottom: spacing.md },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 0.5,
  },
  groupTitle: { fontSize: 14, fontWeight: '600' },

  // 字段行
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    minHeight: 56,
  },
  fieldInfo: { flex: 1, paddingRight: spacing.md },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2 },
  fieldLabel: { fontSize: 14, fontWeight: '500' },
  requiredBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  requiredBadgeText: { fontSize: 10, fontWeight: '600' },
  fieldDesc: { fontSize: 12, lineHeight: 16 },
  fieldInputWrap: { minWidth: 120, alignItems: 'flex-end' },

  // 输入控件
  textInput: {
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: 14,
    minWidth: 100,
    textAlign: 'right',
  },
  numberInputWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  numberInput: {
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: 14,
    width: 60,
    textAlign: 'center',
  },
  tempIndicator: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tempText: { fontSize: 11, fontWeight: '500' },

  // Select 触发器
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    minWidth: 100,
  },
  selectText: { fontSize: 14, flex: 1, textAlign: 'right' },

  // 底部弹出选择器
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheetContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
  },
  sheetTitle: { fontSize: 16, fontWeight: '600' },
  sheetClose: { fontSize: 16, padding: spacing.xs },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    marginHorizontal: spacing.sm,
    marginVertical: 1,
    borderRadius: 8,
  },
  sheetOptionText: { fontSize: 15 },
  sheetClear: {
    padding: spacing.md,
    borderTopWidth: 0.5,
    alignItems: 'center',
  },
  sheetClearText: { fontSize: 15, fontWeight: '500' },

  // 底部操作栏
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderTopWidth: 0.5 },
  resetBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 8, borderWidth: 1 },
  resetBtnText: { fontSize: 14 },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginLeft: 'auto' },
  unsavedText: { fontSize: 12, fontWeight: '500' },
  saveBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '600' },

  // 重置确认弹窗
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  dialog: { width: '80%', borderRadius: 16, padding: spacing.lg },
  dialogTitle: { fontSize: 17, fontWeight: '600', marginBottom: spacing.sm },
  dialogMsg: { fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },
  dialogBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  dialogCancel: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  dialogCancelText: { fontSize: 14 },
  dialogConfirm: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 8 },
  dialogConfirmText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

export default KnowledgeGraphConfigScreen;
