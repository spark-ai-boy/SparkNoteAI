// 数据管理（手机端）— iOS 分组卡片风格

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../../navigation/SettingsStack';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import { notesApi } from '../../api/note';
import { knowledgeGraphApi } from '../../api/knowledgeGraph';
import {
  DatabaseIcon,
  DownloadIcon,
  NetworkIcon,
  TrashIcon,
  FileTextIcon,
  ChevronRightIcon,
} from '../../components/icons';
import { useImportTaskStore } from '../../stores/importTaskStore';

type NavProp = NativeStackNavigationProp<SettingsStackParamList, 'DataManagement'>;

export const DataManagementScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const colors = useTheme();
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isClearingGraph, setIsClearingGraph] = useState(false);
  const [noteCount, setNoteCount] = useState(0);
  const [graphStats, setGraphStats] = useState({ nodes: 0, edges: 0 });
  const [loading, setLoading] = useState(true);

  const { tasks, fetchTasks } = useImportTaskStore();

  useEffect(() => {
    Promise.all([
      fetchNoteStats(),
      fetchGraphStats(),
      fetchTasks(),
    ]).finally(() => setLoading(false));
  }, []);

  const fetchNoteStats = async () => {
    try {
      const res = await notesApi.getNotes({ page: 1, size: 1 });
      setNoteCount(res.total);
    } catch {
      // ignore
    }
  };

  const fetchGraphStats = async () => {
    try {
      const status = await knowledgeGraphApi.getStatus();
      setGraphStats({ nodes: status.node_count, edges: status.edge_count });
    } catch {
      // ignore
    }
  };

  const handleExportNotes = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const blob = await notesApi.exportNotes();

      // 移动端：写入文件后弹出系统分享/保存面板
      const Sharing = await import('expo-sharing');
      const FileSystem = await import('expo-file-system/legacy');

      const docDir = FileSystem.documentDirectory ?? '';
      const filename = `${docDir}sparknoteai_notes_${Date.now()}.zip`;
      const base64 = await blobToBase64(blob);
      await FileSystem.writeAsStringAsync(filename, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Sharing.shareAsync(filename, {
        mimeType: 'application/zip',
        UTI: 'com.pkware.zip-archive',
      });
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

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleClearGraph = () => {
    Alert.alert(
      '确认清空',
      `确定要清空知识图谱吗？当前有 ${graphStats.nodes} 个节点、${graphStats.edges} 条关系。此操作不可恢复。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '清空',
          style: 'destructive',
          onPress: async () => {
            setIsClearingGraph(true);
            try {
              await knowledgeGraphApi.clearGraph();
              setGraphStats({ nodes: 0, edges: 0 });
              toast.success('知识图谱已清空');
            } catch {
              toast.error('清空失败，请重试');
            } finally {
              setIsClearingGraph(false);
            }
          },
        },
      ]
    );
  };

  const completedTaskCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* 数据统计 */}
            <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
              <View style={styles.cardHeader}>
                <DatabaseIcon size={20} color={colors.textSecondary} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>数据统计</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <StatRow label="笔记" value={noteCount.toString()} icon={<FileTextIcon size={16} color={colors.blue} />} isLast />
            </View>

            {/* 知识图谱统计 */}
            <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
              <View style={styles.cardHeader}>
                <NetworkIcon size={20} color={colors.textSecondary} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>知识图谱</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.statGrid}>
                <View style={styles.statGridItem}>
                  <Text style={[styles.statGridValue, { color: colors.text }]}>{graphStats.nodes}</Text>
                  <Text style={[styles.statGridLabel, { color: colors.textSecondary }]}>节点</Text>
                </View>
                <View style={styles.statGridItem}>
                  <Text style={[styles.statGridValue, { color: colors.text }]}>{graphStats.edges}</Text>
                  <Text style={[styles.statGridLabel, { color: colors.textSecondary }]}>关系</Text>
                </View>
              </View>
              {graphStats.nodes > 0 && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <Pressable
                    style={styles.dangerRow}
                    onPress={handleClearGraph}
                    disabled={isClearingGraph}
                  >
                    {isClearingGraph ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <>
                        <TrashIcon size={18} color={colors.error} />
                        <Text style={[styles.dangerText, { color: colors.error }]}>清空知识图谱</Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}
            </View>

            {/* 导入任务统计 */}
            <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
              <View style={styles.cardHeader}>
                <FileTextIcon size={20} color={colors.textSecondary} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>导入任务</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Pressable
                style={styles.row}
                onPress={() => navigation.navigate('Tasks')}
              >
                <View style={styles.rowLeft}>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>查看任务记录</Text>
                  {completedTaskCount > 0 && (
                    <View style={[styles.badge, { backgroundColor: colors.success + '18' }]}>
                      <Text style={[styles.badgeText, { color: colors.success }]}>
                        已完成 {completedTaskCount} 条
                      </Text>
                    </View>
                  )}
                </View>
                <ChevronRightIcon size={16} color={colors.textTertiary} />
              </Pressable>
            </View>

            {/* 导出笔记 */}
            <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
              <View style={styles.cardHeader}>
                <DownloadIcon size={20} color={colors.blue} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>数据导出</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Pressable
                style={[styles.exportBtn, isExporting && styles.exportBtnDisabled]}
                onPress={handleExportNotes}
                disabled={isExporting}
              >
                {isExporting ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <DownloadIcon size={18} color={colors.primary} />
                    <Text style={[styles.exportBtnText, { color: colors.primary }]}>
                      {noteCount > 0 ? `导出全部笔记（${noteCount} 条）` : '导出笔记'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const StatRow: React.FC<{ label: string; value: string; icon: React.ReactNode; isLast?: boolean }> = ({ label, value, icon, isLast }) => {
  const colors = useTheme();
  return (
    <View style={[styles.statRow, !isLast && { borderBottomColor: colors.border, borderBottomWidth: 0.5 }]}>
      <View style={styles.statRowLeft}>
        {icon}
        <Text style={[styles.statLabel, { color: colors.text }]}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: colors.textSecondary }]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl * 3 },

  card: { borderRadius: 12, overflow: 'hidden', marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  divider: { height: 0.5, marginLeft: spacing.md },

  // 统计行
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  statRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statLabel: { fontSize: 15 },
  statValue: { fontSize: 15, fontWeight: '600' },

  // 统计网格
  statGrid: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
  statGridItem: { flex: 1, alignItems: 'center' },
  statGridValue: { fontSize: 24, fontWeight: '700' },
  statGridLabel: { fontSize: 13, marginTop: spacing.xs },

  // 普通行
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowLabel: { fontSize: 15 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '600' },

  // 危险操作
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dangerText: { fontSize: 15, fontWeight: '600' },

  // 导出按钮
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  exportBtnDisabled: { opacity: 0.6 },
  exportBtnText: { fontSize: 15, fontWeight: '600' },
});

export default DataManagementScreen;
