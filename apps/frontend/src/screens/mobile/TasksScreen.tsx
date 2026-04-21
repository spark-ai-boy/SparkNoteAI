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
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {statusOptions.map((opt) => {
            const isActive = filter === opt;
            return (
              <Pressable
                key={opt}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? colors.primary : 'transparent',
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => setFilter(opt)}
              >
                <Text style={{ color: isActive ? colors.background : colors.textSecondary, fontSize: 13, fontWeight: '500' }}>
                  {statusLabels[opt as keyof typeof statusLabels]}
                </Text>
              </Pressable>
            );
          })}
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
          filteredTasks.map((task) => (
            <View key={task.id} style={[styles.taskCard, { backgroundColor: colors.backgroundSecondary }]}>
              <View style={styles.taskHeader}>
                <View style={[styles.statusDot, { backgroundColor: statusColors[task.status as keyof typeof statusColors] }]} />
                <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1}>{task.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColors[task.status as keyof typeof statusColors] + '15' }]}>
                  <Text style={[styles.statusText, { color: statusColors[task.status as keyof typeof statusColors] }]}>
                    {STATUS_LABELS[task.status] || task.status}
                  </Text>
                </View>
              </View>

              {task.progress !== undefined && task.progress !== null && task.status !== 'completed' && task.status !== 'failed' && (
                <View style={styles.progressRow}>
                  <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
                    <View style={[styles.progressFg, { width: `${Math.max(task.progress, 5)}%`, backgroundColor: statusColors[task.status as keyof typeof statusColors] }]} />
                  </View>
                  <Text style={[styles.progressText, { color: statusColors[task.status as keyof typeof statusColors] }]}>{Math.round(task.progress)}%</Text>
                </View>
              )}

              {task.error_message && (
                <Text style={[styles.descText, { color: task.status === 'completed' ? colors.success : colors.error }]}>{task.error_message}</Text>
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
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterBar: { paddingVertical: spacing.sm },
  filterContent: { paddingHorizontal: spacing.md, gap: spacing.sm },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 16 },
  taskList: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  taskCard: { borderRadius: 12, padding: spacing.md, gap: spacing.sm },
  taskHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  taskTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressBg: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFg: { height: '100%', borderRadius: 2 },
  progressText: { fontSize: 12, fontWeight: '500', minWidth: 36, textAlign: 'right' },
  descText: { fontSize: 13 },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTime: { fontSize: 12 },
  cancelBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 4, borderWidth: 1 },
  cancelBtnText: { fontSize: 12, fontWeight: '500' },
  empty: { justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl * 3 },
  emptyText: { fontSize: 16, marginTop: spacing.md },
});

export default TasksScreen;
