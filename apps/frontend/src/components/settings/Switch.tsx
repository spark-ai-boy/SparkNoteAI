// 开关组件

import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';

interface SwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({ value, onChange, disabled }) => {
  const colors = useWebTheme();

  return (
    <TouchableOpacity
      style={[
        styles.switch,
        { backgroundColor: colors.border },
        value && { backgroundColor: colors.primary },
        disabled && styles.switchDisabled,
      ]}
      onPress={() => !disabled && onChange(!value)}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <View
        style={[
          styles.thumb,
          value && styles.thumbActive,
        ]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    padding: 3,
  },
  switchActive: {
  },
  switchDisabled: {
    opacity: 0.5,
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbActive: {
    marginLeft: 20,
  },
});

export default Switch;
