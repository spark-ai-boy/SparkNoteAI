// 设置详情组件 - 右侧栏

import React, { Fragment } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { ConstructionIcon, UserIcon, LockIcon, InfoIcon } from '../icons';
import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import AccountSettings from './AccountSettings';
import FeatureConfigDetail from './FeatureConfigDetail';
import LLMConfigManager from './LLMConfigManager';
import ImageStorageConfigManager from './ImageStorageConfigManager';
import ServerInfoView from './ServerInfoView';
import PrivacySecuritySettings from './PrivacySecuritySettings';
import InterfaceSettingsScreen from '../../screens/main/InterfaceSettingsScreen';
import NotificationSettingsScreen from '../../screens/main/NotificationSettingsScreen';
import DataManagement from './DataManagement';

// 设置分类详情组件属性
interface SettingsDetailViewProps {
  category: string;
}

// 场景配置 ID 列表
const FEATURE_CONFIG_IDS = ['notes', 'knowledge_graph', 'ai_assistant'];

export const SettingsDetailView: React.FC<SettingsDetailViewProps> = ({ category }) => {
  const colors = useWebTheme();

  // 渲染大模型配置内容
  const renderLLMConfig = () => {
    return <LLMConfigManager />;
  };

  // 渲染图片存储配置内容
  const renderImageStorageConfig = () => (
    <ImageStorageConfigManager />
  );

  // 渲染其他设置的占位内容
  const renderPlaceholder = (
    title: string,
    description: string,
    icon?: React.ReactNode
  ) => (
    <View style={styles.placeholderContainer}>
      <View style={styles.placeholderIconContainer}>
        {icon || <ConstructionIcon size={64} color={colors.textSecondary} />}
      </View>
      <Text style={[styles.placeholderTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.placeholderText, { color: colors.text }]}>{description}</Text>
      <Text style={[styles.placeholderHint, { color: colors.textSecondary }]}>功能开发中，敬请期待...</Text>
    </View>
  );

  // 根据 category 渲染不同的内容
  let content: React.ReactNode;

  switch (category) {
    case 'server':
      content = <ServerInfoView />;
      break;

    case 'llm':
      content = renderLLMConfig();
      break;

    case 'image_storage':
      content = renderImageStorageConfig();
      break;

    case 'appearance':
      content = <InterfaceSettingsScreen />;
      break;

    case 'account':
      content = <AccountSettings />;
      break;

    case 'notes':
    case 'knowledge_graph':
    case 'ai_assistant':
      content = <FeatureConfigDetail featureId={category} />;
      break;

    case 'notification':
      content = <NotificationSettingsScreen />;
      break;

    case 'privacy':
      content = <PrivacySecuritySettings />;
      break;

    case 'data':
      content = <DataManagement />;
      break;

    case 'about':
      content = (
        <View style={styles.placeholderContainer}>
          <View style={styles.placeholderIconContainer}>
            <InfoIcon size={64} color={colors.textSecondary} />
          </View>
          <Text style={[styles.placeholderTitle, { color: colors.text }]}>SparkNoteAI</Text>
          <Text style={[styles.placeholderText, { fontSize: 16, marginTop: spacing.md, color: colors.text }]}>
            拾光如spark，沉淀成note
          </Text>
          <Text style={[styles.placeholderText, { color: colors.text }]}>
            捕捉灵感的碎片，编织知识的图谱
          </Text>
          <Text style={[styles.placeholderVersion, { color: colors.textSecondary }]}>Version 1.0.0</Text>
          <Text style={[styles.placeholderHint, { color: colors.textSecondary }]}>© 2026 SparkNoteAI. All rights reserved.</Text>
        </View>
      );
      break;

    default:
      content = renderPlaceholder('设置详情', '请选择左侧的设置项');
  }

  return <Fragment>{content}</Fragment>;
};

const styles = StyleSheet.create({
  detailContent: {
    flex: 1,
    padding: spacing.lg,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl * 2,
  },
  placeholderIconContainer: {
    marginBottom: spacing.lg,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  placeholderText: {
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  placeholderVersion: {
    fontSize: 12,
    marginTop: spacing.sm,
  },
  placeholderHint: {
    fontSize: 12,
    marginTop: spacing.lg,
    fontStyle: 'italic',
  },
});

export default SettingsDetailView;
