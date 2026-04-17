// 登录页面

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Input } from '../../components';
import { spacing, typography, fontFamily } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { useAuthStore, useServerConfigStore } from '../../stores';
import { AuthStackParamList } from '../../navigation/types';
import { ServerConfigDialog } from '../../components/layout/ServerConfigDialog';
import { ConfirmDialog } from '../../components/layout/ConfirmDialog';
import {
  SmartphoneIcon,
  ServerIcon,
  ChevronRightIcon,
} from '../../components/icons';

type LoginScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Login'
>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

// Web 端默认使用 localhost:8000，不显示服务器配置 UI
// 注意：Electron 的 Platform.OS 也是 'web'，需要通过 electronAPI 区分
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isElectron = typeof (globalThis as any).electronAPI !== 'undefined';
const isWeb = Platform.OS === 'web' && !isElectron;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useWebTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showForgotPasswordPrompt, setShowForgotPasswordPrompt] = useState(false);
  const [codeError, setCodeError] = useState('');
  const { login, loginWith2FA, isLoading, error, clearError, clear2FAState, twoFactorRequired, twoFactorSecret } = useAuthStore();
  const { baseUrl, loadConfig } = useServerConfigStore();

  // Web 端不需要加载服务器配置（默认 localhost:8000）
  React.useEffect(() => {
    if (!isWeb) {
      loadConfig();
    }
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setShowLoginPrompt(true);
      return;
    }

    try {
      await login(username, password);
    } catch (err) {
      // 错误已在 store 中处理，会在界面显示
    }
  };

  const handleLoginWith2FA = async () => {
    if (twoFactorCode.length !== 6) {
      setCodeError('请输入 6 位验证码');
      return;
    }
    setCodeError('');

    try {
      await loginWith2FA(twoFactorCode);
    } catch (err) {
      // 错误已在 store 中处理
    }
  };

  const handleCancel2FA = () => {
    clear2FAState();
    setTwoFactorCode('');
    setCodeError('');
  };

  // 清除错误当用户开始输入
  const handleUsernameChange = (text: string) => {
    setUsername(text);
    if (error) clearError();
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (error) clearError();
  };

  const handleTwoFactorCodeChange = (text: string) => {
    // 只允许输入数字
    const numericText = text.replace(/[^0-9]/g, '');
    setTwoFactorCode(numericText);
    setCodeError('');
    if (error) clearError();
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
                  <Text style={[styles.leftSubtitle, { color: colors.white + 'CC' }]}>拾光如 spark，沉淀成 note</Text>
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
                  <Text style={[styles.tagline, { color: colors.white + 'CC' }]}>捕捉灵感的碎片，编织知识的图谱</Text>
                  <Text style={[styles.taglineEn, { color: colors.white + '99' }]}>Organize knowledge, connect wisdom</Text>
                </View>
              </View>
            </View>

            {/* 右侧登录区域 */}
            <View style={[styles.rightPanel, { backgroundColor: colors.background }]}>
              <View style={styles.formContainer}>
                <View style={styles.formHeader}>
                  <Text style={[styles.formTitle, { color: colors.text }]}>{twoFactorRequired ? '双因素验证' : '欢迎回来'}</Text>
                  <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
                    {twoFactorRequired
                      ? '请输入认证器生成的 6 位验证码'
                      : '请输入你的账号信息登录'}
                  </Text>
                </View>

                {/* 服务器地址显示（仅原生端显示） */}
                {!isWeb && !twoFactorRequired && (
                  <TouchableOpacity
                    style={[styles.serverConfigButton, { backgroundColor: colors.backgroundSecondary }]}
                    onPress={() => setShowServerConfig(true)}
                  >
                    <ServerIcon size={16} color={colors.textSecondary} />
                    <Text style={[styles.serverConfigText, { color: colors.textSecondary }]}>
                      服务器：{baseUrl}
                    </Text>
                    <ChevronRightIcon size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}

                <View style={styles.inputContainer}>
                  {twoFactorRequired ? (
                    // 2FA 验证模式
                    <>
                      <View style={[styles.twoFactorInfoBox, { backgroundColor: colors.primary + '10' }]}>
                        <SmartphoneIcon size={24} color={colors.primary} />
                        <Text style={[styles.twoFactorInfoText, { color: colors.text }]}>
                          已启用双因素认证，请使用认证器应用查看 6 位验证码
                        </Text>
                      </View>

                      <Input
                        label="验证码"
                        placeholder="000000"
                        value={twoFactorCode}
                        onChangeText={handleTwoFactorCodeChange}
                        keyboardType="number-pad"
                        maxLength={6}
                        autoCapitalize="none"
                      />

                      {codeError && (
                        <View style={styles.codeErrorContainer}>
                          <Text style={styles.codeErrorText}>{codeError}</Text>
                        </View>
                      )}

                      <TouchableOpacity
                        style={[styles.cancel2FAButton, { backgroundColor: colors.backgroundSecondary }]}
                        onPress={handleCancel2FA}
                      >
                        <Text style={[styles.cancel2FAText, { color: colors.text }]}>返回</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    // 普通登录模式
                    <>
                      <Input
                        label="用户名"
                        placeholder="请输入用户名"
                        value={username}
                        onChangeText={handleUsernameChange}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />

                      <Input
                        label="密码"
                        placeholder="请输入密码"
                        value={password}
                        onChangeText={handlePasswordChange}
                        secureTextEntry
                        autoCapitalize="none"
                      />
                    </>
                  )}

                  {error && (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}
                </View>

                {!twoFactorRequired && (
                  <TouchableOpacity
                    style={styles.forgotPassword}
                    onPress={() => setShowForgotPasswordPrompt(true)}
                  >
                    <Text style={[styles.forgotPasswordText, { color: colors.textSecondary }]}>忘记密码？</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.loginButton, { backgroundColor: colors.primary }, isLoading && styles.loginButtonDisabled]}
                  onPress={twoFactorRequired ? handleLoginWith2FA : handleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={[styles.loginButtonText, { color: colors.cta }]}>
                      {twoFactorRequired ? '验证' : '登 录'}
                    </Text>
                  )}
                </TouchableOpacity>

                {!twoFactorRequired && (
                  <>
                    <View style={styles.divider}>
                      <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                      <Text style={[styles.dividerText, { color: colors.textSecondary }]}>或</Text>
                      <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                    </View>

                    <TouchableOpacity
                      style={[styles.registerButton, { backgroundColor: colors.backgroundSecondary }]}
                      onPress={() => navigation.navigate('Register')}
                    >
                      <Text style={[styles.registerButtonText, { color: colors.text }]}>创建新账号</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 服务器配置对话框（仅原生端显示） */}
      {!isWeb && (
        <ServerConfigDialog
          visible={showServerConfig}
          onClose={() => setShowServerConfig(false)}
        />
      )}

      {/* 登录提示对话框 */}
      <ConfirmDialog
        visible={showLoginPrompt}
        title="提示"
        message="请输入用户名和密码"
        confirmText="好的"
        cancelText=""
        onConfirm={() => setShowLoginPrompt(false)}
        onCancel={() => setShowLoginPrompt(false)}
      />

      {/* 忘记密码提示对话框 */}
      <ConfirmDialog
        visible={showForgotPasswordPrompt}
        title="提示"
        message="忘记密码功能开发中"
        confirmText="好的"
        cancelText=""
        onConfirm={() => setShowForgotPasswordPrompt(false)}
        onCancel={() => setShowForgotPasswordPrompt(false)}
      />
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
  serverConfigButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  serverConfigText: {
    flex: 1,
    fontSize: 13,
    marginHorizontal: spacing.sm,
    fontFamily: fontFamily.mono,
  },
  twoFactorInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  twoFactorInfoText: {
    flex: 1,
    fontSize: 13,
    marginLeft: spacing.sm,
    lineHeight: 18,
  },
  cancel2FAButton: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  cancel2FAText: {
    fontSize: 14,
    fontWeight: '500',
  },
  codeErrorContainer: {
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
  },
  codeErrorText: {
    ...typography.body,
    fontSize: 14,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  forgotPasswordText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '500',
  },
  loginButton: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 4,
    ...(Platform.OS === 'web' ? { WebkitTextFillColor: '#FFFFFF' } : {}),
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
  registerButton: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '500',
  },
});

export default LoginScreen;
