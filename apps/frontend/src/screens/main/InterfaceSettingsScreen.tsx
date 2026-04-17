// 界面设置页面

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { colors, spacing } from '../../theme';
import {
  useInterfaceSettingsStore,
  useThemeColors,
} from '../../stores/interfaceSettingsStore';
import ThemeSelector from '../../components/settings/ThemeSelector';
import {
  PaletteIcon,
  GlobeIcon,
  ChevronRightIcon,
  CloseIcon,
  CheckIcon,
  LanguagesIcon,
} from '../../components/icons';

export const InterfaceSettingsScreen: React.FC<{
  onClose?: () => void;
}> = ({ onClose }) => {
  const {
    theme,
    language,
    setTheme,
    setLanguage,
    loadSettings,
  } = useInterfaceSettingsStore();

  const currentColors = useThemeColors();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 加载设置
  useEffect(() => {
    loadSettings();
  }, []);

  // 处理主题切换
  const handleThemeChange = async (newTheme: typeof theme) => {
    setIsSaving(true);
    await setTheme(newTheme);
    setIsSaving(false);
  };

  // 处理语言变化
  const handleLanguageChange = async (newLanguage: typeof language) => {
    setIsSaving(true);
    await setLanguage(newLanguage);
    setIsSaving(false);
    setShowLanguageModal(false);
  };

  const languages: { value: typeof language; label: string; disabled?: boolean }[] = [
    { value: 'zh-CN', label: '简体中文' },
    { value: 'en-US', label: 'English', disabled: true },
  ];

  const ContainerWrapper = Platform.OS === 'web' ? View : require('react-native-safe-area-context').SafeAreaView;

  return (
    <ContainerWrapper style={[styles.container, { backgroundColor: currentColors.background }]}>
      {/* 头部 */}
      <View style={[styles.header, { backgroundColor: currentColors.textSecondary + '10' }]}>
        <Text style={[styles.title, { color: currentColors.text }]}>界面设置</Text>
        <Text style={[styles.subtitle, { color: currentColors.textSecondary }]}>
          个性化你的使用体验
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 主题设置 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <PaletteIcon size={20} color={currentColors.text} />
            <Text style={[styles.sectionTitle, { color: currentColors.text }]}>主题外观</Text>
          </View>
          <View style={[styles.sectionContent, { backgroundColor: currentColors.backgroundSecondary }]}>
            <ThemeSelector value={theme} onChange={handleThemeChange} />
          </View>
        </View>

        {/* 语言设置 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <GlobeIcon size={20} color={currentColors.text} />
            <Text style={[styles.sectionTitle, { color: currentColors.text }]}>语言设置</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.languageRow,
              { backgroundColor: currentColors.backgroundSecondary },
            ]}
            onPress={() => setShowLanguageModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.languageLeft}>
              <LanguagesIcon size={20} color={currentColors.text} />
              <Text style={[styles.languageLabel, { color: currentColors.text }]}>
                {languages.find(l => l.value === language)?.label}
              </Text>
            </View>
            <ChevronRightIcon size={20} color={currentColors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* 底部占位 */}
        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* 语言选择 Modal */}
      <Modal
        visible={showLanguageModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: currentColors.border }]}>
              <Text style={[styles.modalTitle, { color: currentColors.text }]}>选择语言</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <CloseIcon size={24} color={currentColors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {languages.map((lang) => (
                <View
                  key={lang.value}
                  style={[
                    styles.languageOption,
                    { backgroundColor: currentColors.backgroundSecondary },
                    language === lang.value && {
                      backgroundColor: currentColors.primary,
                    },
                    lang.disabled && {
                      opacity: 0.5,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                    disabled={lang.disabled}
                    onPress={() => handleLanguageChange(lang.value)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.languageOptionLeft}>
                      <LanguagesIcon size={20} color={language === lang.value ? currentColors.primaryForeground : currentColors.text} />
                      <View>
                        <Text
                          style={[
                            styles.languageOptionLabel,
                            { color: language === lang.value ? currentColors.primaryForeground : currentColors.text },
                          ]}
                        >
                          {lang.label}
                        </Text>
                        {lang.disabled && (
                          <Text style={[styles.comingSoonText, { color: currentColors.textSecondary }]}>
                            暂不支持，正在开发中
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                  {language === lang.value && (
                    <View style={[styles.checkmark, { backgroundColor: currentColors.success }]}>
                      <CheckIcon size={14} color={currentColors.primaryForeground} />
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </ContainerWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderRadius: 12,
    padding: spacing.lg,
    margin: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionContent: {
    borderRadius: 12,
    padding: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flex: 1,
    gap: spacing.xs,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingHint: {
    fontSize: 12,
  },
  languageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 12,
  },
  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  languageLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    borderRadius: 16,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 320,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    paddingVertical: spacing.sm,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    marginBottom: spacing.sm,
  },
  languageOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  languageOptionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  comingSoonText: {
    fontSize: 11,
    marginTop: 2,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default InterfaceSettingsScreen;
