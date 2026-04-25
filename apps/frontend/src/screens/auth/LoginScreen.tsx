// 登录页面

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Input } from '../../components';
import { spacing, typography, fontFamily } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { useAuthStore, useServerConfigStore } from '../../stores';
import { AuthStackParamList } from '../../navigation/types';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ServerConfigDialog } from '../../components/common/ServerConfigDialog';
import { SettingsIcon, WifiOffIcon, AlertTriangleIcon, CheckCircleIcon, ServerIcon, ChevronRightIcon } from '../../components/icons';

type LoginScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Login'
>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

// Web 端默认使用 localhost:8000，不显示服务器配置 UI
const isElectron = typeof (globalThis as any).electronAPI !== 'undefined';
const isPureWeb = Platform.OS === 'web' && !isElectron;
const isMobile = Platform.OS !== 'web'; // 仅 iOS/Android，Electron 用 Web 布局

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useWebTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showForgotPasswordPrompt, setShowForgotPasswordPrompt] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [loginAnimating, setLoginAnimating] = useState(false);
  const { login, loginWith2FA, isLoading, error, errorType, clearError, clear2FAState, twoFactorRequired, twoFactorSecret, isAuthenticated } = useAuthStore();
  const { baseUrl, hasConfigured, loadConfig } = useServerConfigStore();

  // Web 端不需要加载服务器配置（默认 localhost:8000）
  React.useEffect(() => {
    if (!isPureWeb) {
      loadConfig();
    }
  }, []);

  // 移动端不锁定登录按钮（用户配置的服务器即使和默认值一样也应视为有效）

  // 动画值
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // 监听登录成功时触发淡出
  React.useEffect(() => {
    if (isMobile && !isLoading && isAuthenticated && !loginAnimating) {
      setLoginAnimating(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.02,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoading, isAuthenticated, loginAnimating]);

  // 触发抖动动画
  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 100, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 100, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 100, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, easing: Easing.linear, useNativeDriver: true }),
    ]).start();
  };

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
    setLoginAnimating(false);
  };

  // 清除错误当用户开始输入
  const handleUsernameChange = (text: string) => {
    setUsername(text);
    if (error) {
      clearError();
      setLoginAnimating(false);
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (error) clearError();
  };

  const handleTwoFactorCodeChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    setTwoFactorCode(numericText);
    setCodeError('');
    if (error) clearError();
  };

  // 监听错误，触发抖动
  React.useEffect(() => {
    if (isMobile && error) {
      triggerShake();
    }
  }, [error]);

  // 移动端登录界面
  if (isMobile) {
    return (
      <SafeAreaView style={[styles.mobileContainer, { backgroundColor: colors.background }]}>
        <Animated.View
          style={[
            styles.keyboardView,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateX: shakeAnim },
              ],
            },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.innerKeyboardView}
          >
          {/* 顶部栏：右侧设置按钮 */}
          <View style={styles.topBar}>
            <View />
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('ServerConfig')}
            >
              <SettingsIcon size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.mobileContent}>
            {/* 品牌区域 */}
            <View style={styles.brandArea}>
              <View style={[styles.logoCircle, { backgroundColor: colors.backgroundSecondary }]}>
                <Image source={require('../../../assets/icon.png')} style={styles.logoImage} />
              </View>
              <Text style={[styles.brandTitle, { color: colors.text }]}>SparkNoteAI</Text>
              <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
                拾光如 spark，沉淀成 note
              </Text>
            </View>

            {/* 服务器配置提示 */}
            {!hasConfigured && (
              <View style={[styles.warningBanner, { backgroundColor: colors.warning + '12' }]}>
                <AlertTriangleIcon size={18} color={colors.warning} />
                <Text style={[styles.warningText, { color: colors.warning }]}>
                  请先点击右上角配置服务器地址，否则无法登录
                </Text>
              </View>
            )}
            {hasConfigured && (
              <View style={[styles.warningBanner, { backgroundColor: colors.success + '12' }]}>
                <CheckCircleIcon size={18} color={colors.success} />
                <Text style={[styles.warningText, { color: colors.success }]}>
                  已连接：{baseUrl}
                </Text>
              </View>
            )}

            {/* 2FA 验证模式 - 使用 ScrollView 处理键盘 */}
            {twoFactorRequired ? (
              <ScrollView
                contentContainerStyle={styles.formScrollContent}
                keyboardShouldPersistTaps="always"
                showsVerticalScrollIndicator={false}
              >
              <View style={styles.formArea}>
                <View style={[styles.twoFactorInfoBox, { backgroundColor: colors.primary + '10' }]}>
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
                    <Text style={[styles.codeErrorText, { color: colors.error }]}>{codeError}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.cancel2FAButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={handleCancel2FA}
                >
                  <Text style={[styles.cancel2FAText, { color: colors.text }]}>返回</Text>
                </TouchableOpacity>
              </View>
              </ScrollView>
            ) : (
              /* 普通登录模式 - 不使用滚动视图 */
              <View style={styles.formArea}>
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

                {error && (
                  <View style={[
                    styles.errorContainer,
                    {
                      backgroundColor: errorType === 'network' ? (colors.warning + '10') : (colors.error + '10'),
                      borderLeftColor: errorType === 'network' ? colors.warning : colors.error,
                    },
                  ]}>
                    <View style={styles.errorContent}>
                      {errorType === 'network' ? (
                        <WifiOffIcon size={18} color={colors.warning} />
                      ) : (
                        <AlertTriangleIcon size={18} color={colors.error} />
                      )}
                      <Text style={[
                        styles.errorText,
                        { color: errorType === 'network' ? colors.warning : colors.error },
                      ]}>
                        {error}
                      </Text>
                    </View>
                    {errorType === 'network' && (
                      <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: colors.warning }]}
                        onPress={() => {
                          clearError();
                          handleLogin();
                        }}
                      >
                        <Text style={styles.retryButtonText}>重试</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.forgotPassword}
                  onPress={() => setShowForgotPasswordPrompt(true)}
                >
                  <Text style={[styles.forgotPasswordText, { color: colors.textSecondary }]}>忘记密码？</Text>
                </TouchableOpacity>

                {/* 登录和注册按钮并排 */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[
                      styles.loginButton,
                      { backgroundColor: colors.primary, flex: 1 },
                      (!hasConfigured || isLoading) && styles.loginButtonDisabled,
                    ]}
                    onPress={handleLogin}
                    disabled={!hasConfigured || isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={[styles.loginButtonText, { color: '#ffffff' }]}>登 录</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.registerButton, { backgroundColor: colors.backgroundSecondary }]}
                    onPress={() => navigation.navigate('Register')}
                  >
                    <Text style={[styles.registerButtonText, { color: colors.text }]}>注 册</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>

        {/* 登录加载遮罩 */}
        {(isLoading || loginAnimating) && !twoFactorRequired && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {loginAnimating ? '登录成功' : '登录中...'}
            </Text>
          </View>
        )}
        </Animated.View>

        {/* 提示对话框 */}
        <ConfirmDialog
          visible={showLoginPrompt}
          title="提示"
          message="请输入用户名和密码"
          confirmText="好的"
          cancelText=""
          onConfirm={() => setShowLoginPrompt(false)}
          onCancel={() => setShowLoginPrompt(false)}
        />

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
  }

  // Web 端：保持原有双栏布局
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
          <View style={styles.layoutContainer}>
            {!isMobile && (
              <View style={[styles.leftPanel, { backgroundColor: colors.primary }]}>
                <View style={styles.leftHeader}>
                  <View style={styles.logoIconWrapper}>
                    <Text style={styles.logoIcon}>✨</Text>
                  </View>
                  <Text style={[styles.leftTitle, { color: colors.white }]}>SparkNoteAI</Text>
                  <Text style={[styles.leftSubtitle, { color: colors.white + 'CC' }]}>拾光如 spark，沉淀成 note</Text>
                </View>

                <View style={styles.patternContainer}>
                  <View style={[styles.waveLine, styles.waveLine1]} />
                  <View style={[styles.waveLine, styles.waveLine2]} />
                  <View style={[styles.waveLine, styles.waveLine3]} />

                  <View style={[styles.dot, styles.dot1]} />
                  <View style={[styles.dot, styles.dot2]} />
                  <View style={[styles.dot, styles.dot3]} />
                  <View style={[styles.dot, styles.dot4]} />

                  <View style={[styles.shape, styles.circle1]} />
                  <View style={[styles.shape, styles.circle2]} />
                  <View style={styles.hexagon} />
                </View>

                <View style={styles.leftFooter}>
                  <Text style={[styles.tagline, { color: colors.white + 'CC' }]}>捕捉灵感的碎片，编织知识的图谱</Text>
                  <Text style={[styles.taglineEn, { color: colors.white + '99' }]}>Organize knowledge, connect wisdom</Text>
                </View>
              </View>
            )}

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

                {!isPureWeb && !twoFactorRequired && (
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
                    <>
                      <View style={[styles.twoFactorInfoBox, { backgroundColor: colors.primary + '10' }]}>
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
                    <View style={[
                      styles.errorContainer,
                      {
                        backgroundColor: errorType === 'network' ? (colors.warning + '10') : (colors.error + '10'),
                        borderLeftColor: errorType === 'network' ? colors.warning : colors.error,
                      },
                    ]}>
                      <View style={styles.errorContent}>
                        {errorType === 'network' ? (
                          <WifiOffIcon size={18} color={colors.warning} />
                        ) : (
                          <AlertTriangleIcon size={18} color={colors.error} />
                        )}
                        <Text style={[
                          styles.errorText,
                          { color: errorType === 'network' ? colors.warning : colors.error },
                        ]}>
                          {error}
                        </Text>
                      </View>
                      {errorType === 'network' && (
                        <TouchableOpacity
                          style={[styles.retryButton, { backgroundColor: colors.warning }]}
                          onPress={() => {
                            clearError();
                            handleLogin();
                          }}
                        >
                          <Text style={styles.retryButtonText}>重试</Text>
                        </TouchableOpacity>
                      )}
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

      <ConfirmDialog
        visible={showLoginPrompt}
        title="提示"
        message="请输入用户名和密码"
        confirmText="好的"
        cancelText=""
        onConfirm={() => setShowLoginPrompt(false)}
        onCancel={() => setShowLoginPrompt(false)}
      />

      <ConfirmDialog
        visible={showForgotPasswordPrompt}
        title="提示"
        message="忘记密码功能开发中"
        confirmText="好的"
        cancelText=""
        onConfirm={() => setShowForgotPasswordPrompt(false)}
        onCancel={() => setShowForgotPasswordPrompt(false)}
      />

      <ServerConfigDialog
        visible={showServerConfig}
        onClose={() => setShowServerConfig(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ========== 通用样式（Web 端） ==========
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  innerKeyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: Platform.OS === 'web' ? ('100vh' as any) : 600,
  },
  layoutContainer: {
    flexDirection: 'row',
    minHeight: Platform.OS === 'web' ? ('100vh' as any) : 600,
  },
  leftPanel: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: spacing.xl,
    ...(Platform.OS === 'web' ? ({ minHeight: '100vh' } as any) : {}),
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
  patternContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
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
  dot: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
  },
  dot1: { width: 8, height: 8, top: '20%', left: '30%' },
  dot2: { width: 6, height: 6, top: '35%', left: '60%' },
  dot3: { width: 10, height: 10, top: '55%', left: '25%' },
  dot4: { width: 7, height: 7, top: '75%', left: '70%' },
  shape: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  circle1: { width: 60, height: 60, borderRadius: 30, top: '15%', right: '20%' },
  circle2: { width: 40, height: 40, borderRadius: 20, bottom: '25%', right: '15%' },
  hexagon: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ rotate: '45deg' }],
    bottom: '40%',
    left: '10%',
    position: 'absolute',
  },
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
  rightPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    ...(Platform.OS === 'web' ? ({ minHeight: '100vh' } as any) : {}),
  },
  rightPanelMobile: {
    padding: spacing.lg,
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
    flex: 1,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  retryButton: {
    alignSelf: 'flex-end',
    borderRadius: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
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
  registerButtonText: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '500',
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

  // ========== 移动端专用样式 ==========
  mobileContainer: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  settingsButton: {
    padding: spacing.xs,
  },
  mobileContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  formScrollContent: {
    flexGrow: 1,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  registerButton: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  brandArea: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  logoEmoji: {
    fontSize: 28,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  brandSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  },
  serverStatus: {
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  serverStatusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  formArea: {
    gap: spacing.md,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    zIndex: 100,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 15,
    fontWeight: '500',
  },
});

export default LoginScreen;
