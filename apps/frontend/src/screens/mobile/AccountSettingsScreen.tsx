// 账号设置（手机端）— iOS 原生分组风格

import React, { useState, useLayoutEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../../navigation/SettingsStack';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/authStore';
import { KeyIcon, UserIcon, MailIcon, ChevronRightIcon } from '../../components/icons';

type NavProp = NativeStackNavigationProp<SettingsStackParamList, 'AccountSettings'>;

export const AccountSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const colors = useTheme();
  const { user, updateUser } = useAuthStore();
  const [editingProfile, setEditingProfile] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    if (editingProfile) {
      navigation.setOptions({
        headerRight: () => (
          saving ? <ActivityIndicator size="small" color={colors.primary} /> : (
            <TouchableOpacity activeOpacity={0.6} onPress={handleSaveProfile} style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
              <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '600' }}>保存</Text>
            </TouchableOpacity>
          )
        ),
      });
    } else {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity activeOpacity={0.6} onPress={() => { setEditingProfile(true); setUsername(user?.username || ''); setEmail(user?.email || ''); }} style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
            <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '600' }}>编辑</Text>
          </TouchableOpacity>
        ),
      });
    }
  }, [editingProfile, saving, colors.primary, navigation, user]);

  const handleSaveProfile = async () => {
    if (!username.trim()) {
      Alert.alert('提示', '用户名不能为空');
      return;
    }
    setSaving(true);
    try {
      await updateUser({ username: username.trim(), email: email.trim() });
      setEditingProfile(false);
    } catch (e: any) {
      Alert.alert('失败', e.message || '更新失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 个人资料 */}
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
          {editingProfile ? (
            <>
              <Text style={[styles.editNote, { color: colors.textSecondary }]}>
                修改个人资料
              </Text>
              <InputRow label="用户名" value={username} onChangeText={setUsername} colors={colors} />
              <InputRow label="邮箱" value={email} onChangeText={setEmail} keyboardType="email-address" colors={colors} />
            </>
          ) : (
            <>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <UserIcon size={20} color={colors.textSecondary} />
                  <Text style={[styles.label, { color: colors.textSecondary }]}>用户名</Text>
                </View>
                <Text style={[styles.value, { color: colors.text }]}>{user?.username || ''}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <MailIcon size={20} color={colors.textSecondary} />
                  <Text style={[styles.label, { color: colors.textSecondary }]}>邮箱</Text>
                </View>
                <Text style={[styles.value, { color: colors.text }]}>{user?.email || ''}</Text>
              </View>
            </>
          )}
        </View>

        {/* 修改密码 */}
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
          <TouchableOpacity style={styles.passwordRow} onPress={() => navigation.navigate('ChangePassword')}>
            <View style={styles.rowLeft}>
              <KeyIcon size={20} color={colors.textSecondary} />
              <Text style={[styles.label, { color: colors.text }]}>修改密码</Text>
            </View>
            <ChevronRightIcon size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const InputRow: React.FC<{
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'email-address' | 'default';
  colors: ReturnType<typeof useTheme>;
}> = ({ label, value, onChangeText, secureTextEntry, keyboardType, colors }) => (
  <View style={[styles.inputRowWrap, { borderBottomColor: colors.border }]}>
    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
    <TextInput
      style={[styles.input, { color: colors.text }]}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType || 'default'}
      placeholderTextColor={colors.textTertiary}
      autoCapitalize="none"
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: { borderRadius: 12, overflow: 'hidden', marginBottom: spacing.md },
  divider: { height: 0.5, marginLeft: 48 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 44 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontSize: 15 },
  value: { fontSize: 15 },
  editNote: { fontSize: 13, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs },
  inputRowWrap: { flexDirection: 'row', alignItems: 'center', minHeight: 44, borderBottomWidth: 0.5, paddingHorizontal: spacing.md },
  inputLabel: { fontSize: 15, width: 70, flexShrink: 0 },
  input: { flex: 1, fontSize: 15, textAlign: 'right', paddingVertical: spacing.sm },
  passwordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 44 },
});

export default AccountSettingsScreen;
