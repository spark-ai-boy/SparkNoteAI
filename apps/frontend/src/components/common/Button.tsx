// 按钮组件

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native';
import { colors } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  loading = false,
  fullWidth = false,
  style,
  disabled,
  ...props
}) => {
  const colors = useWebTheme();

  const buttonStyles = [
    styles.button,
    styles[variant],
    { backgroundColor: variant === 'primary' ? colors.primary : (variant === 'secondary' ? colors.secondary : 'transparent') },
    { borderColor: colors.border },
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    { color: variant === 'primary' ? colors.background : colors.text },
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.background : colors.primary}
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    elevation: 2,
  },
  primary: {
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  },
  secondary: {
  },
  outline: {
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 15,
    fontWeight: '500',
  },
  primaryText: {
  },
  secondaryText: {
  },
  outlineText: {
  },
});

export default Button;
