// 后台任务（手机端）— iOS 分组卡片风格

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../../navigation/SettingsStack';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { useImportTaskStore } from '../../stores/importTaskStore';
import { ClockIcon, CheckCircleIcon, XCircleIcon, RefreshCwIcon, AlertTriangleIcon } from '../../components/icons';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <ClockIcon size={16} />,
  running: <RefreshCwIcon size={16} />,
  completed: <CheckCircleIcon size={16} />,
  failed: <XCircleIcon size={16} />,
  cancelled: <AlertTriangleIcon size={16} />,
};

const STATUS_COLORS = (colors: ReturnType<typeof useTheme>) => ({
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

type NavProp = NativeStackNavigationProp<SettingsStackParamList, 'Tasks'>;

export const TasksScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const colors = useTheme();
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 状态筛选 */}
      <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {statusOptions.map((opt) => (
            <Pressable
              key={opt}
              style={[styles.filterChip, { backgroundColor: filter === opt ? colors.primary : colors.backgroundSecondary }]}
              onPress={() => setFilter(opt)}
            >
              <Text style={{ color: filter === opt ? colors.primaryForeground : colors.text, fontSize: 14 }}>
                {statusLabels[opt as keyof typeof statusLabels]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* 任务列表 */}
      <ScrollView
        contentContainerStyle={styles.taskList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {filteredTasks.length === 0 ? (
          <View style={styles.empty}>
            <ClockIcon size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂无任务</Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
            {filteredTasks.map((task, i) => {
              const isLast = i === filteredTasks.length - 1;
              return (
                <View key={task.id}>
                  <View style={styles.taskItem}>
                    <View style={styles.taskHeader}>
                      <View style={{ marginRight: spacing.xs }}>
                        {STATUS_ICONS[task.status as keyof typeof STATUS_ICONS]}
                      </View>
                      <Text style={[styles.taskType, { color: colors.text }]}>{task.task_type}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusColors[task.status as keyof typeof statusColors] + '20' }]}>
                        <Text style={[styles.statusText, { color: statusColors[task.status as keyof typeof statusColors] }]}>
                          {STATUS_LABELS[task.status] || task.status}
                        </Text>
                      </View>
                    </View>
                    {task.progress !== undefined && task.progress !== null && (
                      <View style={styles.progressRow}>
                        <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
                          <View style={[styles.progressFg, { width: `${task.progress}%`, backgroundColor: colors.primary }]} />
                        </View>
                        <Text style={[styles.progressText, { color: colors.textSecondary }]}>{task.progress}%</Text>
                      </View>
                    )}
                    {task.error_message && (
                      <Text style={[styles.errorText, { color: colors.error }]}>{task.error_message}</Text>
                    )}
                    <View style={styles.taskFooter}>
                      <Text style={[styles.taskTime, { color: colors.textTertiary }]}>
                        {task.created_at ? new Date(task.created_at).toLocaleString('zh-CN') : ''}
                      </Text>
                      {(task.status === 'running' || task.status === 'pending') && (
                        <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.error }]} onPress={() => handleCancel(task.id)}>
                          <Text style={[styles.cancelBtnText, { color: colors.error }]}>取消</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  {!isLast && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterBar: { borderBottomWidth: 1, paddingVertical: spacing.sm },
  filterContent: { paddingHorizontal: spacing.md, gap: spacing.sm },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 16 },
  taskList: { padding: spacing.md, paddingBottom: spacing.xl },
  card: { borderRadius: 12, overflow: 'hidden' },
  divider: { height: 0.5, marginLeft: spacing.md },
  taskItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  taskHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  taskType: { flex: 1, fontSize: 15, fontWeight: '600' },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  progressBg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFg: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, minWidth: 36, textAlign: 'right' },
  errorText: { fontSize: 12, marginBottom: spacing.sm },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTime: { fontSize: 12 },
  cancelBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 4, borderWidth: 1 },
  cancelBtnText: { fontSize: 12, fontWeight: '500' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyText: { fontSize: 16, marginTop: spacing.md },
});

export default TasksScreen;
