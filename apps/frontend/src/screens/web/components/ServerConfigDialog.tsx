// 服务器配置对话框 - 用于登录前配置服务器地址

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CheckCircleIcon, XCircleIcon, ServerIcon, SettingsIcon } from '../../../components/icons';
import { spacing, typography, fontFamily } from '../../../theme';
import { useWebTheme } from '../../../hooks/useWebTheme';
import { useServerConfigStore } from '../../../stores/serverConfigStore';

interface ServerConfigDialogProps {
  visible: boolean;
  onClose: () => void;
}

export const ServerConfigDialog: React.FC<ServerConfigDialogProps> = ({
  visible,
  onClose,
}) => {
  const colors = useWebTheme();
  const {
    baseUrl,
    isTesting,
    lastTestResult,
    serverInfo,
    compatibility,
    setBaseUrl,
    testConnection,
    resetConfig,
  } = useServerConfigStore();

  const [inputValue, setInputValue] = useState(baseUrl);

  useEffect(() => {
    if (visible) {
      setInputValue(baseUrl);
    }
  }, [visible, baseUrl]);

  const handleTest = async () => {
    await setBaseUrl(inputValue);
    await testConnection();
  };

  const handleSave = async () => {
    const result = await testConnection();
    if (result.compatible) {
      await setBaseUrl(inputValue);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* 头部 */}
          <View style={styles.header}>
            <ServerIcon size={28} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>服务器配置</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              配置私有化部署的服务器地址
            </Text>
          </View>

          {/* 服务器地址输入 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>服务器地址</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text },
              ]}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="http://localhost:8000"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          {/* 测试结果显示 */}
          {lastTestResult !== null && compatibility && (
            <View
              style={[
                styles.resultContainer,
                { backgroundColor: compatibility.compatible ? colors.success + '10' : colors.error + '10' },
              ]}
            >
              {compatibility.compatible ? (
                <CheckCircleIcon size={20} color={colors.success} />
              ) : (
                <XCircleIcon size={20} color={colors.error} />
              )}
              <Text
                style={[
                  styles.resultText,
                  compatibility.compatible ? styles.resultSuccessText : styles.resultErrorText,
                ]}
              >
                {compatibility.message}
              </Text>
            </View>
          )}

          {/* 底部按钮 */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.testButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
              onPress={handleTest}
              disabled={isTesting}
            >
              {isTesting ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <>
                  <SettingsIcon size={16} color={colors.text} />
                  <Text style={[styles.testButtonText, { color: colors.text }]}>测试连接</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={onClose}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>取消</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                disabled={isTesting}
              >
                <Text style={[styles.saveButtonText, { color: '#FFFFFF' }]}>保存并登录</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    borderRadius: 16,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
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
  input: {
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 14,
    fontFamily: fontFamily.mono,
    borderWidth: 1,
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  resultText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  resultSuccessText: {
  },
  resultErrorText: {
  },
  footer: {
    gap: spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 8,
    minHeight: 44,
  },
  testButton: {
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ServerConfigDialog;
