// 登录前服务器配置页面

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { spacing, fontFamily } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { useServerConfigStore } from '../../stores/serverConfigStore';
import { AuthStackParamList } from '../../navigation/types';
import { ServerIcon, CheckCircleIcon, XCircleIcon, SettingsIcon } from '../../components/icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'ServerConfig'>;

export const AuthServerConfigScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useTheme();
  const { baseUrl, isTesting, lastTestResult, compatibility, setBaseUrl, testConnection } = useServerConfigStore();
  const [inputValue, setInputValue] = useState(baseUrl);

  useEffect(() => {
    setInputValue(baseUrl);
  }, [baseUrl]);

  const handleTest = async () => {
    await setBaseUrl(inputValue);
    await testConnection();
  };

  const handleSave = async () => {
    // 只有测试通过才允许保存
    if (lastTestResult !== true || !compatibility?.compatible) {
      return;
    }
    await setBaseUrl(inputValue);
    navigation.goBack();
  };

  const canSave = lastTestResult === true && compatibility?.compatible;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="always">
          {/* 页面标题 */}
          <View style={styles.header}>
            <ServerIcon size={32} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>配置服务器</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              请输入你的 SparkNoteAI 服务器地址，登录后即可同步数据
            </Text>
          </View>

          {/* 输入区域 */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>服务器地址</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="http://192.168.1.100:8000"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text style={[styles.hint, { color: colors.textTertiary }]}>
              格式：http(s)://你的服务器IP或域名:端口
            </Text>
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
                  { color: compatibility.compatible ? colors.success : colors.error },
                ]}
              >
                {compatibility.message}
              </Text>
            </View>
          )}

          {/* 按钮区域 */}
          <View style={styles.buttonArea}>
            <TouchableOpacity
              style={[styles.testButton, { borderColor: colors.primary, borderWidth: 1.5 }]}
              onPress={handleTest}
              disabled={isTesting}
            >
              {isTesting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <SettingsIcon size={18} color={colors.primary} />
                  <Text style={[styles.testButtonText, { color: colors.primary }]}>测试连接</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: canSave ? colors.primary : colors.textTertiary }]}
              onPress={handleSave}
              disabled={!canSave || isTesting}
            >
              <Text style={[styles.saveButtonText, { color: '#fff' }]}>
                {!canSave ? '请先测试连接' : '保存并返回'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  input: {
    borderRadius: 10,
    padding: spacing.md,
    fontSize: 14,
    fontFamily: fontFamily.mono,
    borderWidth: 1,
    minHeight: 48,
  },
  hint: {
    fontSize: 12,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  resultText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  buttonArea: {
    gap: spacing.md,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 10,
    minHeight: 48,
  },
  testButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
});

export default AuthServerConfigScreen;
