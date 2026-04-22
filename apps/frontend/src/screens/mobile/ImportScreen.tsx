// 移动端导入笔记页面

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { spacing, typography } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { LinkIcon, GlobeIcon, MessageSquareIcon, FileTextIcon, MonitorIcon, PlayCircleIcon, CheckCircleIcon, XCircleIcon } from '../../components/icons';
import { useImportTaskStore, TaskStatus } from '../../stores/importTaskStore';
import { useToastStore } from '../../stores/toastStore';
import { useNoteStore } from '../../stores/noteStore';
import { getPlatforms, createImportTask, detectPlatformFromUrl } from '../../api/importTask';

// 平台图标组件映射
const PLATFORM_ICONS: Record<string, React.FC<{ size?: number; strokeWidth?: number; color?: string }>> = {
  wechat: MessageSquareIcon,
  xiaohongshu: FileTextIcon,
  bilibili: MonitorIcon,
  youtube: PlayCircleIcon,
  web: GlobeIcon,
  other: FileTextIcon,
};

const PLATFORM_NAMES: Record<string, string> = {
  wechat: '微信公众号',
  xiaohongshu: '小红书',
  bilibili: 'B 站',
  youtube: 'YouTube',
  web: '网页',
  other: '其他',
};

type MobileNotesStackParamList = {
  NotesHome: undefined;
  AIAgent: undefined;
  KnowledgeGraph: undefined;
  Settings: undefined;
  Tasks: undefined;
  NoteDetail: { noteId: number };
  Import: { url?: string } | undefined;
};

type NavProp = NativeStackNavigationProp<MobileNotesStackParamList, 'Import'>;

export const ImportScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = navigation.getState();
  const colors = useTheme();
  const [url, setUrl] = useState('');
  const [detectedPlatform, setDetectedPlatform] = useState<string>('');
  const [platforms, setPlatforms] = useState<{ id: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { activeTask, pollActiveTask, setActiveTask } = useImportTaskStore();

  // 从导航参数中获取 URL（来自分享）
  useEffect(() => {
    const params = route?.routes[route?.routes.length - 1]?.params as { url?: string } | undefined;
    if (params?.url) {
      setUrl(params.url);
      setDetectedPlatform(detectPlatformFromUrl(params.url));
    }
  }, [route]);

  // 加载平台列表
  useEffect(() => {
    const loadPlatforms = async () => {
      try {
        const data = await getPlatforms();
        setPlatforms(data);
      } catch {
        setPlatforms([
          { id: 'wechat', name: '微信公众号' },
          { id: 'xiaohongshu', name: '小红书' },
          { id: 'bilibili', name: 'B 站' },
          { id: 'youtube', name: 'YouTube' },
          { id: 'other', name: '其他' },
        ]);
      }
    };
    loadPlatforms();
  }, []);

  // 自动识别平台
  const handleUrlChange = useCallback((text: string) => {
    setUrl(text);
    if (text.trim()) {
      setDetectedPlatform(detectPlatformFromUrl(text.trim()));
    } else {
      setDetectedPlatform('');
    }
  }, []);

  // 轮询活动任务
  useEffect(() => {
    if (!activeTask) return;

    const isTerminal = activeTask.status === TaskStatus.COMPLETED ||
      activeTask.status === TaskStatus.FAILED ||
      activeTask.status === TaskStatus.CANCELLED;

    if (isTerminal) {
      const timer = setTimeout(async () => {
        if (activeTask.status === TaskStatus.COMPLETED) {
          useToastStore.getState().showSuccess('导入完成', `《${activeTask.title}》已成功导入`, 5000);
          // 刷新笔记列表
          useNoteStore.getState().fetchNotes();
        } else {
          useToastStore.getState().showError('导入失败', activeTask.error_message || '导入失败，请重试', 5000);
        }
        setActiveTask(null);
      }, 1500);
      return () => clearTimeout(timer);
    }

    const pollInterval = setInterval(pollActiveTask, 1000);
    return () => clearInterval(pollInterval);
  }, [activeTask]);

  const handleImport = useCallback(async () => {
    if (!url.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const platform = detectedPlatform || 'other';
      const task = await createImportTask({ url: url.trim(), platform });
      useImportTaskStore.getState().setActiveTask(task);
      useToastStore.getState().showInfo(`正在导入《${task.title}》...`);
      setUrl('');
      setDetectedPlatform('');
    } catch (error: any) {
      useToastStore.getState().showError(error.response?.data?.detail || '创建导入任务失败');
    } finally {
      setIsSubmitting(false);
    }
  }, [url, detectedPlatform, isSubmitting]);

  const DetectedPlatformIcon = detectedPlatform ? (PLATFORM_ICONS[detectedPlatform] || PLATFORM_ICONS.other) : null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.formContainer}>
        <Text style={[styles.title, { color: colors.text }]}>导入内容</Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>内容链接</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            <View style={styles.inputIcon}>
              <LinkIcon size={18} color={colors.textTertiary} />
            </View>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="粘贴微信公众号、小红书等链接"
              placeholderTextColor={colors.textTertiary}
              value={url}
              onChangeText={handleUrlChange}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              multiline
              editable={!activeTask || activeTask.status === TaskStatus.COMPLETED || activeTask.status === TaskStatus.FAILED || activeTask.status === TaskStatus.CANCELLED}
            />
          </View>
        </View>

        {/* 自动识别的平台 */}
        {detectedPlatform && DetectedPlatformIcon && (
          <View style={[styles.platformDetected, { backgroundColor: colors.primary + '15' }]}>
            <DetectedPlatformIcon size={20} color={colors.primary} />
            <Text style={[styles.platformDetectedText, { color: colors.primary }]}>
              已识别：{PLATFORM_NAMES[detectedPlatform] || detectedPlatform}
            </Text>
          </View>
        )}

        {/* 进度条 — 仅在任务进行中显示 */}
        {activeTask && (activeTask.status === TaskStatus.RUNNING || activeTask.status === TaskStatus.PENDING) && (
          <View style={[styles.progressInline, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={styles.progressRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.progressLabel, { color: colors.text }]}>
                {activeTask.status === TaskStatus.RUNNING ? '正在导入' : '等待中'}
              </Text>
              <Text style={[styles.progressPercent, { color: colors.primary }]}>{Math.round(activeTask.progress)}%</Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${Math.max(activeTask.progress, 5)}%` }]} />
            </View>
          </View>
        )}

        {/* 任务完成/失败提示 */}
        {activeTask && (activeTask.status === TaskStatus.COMPLETED || activeTask.status === TaskStatus.FAILED) && (
          <View style={[styles.progressInline, styles.progressResult]}>
            <View style={styles.progressRow}>
              {activeTask.status === TaskStatus.COMPLETED ? (
                <CheckCircleIcon size={20} color={colors.success} />
              ) : (
                <XCircleIcon size={20} color={colors.error} />
              )}
              <Text style={[styles.progressLabel, { color: colors.text }]}>
                {activeTask.status === TaskStatus.COMPLETED ? '导入完成' : '导入失败'}
              </Text>
              <TouchableOpacity onPress={() => setActiveTask(null)} activeOpacity={0.6}>
                <Text style={[styles.dismissText, { color: colors.textTertiary }]}>关闭</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.progressResultText, { color: colors.textSecondary }]}>
              {activeTask.status === TaskStatus.COMPLETED
                ? `《${activeTask.title}》已成功导入`
                : activeTask.error_message || '导入失败，请重试'}
            </Text>
          </View>
        )}

        {/* 导入按钮 */}
        <TouchableOpacity
          style={[
            styles.importButton,
            { backgroundColor: colors.primary },
            (!url.trim() || isSubmitting) && { opacity: 0.5 },
          ]}
          onPress={handleImport}
          disabled={!url.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.importButtonText, { color: colors.background }]}>开始导入</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  formContainer: { flex: 1, padding: spacing.lg },
  title: { ...typography.h2, textAlign: 'center', marginBottom: spacing.xl },
  inputContainer: { marginBottom: spacing.lg },
  label: { ...typography.caption, marginBottom: spacing.sm },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  inputIcon: { alignItems: 'center', justifyContent: 'center' },
  input: { ...typography.body, padding: 0, flex: 1 },
  platformDetected: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: 12, gap: spacing.sm, marginBottom: spacing.lg },
  platformDetectedText: { ...typography.body, fontWeight: '500' },
  platformsSection: { marginBottom: spacing.xl },
  platformsLabel: { ...typography.caption, marginBottom: spacing.sm },
  platformsList: { gap: spacing.sm },
  platformItem: { alignItems: 'center', padding: spacing.sm, borderRadius: 12, minWidth: 72, gap: 4 },
  platformItemName: { ...typography.caption, textAlign: 'center' },
  importButton: { paddingVertical: spacing.md, borderRadius: 12, alignItems: 'center' },
  importButtonText: { ...typography.button, fontWeight: '600' },
  progressInline: { padding: spacing.md, borderRadius: 12, gap: spacing.sm, marginBottom: spacing.lg },
  progressResult: {},
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressLabel: { ...typography.body, fontWeight: '500', flex: 1 },
  progressPercent: { ...typography.caption, fontWeight: '600' },
  progressResultText: { ...typography.caption, marginTop: spacing.xs },
  dismissText: { ...typography.caption, fontWeight: '500', padding: spacing.xs },
  progressBar: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
});

export default ImportScreen;
