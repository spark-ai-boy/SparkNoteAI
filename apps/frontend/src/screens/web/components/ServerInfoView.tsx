// 服务器信息只读显示组件 - 用于登录后的设置页面

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {
  InfoIcon,
  LogOutIcon,
  CloseIcon,
} from '../../../components/icons';
import { spacing, fontFamily } from '../../../theme';
import { useWebTheme } from '../../../hooks/useWebTheme';
import { useServerConfigStore } from '../../../stores/serverConfigStore';
import { useAuthStore } from '../../../stores/authStore';
import apiClient from '../../../api/client';

export const ServerInfoView: React.FC = () => {
  const colors = useWebTheme();
  const { baseUrl, serverInfo, loadConfig } = useServerConfigStore();
  const { logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  useEffect(() => {
    loadInfo();
  }, []);

  const loadInfo = async () => {
    setIsLoading(true);
    await loadConfig();
    // 加载时获取服务器版本信息
    await fetchServerVersion();
    setIsLoading(false);
  };

  const fetchServerVersion = async () => {
    try {
      // 使用主 API 客户端（生产环境走相对路径 /api）
      const response = await apiClient.get('/version');
      if (response.data) {
        useServerConfigStore.setState({
          serverInfo: {
            version: response.data.version,
            compatible_client_versions: response.data.compatible_client_versions || [],
          },
        });
      }
    } catch (e) {
      console.log('获取服务器版本失败:', e);
    }
  };

  const handleChangeServer = () => {
    setIsLogoutModalVisible(true);
  };

  const handleConfirmLogout = async () => {
    await logout();
    setIsLogoutModalVisible(false);
  };

  const handleCloseModal = () => {
    setIsLogoutModalVisible(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>加载服务器信息...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: colors.textSecondary + '10' }]}>
          <Text style={[styles.title, { color: colors.text }]}>服务器信息</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            查看当前服务器配置信息和版本
          </Text>
        </View>

      {/* 服务器地址 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>服务器地址</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <Text style={[styles.infoValue, { color: colors.textSecondary }]}>{baseUrl}</Text>
        </View>
      </View>

      {/* 服务器版本 */}
      {serverInfo?.version && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>服务器版本</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            <Text style={[styles.infoValue, { color: colors.textSecondary }]}>v{serverInfo.version}</Text>
          </View>
        </View>
      )}

      {/* 兼容客户端版本 */}
      {serverInfo?.compatible_client_versions && serverInfo.compatible_client_versions.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>兼容客户端版本</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            <View style={styles.versionList}>
              {serverInfo.compatible_client_versions.map((version, index) => (
                <Text key={index} style={[styles.versionItem, { color: colors.textSecondary }]}>
                  v{version}{index < serverInfo.compatible_client_versions.length - 1 ? ',' : ''}
                </Text>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* 修改提示 */}
      <View style={[styles.hintCard, { backgroundColor: colors.backgroundSecondary }]}>
        <InfoIcon size={20} color={colors.textSecondary} />
        <View style={styles.hintContent}>
          <Text style={[styles.hintTitle, { color: colors.text }]}>需要修改服务器？</Text>
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>
            如需修改服务器配置，请先退出登录，然后在登录界面点击服务器地址进行配置。
          </Text>
        </View>
        <TouchableOpacity style={[styles.changeButton, { backgroundColor: colors.primary }]} onPress={handleChangeServer}>
          <LogOutIcon size={16} color={colors.primaryForeground} />
          <Text style={[styles.changeButtonText, { color: colors.primaryForeground }]}>修改服务器</Text>
        </TouchableOpacity>
      </View>

      {/* 版本说明 */}
      <View style={[styles.helpContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.helpTitle, { color: colors.text }]}>关于私有化部署</Text>
        <Text style={[styles.helpText, { color: colors.textSecondary }]}>
          • 默认使用官方服务器：https://api.sparknoteai.com
        </Text>
        <Text style={[styles.helpText, { color: colors.textSecondary }]}>
          • 支持私有化部署，可配置自己的服务器地址
        </Text>
        <Text style={[styles.helpText, { color: colors.textSecondary }]}>
          • 服务器版本需要与客户端版本兼容才能正常使用
        </Text>
      </View>
      </ScrollView>
      {/* 退出登录确认弹窗 */}
      <Modal
        visible={isLogoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>确认退出登录</Text>
              <TouchableOpacity onPress={handleCloseModal} style={styles.modalCloseButton}>
                <CloseIcon size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
                修改服务器配置需要先退出登录，然后在登录界面进行配置。
              </Text>
              <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
                确定要退出登录吗？
              </Text>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={handleCloseModal}
              >
                <Text style={[styles.modalCancelButtonText, { color: colors.text }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, { backgroundColor: colors.primary }]}
                onPress={handleConfirmLogout}
              >
                <Text style={[styles.modalConfirmButtonText, { color: colors.white }]}>退出登录</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  header: {
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  infoCard: {
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: fontFamily.mono,
  },
  versionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  versionItem: {
    fontSize: 13,
    fontFamily: fontFamily.mono,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  hintContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  hintTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  hintText: {
    fontSize: 12,
    lineHeight: 20,
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    flexShrink: 0,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  helpContainer: {
    borderRadius: 8,
    padding: spacing.md,
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  helpText: {
    fontSize: 12,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  // 退出登录确认弹窗
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    borderRadius: 16,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalBody: {
    marginBottom: spacing.xl,
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
  },
  modalCancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100,
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalConfirmButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100,
  },
  modalConfirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ServerInfoView;
