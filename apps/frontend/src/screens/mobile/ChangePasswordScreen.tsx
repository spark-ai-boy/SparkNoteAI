// 修改密码（手机端）— iOS 原生 modal 风格

import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../../navigation/SettingsStack';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/authStore';

type NavProp = NativeStackNavigationProp<SettingsStackParamList, 'ChangePassword'>;

export const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const colors = useTheme();
  const { changePassword } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity activeOpacity={0.6} onPress={() => navigation.goBack()} style={{ marginLeft: 0, padding: 4 }}>
          <Text style={{ color: colors.primary, fontSize: 17 }}>取消</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors.primary]);

  const handleSubmit = async () => {
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
      navigation.goBack();
      Alert.alert('成功', '密码已修改');
    } catch (e: any) {
      Alert.alert('失败', e.message || '修改失败');
    } finally {
      setChanging(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
          请输入当前密码和新密码
        </Text>
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
          <InputRow label="当前密码" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry colors={colors} />
          <View style={[styles.inputDivider, { backgroundColor: colors.border }]} />
          <InputRow label="新密码" value={newPassword} onChangeText={setNewPassword} secureTextEntry colors={colors} />
          <View style={[styles.inputDivider, { backgroundColor: colors.border }]} />
          <InputRow label="确认密码" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry colors={colors} />
        </View>

        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleSubmit} disabled={changing}>
          {changing ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>确认修改</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const InputRow: React.FC<{
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  colors: ReturnType<typeof useTheme>;
}> = ({ label, value, onChangeText, secureTextEntry, colors }) => (
  <View style={styles.inputRowWrap}>
    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
    <TextInput
      style={[styles.input, { color: colors.text }]}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      placeholderTextColor={colors.textTertiary}
      autoCapitalize="none"
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md },
  subLabel: { fontSize: 13, marginBottom: spacing.sm, marginHorizontal: spacing.sm },
  card: { borderRadius: 12, overflow: 'hidden', marginBottom: spacing.lg },
  inputDivider: { height: 0.5, marginLeft: 70 },
  inputRowWrap: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: spacing.md },
  inputLabel: { fontSize: 15, width: 70, flexShrink: 0 },
  input: { flex: 1, fontSize: 15, textAlign: 'right', paddingVertical: spacing.sm },
  submitBtn: { paddingVertical: spacing.md, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { fontSize: 17, fontWeight: '600' },
});

export default ChangePasswordScreen;
