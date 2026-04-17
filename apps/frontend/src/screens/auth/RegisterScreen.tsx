// 注册页面

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Input } from '../../components';
import { spacing, typography } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { useAuthStore } from '../../stores';
import { AuthStackParamList } from '../../navigation/types';

type RegisterScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Register'
>;

interface Props {
  navigation: RegisterScreenNavigationProp;
}

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useWebTheme();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const { register, isLoading, error, clearError } = useAuthStore();

  const handleRegister = async () => {
    // 清除之前的错误
    setValidationError(null);
    clearError();

    if (!username.trim() || !email.trim() || !password.trim()) {
      setValidationError('请填写所有必填项');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      setValidationError('密码长度至少为6位');
      return;
    }

    // 简单的邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setValidationError('请输入有效的邮箱地址');
      return;
    }

    try {
      await register(username, email, password);
    } catch (err) {
      // 错误已在 store 中处理，会在界面显示
    }
  };

  // 清除错误当用户开始输入
  const handleUsernameChange = (text: string) => {
    setUsername(text);
    if (error) clearError();
    if (validationError) setValidationError(null);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (error) clearError();
    if (validationError) setValidationError(null);
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (error) clearError();
    if (validationError) setValidationError(null);
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (error) clearError();
    if (validationError) setValidationError(null);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
        >
          {/* 左右布局容器 */}
          <View style={styles.layoutContainer}>
            {/* 左侧装饰区域 */}
            <View style={[styles.leftPanel, { backgroundColor: colors.primary }]}>
              <View style={styles.leftPanelContent}>
                {/* 主标题 */}
                <View style={styles.leftHeader}>
                  <View style={styles.logoIconWrapper}>
                    <Text style={styles.logoIcon}>✨</Text>
                  </View>
                  <Text style={[styles.leftTitle, { color: colors.white }]}>SparkNoteAI</Text>
                  <Text style={[styles.leftSubtitle, { color: colors.white + 'CC' }]}>知语拾光</Text>
                </View>

                {/* 装饰性线条图案 */}
                <View style={styles.patternContainer}>
                  {/* 波浪线条 */}
                  <View style={[styles.waveLine, styles.waveLine1]} />
                  <View style={[styles.waveLine, styles.waveLine2]} />
                  <View style={[styles.waveLine, styles.waveLine3]} />

                  {/* 装饰圆点 */}
                  <View style={[styles.dot, styles.dot1]} />
                  <View style={[styles.dot, styles.dot2]} />
                  <View style={[styles.dot, styles.dot3]} />
                  <View style={[styles.dot, styles.dot4]} />

                  {/* 装饰性几何图形 */}
                  <View style={[styles.shape, styles.circle1]} />
                  <View style={[styles.shape, styles.circle2]} />
                  <View style={styles.hexagon} />
                </View>

                {/* 底部标语 */}
                <View style={styles.leftFooter}>
                  <Text style={[styles.tagline, { color: colors.white + 'CC' }]}>整理知识，连接智慧</Text>
                  <Text style={[styles.taglineEn, { color: colors.white + '99' }]}>Organize knowledge, connect wisdom</Text>
                </View>
              </View>
            </View>

            {/* 右侧注册区域 */}
            <View style={[styles.rightPanel, { backgroundColor: colors.background }]}>
              <View style={styles.formContainer}>
                <View style={styles.formHeader}>
                  <Text style={[styles.formTitle, { color: colors.text }]}>创建账号</Text>
                  <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>开始你的知识管理之旅</Text>
                </View>

                <View style={styles.inputContainer}>
                  <Input
                    label="用户名"
                    placeholder="请输入用户名"
                    value={username}
                    onChangeText={handleUsernameChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <Input
                    label="邮箱"
                    placeholder="请输入邮箱"
                    value={email}
                    onChangeText={handleEmailChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <Input
                    label="密码"
                    placeholder="请输入密码（至少6位）"
                    value={password}
                    onChangeText={handlePasswordChange}
                    secureTextEntry
                    autoCapitalize="none"
                  />

                  <Input
                    label="确认密码"
                    placeholder="请再次输入密码"
                    value={confirmPassword}
                    onChangeText={handleConfirmPasswordChange}
                    secureTextEntry
                    autoCapitalize="none"
                  />

                  {(validationError || error) && (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{validationError || error}</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.registerButton, { backgroundColor: colors.primary }, isLoading && styles.registerButtonDisabled]}
                  onPress={handleRegister}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Text style={[styles.registerButtonText, { color: colors.cta }]}>注册中...</Text>
                  ) : (
                    <Text style={[styles.registerButtonText, { color: colors.cta }]}>创 建 账 号</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.textSecondary }]}>或</Text>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                </View>

                <TouchableOpacity
                  style={[styles.loginButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={[styles.loginButtonText, { color: colors.text }]}>已有账号？立即登录</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: Platform.OS === 'web' ? ('100vh' as any) : 600,
  },
  // 左右布局容器
  layoutContainer: {
    flexDirection: 'row',
    minHeight: Platform.OS === 'web' ? ('100vh' as any) : 600,
  },
  // 左侧面板
  leftPanel: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: spacing.xl,
    ...(Platform.OS === 'web' ? ({ minHeight: '100vh' } as any) : {}),
  },
  leftPanelContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  leftHeader: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
  },
  logoIconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoIcon: {
    fontSize: 48,
  },
  leftTitle: {
    fontSize: 42,
    fontWeight: '700',
    marginBottom: spacing.sm,
    letterSpacing: -0.5,
  },
  leftSubtitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  // 图案容器
  patternContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  // 波浪线条
  waveLine: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 100,
  },
  waveLine1: {
    width: 200,
    height: 200,
    left: -50,
  },
  waveLine2: {
    width: 280,
    height: 280,
    left: -80,
  },
  waveLine3: {
    width: 360,
    height: 360,
    left: -110,
  },
  // 装饰圆点
  dot: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
  },
  dot1: {
    width: 8,
    height: 8,
    top: '20%',
    left: '30%',
  },
  dot2: {
    width: 6,
    height: 6,
    top: '35%',
    left: '60%',
  },
  dot3: {
    width: 10,
    height: 10,
    top: '55%',
    left: '25%',
  },
  dot4: {
    width: 7,
    height: 7,
    top: '75%',
    left: '70%',
  },
  // 几何图形
  shape: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  circle1: {
    width: 60,
    height: 60,
    borderRadius: 30,
    top: '15%',
    right: '20%',
  },
  circle2: {
    width: 40,
    height: 40,
    borderRadius: 20,
    bottom: '25%',
    right: '15%',
  },
  hexagon: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ rotate: '45deg' }],
    bottom: '40%',
    left: '10%',
    position: 'absolute',
  },
  // 左侧底部
  leftFooter: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 3,
    marginBottom: spacing.xs,
  },
  taglineEn: {
    fontSize: 12,
    letterSpacing: 1,
  },
  // 右侧面板
  rightPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    ...(Platform.OS === 'web' ? ({ minHeight: '100vh' } as any) : {}),
  },
  formContainer: {
    width: '100%',
    maxWidth: 420,
    padding: spacing.xl,
  },
  formHeader: {
    marginBottom: spacing['3xl'],
  },
  formTitle: {
    ...typography.h1,
    fontSize: 32,
    fontWeight: '700',
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  formSubtitle: {
    ...typography.body,
    fontSize: 15,
  },
  inputContainer: {
    gap: spacing.md,
  },
  errorContainer: {
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
  },
  errorText: {
    ...typography.body,
    fontSize: 14,
  },
  registerButton: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: spacing.lg,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    ...typography.caption,
    marginHorizontal: spacing.md,
    fontSize: 12,
  },
  loginButton: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '500',
  },
});

export default RegisterScreen;
