// 碎片化内容页面

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, typography } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { ImportDialog, ImportProgressDialog } from '../../components';
import { useImportTaskStore, TaskStatus, ImportTask } from '../../stores/importTaskStore';
import {
  MessageSquareIcon,
  FileTextIcon,
  MonitorIcon,
  PlayCircleIcon,
  GlobeIcon,
  DownloadIcon,
} from '../../components/icons';

// 平台图标组件映射
const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  wechat: <MessageSquareIcon size={20} strokeWidth={2} />,
  xiaohongshu: <FileTextIcon size={20} strokeWidth={2} />,
  bilibili: <MonitorIcon size={20} strokeWidth={2} />,
  youtube: <PlayCircleIcon size={20} strokeWidth={2} />,
  web: <GlobeIcon size={20} strokeWidth={2} />,
  other: <FileTextIcon size={20} strokeWidth={2} />,
};

export const FragmentsScreen: React.FC = () => {
  const colors = useWebTheme();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);

  const {
    activeTask,
    tasks,
    createImportTask,
    setActiveTask,
    fetchTasks,
    pollActiveTask,
  } = useImportTaskStore();

  // 加载任务列表
  useEffect(() => {
    fetchTasks();
  }, []);

  // 轮询活动任务状态
  useEffect(() => {
    if (!showProgressDialog || !activeTask) return;

    // 检查任务是否完成
    const isCompleted = activeTask.status === TaskStatus.COMPLETED;
    const isFailed = activeTask.status === TaskStatus.FAILED;
    const isCancelled = activeTask.status === TaskStatus.CANCELLED;

    if (isCompleted || isFailed || isCancelled) {
      // 任务完成/失败/取消，延迟关闭弹窗并刷新列表
      const timer = setTimeout(() => {
        setShowProgressDialog(false);
        setActiveTask(null);
        fetchTasks(); // 刷新任务列表
      }, 1500); // 1.5 秒后关闭，让用户看到完成状态
      return () => clearTimeout(timer);
    }

    // 任务进行中，继续轮询
    const pollInterval = setInterval(() => {
      pollActiveTask();
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [showProgressDialog, activeTask]);

  // 处理导入
  const handleImport = async (url: string, platform: string) => {
    try {
      setShowImportDialog(false);

      const task = await createImportTask({
        url,
        platform: platform !== 'other' ? platform : undefined,
        content_type: 'fragment',
      });

      setShowProgressDialog(true);
    } catch (error) {
      console.error('导入失败:', error);
    }
  };

  // 发送到后台
  const handleSendToBackground = () => {
    setShowProgressDialog(false);
  };

  // 关闭进度弹窗
  const handleCloseProgress = () => {
    setShowProgressDialog(false);
    setActiveTask(null);
  };

  // 渲染任务项
  const renderTaskItem = ({ item }: { item: ImportTask }) => {
    const platformIcon = item.platform ? PLATFORM_ICONS[item.platform] || PLATFORM_ICONS.other : PLATFORM_ICONS.other;
    const statusColor = item.status === TaskStatus.COMPLETED
      ? colors.success
      : item.status === TaskStatus.FAILED
        ? colors.error
        : colors.textSecondary;

    return (
      <View style={[styles.taskCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <View style={styles.taskHeader}>
          <View style={styles.taskPlatformIcon}>{platformIcon}</View>
          <View style={styles.taskInfo}>
            <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.taskUrl, { color: colors.textSecondary }]} numberOfLines={1}>{item.url}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status === TaskStatus.COMPLETED ? '完成' :
               item.status === TaskStatus.RUNNING ? '进行中' :
               item.status === TaskStatus.PENDING ? '等待中' :
               item.status === TaskStatus.FAILED ? '失败' : '已取消'}
            </Text>
          </View>
        </View>
        <View style={[styles.taskFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.taskTime, { color: colors.textSecondary }]}>
            {new Date(item.created_at).toLocaleString('zh-CN')}
          </Text>
          {item.status === TaskStatus.COMPLETED && (
            <Text style={[styles.progressText, { color: colors.success }]}>{item.progress}%</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 头部 */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>碎片化内容</Text>
        <TouchableOpacity
          style={[styles.importButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowImportDialog(true)}
        >
          <Text style={[styles.importButtonText, { color: colors.cta }]}>+ 导入</Text>
        </TouchableOpacity>
      </View>

      {/* 内容列表 */}
      <View style={[styles.content, { backgroundColor: colors.background }]}>
        {tasks.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
            <View style={styles.emptyIcon}>
              <DownloadIcon size={48} strokeWidth={1.5} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyText, { color: colors.text }]}>暂无导入记录</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>点击右上角"导入"按钮开始导入内容</Text>
          </View>
        ) : (
          <FlatList
            data={tasks}
            renderItem={renderTaskItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      {/* 导入对话框 */}
      <ImportDialog
        visible={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImport}
      />

      {/* 导入进度弹窗 */}
      <ImportProgressDialog
        visible={showProgressDialog}
        task={activeTask}
        onClose={handleCloseProgress}
        onSendToBackground={handleSendToBackground}
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
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...typography.h2,
  },
  importButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  importButtonText: {
    ...typography.button,
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.caption,
    textAlign: 'center',
  },
  listContent: {
    padding: spacing.md,
  },
  taskCard: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  taskPlatformIcon: {
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    ...typography.body,
    fontWeight: '600',
  },
  taskUrl: {
    ...typography.caption,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '500',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTime: {
    ...typography.caption,
  },
  progressText: {
    ...typography.caption,
    fontWeight: '600',
  },
});

export default FragmentsScreen;
