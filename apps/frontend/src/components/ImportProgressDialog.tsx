// 导入进度弹窗组件

import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { spacing, typography } from '../theme';
import { useWebTheme } from '../hooks/useWebTheme';
import { TaskStatus, ImportTask } from '../stores/importTaskStore';

interface ImportProgressDialogProps {
  visible: boolean;
  task: ImportTask | null;
  onClose: () => void;
  onSendToBackground: () => void;
}

// 获取状态文本
const getStatusText = (status: TaskStatus): string => {
  switch (status) {
    case TaskStatus.PENDING:
      return '等待中...';
    case TaskStatus.RUNNING:
      return '导入中...';
    case TaskStatus.COMPLETED:
      return '导入完成';
    case TaskStatus.FAILED:
      return '导入失败';
    case TaskStatus.CANCELLED:
      return '已取消';
    default:
      return '未知状态';
  }
};

// 获取状态颜色
const getStatusColor = (status: TaskStatus, colors: ReturnType<typeof useWebTheme>): string => {
  switch (status) {
    case TaskStatus.PENDING:
      return colors.textSecondary;
    case TaskStatus.RUNNING:
      return colors.cta;
    case TaskStatus.COMPLETED:
      return colors.success;
    case TaskStatus.FAILED:
      return colors.error;
    case TaskStatus.CANCELLED:
      return colors.textSecondary;
    default:
      return colors.text;
  }
};

export const ImportProgressDialog: React.FC<ImportProgressDialogProps> = ({
  visible,
  task,
  onClose,
  onSendToBackground,
}) => {
  const colors = useWebTheme();
  const isCompleted = task?.status === TaskStatus.COMPLETED;
  const isFailed = task?.status === TaskStatus.FAILED;
  const isCancelled = task?.status === TaskStatus.CANCELLED;
  const isActive = task && [TaskStatus.PENDING, TaskStatus.RUNNING].includes(task.status);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isCompleted || isFailed || isCancelled ? onClose : undefined}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* 标题 */}
          <Text style={[styles.title, { color: colors.text }]}>导入进度</Text>

          {/* 任务信息 */}
          {task && (
            <View style={styles.content}>
              {/* 任务标题 */}
              <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={2}>
                {task.title}
              </Text>

              {/* URL */}
              <Text style={[styles.url, { color: colors.textSecondary }]} numberOfLines={1}>
                {task.url}
              </Text>

              {/* 进度条 */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${task.progress}%`, backgroundColor: colors.primary },
                      isActive && styles.progressActive,
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: colors.text }]}>{task.progress}%</Text>
              </View>

              {/* 状态 */}
              <View style={styles.statusRow}>
                {isActive && <ActivityIndicator size="small" color={colors.cta} />}
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(task.status, colors) },
                  ]}
                >
                  {getStatusText(task.status)}
                </Text>
              </View>

              {/* 错误信息 */}
              {isFailed && task.error_message && (
                <Text style={[styles.errorText, { color: colors.error }]}>{task.error_message}</Text>
              )}

              {/* 完成信息 */}
              {isCompleted && (
                <Text style={[styles.successText, { color: colors.success }]}>内容已成功导入到碎片列表</Text>
              )}

              {/* 已取消信息 */}
              {isCancelled && (
                <Text style={[styles.cancelledText, { color: colors.textSecondary }]}>任务已取消</Text>
              )}
            </View>
          )}

          {/* 操作按钮 */}
          <View style={styles.buttonContainer}>
            {/* 后台导入按钮 - 仅在活跃状态显示 */}
            {isActive && (
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={onSendToBackground}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>后台导入</Text>
              </TouchableOpacity>
            )}

            {/* 关闭按钮 */}
            {(isCompleted || isFailed || isCancelled) && (
              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={onClose}>
                <Text style={styles.primaryButtonText}>知道了</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    borderRadius: 16,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  content: {
    marginBottom: spacing.lg,
  },
  taskTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  url: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressActive: {
  },
  progressText: {
    ...typography.caption,
    width: 40,
    textAlign: 'right',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    ...typography.body,
    marginLeft: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  successText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  cancelledText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  primaryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...typography.button,
  },
  secondaryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...typography.button,
  },
});

export default ImportProgressDialog;
