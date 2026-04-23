// 通知设置页面

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import {
  BellIcon,
  CheckIcon,
  CloseIcon,
  TaskIcon,
  UploadIcon,
  NetworkIcon,
  AlertTriangleIcon,
} from '../../components/icons';
import apiClient from '../../api/client';

// 通知设置项
interface NotificationOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

// 通知设置数据结构
interface NotificationSettings {
  task_complete: boolean;
  import_progress: boolean;
  import_complete: boolean;
  knowledge_graph_complete: boolean;
  error_alerts: boolean;
}

const notificationOptions: NotificationOption[] = [
  {
    id: 'task_complete',
    label: '任务完成通知',
    description: '后台任务完成时发送通知',
    icon: <TaskIcon size={20} />,
  },
  {
    id: 'import_progress',
    label: '导入进度通知',
    description: '显示内容导入的实时进度',
    icon: <UploadIcon size={20} />,
  },
  {
    id: 'import_complete',
    label: '导入完成通知',
    description: '内容导入完成时发送通知',
    icon: <UploadIcon size={20} />,
  },
  {
    id: 'knowledge_graph_complete',
    label: '知识图谱构建通知',
    description: '知识图谱构建完成时发送通知',
    icon: <NetworkIcon size={20} />,
  },
  {
    id: 'error_alerts',
    label: '错误警告',
    description: '出现错误时显示警告通知',
    icon: <AlertTriangleIcon size={20} />,
  },
];

interface NotificationSettingsScreenProps {
  onClose?: () => void;
}

export const NotificationSettingsScreen: React.FC<NotificationSettingsScreenProps> = ({
  onClose,
}) => {
  const colors = useWebTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    task_complete: true,
    import_progress: true,
    import_complete: true,
    knowledge_graph_complete: true,
    error_alerts: true,
  });

  // 加载通知设置
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/preferences');
      const data = response.data;
      if (data.notifications) {
        setSettings({
          task_complete: data.notifications.task_complete ?? true,
          import_progress: data.notifications.import_progress ?? true,
          import_complete: data.notifications.import_complete ?? true,
          knowledge_graph_complete: data.notifications.knowledge_graph_complete ?? true,
          error_alerts: data.notifications.error_alerts ?? true,
        });
      }
    } catch (error) {
      console.error('加载通知设置失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 保存通知设置
  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      setIsSaving(true);
      await apiClient.put('/preferences', {
        notifications: newSettings,
      });
    } catch (error) {
      console.error('保存通知设置失败:', error);
      // 保存失败时回滚设置
      loadSettings();
    } finally {
      setIsSaving(false);
    }
  };

  // 切换单个通知设置
  const toggleSetting = async (id: string) => {
    const newSettings = {
      ...settings,
      [id as keyof NotificationSettings]: !settings[id as keyof NotificationSettings],
    };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const ContainerWrapper = Platform.OS === 'web' ? View : require('react-native-safe-area-context').SafeAreaView;

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ContainerWrapper style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 头部 */}
      <View style={[styles.header, { backgroundColor: colors.textSecondary + '10' }]}>
        <Text style={[styles.title, { color: colors.text }]}>通知设置</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          管理你的通知偏好
        </Text>
      </View>
      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <CloseIcon size={24} color={colors.text} />
        </TouchableOpacity>
      )}
      {isSaving && (
        <ActivityIndicator size="small" color={colors.primary} style={styles.savingIndicator} />
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            选择你希望接收的通知类型。你可以随时关闭或开启这些通知。
          </Text>
        </View>

        {notificationOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionRow,
              { backgroundColor: colors.backgroundSecondary },
            ]}
            onPress={() => toggleSetting(option.id)}
            activeOpacity={0.7}
            disabled={isSaving}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.optionIconContainer, { backgroundColor: colors.muted }]}>
                {option.icon}
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionLabel, { color: colors.text }]}>
                  {option.label}
                </Text>
                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                  {option.description}
                </Text>
              </View>
            </View>
            <View style={[styles.toggleSwitch, { backgroundColor: settings[option.id as keyof NotificationSettings] ? colors.primary : colors.border }, settings[option.id as keyof NotificationSettings] && styles.toggleSwitchActive]}>
              <View style={[styles.toggleKnob, { backgroundColor: settings[option.id as keyof NotificationSettings] ? colors.primaryForeground : colors.background }, settings[option.id as keyof NotificationSettings] && styles.toggleKnobActive]} />
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </ContainerWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    borderRadius: 12,
    padding: spacing.lg,
    margin: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    padding: spacing.sm,
  },
  savingIndicator: {
    marginLeft: spacing.sm,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 20,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 12,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    padding: 2,
  },
  toggleSwitchActive: {
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
});

export default NotificationSettingsScreen;
