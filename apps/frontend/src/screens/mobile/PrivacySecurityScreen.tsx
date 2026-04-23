// 隐私与安全（手机端）— iOS 分组卡片风格

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../../navigation/SettingsStack';
import QRCode from 'react-native-qrcode-svg';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/authStore';
import * as authApi from '../../api/auth';
import type { UserSession } from '../../api/auth';
import { ShieldIcon, ClockIcon, LogOutIcon, CloseIcon, CheckIcon } from '../../components/icons';

type NavProp = NativeStackNavigationProp<SettingsStackParamList, 'PrivacySecurity'>;

export const PrivacySecurityScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const colors = useTheme();
  const { clear2FAState } = useAuthStore();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);

  const [setupModal, setSetupModal] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState(0);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const security = await authApi.getSecurityInfo();
      setTwoFactorEnabled(security.two_factor_enabled);
      const sess = await authApi.getSessions();
      setSessions(sess);
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setSetupModal(false);
    setTwoFactorStep(0);
    setPasswordConfirm('');
    setTwoFactorCode('');
  };

  const handleEnable2FA = async () => {
    setProcessing(true);
    try {
      const result = await authApi.setupTwoFactor(passwordConfirm);
      setTwoFactorSecret(result.secret);
      setQrCodeUrl(result.qr_code_url);
      setTwoFactorStep(1);
    } catch (e: any) {
      Alert.alert('失败', e.message || '启用 2FA 失败');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerify2FA = async () => {
    if (twoFactorCode.length !== 6) {
      Alert.alert('提示', '请输入 6 位验证码');
      return;
    }
    setProcessing(true);
    try {
      await authApi.enableTwoFactor(twoFactorCode);
      setTwoFactorEnabled(true);
      resetModal();
      Alert.alert('成功', '2FA 已启用');
    } catch (e: any) {
      Alert.alert('失败', e.message || '验证失败');
    } finally {
      setProcessing(false);
    }
  };

  const handleDisable2FA = async () => {
    Alert.alert('确认', '确定要关闭 2FA 吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: async () => {
          try {
            await authApi.disableTwoFactor(passwordConfirm, twoFactorCode);
            setTwoFactorEnabled(false);
            resetModal();
            Alert.alert('成功', '2FA 已关闭');
          } catch (e: any) {
            Alert.alert('失败', e.message || '操作失败');
          }
        },
      },
    ]);
  };

  const handleRevokeSession = (sessionId: number) => {
    Alert.alert('确认', '确定要撤销此会话吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '撤销',
        style: 'destructive',
        onPress: async () => {
          try {
            await authApi.revokeSession(sessionId);
            setSessions((prev) => prev.filter((s) => s.id !== sessionId));
          } catch (e: any) {
            Alert.alert('失败', e.message || '操作失败');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 两步验证 */}
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
          <Pressable
            style={styles.twoFaRow}
            onPress={() => twoFactorEnabled ? setSetupModal(true) : setSetupModal(true)}
          >
            <ShieldIcon size={20} color={colors.primary} />
            <View style={styles.twoFaText}>
              <Text style={[styles.twoFaTitle, { color: colors.text }]}>两步验证</Text>
              <Text style={[styles.twoFaDesc, { color: colors.textSecondary }]}>
                {twoFactorEnabled ? '已启用两步验证' : '启用后登录需要额外验证码'}
              </Text>
            </View>
            <View style={{ flex: 1 }} />
            {twoFactorEnabled ? (
              <Text style={[styles.statusBadge, { color: colors.success }]}>已启用</Text>
            ) : (
              <Text style={[styles.statusBadge, { color: colors.textTertiary }]}>未启用</Text>
            )}
          </Pressable>
        </View>

        {/* 活跃会话 */}
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.sectionLabelRow}>
            <ClockIcon size={18} color={colors.textSecondary} />
            <Text style={[styles.sectionLabel, { color: colors.text }]}>活跃会话</Text>
          </View>

          {sessions.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂无活跃会话</Text>
            </View>
          ) : (
            sessions.map((s, i) => {
              const isLast = i === sessions.length - 1;
              return (
                <View key={s.id}>
                  <View style={styles.sessionRow}>
                    <View style={styles.sessionInfo}>
                      <Text style={[styles.sessionDevice, { color: colors.text }]}>
                        {s.device_name || s.device_type || '未知设备'}
                      </Text>
                      <Text style={[styles.sessionMeta, { color: colors.textSecondary }]}>
                        {s.ip_address || ''}{s.last_active_at ? ` · ${formatDate(s.last_active_at)}` : ''}
                      </Text>
                    </View>
                    <Pressable onPress={() => handleRevokeSession(s.id)}>
                      <LogOutIcon size={16} color={colors.error} />
                    </Pressable>
                  </View>
                  {!isLast && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* 2FA 设置 Modal */}
      <Modal visible={setupModal} animationType="slide" transparent onRequestClose={resetModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {twoFactorStep === 2 ? '关闭两步验证' : '启用两步验证'}
              </Text>
              <Pressable onPress={resetModal}>
                <CloseIcon size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalContent}>
              {twoFactorStep === 0 && (
                <View style={styles.modalBody}>
                  <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                    请输入当前密码以启用两步验证
                  </Text>
                  <View style={[styles.inputWrap, { backgroundColor: colors.backgroundSecondary }]}>
                    <TextInput style={[styles.input, { color: colors.text }]} value={passwordConfirm} onChangeText={setPasswordConfirm} placeholder="当前密码" secureTextEntry placeholderTextColor={colors.textTertiary} />
                  </View>
                  <Pressable style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleEnable2FA} disabled={processing}>
                    <Text style={[styles.modalBtnText, { color: colors.primaryForeground }]}>{processing ? '处理中...' : '下一步'}</Text>
                  </Pressable>
                </View>
              )}
              {twoFactorStep === 1 && (
                <View style={[styles.modalBody, { alignItems: 'center' }]}>
                  <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                    使用身份验证器扫描以下二维码
                  </Text>
                  <View style={styles.qrContainer}>
                    {qrCodeUrl ? <QRCode value={qrCodeUrl} size={180} /> : <ActivityIndicator />}
                  </View>
                  <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>输入 6 位验证码</Text>
                  <View style={[styles.inputWrap, { backgroundColor: colors.backgroundSecondary, width: '100%' }]}>
                    <TextInput style={[styles.input, { color: colors.text, textAlign: 'center' }]} value={twoFactorCode} onChangeText={setTwoFactorCode} placeholder="000000" keyboardType="number-pad" maxLength={6} placeholderTextColor={colors.textTertiary} />
                  </View>
                  <Pressable style={[styles.modalBtn, { backgroundColor: colors.primary, width: '100%' }]} onPress={handleVerify2FA} disabled={processing}>
                    <Text style={[styles.modalBtnText, { color: colors.primaryForeground }]}>{processing ? '验证中...' : '验证并启用'}</Text>
                  </Pressable>
                </View>
              )}
              {twoFactorStep === 2 && (
                <View style={styles.modalBody}>
                  <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                    输入当前密码和 2FA 验证码以关闭
                  </Text>
                  <View style={[styles.inputWrap, { backgroundColor: colors.backgroundSecondary }]}>
                    <TextInput style={[styles.input, { color: colors.text }]} value={passwordConfirm} onChangeText={setPasswordConfirm} placeholder="当前密码" secureTextEntry placeholderTextColor={colors.textTertiary} />
                  </View>
                  <View style={[styles.inputWrap, { backgroundColor: colors.backgroundSecondary }]}>
                    <TextInput style={[styles.input, { color: colors.text }]} value={twoFactorCode} onChangeText={setTwoFactorCode} placeholder="2FA 验证码" keyboardType="number-pad" maxLength={6} placeholderTextColor={colors.textTertiary} />
                  </View>
                  <Pressable style={[styles.modalBtn, { backgroundColor: colors.error }]} onPress={handleDisable2FA} disabled={processing}>
                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>{processing ? '处理中...' : '确认关闭'}</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 12, overflow: 'hidden', marginBottom: spacing.md },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  sectionLabel: { fontSize: 15, fontWeight: '600' },
  twoFaRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.sm },
  twoFaText: { flex: 1 },
  twoFaTitle: { fontSize: 15, fontWeight: '600' },
  twoFaDesc: { fontSize: 13, marginTop: 2 },
  statusBadge: { fontSize: 13, fontWeight: '500' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  sessionInfo: { flex: 1 },
  sessionDevice: { fontSize: 15 },
  sessionMeta: { fontSize: 12, marginTop: 2 },
  emptyRow: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: 14 },
  divider: { height: 0.5, marginLeft: spacing.md },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContainer: { borderRadius: 16, margin: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalContent: {},
  modalBody: { padding: spacing.lg, alignItems: 'center' },
  modalDesc: { fontSize: 14, marginBottom: spacing.md, textAlign: 'center' },
  inputWrap: { borderRadius: 10, width: '100%', marginBottom: spacing.md },
  input: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15, minHeight: 44 },
  modalBtn: { width: '100%', paddingVertical: spacing.md, borderRadius: 10, alignItems: 'center', marginTop: spacing.sm },
  modalBtnText: { fontSize: 15, fontWeight: '600' },
  qrContainer: { padding: spacing.xl, marginBottom: spacing.lg },
});

export default PrivacySecurityScreen;
