// 确认对话框组件 - 用于替代 Alert.alert

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { spacing, typography } from '../../../theme';
import { useWebTheme } from '../../../hooks/useWebTheme';
import { CloseIcon } from '../../../components/icons';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  const colors = useWebTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* 头部 */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <CloseIcon size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* 消息内容 */}
          <View style={styles.messageContainer}>
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          </View>

          {/* 底部按钮 */}
          <View style={styles.footer}>
            {cancelText ? (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }
                ]}
                onPress={onCancel}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{cancelText}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                { backgroundColor: isDestructive ? colors.error : colors.primary },
                isDestructive && styles.destructiveButton,
                !cancelText && styles.fullWidthButton,
              ]}
              onPress={onConfirm}
            >
              <Text
                style={[
                  styles.confirmButtonText,
                  isDestructive && styles.destructiveButtonText,
                  { color: colors.white },
                ]}
              >
                {confirmText}
              </Text>
            </TouchableOpacity>
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
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    paddingRight: spacing.sm,
  },
  closeButton: {
    padding: 4,
  },
  messageContainer: {
    marginBottom: spacing.xl,
  },
  message: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
  },
  fullWidthButton: {
    flex: 1,
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  confirmButton: {
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  destructiveButton: {
    borderWidth: 0,
  },
  destructiveButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ConfirmDialog;
