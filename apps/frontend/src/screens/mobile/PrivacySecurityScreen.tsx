// 隐私与安全（手机端）

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { useAuthStore } from '../../stores/authStore';
import * as authApi from '../../api/auth';
import type { UserSession } from '../../api/auth';
import { SettingsItem } from './components/SettingsItem';
import { ChevronLeftIcon, ShieldIcon, SmartphoneIcon, ClockIcon, LogOutIcon } from '../../components/icons';

interface PrivacySecurityScreenProps {
  onBack: () => void;
}

export const PrivacySecurityScreen: React.FC<PrivacySecurityScreenProps> = ({ onBack }) => {
  const colors = useWebTheme();
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
    } catch (e: any) {
      // 静默失败
    } finally {
      setLoading(false);
    }
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
      setSetupModal(false);
      setTwoFactorStep(0);
      clear2FAState();
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
            setSetupModal(false);
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <SettingsItem
          icon={<ChevronLeftIcon size={22} color={colors.text} />}
          title="隐私与安全"
          showChevron={false}
          onPress={onBack}
        />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView>
          {/* 两步验证 */}
          <View style={[styles.section, { backgroundColor: colors.backgroundSecondary, margin: spacing.md, borderRadius: 12, overflow: 'hidden' }]}>
            <View style={styles.sectionHeader}>
              <ShieldIcon size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>两步验证</Text>
              <View style={{ flex: 1 }} />
              {twoFactorEnabled ? (
                <TouchableOpacity onPress={() => { setSetupModal(true); setTwoFactorStep(2); }}>
                  <Text style={[styles.actionLink, { color: colors.error }]}>关闭</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setSetupModal(true)}>
                  <Text style={[styles.actionLink, { color: colors.primary }]}>启用</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              {twoFactorEnabled ? '已启用两步验证' : '启用后登录需要额外验证码'}
            </Text>
          </View>

          {/* 活跃会话 */}
          <View style={[styles.section, { margin: spacing.md, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.backgroundSecondary }]}>
            <View style={[styles.sectionHeader, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <SmartphoneIcon size={20} color={colors.blue} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>活跃会话</Text>
              <View style={{ flex: 1 }} />
              <Text style={[styles.sectionCount, { color: colors.textTertiary }]}>{sessions.length}</Text>
            </View>
            {sessions.length === 0 ? (
              <View style={styles.sectionEmpty}>
                <ClockIcon size={32} color={colors.textTertiary} />
                <Text style={[styles.sectionEmptyText, { color: colors.textSecondary }]}>暂无活跃会话</Text>
              </View>
            ) : (
              sessions.map((s, i) => (
                <React.Fragment key={s.id}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  <View style={styles.sessionItem}>
                    <View style={styles.sessionInfo}>
                      <Text style={[styles.sessionDevice, { color: colors.text }]}>
                        {s.device_name || s.device_type || '未知设备'}
                      </Text>
                      <Text style={[styles.sessionMeta, { color: colors.textSecondary }]}>
                        {s.ip_address || ''}{s.last_active_at ? ` · ${new Date(s.last_active_at).toLocaleString('zh-CN')}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRevokeSession(s.id)}>
                      <LogOutIcon size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </React.Fragment>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* 2FA 设置 Modal */}
      <Modal visible={setupModal} animationType="slide" transparent onRequestClose={() => { setSetupModal(false); setTwoFactorStep(0); setPasswordConfirm(''); setTwoFactorCode(''); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {twoFactorStep === 2 ? '关闭两步验证' : '启用两步验证'}
              </Text>
              <TouchableOpacity onPress={() => { setSetupModal(false); setTwoFactorStep(0); setPasswordConfirm(''); setTwoFactorCode(''); }}>
                <ChevronLeftIcon size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {twoFactorStep === 0 && (
                <View style={{ padding: spacing.lg }}>
                  <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                    请输入当前密码以启用两步验证
                  </Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]} value={passwordConfirm} onChangeText={setPasswordConfirm} placeholder="当前密码" secureTextEntry placeholderTextColor={colors.textTertiary} />
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleEnable2FA} disabled={processing}>
                    <Text style={[styles.modalBtnText, { color: colors.primaryForeground }]}>{processing ? '处理中...' : '下一步'}</Text>
                  </TouchableOpacity>
                </View>
              )}
              {twoFactorStep === 1 && (
                <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                  <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                    使用身份验证器扫描以下二维码
                  </Text>
                  <View style={styles.qrContainer}>
                    {qrCodeUrl ? <QRCode value={qrCodeUrl} size={180} /> : <ActivityIndicator />}
                  </View>
                  <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>输入 6 位验证码</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]} value={twoFactorCode} onChangeText={setTwoFactorCode} placeholder="000000" keyboardType="number-pad" maxLength={6} placeholderTextColor={colors.textTertiary} />
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleVerify2FA} disabled={processing}>
                    <Text style={[styles.modalBtnText, { color: colors.primaryForeground }]}>{processing ? '验证中...' : '验证并启用'}</Text>
                  </TouchableOpacity>
                </View>
              )}
              {twoFactorStep === 2 && (
                <View style={{ padding: spacing.lg }}>
                  <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                    输入当前密码和 2FA 验证码以关闭
                  </Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]} value={passwordConfirm} onChangeText={setPasswordConfirm} placeholder="当前密码" secureTextEntry placeholderTextColor={colors.textTertiary} />
                  <TextInput style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]} value={twoFactorCode} onChangeText={setTwoFactorCode} placeholder="2FA 验证码" keyboardType="number-pad" maxLength={6} placeholderTextColor={colors.textTertiary} />
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.error }]} onPress={handleDisable2FA} disabled={processing}>
                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>{processing ? '处理中...' : '确认关闭'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: {},
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  sectionDesc: { fontSize: 13, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  actionLink: { fontSize: 14, fontWeight: '500' },
  sectionCount: { fontSize: 13 },
  sectionEmpty: { padding: spacing.xl, alignItems: 'center' },
  sectionEmptyText: { fontSize: 14, marginTop: spacing.sm },
  divider: { height: 1 },
  sessionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  sessionInfo: { flex: 1 },
  sessionDevice: { fontSize: 14, fontWeight: '500' },
  sessionMeta: { fontSize: 12, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalContent: {},
  modalDesc: { fontSize: 14, marginBottom: spacing.md, textAlign: 'center' },
  input: { borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15, minHeight: 44, marginBottom: spacing.md, width: '100%' },
  modalBtn: { width: '100%', paddingVertical: spacing.md, borderRadius: 8, alignItems: 'center', marginTop: spacing.sm },
  modalBtnText: { fontSize: 15, fontWeight: '600' },
  qrContainer: { padding: spacing.xl, marginBottom: spacing.lg },
});

export default PrivacySecurityScreen;
