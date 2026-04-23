// 账户设置组件

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { EditIcon, SaveIcon, CloseIcon, EyeIcon, EyeOffIcon, ShieldIcon } from '../../../components/icons';
import { spacing } from '../../../theme';
import { useWebTheme } from '../../../hooks/useWebTheme';
import { useAuthStore } from '../../../stores/authStore';

interface Toast {
  type: 'success' | 'error';
  message: string;
  action?: string;
}

export const AccountSettings: React.FC = () => {
  const colors = useWebTheme();
  const { user, updateUser, changePassword, logout } = useAuthStore();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Toast 提示状态
  const [toast, setToast] = useState<Toast | null>(null);
  const [showToast, setShowToast] = useState(false);

  // 个人资料表单
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const originalUsername = user?.username || '';

  // 密码表单
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 显示 Toast 提示
  const showToastMessage = (type: 'success' | 'error', message: string, action?: string) => {
    setToast({ type, message, action });
    setShowToast(true);
  };

  // 隐藏 Toast
  const hideToast = () => {
    setShowToast(false);
    setTimeout(() => setToast(null), 300);
  };

  // 自动登出并跳转到登录页
  const autoLogout = async (message: string) => {
    showToastMessage('success', message, '正在跳转到登录页...');
    // 延迟3秒后登出
    setTimeout(async () => {
      await logout();
      hideToast();
    }, 3000);
  };

  const handleSaveProfile = async () => {
    if (!username.trim() || !email.trim()) {
      showToastMessage('error', '用户名和邮箱不能为空');
      setTimeout(hideToast, 3000);
      return;
    }
    setLoading(true);
    try {
      await updateUser({ username, email });
      const usernameChanged = username !== originalUsername;
      if (usernameChanged) {
        // 用户名修改了，需要重新登录
        await autoLogout('用户名已修改，请重新登录');
      } else {
        showToastMessage('success', '个人资料已更新');
        setIsEditingProfile(false);
        setTimeout(hideToast, 3000);
      }
    } catch (error: any) {
      let message = '更新失败，请重试';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          message = detail;
        } else if (Array.isArray(detail)) {
          message = detail.map((d: any) => d.msg || d).join(', ');
        }
      }
      showToastMessage('error', message);
      setTimeout(hideToast, 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToastMessage('error', '请填写所有密码字段');
      setTimeout(hideToast, 3000);
      return;
    }
    if (newPassword.length < 6) {
      showToastMessage('error', '新密码至少需要6个字符');
      setTimeout(hideToast, 3000);
      return;
    }
    if (newPassword !== confirmPassword) {
      showToastMessage('error', '两次输入的新密码不一致');
      setTimeout(hideToast, 3000);
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      // 密码修改成功，需要重新登录
      await autoLogout('密码已修改，请使用新密码重新登录');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      // 密码修改失败，显示错误提示并清空密码字段
      let message = '密码修改失败，请检查当前密码是否正确';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          message = detail;
        } else if (Array.isArray(detail)) {
          message = detail.map((d: any) => d.msg || d).join(', ');
        }
      }
      showToastMessage('error', message);
      // 清空密码字段，让用户重新输入
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(hideToast, 3000);
    } finally {
      setLoading(false);
    }
  };

  const cancelEditProfile = () => {
    setUsername(user?.username || '');
    setEmail(user?.email || '');
    setIsEditingProfile(false);
  };

  const cancelChangePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsChangingPassword(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Toast 提示 */}
      {showToast && toast && (
        <View style={[
          styles.toastContainer,
          toast.type === 'success' ? styles.toastSuccess : styles.toastError
        ]}>
          <View style={styles.toastContent}>
            <Text style={[styles.toastText, { color: colors.white }]}>{toast.message}</Text>
            {toast.action && (
              <Text style={[styles.toastAction, { color: colors.white }]}>{toast.action}</Text>
            )}
          </View>
        </View>
      )}

      <View style={[styles.header, { backgroundColor: colors.textSecondary + '10' }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>账户设置</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          管理个人资料、密码和登录设备
        </Text>
      </View>

      <ScrollView style={[styles.scrollContent, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        {/* 个人资料卡片 */}
        <View style={[styles.sectionCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>个人资料</Text>
            {!isEditingProfile && (
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: colors.primary + '10' }]}
                onPress={() => setIsEditingProfile(true)}
              >
                <EditIcon size={16} color={colors.primary} />
                <Text style={[styles.editButtonText, { color: colors.primary }]}>编辑</Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditingProfile ? (
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>用户名</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="输入用户名"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>邮箱</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="输入邮箱"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                  onPress={cancelEditProfile}
                >
                  <CloseIcon size={16} color={colors.text} />
                  <Text style={[styles.buttonTextSecondary, { color: colors.text }]}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary, { backgroundColor: colors.primary }]}
                  onPress={handleSaveProfile}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <>
                      <SaveIcon size={16} color={colors.background} />
                      <Text style={[styles.buttonTextPrimary, { color: colors.background }]}>保存</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>用户名</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{user?.username}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>邮箱</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{user?.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>注册时间</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '-'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* 修改密码卡片 */}
        <View style={[styles.sectionCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>修改密码</Text>
            {!isChangingPassword && (
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: colors.background }]}
                onPress={() => setIsChangingPassword(true)}
              >
                <EditIcon size={16} color={colors.primary} />
                <Text style={[styles.editButtonText, { color: colors.text }]}>修改</Text>
              </TouchableOpacity>
            )}
          </View>

          {isChangingPassword ? (
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>当前密码</Text>
                <View style={[styles.passwordInputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.passwordInput, { color: colors.text }]}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="输入当前密码"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showCurrentPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOffIcon size={18} color={colors.textSecondary} />
                    ) : (
                      <EyeIcon size={18} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>新密码</Text>
                <View style={[styles.passwordInputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.passwordInput, { color: colors.text }]}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="输入新密码（至少6位）"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showNewPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOffIcon size={18} color={colors.textSecondary} />
                    ) : (
                      <EyeIcon size={18} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>确认新密码</Text>
                <View style={[styles.passwordInputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.passwordInput, { color: colors.text }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="再次输入新密码"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOffIcon size={18} color={colors.textSecondary} />
                    ) : (
                      <EyeIcon size={18} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                  onPress={cancelChangePassword}
                >
                  <CloseIcon size={16} color={colors.text} />
                  <Text style={[styles.buttonTextSecondary, { color: colors.text }]}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary, { backgroundColor: colors.primary }]}
                  onPress={handleChangePassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <>
                      <SaveIcon size={16} color={colors.background} />
                      <Text style={[styles.buttonTextPrimary, { color: colors.background }]}>保存</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.infoContainer}>
              <Text style={[styles.passwordHint, { color: colors.textSecondary }]}>定期修改密码可以提高账户安全性</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderRadius: 12,
    padding: spacing.lg,
    margin: spacing.lg,
    marginBottom: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  scrollContent: {
    flex: 1,
    padding: spacing.lg,
  },
  // Toast 样式
  toastContainer: {
    margin: spacing.lg,
    marginBottom: 0,
    borderRadius: 8,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toastSuccess: {
    backgroundColor: '#10b981',
  },
  toastError: {
    backgroundColor: '#ef4444',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  toastAction: {
    fontSize: 12,
    opacity: 0.9,
    marginTop: 4,
  },
  // 卡片样式
  sectionCard: {
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoContainer: {
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  formContainer: {
    gap: spacing.md,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  input: {
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 14,
    borderWidth: 1,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  passwordInput: {
    flex: 1,
    padding: spacing.md,
    fontSize: 14,
  },
  eyeButton: {
    padding: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  buttonPrimary: {
  },
  buttonSecondary: {
    borderWidth: 1,
  },
  buttonTextPrimary: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonTextSecondary: {
    fontSize: 14,
    fontWeight: '500',
  },
  passwordHint: {
    fontSize: 13,
    lineHeight: 20,
  },
});

export default AccountSettings;
