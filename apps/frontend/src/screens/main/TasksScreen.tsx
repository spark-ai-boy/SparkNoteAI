// 后台任务页面

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, typography } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { useImportTaskStore, TaskStatus, Task } from '../../stores/importTaskStore';
import { useToastStore } from '../../stores/toastStore';
import { TaskType } from '../../api/importTask';
import {
  DownloadIcon,
  NetworkIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  XCircleIcon,
  RefreshCwIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../../components/icons';

// 获取动态颜色的 Hook
const useStatusConfig = () => {
  const colors = useWebTheme();
  return {
    [TaskStatus.PENDING]: {
      label: '等待中',
      color: colors.textSecondary,
      bg: colors.border,
      icon: ClockIcon,
    },
    [TaskStatus.RUNNING]: {
      label: '进行中',
      color: colors.blue,
      bg: colors.blue + '15',
      icon: RefreshCwIcon,
    },
    [TaskStatus.COMPLETED]: {
      label: '已完成',
      color: colors.success,
      bg: colors.success + '15',
      icon: CheckCircleIcon,
    },
    [TaskStatus.FAILED]: {
      label: '失败',
      color: colors.error,
      bg: colors.error + '15',
      icon: XCircleIcon,
    },
    [TaskStatus.CANCELLED]: {
      label: '已取消',
      color: colors.textSecondary,
      bg: colors.border,
      icon: AlertCircleIcon,
    },
  };
};

// 格式化时间
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
};

// 获取屏幕宽度用于计算列数
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const CARD_MARGIN = spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - (COLUMN_COUNT + 1) * CARD_MARGIN) / COLUMN_COUNT;

export const TasksScreen: React.FC = () => {
  const colors = useWebTheme();
  const statusConfig = useStatusConfig();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const previousTasksRef = useRef<Map<number, TaskStatus>>(new Map());

  const tasks = useImportTaskStore((state) => state.tasks);
  const pagination = useImportTaskStore((state) => state.pagination);
  const fetchTasks = useImportTaskStore((state) => state.fetchTasks);
  const cancelTask = useImportTaskStore((state) => state.cancelTask);
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);

  // 加载任务列表
  useEffect(() => {
    fetchTasks(1, 10);
  }, []);

  // 检测任务状态变化并显示通知
  useEffect(() => {
    tasks.forEach((task) => {
      const previousStatus = previousTasksRef.current.get(task.id);
      const isCompleted = task.status === TaskStatus.COMPLETED;
      const isFailed = task.status === TaskStatus.FAILED;
      const wasActive = previousStatus && [TaskStatus.PENDING, TaskStatus.RUNNING].includes(previousStatus);

      // 状态从活跃变为完成/失败
      if (wasActive && isCompleted) {
        showSuccessToast('导入完成', `《${task.title}》已成功导入`, 5000);
      } else if (wasActive && isFailed) {
        showErrorToast('导入失败', task.error_message || '导入失败，请重试', 5000);
      }

      // 更新之前的状态
      previousTasksRef.current.set(task.id, task.status);
    });
  }, [tasks]);

  // 轮询进行中的任务状态（仅当有任务在运行时）
  useEffect(() => {
    const hasRunningTask = tasks.some((t) => t.status === TaskStatus.RUNNING);
    if (!hasRunningTask) return;

    // 每 3 秒刷新一次任务列表
    const pollInterval = setInterval(() => {
      fetchTasks(pagination.page, pagination.size);
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [pagination.page, pagination.size, tasks]);

  // 取消任务
  const handleCancelTask = async (taskId: number) => {
    try {
      await cancelTask(taskId);
    } catch (error) {
      console.error('取消任务失败:', error);
    }
  };

  // 下拉刷新
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTasks(1, 10);
    setRefreshing(false);
  };

  // 统计（基于总数而非当前页）
  const stats = {
    all: pagination.total,
    running: tasks.filter((t) => t.status === TaskStatus.RUNNING).length,
    completed: tasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
    failed: tasks.filter((t) => t.status === TaskStatus.FAILED).length,
  };

  // 分页加载
  const handlePageChange = (newPage: number) => {
    fetchTasks(newPage, 10);
  };

  // 渲染任务项（紧凑卡片）
  const renderTaskItem = ({ item }: { item: Task }) => {
    const statusConfigItem = statusConfig[item.status];
    const StatusIcon = statusConfigItem.icon;
    const canCancel = [TaskStatus.PENDING, TaskStatus.RUNNING].includes(item.status);

    // 根据任务类型显示不同的标题
    const isKnowledgeGraphBuild = item.task_type === TaskType.KNOWLEDGE_GRAPH_BUILD;
    const taskTitle = isKnowledgeGraphBuild ? '构建知识图谱' : (item.title || '导入内容');

    return (
      <View style={[styles.taskCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        {/* 顶部：状态标签 */}
        <View style={[styles.statusBadge, { backgroundColor: statusConfigItem.bg }]}>
          <StatusIcon size={12} color={statusConfigItem.color} />
          <Text style={[styles.statusText, { color: statusConfigItem.color }]}>
            {statusConfigItem.label}
          </Text>
        </View>

        {/* 图标和标题 */}
        <View style={styles.cardBody}>
          <View style={[styles.taskIconContainer, { backgroundColor: colors.primary + '10' }]}>
            {isKnowledgeGraphBuild ? (
              <NetworkIcon size={24} color={colors.primary} />
            ) : (
              <DownloadIcon size={24} color={colors.primary} />
            )}
          </View>
          <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={2}>
            {taskTitle}
          </Text>
        </View>

        {/* 进度条 */}
        {item.status === TaskStatus.RUNNING && (
          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${item.progress || 0}%`, backgroundColor: colors.blue },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: colors.blue }]}>{item.progress || 0}%</Text>
            </View>
          </View>
        )}

        {/* 底部：时间和操作 */}
        <View style={[styles.taskFooter, { borderTopColor: colors.border + '50' }]}>
          <View style={styles.timeRow}>
            <ClockIcon size={11} color={colors.textSecondary} />
            <Text style={[styles.taskTime, { color: colors.textSecondary }]}>{formatTime(item.created_at)}</Text>
          </View>

          {/* 取消按钮 */}
          {canCancel && (
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.destructive + '10' }]}
              onPress={() => handleCancelTask(item.id)}
            >
              <TrashIcon size={12} color={colors.destructive} />
            </TouchableOpacity>
          )}
        </View>

        {/* 错误/结果信息 - 小角标 */}
        {item.status === TaskStatus.FAILED && item.error_message && (
          <View style={[styles.cornerBadge, { backgroundColor: colors.error + '15' }]}>
            <AlertCircleIcon size={10} color={colors.error} />
          </View>
        )}
        {item.status === TaskStatus.COMPLETED && (
          <View style={[styles.cornerBadge, styles.cornerBadgeSuccess, { backgroundColor: colors.success + '15' }]}>
            <CheckCircleIcon size={10} color={colors.success} />
          </View>
        )}
      </View>
    );
  };

  // 渲染筛选器
  const renderFilter = () => {
    const statusConfigLocal = useStatusConfig();
    return (
    <View style={[styles.filterContainer, { backgroundColor: colors.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        <TouchableOpacity
          style={[styles.filterChip, { backgroundColor: colors.secondary, borderColor: colors.border }, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterChipText,
              filter === 'all' && styles.filterChipTextActive,
            ]}
          >
            全部
          </Text>
          <View style={[styles.filterCount, { backgroundColor: colors.border }]}>
            <Text style={styles.filterCountText}>{stats.all}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, { backgroundColor: colors.secondary, borderColor: colors.border }, filter === TaskStatus.RUNNING && styles.filterChipActive]}
          onPress={() => setFilter(TaskStatus.RUNNING)}
        >
          <RefreshCwIcon
            size={14}
            color={filter === TaskStatus.RUNNING ? colors.background : colors.blue}
          />
          <Text
            style={[
              styles.filterChipText,
              filter === TaskStatus.RUNNING && styles.filterChipTextActive,
            ]}
          >
            进行中
          </Text>
          <View style={[styles.filterCount, styles.filterCountBlue, { backgroundColor: colors.blue + '20' }]}>
            <Text style={styles.filterCountText}>{stats.running}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, { backgroundColor: colors.secondary, borderColor: colors.border }, filter === TaskStatus.COMPLETED && styles.filterChipActive]}
          onPress={() => setFilter(TaskStatus.COMPLETED)}
        >
          <CheckCircleIcon
            size={14}
            color={filter === TaskStatus.COMPLETED ? colors.background : colors.success}
          />
          <Text
            style={[
              styles.filterChipText,
              filter === TaskStatus.COMPLETED && styles.filterChipTextActive,
            ]}
          >
            完成
          </Text>
          <View style={[styles.filterCount, styles.filterCountGreen, { backgroundColor: colors.success + '20' }]}>
            <Text style={styles.filterCountText}>{stats.completed}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, { backgroundColor: colors.secondary, borderColor: colors.border }, filter === TaskStatus.FAILED && styles.filterChipActive]}
          onPress={() => setFilter(TaskStatus.FAILED)}
        >
          <AlertCircleIcon
            size={14}
            color={filter === TaskStatus.FAILED ? colors.background : colors.error}
          />
          <Text
            style={[
              styles.filterChipText,
              filter === TaskStatus.FAILED && styles.filterChipTextActive,
            ]}
          >
            失败
          </Text>
          <View style={[styles.filterCount, styles.filterCountRed, { backgroundColor: colors.error + '20' }]}>
            <Text style={styles.filterCountText}>{stats.failed}</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 头部 */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>任务管理</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {stats.running > 0
                ? `${stats.running} 个任务进行中`
                : `${pagination.page}/${pagination.pages || 1} 页 · ${pagination.total} 个任务`}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: colors.secondary }]}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCwIcon
              size={20}
              color={colors.text}
              style={refreshing ? styles.refreshing : null}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 筛选器 */}
      {renderFilter()}

      {/* 任务列表 - 双列网格 */}
      <FlatList
        data={tasks}
        renderItem={renderTaskItem}
        keyExtractor={(item) => String(item.id)}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.cta}
          />
        }
        ListEmptyComponent={
          <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.emptyIconWrapper, { backgroundColor: colors.border }]}>
              <DownloadIcon size={48} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>暂无任务</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              {filter === 'all'
                ? '还没有任何任务记录'
                : `没有${statusConfig[filter as TaskStatus]?.label}的任务`}
            </Text>
          </View>
        }
        ListFooterComponent={
          pagination.pages > 1 ? (
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                style={[styles.paginationButton, { backgroundColor: colors.secondary, borderColor: colors.border }, pagination.page <= 1 && styles.paginationButtonDisabled]}
                onPress={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeftIcon
                  size={18}
                  color={pagination.page <= 1 ? colors.textSecondary : colors.text}
                />
                <Text
                  style={[
                    styles.paginationButtonText,
                    pagination.page <= 1 && styles.paginationButtonTextDisabled,
                  ]}
                >
                  上一页
                </Text>
              </TouchableOpacity>

              <View style={styles.paginationInfo}>
                <Text style={[styles.paginationInfoText, { color: colors.textSecondary }]}>
                  {pagination.page} / {pagination.pages || 1}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.paginationButton, { backgroundColor: colors.secondary, borderColor: colors.border }, pagination.page >= pagination.pages && styles.paginationButtonDisabled]}
                onPress={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
              >
                <Text
                  style={[
                    styles.paginationButtonText,
                    pagination.page >= pagination.pages && styles.paginationButtonTextDisabled,
                  ]}
                >
                  下一页
                </Text>
                <ChevronRightIcon
                  size={18}
                  color={pagination.page >= pagination.pages ? colors.textSecondary : colors.text}
                />
              </TouchableOpacity>
            </View>
          ) : null
        }
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
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...typography.h2,
    fontWeight: '700',
    fontSize: 24,
  },
  refreshButton: {
    padding: spacing.sm,
    borderRadius: 8,
  },
  refreshing: {
    transform: [{ rotate: '180deg' }],
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
    fontSize: 13,
  },
  filterContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.xs,
  },
  filterChipActive: {
    borderColor: 'transparent',
  },
  filterChipText: {
    ...typography.caption,
    fontWeight: '500',
    fontSize: 13,
  },
  filterChipTextActive: {
    fontWeight: '600',
  },
  filterCount: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountBlue: {
  },
  filterCountGreen: {
  },
  filterCountRed: {
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  taskCard: {
    width: CARD_WIDTH,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    position: 'relative',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 10,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  taskIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  taskTitle: {
    flex: 1,
    ...typography.body,
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 18,
  },
  progressSection: {
    marginBottom: spacing.sm,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    ...typography.caption,
    fontWeight: '600',
    width: 30,
    textAlign: 'right',
    fontSize: 10,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskTime: {
    ...typography.caption,
    fontSize: 10,
  },
  cancelButton: {
    padding: spacing.xs,
    borderRadius: 6,
  },
  cornerBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerBadgeSuccess: {
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    ...typography.caption,
    fontWeight: '500',
    fontSize: 13,
  },
  paginationButtonTextDisabled: {
  },
  paginationInfo: {
    paddingHorizontal: spacing.md,
  },
  paginationInfoText: {
    ...typography.caption,
    fontWeight: '500',
    fontSize: 13,
  },
  emptyContainer: {
    padding: spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.caption,
    textAlign: 'center',
    fontSize: 13,
  },
});

export default TasksScreen;
