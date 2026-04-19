// 设置列表项

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { spacing } from '../../../theme';
import { useWebTheme } from '../../../hooks/useWebTheme';
import { ChevronRightIcon } from '../../../components/icons';

interface SettingsItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  destructive?: boolean;
  onPress?: () => void;
  showChevron?: boolean;
}

export const SettingsItem: React.FC<SettingsItemProps> = ({
  icon,
  title,
  subtitle,
  destructive,
  onPress,
  showChevron = true,
}) => {
  const colors = useWebTheme();
  const textColor = destructive ? colors.error : colors.text;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && { opacity: 0.6 },
      ]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        {icon}
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {showChevron && onPress ? (
        <ChevronRightIcon size={18} color={colors.textTertiary} />
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default SettingsItem;
