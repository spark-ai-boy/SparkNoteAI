// 设置页面

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { useAuthStore } from '../../stores';
import { LLMConfigManager } from '../web/components/LLMConfigManager';
import PrivacySecurityScreen from '../web/PrivacySecurityScreen';
import InterfaceSettingsScreen from '../web/InterfaceSettingsScreen';
import { TasksScreen } from '../web/TasksScreen';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { notesApi } from '../../api/note';
import { useToast } from '../../hooks/useToast';

export const SettingsScreen: React.FC = () => {
  const colors = useWebTheme();
  const { user, logout } = useAuthStore();
  const toast = useToast();
  const [showLLMConfig, setShowLLMConfig] = useState(false);
  const [showPrivacySecurity, setShowPrivacySecurity] = useState(false);
  const [showInterfaceSettings, setShowInterfaceSettings] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleExportNotes = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      const blob = await notesApi.exportNotes();

      if (Platform.OS === 'web') {
        // Web 端下载
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'sparknoteai_notes_export.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('笔记导出成功');
      } else {
        // 移动端：动态导入 expo 模块
        const FileSystem = await import('expo-file-system');
        const Sharing = await import('expo-sharing');

        const filename = FileSystem.default.documentDirectory + 'sparknoteai_notes_export.zip';
        await FileSystem.default.writeAsStringAsync(filename, blob as unknown as string, {
          encoding: FileSystem.default.EncodingType.UTF8,
        });
        await Sharing.default.shareAsync(filename);
        toast.success('笔记导出成功');
      }
    } catch (error: any) {
      console.error('导出笔记失败:', error);
      if (error.response?.status === 404) {
        toast.error('暂无笔记可导出');
      } else {
        toast.error('导出失败，请重试');
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>设置</Text>
      </View>
      <View style={[styles.content, { backgroundColor: colors.background }]}>
        <View style={[styles.userInfo, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.userName, { color: colors.text }]}>{user?.username}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
        </View>

        <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.menuText, { color: colors.text }]}>账号设置</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => setShowInterfaceSettings(true)}
        >
          <Text style={[styles.menuText, { color: colors.text }]}>主题设置</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => setShowPrivacySecurity(true)}
        >
          <Text style={[styles.menuText, { color: colors.text }]}>隐私与安全</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => setShowLLMConfig(true)}
        >
          <Text style={[styles.menuText, { color: colors.text }]}>大模型配置</Text>
        </TouchableOpacity>

        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => setShowTasks(true)}
          >
            <Text style={[styles.menuText, { color: colors.text }]}>后台任务</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.backgroundSecondary }]}
          onPress={handleExportNotes}
          disabled={isExporting}
        >
          <Text style={[styles.menuText, { color: colors.text }]}>
            {isExporting ? '导出中...' : '导出笔记'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.menuText, { color: colors.text }]}>关于</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.logoutButton, { backgroundColor: colors.backgroundSecondary }]}
          onPress={handleLogout}
        >
          <Text style={[styles.menuText, { color: colors.error }, styles.logoutText]}>退出登录</Text>
        </TouchableOpacity>
      </View>

      {/* LLM 配置管理对话框 */}
      <Modal
        visible={showLLMConfig}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLLMConfig(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <LLMConfigManager onClose={() => setShowLLMConfig(false)} />
          </View>
        </View>
      </Modal>

      {/* 界面设置对话框 */}
      <Modal
        visible={showInterfaceSettings}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInterfaceSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <InterfaceSettingsScreen onClose={() => setShowInterfaceSettings(false)} />
          </View>
        </View>
      </Modal>

      {/* 隐私与安全设置对话框 */}
      <Modal
        visible={showPrivacySecurity}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPrivacySecurity(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <PrivacySecurityScreen />
          </View>
        </View>
      </Modal>

      {/* 后台任务（仅手机端） */}
      {Platform.OS !== 'web' && (
        <Modal
          visible={showTasks}
          animationType="slide"
          transparent
          onRequestClose={() => setShowTasks(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <TasksScreen onClose={() => setShowTasks(false)} />
            </View>
          </View>
        </Modal>
      )}
      <ConfirmDialog
        visible={showLogoutConfirm}
        title="确认退出"
        message="确定要退出登录吗？"
        confirmText="确定"
        cancelText="取消"
        isDestructive
        onConfirm={() => logout()}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    padding: spacing.md,
  },
  userInfo: {
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: 13,
  },
  menuItem: {
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  menuText: {
    fontSize: 14,
  },
  logoutButton: {
    marginTop: spacing.lg,
  },
  logoutText: {
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flex: 1,
  },
});

export default SettingsScreen;
