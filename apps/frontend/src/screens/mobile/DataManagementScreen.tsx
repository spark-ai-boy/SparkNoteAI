// 数据管理（手机端）

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { useToast } from '../../hooks/useToast';
import { notesApi } from '../../api/note';
import { SettingsItem } from './components/SettingsItem';
import { ChevronLeftIcon, DatabaseIcon, DownloadIcon } from '../../components/icons';

interface DataManagementScreenProps {
  onBack: () => void;
}

export const DataManagementScreen: React.FC<DataManagementScreenProps> = ({ onBack }) => {
  const colors = useWebTheme();
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportNotes = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await notesApi.exportNotes();
      toast.success('笔记导出成功');
    } catch (error: any) {
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
        <SettingsItem
          icon={<ChevronLeftIcon size={22} color={colors.text} />}
          title="数据管理"
          showChevron={false}
          onPress={onBack}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 导出笔记 */}
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.sectionHeader}>
            <DatabaseIcon size={20} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>导出笔记</Text>
          </View>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            将所有笔记导出为 Markdown 格式，永久珍藏
          </Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={[styles.exportBtn, isExporting && styles.exportBtnDisabled]}
            onPress={handleExportNotes}
            disabled={isExporting}
            activeOpacity={0.7}
          >
            {isExporting ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <DownloadIcon size={18} color={colors.primary} />
                <Text style={[styles.exportBtnText, { color: colors.primary }]}>导出笔记</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  section: { borderRadius: 12, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  desc: { fontSize: 14, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  divider: { height: 1 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, margin: spacing.md, borderRadius: 8 },
  exportBtnDisabled: { opacity: 0.6 },
  exportBtnText: { fontSize: 15, fontWeight: '600' },
});

export default DataManagementScreen;
