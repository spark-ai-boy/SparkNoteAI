// 服务器配置界面组件

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  CheckCircleIcon,
  XCircleIcon,
  ServerIcon,
  RefreshCwIcon,
  SaveIcon,
  RotateCcwIcon,
} from '../icons';
import { ConfirmDialog } from './ConfirmDialog';
import { spacing, typography, fontFamily } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { useServerConfigStore } from '../../stores/serverConfigStore';

export const ServerConfigView: React.FC = () => {
  const colors = useWebTheme();
  const {
    baseUrl,
    isLoading,
    isTesting,
    lastTestResult,
    serverInfo,
    compatibility,
    error,
    loadConfig,
    setBaseUrl,
    testConnection,
    resetConfig,
    clearError,
  } = useServerConfigStore();

  const [inputValue, setInputValue] = useState(baseUrl);
  const [isDirty, setIsDirty] = useState(false);

  // Dialog states
  const [showTestWarning, setShowTestWarning] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [pendingSaveWithIncompatibility, setPendingSaveWithIncompatibility] = useState(false);

  // 加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  // 同步 store 中的 baseUrl 到本地状态
  useEffect(() => {
    setInputValue(baseUrl);
  }, [baseUrl]);

  const handleTest = async () => {
    const result = await testConnection();
    if (!result.compatible) {
      setShowTestWarning(true);
    }
  };

  const handleSave = async () => {
    // 先测试连接
    const result = await testConnection();

    if (result.compatible) {
      await setBaseUrl(inputValue);
      setIsDirty(false);
      setShowSaveSuccess(true);
    } else {
      // 版本不兼容时，询问用户是否仍要保存
      setShowSaveConfirm(true);
    }
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  // 执行重置操作
  const executeReset = () => {
    resetConfig();
    setInputValue('http://localhost:8000');
    setIsDirty(false);
  };

  // 执行保存（包括不兼容时强制保存）
  const executeSave = async (forceSave: boolean) => {
    if (forceSave) {
      await setBaseUrl(inputValue);
      setIsDirty(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>加载配置...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <ServerIcon size={28} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>服务器配置</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          配置私有化部署的服务器地址，修改后需要测试连接并保存才能生效
        </Text>
      </View>

      {/* 服务器地址输入 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>服务器地址</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
              isDirty && { borderColor: colors.warning, backgroundColor: colors.warning + '10' },
            ]}
            value={inputValue}
            onChangeText={(text) => {
              setInputValue(text);
              setIsDirty(text !== baseUrl);
              clearError();
            }}
            placeholder="http://192.168.1.100:8000"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            selectTextOnFocus
            placeholderTextColor={colors.textSecondary}
          />
          {isDirty && (
            <View style={styles.dirtyIndicator}>
              <Text style={[styles.dirtyText, { color: colors.warning }]}>未保存</Text>
            </View>
          )}
        </View>
      </View>

      {/* 测试连接按钮 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>连接测试</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.testButton, { backgroundColor: colors.secondary }]}
            onPress={handleTest}
            disabled={isTesting}
          >
            {isTesting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <RefreshCwIcon size={18} color={colors.white} />
            )}
            <Text style={styles.buttonText}>
              {isTesting ? '测试中...' : '测试连接'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton, { backgroundColor: colors.primary }, !isDirty && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={!isDirty || isTesting}
          >
            <SaveIcon size={18} color={colors.white} />
            <Text style={styles.buttonText}>保存配置</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 测试结果显示 */}
      {lastTestResult !== null && compatibility && (
        <View
          style={[
            styles.resultContainer,
            { backgroundColor: compatibility.compatible ? colors.success + '10' : colors.error + '10' },
            compatibility.compatible ? { borderWidth: 1, borderColor: colors.success + '30' } : { borderWidth: 1, borderColor: colors.error + '30' },
          ]}
        >
          <View style={styles.resultIcon}>
            {compatibility.compatible ? (
              <CheckCircleIcon size={24} color={colors.success} />
            ) : (
              <XCircleIcon size={24} color={colors.error} />
            )}
          </View>
          <View style={styles.resultContent}>
            <Text
              style={[
                styles.resultTitle,
                compatibility.compatible ? { color: colors.success } : { color: colors.error },
              ]}
            >
              {compatibility.compatible ? '连接成功' : '连接失败'}
            </Text>
            <Text style={[styles.resultMessage, { color: colors.textSecondary }]}>{compatibility.message}</Text>
            {serverInfo?.version && (
              <Text style={[styles.versionInfo, { color: colors.textSecondary }]}>
                服务器版本：{serverInfo.version}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* 错误提示 */}
      {error && !compatibility?.compatible && (
        <View style={[styles.errorContainer, { backgroundColor: colors.error + '10' }]}>
          <XCircleIcon size={20} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error, flex: 1 }]}>{error}</Text>
        </View>
      )}

      {/* 重置按钮 */}
      <View style={styles.section}>
        <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
          <RotateCcwIcon size={16} color={colors.textSecondary} />
          <Text style={[styles.resetText, { color: colors.textSecondary }]}>恢复默认配置</Text>
        </TouchableOpacity>
      </View>

      {/* 版本兼容性说明 */}
      <View style={[styles.helpContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.helpTitle, { color: colors.text }]}>版本兼容性说明</Text>
        <Text style={[styles.helpText, { color: colors.textSecondary }]}>
          • 客户端版本：v{CLIENT_VERSION}
        </Text>
        <Text style={[styles.helpText, { color: colors.textSecondary }]}>
          • 支持的服务器版本：v{SUPPORTED_SERVER_VERSIONS.min} ~ v{SUPPORTED_SERVER_VERSIONS.max}
        </Text>
        <Text style={[styles.helpText, { color: colors.textSecondary }]}>
          • 主版本不一致可能导致兼容性问题
        </Text>
      </View>
    </ScrollView>

    {/* 测试连接警告对话框 */}
    <ConfirmDialog
      visible={showTestWarning}
      title="版本不兼容"
      message={error || '连接测试失败'}
      confirmText="确定"
      cancelText=""
      onConfirm={() => setShowTestWarning(false)}
      onCancel={() => setShowTestWarning(false)}
    />

    {/* 保存成功对话框 */}
    <ConfirmDialog
      visible={showSaveSuccess}
      title="保存成功"
      message="服务器配置已更新，应用将使用新的服务器地址"
      confirmText="确定"
      cancelText=""
      onConfirm={() => setShowSaveSuccess(false)}
      onCancel={() => setShowSaveSuccess(false)}
    />

    {/* 保存确认对话框（版本不兼容时） */}
    <ConfirmDialog
      visible={showSaveConfirm}
      title="版本不兼容"
      message={error || '服务器版本不兼容，确定仍要保存吗？'}
      confirmText="仍要保存"
      cancelText="取消"
      onConfirm={async () => {
        setShowSaveConfirm(false);
        await executeSave(true);
      }}
      onCancel={() => setShowSaveConfirm(false)}
    />

    {/* 重置确认对话框 */}
    <ConfirmDialog
      visible={showResetConfirm}
      title="重置配置"
      message="确定要恢复默认服务器地址吗？"
      confirmText="重置"
      cancelText="取消"
      isDestructive
      onConfirm={executeReset}
      onCancel={() => setShowResetConfirm(false)}
    />
  </>
  );
};

// 版本号需要从 package.json 读取
const CLIENT_VERSION = '1.0.0';
const SUPPORTED_SERVER_VERSIONS = { min: '1.0.0', max: '2.0.0' };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: 13,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 14,
    fontFamily: fontFamily.mono,
    borderWidth: 1,
  },
  inputDirty: {
  },
  dirtyIndicator: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
  },
  dirtyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  testButton: {
  },
  saveButton: {
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  resultSuccess: {
  },
  resultError: {
  },
  resultIcon: {
    marginRight: spacing.md,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  resultTitleSuccess: {
  },
  resultTitleError: {
  },
  resultMessage: {
    fontSize: 13,
    lineHeight: 20,
  },
  versionInfo: {
    fontSize: 12,
    marginTop: spacing.xs,
    fontFamily: fontFamily.mono,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  resetText: {
    fontSize: 13,
  },
  helpContainer: {
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  helpText: {
    fontSize: 12,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
});

export default ServerConfigView;
