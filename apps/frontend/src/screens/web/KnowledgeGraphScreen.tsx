// 知识图谱页面（Web 端）

import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import KnowledgeGraph from './components/KnowledgeGraph';

export const KnowledgeGraphScreen: React.FC = () => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KnowledgeGraph />
    </SafeAreaView>
  );
};

export default KnowledgeGraphScreen;
