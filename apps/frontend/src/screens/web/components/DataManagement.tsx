// 数据管理组件

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { spacing } from '../../../theme';
import { useWebTheme } from '../../../hooks/useWebTheme';
import { DatabaseIcon, DownloadIcon } from '../../../components/icons';
import { notesApi } from '../../../api/note';
import { useToast } from '../../../hooks/useToast';

export const DataManagement: React.FC = () => {
  const colors = useWebTheme();
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.textSecondary + '10' }]}>
        <Text style={[styles.title, { color: colors.text }]}>数据管理</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          珍藏每一份灵感，留存思想的痕迹
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.secondary }]}>
        <View style={styles.sectionRow}>
          <View style={styles.sectionText}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>导出笔记</Text>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              将所有笔记导出为 Markdown 格式，永久珍藏
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.primary, opacity: isExporting ? 0.6 : 1 },
            ]}
            onPress={handleExportNotes}
            disabled={isExporting}
          >
            <DownloadIcon size={16} color={colors.cta} />
            <Text style={[styles.actionButtonText, { color: colors.cta }]}>
              {isExporting ? '导出中...' : '导出'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 14,
  },
  section: {
    marginBottom: spacing.xl,
    padding: spacing.lg,
    borderRadius: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionText: {
    flex: 1,
    marginRight: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: 13,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    flexShrink: 0,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DataManagement;
