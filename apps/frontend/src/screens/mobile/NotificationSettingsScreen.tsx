// 通知设置（手机端）— iOS 分组卡片风格

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { useToastStore } from '../../stores/toastStore';
import {
  BellIcon,
  ClockIcon,
  UploadIcon,
  NetworkIcon,
  AlertTriangleIcon,
} from '../../components/icons';
import { getNotificationSettings, updatePreferences, type NotificationSettings } from '../../api/preferences';

const OPTIONS = (colors: ReturnType<typeof useTheme>): { id: keyof NotificationSettings; label: string; description: string; icon: React.ReactNode }[] => [
  {
    id: 'task_complete',
    label: '任务完成通知',
    description: '后台任务完成时发送通知',
    icon: <ClockIcon size={20} color={colors.textSecondary} />,
  },
  {
    id: 'import_progress',
    label: '导入进度通知',
    description: '显示内容导入的实时进度',
    icon: <UploadIcon size={20} color={colors.textSecondary} />,
  },
  {
    id: 'import_complete',
    label: '导入完成通知',
    description: '内容导入完成时发送通知',
    icon: <UploadIcon size={20} color={colors.textSecondary} />,
  },
  {
    id: 'knowledge_graph_complete',
    label: '知识图谱构建通知',
    description: '知识图谱构建完成时发送通知',
    icon: <NetworkIcon size={20} color={colors.textSecondary} />,
  },
  {
    id: 'error_alerts',
    label: '错误警告',
    description: '出现错误时显示警告通知',
    icon: <AlertTriangleIcon size={20} color={colors.textSecondary} />,
  },
];

// iOS 风格 Switch 组件
const ToggleSwitch: React.FC<{
  value: boolean;
  onValueChange: () => void;
  colors: ReturnType<typeof useTheme>;
}> = ({ value, onValueChange, colors }) => (
  <Pressable
    onPress={onValueChange}
    style={[
      styles.toggleTrack,
      {
        backgroundColor: value ? colors.primary : colors.border,
      },
    ]}
  >
    <View
      style={[
        styles.toggleKnob,
        {
          backgroundColor: value ? colors.primaryForeground : colors.background,
          transform: [{ translateX: value ? 18 : 0 }],
        },
      ]}
    />
  </Pressable>
);

export const NotificationSettingsScreen: React.FC = () => {
  const colors = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<keyof NotificationSettings | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>({
    task_complete: true,
    import_progress: true,
    import_complete: true,
    knowledge_graph_complete: true,
    error_alerts: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getNotificationSettings();
      setSettings(data);
    } catch {
      // 使用默认值
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = async (id: keyof NotificationSettings) => {
    const newValue = !settings[id];
    const newSettings = { ...settings, [id]: newValue };
    setSettings(newSettings);

    setSaving(id);
    try {
      await updatePreferences({ notifications: { [id]: newValue } });
      useToastStore.getState().showSuccess('已保存');
    } catch {
      setSettings(settings); // 回滚
      useToastStore.getState().showError('保存失败');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 通知开关卡片 */}
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.cardHeader}>
            <BellIcon size={20} color={colors.textSecondary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>通知偏好</Text>
          </View>

          {OPTIONS(colors).map((option, i) => {
            const isLast = i === OPTIONS.length - 1;
            const isSavingThis = saving === option.id;

            return (
              <View key={option.id}>
                <View style={styles.optionRow}>
                  <View style={styles.optionLeft}>
                    <View style={[styles.iconBox, { backgroundColor: colors.background }]}>
                      {option.icon}
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
                      <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{option.description}</Text>
                    </View>
                  </View>
                  {isSavingThis ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <ToggleSwitch
                      value={settings[option.id]}
                      onValueChange={() => toggleSetting(option.id)}
                      colors={colors}
                    />
                  )}
                </View>
                {!isLast && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: { borderRadius: 12, overflow: 'hidden' },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  cardTitle: { fontSize: 13, fontWeight: '400' },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 52,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '500' },
  optionDesc: { fontSize: 13, marginTop: 1 },

  divider: { height: 0.5, marginLeft: spacing.md + spacing.sm + 32 },

  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default NotificationSettingsScreen;
