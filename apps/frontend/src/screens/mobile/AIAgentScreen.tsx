// AI 助手独立页面（手机端 Tab）

import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import AIAssistant from '../web/components/AIAssistant';

export const AIAgentScreen: React.FC = () => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <AIAssistant />
    </SafeAreaView>
  );
};

export default AIAgentScreen;
