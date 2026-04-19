// 账号设置（手机端）

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { useAuthStore } from '../../stores/authStore';
import * as authApi from '../../api/auth';
import { SettingsItem } from './components/SettingsItem';
import { ChevronLeftIcon, CheckIcon } from '../../components/icons';

interface AccountSettingsScreenProps {
  onBack: () => void;
}

export const AccountSettingsScreen: React.FC<AccountSettingsScreenProps> = ({ onBack }) => {
  const colors = useWebTheme();
  const { user, updateUser, changePassword } = useAuthStore();
  const [editingProfile, setEditingProfile] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateUser({ username, email });
      setEditingProfile(false);
      Alert.alert('成功', '个人资料已更新');
    } catch (e: any) {
      Alert.alert('失败', e.message || '更新失败');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('提示', '两次输入的新密码不一致');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('提示', '新密码至少 6 位');
      return;
    }
    setChanging(true);
    try {
      await changePassword(currentPassword, newPassword);
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('成功', '密码已修改');
    } catch (e: any) {
      Alert.alert('失败', e.message || '修改失败');
    } finally {
      setChanging(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <SettingsItem
          icon={<ChevronLeftIcon size={22} color={colors.text} />}
          title="账号设置"
          showChevron={false}
          onPress={onBack}
        />
      </View>
      <ScrollView>
        {/* 个人资料 */}
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary, margin: spacing.md, borderRadius: 12, overflow: 'hidden' }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>个人资料</Text>
            <TouchableOpacity onPress={() => { setEditingProfile(!editingProfile); if (user) { setUsername(user.username); setEmail(user.email); } }}>
              <Text style={[styles.editBtn, { color: colors.primary }]}>{editingProfile ? '取消' : '编辑'}</Text>
            </TouchableOpacity>
          </View>
          {editingProfile ? (
            <View style={styles.profileForm}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>用户名</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text }]} value={username} onChangeText={setUsername} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>邮箱</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text }]} value={email} onChangeText={setEmail} keyboardType="email-address" />
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveProfile} disabled={saving}>
                {saving ? <ActivityIndicator color={colors.primaryForeground} /> : <><CheckIcon size={16} color={colors.primaryForeground} /><Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>保存</Text></>}
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.profileRow}><Text style={[styles.profileLabel, { color: colors.textSecondary }]}>用户名</Text><Text style={[styles.profileValue, { color: colors.text }]}>{user?.username}</Text></View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.profileRow}><Text style={[styles.profileLabel, { color: colors.textSecondary }]}>邮箱</Text><Text style={[styles.profileValue, { color: colors.text }]}>{user?.email}</Text></View>
            </>
          )}
        </View>

        {/* 修改密码 */}
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary, margin: spacing.md, borderRadius: 12, overflow: 'hidden' }]}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => setChangingPassword(!changingPassword)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>修改密码</Text>
            <Text style={[styles.editBtn, { color: colors.primary }]}>{changingPassword ? '收起' : '修改'}</Text>
          </TouchableOpacity>
          {changingPassword && (
            <View style={styles.profileForm}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>当前密码</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text }]} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
              <Text style={[styles.label, { color: colors.textSecondary }]}>新密码</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text }]} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
              <Text style={[styles.label, { color: colors.textSecondary }]}>确认新密码</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text }]} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleChangePassword} disabled={changing}>
                {changing ? <ActivityIndicator color={colors.primaryForeground} /> : <><CheckIcon size={16} color={colors.primaryForeground} /><Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>修改密码</Text></>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1 },
  section: {},
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  editBtn: { fontSize: 14, fontWeight: '500' },
  divider: { height: 1 },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  profileLabel: { fontSize: 14 },
  profileValue: { fontSize: 14, fontWeight: '500' },
  profileForm: { padding: spacing.md },
  label: { fontSize: 13, marginBottom: spacing.xs },
  input: { borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15, marginBottom: spacing.md, minHeight: 44 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: 8, marginTop: spacing.sm },
  saveBtnText: { fontSize: 15, fontWeight: '600' },
});

export default AccountSettingsScreen;
