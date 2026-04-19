// 数据管理（手机端）— iOS 分组卡片风格

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../../navigation/SettingsStack';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import { notesApi } from '../../api/note';
import { DatabaseIcon, DownloadIcon } from '../../components/icons';

type NavProp = NativeStackNavigationProp<SettingsStackParamList, 'DataManagement'>;

export const DataManagementScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const colors = useTheme();
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 导出笔记 */}
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.cardHeader}>
            <DatabaseIcon size={20} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>导出笔记</Text>
          </View>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: { borderRadius: 12, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  divider: { height: 0.5, marginLeft: spacing.md },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, marginHorizontal: spacing.md, marginVertical: spacing.md, borderRadius: 10 },
  exportBtnDisabled: { opacity: 0.6 },
  exportBtnText: { fontSize: 15, fontWeight: '600' },
});

export default DataManagementScreen;
