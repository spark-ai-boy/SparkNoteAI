// 导入对话框组件 - 用于输入 URL

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { spacing, typography } from '../theme';
import { useWebTheme } from '../hooks/useWebTheme';
import { getPlatforms } from '../api/importTask';
import {
  LinkIcon,
  DownloadIcon,
  MessageSquareIcon,
  FileTextIcon,
  MonitorIcon,
  PlayCircleIcon,
  GlobeIcon,
} from '../components/icons';

// 平台图标组件映射
const PLATFORM_ICONS: Record<string, React.FC<{ size?: number; strokeWidth?: number; color?: string }>> = {
  wechat: MessageSquareIcon,
  xiaohongshu: FileTextIcon,
  bilibili: MonitorIcon,
  youtube: PlayCircleIcon,
  web: GlobeIcon,
  other: FileTextIcon,
};

interface Platform {
  id: string;
  name: string;
}

interface ImportDialogProps {
  visible: boolean;
  onClose: () => void;
  onImport: (url: string, platform: string) => void;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  visible,
  onClose,
  onImport,
}) => {
  const colors = useWebTheme();
  const [url, setUrl] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('wechat');
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(true);

  // 加载平台列表
  useEffect(() => {
    const loadPlatforms = async () => {
      try {
        const data = await getPlatforms();
        setPlatforms(data);
        if (data.length > 0) {
          setSelectedPlatform(data[0].id);
        }
      } catch (error) {
        console.error('加载平台列表失败:', error);
        // 使用默认平台
        setPlatforms([
          { id: 'wechat', name: '微信公众号' },
          { id: 'xiaohongshu', name: '小红书' },
          { id: 'bilibili', name: 'B 站' },
          { id: 'youtube', name: 'YouTube' },
          { id: 'other', name: '其他' },
        ]);
      } finally {
        setIsLoadingPlatforms(false);
      }
    };

    if (visible) {
      loadPlatforms();
    }
  }, [visible]);

  const handleImport = () => {
    if (!url.trim()) {
      return;
    }
    onImport(url.trim(), selectedPlatform);
    setUrl('');
  };

  const handleCancel = () => {
    setUrl('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* 标题 */}
          <View style={styles.titleRow}>
            <DownloadIcon size={22} strokeWidth={2} color={colors.text} />
            <Text style={[styles.title, { color: colors.text }]}>导入内容</Text>
          </View>

          {/* URL 输入框 */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>内容链接</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.inputIcon}>
                <LinkIcon size={18} strokeWidth={2} color={colors.textSecondary} />
              </View>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="粘贴微信公众号、小红书、B 站、YouTube 等链接"
                placeholderTextColor={colors.textSecondary}
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                multiline
              />
            </View>
          </View>

          {/* 平台选择 */}
          <View style={styles.platformContainer}>
            <Text style={[styles.label, { color: colors.text }]}>选择平台</Text>
            {isLoadingPlatforms ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.platformScroll}
              >
                {platforms.map((platform) => (
                  <TouchableOpacity
                    key={platform.id}
                    style={[
                      styles.platformCard,
                      { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                      selectedPlatform === platform.id && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setSelectedPlatform(platform.id)}
                  >
                    <View style={styles.platformIcon}>
                      {(() => {
                        const IconComponent = PLATFORM_ICONS[platform.id] || PLATFORM_ICONS.other;
                        const iconColor = selectedPlatform === platform.id ? colors.background : colors.text;
                        return <IconComponent size={24} strokeWidth={2} color={iconColor} />;
                      })()}
                    </View>
                    <Text
                      style={[
                        styles.platformName,
                        { color: colors.text },
                        selectedPlatform === platform.id && styles.platformNameSelected,
                      ]}
                    >
                      {platform.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* 操作按钮 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.backgroundSecondary }]} onPress={handleCancel}>
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.importButton,
                { backgroundColor: colors.primary },
                !url.trim() && styles.importButtonDisabled,
              ]}
              onPress={handleImport}
              disabled={!url.trim()}
            >
              <Text style={[styles.importButtonText, { color: colors.background }]}>开始导入</Text>
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
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xl + spacing.md,
  },
  title: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  input: {
    ...typography.body,
    borderRadius: 8,
    padding: spacing.md,
    paddingLeft: 0,
    minHeight: 80,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  inputIcon: {
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
  },
  platformContainer: {
    marginBottom: spacing.lg,
  },
  platformScroll: {
    flexDirection: 'row',
    paddingRight: spacing.md,
  },
  platformCard: {
    alignItems: 'center',
    padding: spacing.md,
    marginRight: spacing.sm,
    borderRadius: 12,
    minWidth: 80,
    borderWidth: 2,
  },
  platformCardSelected: {
  },
  platformIcon: {
    marginBottom: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformName: {
    ...typography.caption,
    textAlign: 'center',
  },
  platformNameSelected: {
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.button,
  },
  importButton: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  importButtonDisabled: {
    opacity: 0.5,
  },
  importButtonText: {
    ...typography.button,
    fontWeight: '600',
  },
});

export default ImportDialog;
