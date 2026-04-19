// 设置子页面滑入/滑出过渡动画

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

interface SettingsPageTransitionProps {
  children: React.ReactNode;
  onExitComplete?: () => void;
  exiting?: boolean;
}

export const SettingsPageTransition: React.FC<SettingsPageTransitionProps> = ({
  children,
  onExitComplete,
  exiting = false,
}) => {
  const slideAnim = useRef(new Animated.Value(exiting ? 0 : 1)).current;

  useEffect(() => {
    if (exiting) {
      slideAnim.setValue(0);
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onExitComplete?.();
      });
    } else {
      slideAnim.setValue(1);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [exiting]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 300],
  });

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX }] }]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});
