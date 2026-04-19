// 后台任务（手机端）

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { useImportTaskStore } from '../../stores/importTaskStore';
import { SettingsItem } from './components/SettingsItem';
import { ChevronLeftIcon, ClockIcon, CheckCircleIcon, XCircleIcon, RefreshCwIcon, AlertTriangleIcon } from '../../components/icons';

interface TasksScreenProps {
  onBack: () => void;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <ClockIcon size={16} />,
  running: <RefreshCwIcon size={16} />,
  completed: <CheckCircleIcon size={16} />,
  failed: <XCircleIcon size={16} />,
  cancelled: <AlertTriangleIcon size={16} />,
};

const STATUS_COLORS = (colors: ReturnType<typeof useWebTheme>) => ({
  pending: colors.textTertiary,
  running: colors.blue,
  completed: colors.success,
  failed: colors.error,
  cancelled: colors.warning,
});

const STATUS_LABELS: Record<string, string> = {
  pending: '等待中',
  running: '运行中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

export const TasksScreen: React.FC<TasksScreenProps> = ({ onBack }) => {
  const colors = useWebTheme();
  const { tasks, isLoading, fetchTasks, cancelTask } = useImportTaskStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchTasks();
  }, []);

  // 轮询运行中的任务
  useEffect(() => {
    const hasRunning = tasks.some((t) => t.status === 'running' || t.status === 'pending');
    if (!hasRunning) return;
    const interval = setInterval(() => fetchTasks(), 3000);
    return () => clearInterval(interval);
  }, [tasks, fetchTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks().finally(() => setRefreshing(false));
  };

  const handleCancel = (taskId: number) => {
    Alert.alert('确认取消', '确定要取消此任务吗？', [
      { text: '取消', style: 'cancel' },
      { text: '确定', onPress: () => cancelTask(taskId) },
    ]);
  };

  const filteredTasks = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);
  const statusOptions = ['all', 'running', 'completed', 'failed'];
  const statusLabels = { all: '全部', running: '运行中', completed: '已完成', failed: '失败' };
  const statusColors = STATUS_COLORS(colors);

  const renderTask = ({ item }: { item: (typeof tasks)[0] }) => (
    <View style={[styles.taskCard, { backgroundColor: colors.background }]}>
      <View style={styles.taskHeader}>
        <View style={{ marginRight: spacing.xs }}>
          {STATUS_ICONS[item.status as keyof typeof STATUS_ICONS]}
        </View>
        <Text style={[styles.taskType, { color: colors.text }]}>{item.task_type}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status as keyof typeof statusColors] + '20' }]}>
          <Text style={[styles.statusText, { color: statusColors[item.status as keyof typeof statusColors] }]}>
            {STATUS_LABELS[item.status] || item.status}
          </Text>
        </View>
      </View>
      {item.progress !== undefined && item.progress !== null && (
        <View style={styles.progressRow}>
          <View style={[styles.progressBg, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={[styles.progressFg, { width: `${item.progress}%`, backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>{item.progress}%</Text>
        </View>
      )}
      {item.error_message && (
        <Text style={[styles.errorText, { color: colors.error }]}>{item.error_message}</Text>
      )}
      <View style={styles.taskFooter}>
        <Text style={[styles.taskTime, { color: colors.textTertiary }]}>
          {item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : ''}
        </Text>
        {(item.status === 'running' || item.status === 'pending') && (
          <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.error }]} onPress={() => handleCancel(item.id)}>
            <Text style={[styles.cancelBtnText, { color: colors.error }]}>取消</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <SettingsItem
          icon={<ChevronLeftIcon size={22} color={colors.text} />}
          title="后台任务"
          showChevron={false}
          onPress={onBack}
        />
      </View>

      {/* 状态筛选 */}
      <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
        <FlatList
          horizontal
          data={statusOptions}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, { backgroundColor: filter === item ? colors.primary : colors.backgroundSecondary }]}
              onPress={() => setFilter(item)}
            >
              <Text style={{ color: filter === item ? colors.primaryForeground : colors.text }}>
                {statusLabels[item as keyof typeof statusLabels]}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}
        />
      </View>

      {/* 任务列表 */}
      <FlatList
        data={filteredTasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.taskList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ClockIcon size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂无任务</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1 },
  filterBar: { borderBottomWidth: 1, paddingVertical: spacing.sm },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 16 },
  taskList: { padding: spacing.md },
  taskCard: { borderRadius: 12, padding: spacing.md, marginBottom: spacing.md },
  taskHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  taskType: { flex: 1, fontSize: 14, fontWeight: '600' },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  progressBg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFg: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, minWidth: 36, textAlign: 'right' },
  errorText: { fontSize: 12, marginBottom: spacing.sm },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTime: { fontSize: 11 },
  cancelBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 4, borderWidth: 1 },
  cancelBtnText: { fontSize: 12, fontWeight: '500' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyText: { fontSize: 16, marginTop: spacing.md },
});

export default TasksScreen;
