// 隐私与安全设置组件 - Web/Electron 版本

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { QRCodeSVG } from 'qrcode.react';
import { SmartphoneIcon, ShieldIcon, CheckIcon, CloseIcon, DeviceIcon, LogOutIcon, ClockIcon } from '../../../components/icons';
import { spacing } from '../../../theme';
import { useWebTheme } from '../../../hooks/useWebTheme';
import { useAuthStore } from '../../../stores/authStore';
import * as authApi from '../../../api/auth';
import * as sessionApi from '../../../api/auth';

interface Session {
  id: string;
  device: string;
  location: string;
  ip_address: string;
  last_active: string;
  is_current: boolean;
}

interface UserSession {
  id: number;
  user_id: number;
  device_type: string;
  device_name: string;
  browser?: string;
  os?: string;
  ip_address: string;
  location: string;
  is_current: boolean;
  last_active_at: string;
  created_at: string;
}

export const PrivacySecuritySettings: React.FC = () => {
  const colors = useWebTheme();
  const { user } = useAuthStore();

  // 2FA 状态
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState<'setup' | 'verify'>('setup');
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorFeedback, setTwoFactorFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState('');

  // 禁用 2FA 状态
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);

  // 会话列表
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // 加载用户 2FA 状态和会话列表
  useEffect(() => {
    if (user) {
      setTwoFactorEnabled(!!user.two_factor_enabled);
    }
    loadSessions();
  }, [user]);

  // 加载会话列表
  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const data = await sessionApi.getSessions();
      setSessions(data);
    } catch (error: any) {
      console.error('加载会话列表失败:', error);
      // 如果 API 不存在，使用 mock 数据
      setSessions([
        {
          id: 1,
          user_id: user?.id || 1,
          device_type: 'desktop',
          device_name: 'Chrome on macOS',
          browser: 'Chrome',
          os: 'macOS',
          ip_address: '192.168.1.100',
          location: '北京，中国',
          is_current: true,
          last_active_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSessionsLoading(false);
    }
  };

  // 显示反馈消息
  const showTwoFactorFeedback = (type: 'success' | 'error', message: string) => {
    setTwoFactorFeedback({ type, message });
    setTimeout(() => setTwoFactorFeedback(null), 3000);
  };

  const handleSetup2FA = async () => {
    if (!verifyPassword) {
      showTwoFactorFeedback('error', '请输入当前密码验证');
      return;
    }

    setTwoFactorLoading(true);
    try {
      const response = await authApi.setupTwoFactor(verifyPassword);
      setTwoFactorSecret(response.secret);
      setQrCodeUrl(response.qr_code_url);
      setTwoFactorStep('verify');
    } catch (error: any) {
      showTwoFactorFeedback('error', error.response?.data?.detail || '设置 2FA 失败');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (twoFactorCode.length !== 6) {
      showTwoFactorFeedback('error', '请输入 6 位验证码');
      return;
    }

    setTwoFactorLoading(true);
    try {
      await authApi.enableTwoFactor(twoFactorCode);
      showTwoFactorFeedback('success', '双因素认证已启用');
      setTwoFactorEnabled(true);
      setShow2FAModal(false);
      setTwoFactorStep('setup');
      setTwoFactorSecret('');
      setQrCodeUrl('');
      setTwoFactorCode('');
      setVerifyPassword('');
    } catch (error: any) {
      showTwoFactorFeedback('error', error.response?.data?.detail || '验证失败');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      showTwoFactorFeedback('error', '请输入当前密码验证');
      return;
    }

    if (disableCode.length !== 6) {
      showTwoFactorFeedback('error', '请输入 6 位验证码');
      return;
    }

    setDisableLoading(true);
    try {
      await authApi.disableTwoFactor(disablePassword, disableCode);
      showTwoFactorFeedback('success', '双因素认证已禁用');
      setTwoFactorEnabled(false);
      setShowDisableModal(false);
      setDisablePassword('');
      setDisableCode('');
    } catch (error: any) {
      showTwoFactorFeedback('error', error.response?.data?.detail || '禁用失败');
    } finally {
      setDisableLoading(false);
    }
  };

  const open2FAModal = () => {
    setShow2FAModal(true);
    setTwoFactorStep('setup');
    setTwoFactorSecret('');
    setQrCodeUrl('');
    setTwoFactorCode('');
    setVerifyPassword('');
    setTwoFactorFeedback(null);
  };

  const openDisableModal = () => {
    setShowDisableModal(true);
    setDisablePassword('');
    setDisableCode('');
    setTwoFactorFeedback(null);
  };

  const handleRevokeSession = async (sessionId: number) => {
    if (!confirm('确定要注销此会话吗？')) {
      return;
    }
    try {
      await sessionApi.revokeSession(sessionId);
      showTwoFactorFeedback('success', '会话已注销');
      loadSessions();
    } catch (error: any) {
      showTwoFactorFeedback('error', error.response?.data?.detail || '注销失败');
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm('确定要注销所有其他会话吗？当前会话将保留。')) {
      return;
    }
    // 简化处理，实际可以要求输入密码确认
    const password = prompt('请输入当前密码确认：', '');
    if (!password) {
      return;
    }
    try {
      await sessionApi.revokeAllSessions(password);
      showTwoFactorFeedback('success', '已注销所有其他会话');
      loadSessions();
    } catch (error: any) {
      showTwoFactorFeedback('error', error.response?.data?.detail || '操作失败');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* 头部说明 */}
      <View style={[styles.headerBox, { backgroundColor: colors.primary + '10' }]}>
        <Text style={[styles.headerBoxTitle, { color: colors.text }]}>隐私与安全</Text>
        <Text style={[styles.headerBoxText, { color: colors.textSecondary }]}>
          管理您的账户安全设置，包括双因素认证、会话和登录设备
        </Text>
      </View>

      {/* 双因素认证 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <SmartphoneIcon size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>双因素认证</Text>
        </View>
        <View style={[styles.twoFactorCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          {twoFactorFeedback && (
            <View style={[
              styles.feedbackBox,
              twoFactorFeedback.type === 'success' ? styles.feedbackBoxSuccess : styles.feedbackBoxError,
            ]}>
              <Text style={[
                styles.feedbackText,
                twoFactorFeedback.type === 'success' ? { color: colors.success } : { color: colors.error },
              ]}>
                {twoFactorFeedback.type === 'success' ? '✅ ' : '❌ '}{twoFactorFeedback.message}
              </Text>
            </View>
          )}

          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <Text style={[styles.statusLabel, { color: colors.text }]}>当前状态</Text>
              <Text style={[styles.statusDescription, { color: colors.textSecondary }]}>
                {twoFactorEnabled
                  ? '已启用双因素认证，登录时需要验证码'
                  : '未启用双因素认证'}
              </Text>
            </View>
            <View style={[styles.statusBadge, twoFactorEnabled ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
              <View style={[styles.statusDot, twoFactorEnabled ? styles.statusDotActive : styles.statusDotInactive]} />
              <Text style={[styles.statusText, { color: twoFactorEnabled ? colors.success : colors.textSecondary }]}>
                {twoFactorEnabled ? '已启用' : '未启用'}
              </Text>
            </View>
          </View>

          <View style={[styles.actionRow, { backgroundColor: colors.background }]}>
            <Text style={[styles.actionRowHint, { color: colors.textSecondary }]}>
              {twoFactorEnabled
                ? '💡 启用后，登录时需要输入认证器应用（如 Google Authenticator）生成的 6 位动态验证码'
                : '💡 双因素认证为您的账户提供额外的安全保护。启用后，登录时需要输入 6 位验证码'}
            </Text>
            {twoFactorEnabled ? (
              <TouchableOpacity
                style={[styles.dangerButton, { borderColor: colors.error }]}
                onPress={openDisableModal}
              >
                <Text style={[styles.dangerButtonText, { color: colors.error }]}>禁用</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={open2FAModal}
              >
                <Text style={[styles.buttonText, { color: colors.background }]}>启用</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* 会话管理 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ShieldIcon size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>会话管理</Text>
        </View>
        <View style={[styles.sessionCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <View style={styles.sessionHeader}>
            <Text style={[styles.sessionHeaderTitle, { color: colors.text }]}>活跃的会话</Text>
            {sessions.length > 1 && (
              <TouchableOpacity style={styles.revokeAllButton} onPress={handleRevokeAllSessions}>
                <Text style={[styles.revokeAllButtonText, { color: colors.error }]}>注销其他会话</Text>
              </TouchableOpacity>
            )}
          </View>

          {sessions.map((session) => (
            <View key={session.id} style={[
              styles.sessionItem,
              { backgroundColor: colors.background, borderColor: colors.border },
              session.is_current && { ...styles.sessionItemCurrent, borderColor: colors.primary + '40', backgroundColor: colors.primary + '08' },
            ]}>
              <View style={styles.sessionLeft}>
                <View style={[styles.sessionIcon, { backgroundColor: colors.backgroundSecondary }]}>
                  <DeviceIcon size={24} color={session.is_current ? colors.primary : colors.textSecondary} />
                </View>
                <View style={styles.sessionInfo}>
                  <View style={styles.sessionDeviceRow}>
                    <Text style={[styles.sessionDevice, { color: colors.text }]}>{session.device_name}</Text>
                    {session.is_current && (
                      <View style={[styles.currentBadge, { backgroundColor: colors.primary + '10' }]}>
                        <Text style={[styles.currentBadgeText, { color: colors.primary }]}>当前设备</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.sessionLocation, { color: colors.textSecondary }]}>{session.location}</Text>
                  <Text style={[styles.sessionIP, { color: colors.textTertiary }]}>{session.ip_address}</Text>
                </View>
              </View>
              <View style={styles.sessionRight}>
                <View style={styles.sessionTime}>
                  <ClockIcon size={14} color={colors.textSecondary} />
                  <Text style={[styles.sessionTimeText, { color: colors.textSecondary }]}>{new Date(session.last_active_at).toLocaleString('zh-CN')}</Text>
                </View>
                {!session.is_current && (
                  <TouchableOpacity
                    style={[styles.revokeButton, { backgroundColor: colors.error + '10' }]}
                    onPress={() => handleRevokeSession(session.id)}
                  >
                    <LogOutIcon size={16} color={colors.error} />
                    <Text style={[styles.revokeButtonText, { color: colors.error }]}>注销</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 登录设备 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <DeviceIcon size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>登录设备</Text>
        </View>
        <View style={[styles.deviceCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <Text style={[styles.deviceHint, { color: colors.textSecondary }]}>
            管理已登录您账户的设备。您可以查看设备列表并移除不认识的设备。
          </Text>

          <View style={styles.deviceList}>
            {sessions.map((session) => (
              <View key={session.id} style={[styles.deviceItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={[styles.deviceIcon, { backgroundColor: colors.backgroundSecondary }]}>
                  <DeviceIcon size={28} color={session.is_current ? colors.primary : colors.textSecondary} />
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={[styles.deviceName, { color: colors.text }]}>{session.device_name}</Text>
                  <Text style={[styles.deviceLocation, { color: colors.textSecondary }]}>{session.location}</Text>
                  <Text style={[styles.deviceTime, { color: colors.textTertiary }]}>最后活跃：{new Date(session.last_active_at).toLocaleString('zh-CN')}</Text>
                </View>
                {session.is_current && (
                  <View style={[styles.deviceCurrentBadge, { backgroundColor: colors.primary }]}>
                    <CheckIcon size={14} color={colors.primaryForeground} />
                    <Text style={[styles.deviceCurrentText, { color: colors.primaryForeground }]}>当前</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 2FA 设置 Modal */}
      {show2FAModal && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setShow2FAModal(false)}
        >
          <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>双因素认证设置</Text>
              <TouchableOpacity onPress={() => setShow2FAModal(false)}>
                <CloseIcon size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {twoFactorStep === 'setup' ? (
              <>
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>当前密码验证</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={verifyPassword}
                    onChangeText={setVerifyPassword}
                    secureTextEntry
                    placeholder="请输入当前密码"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={[styles.hintBox, { backgroundColor: colors.background }]}>
                  <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                    双因素认证 (2FA) 为您的账户提供额外的安全保护。
                    启用后，登录时需要输入 6 位验证码。
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }, twoFactorLoading && styles.buttonDisabled]}
                  onPress={handleSetup2FA}
                  disabled={twoFactorLoading}
                >
                  {twoFactorLoading ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text style={[styles.buttonText, { color: colors.background }]}>下一步</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={[styles.qrCodeSection, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.qrCodeHint, { color: colors.textSecondary }]}>
                    1. 使用认证器应用（如 Google Authenticator、Microsoft Authenticator）扫描下方二维码
                  </Text>
                  {qrCodeUrl && (
                    <QRCodeSVG
                      value={qrCodeUrl}
                      size={200}
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  )}
                  <Text style={[styles.qrCodeHint, { color: colors.textSecondary }]}>
                    2. 或手动输入密钥：<Text style={[styles.secretText, { color: colors.primary }]}>{twoFactorSecret}</Text>
                  </Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>6 位验证码</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }, styles.codeInput]}
                    value={twoFactorCode}
                    onChangeText={setTwoFactorCode}
                    placeholder="000000"
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }, twoFactorLoading && styles.buttonDisabled]}
                  onPress={handleVerify2FA}
                  disabled={twoFactorLoading}
                >
                  {twoFactorLoading ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text style={[styles.buttonText, { color: colors.background }]}>验证并启用</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        </Modal>
      )}

      {/* 禁用 2FA Modal */}
      {showDisableModal && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setShowDisableModal(false)}
        >
          <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>禁用双因素认证</Text>
              <TouchableOpacity onPress={() => setShowDisableModal(false)}>
                <CloseIcon size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.hintBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                禁用 2FA 会降低账户安全性。请输入密码和当前的 6 位验证码确认操作。
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>当前密码</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={disablePassword}
                onChangeText={setDisablePassword}
                secureTextEntry
                placeholder="请输入当前密码"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>6 位验证码</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }, styles.codeInput]}
                value={disableCode}
                onChangeText={setDisableCode}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[styles.dangerButton, { borderColor: colors.error }, disableLoading && styles.buttonDisabled]}
              onPress={handleDisable2FA}
              disabled={disableLoading}
            >
              {disableLoading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={[styles.dangerButtonText, { color: colors.error }]}>确认禁用</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  headerBox: {
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  headerBoxTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  headerBoxText: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  feedbackBox: {
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  feedbackBoxSuccess: {
    backgroundColor: '#10b98120',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  feedbackBoxError: {
    backgroundColor: '#ef444420',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '500',
  },
  feedbackTextSuccess: {
  },
  feedbackTextError: {
  },
  twoFactorCard: {
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusLeft: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusBadgeActive: {
    backgroundColor: '#10b98120',
    borderColor: '#10b981',
    borderWidth: 1,
  },
  statusBadgeInactive: {
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusDotActive: {
    backgroundColor: '#10b981',
  },
  statusDotInactive: {
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
  },
  statusTextInactive: {
  },
  sectionHint: {
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  hintText: {
    fontSize: 12,
    lineHeight: 18,
  },
  button: {
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  actionRowHint: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    marginRight: spacing.md,
  },
  dangerButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // 会话管理样式
  sessionCard: {
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sessionHeaderTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  revokeAllButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  revokeAllButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  sessionItemCurrent: {
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDeviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  sessionDevice: {
    fontSize: 14,
    fontWeight: '600',
  },
  currentBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: spacing.xs,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  sessionLocation: {
    fontSize: 12,
    marginBottom: 2,
  },
  sessionIP: {
    fontSize: 11,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  sessionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sessionTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionTimeText: {
    fontSize: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  loadingText: {
    fontSize: 13,
    marginTop: spacing.sm,
  },
  revokeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  revokeButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // 登录设备样式
  deviceCard: {
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
  },
  deviceHint: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  deviceList: {
    gap: spacing.sm,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  deviceLocation: {
    fontSize: 12,
    marginBottom: 2,
  },
  deviceTime: {
    fontSize: 11,
  },
  deviceCurrentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    gap: 4,
  },
  deviceCurrentText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Modal 样式
  hintBox: {
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 450,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  input: {
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 14,
    borderWidth: 1,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 18,
    letterSpacing: 4,
  },
  qrCodeSection: {
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  qrCodeHint: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  secretText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
});

export default PrivacySecuritySettings;
