// 知识图谱页面（手机端）

import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { NetworkIcon, SproutIcon, BrainIcon, WorkflowIcon, TagIcon, LayersIcon } from '../../components/icons';
import { useKnowledgeGraphStore } from '../../stores/knowledgeGraphStore';
import { useImportTaskStore } from '../../stores/importTaskStore';
import type { GraphNode } from '../../api/knowledgeGraph';
import { MobileKnowledgeGraphView } from './components/MobileKnowledgeGraphView';

type KnowledgeGraphNavParamList = {
  NotesHome: undefined;
  NoteDetail: { noteId: number };
  AIAgent: undefined;
  KnowledgeGraph: undefined;
  Settings: undefined;
  Tasks: undefined;
  GraphNodeDetail: { nodeId: number; nodeName: string; nodeType: string; nodeDescription?: string };
};

type KnowledgeGraphNavProp = NativeStackNavigationProp<KnowledgeGraphNavParamList, 'KnowledgeGraph'>;

type SettingsSubPage = null; // 预留

const TYPE_LABELS: Record<string, string> = {
  concept: '概念',
  topic: '主题',
  entity: '实体',
};

function typeLabel(type: string) {
  return TYPE_LABELS[type] || type;
}

function groupNodesByType(nodes: GraphNode[]): Record<string, GraphNode[]> {
  const groups: Record<string, GraphNode[]> = {};
  nodes.forEach((node) => {
    const type = node.node_type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(node);
  });
  return groups;
}

const NODE_COLORS: Record<string, string> = {
  concept: '#10B981',
  topic: '#8B5CF6',
  entity: '#06B6D4',
  fragment: '#4F46E5',
  tag: '#F59E0B',
};

function getNodeColor(type: string): string {
  return NODE_COLORS[type] || '#666666';
}

function StatCard({ icon, label, value, colors }: { icon: React.ReactNode; label: string; value: number; colors: ReturnType<typeof useTheme> }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
      {icon}
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export const KnowledgeGraphScreen: React.FC = () => {
  const navigation = useNavigation<KnowledgeGraphNavProp>();
  const colors = useTheme();
  const {
    status,
    graphData,
    isLoadingStatus,
    isLoadingData,
    error,
    fetchStatus,
    fetchData,
    startBuild,
  } = useKnowledgeGraphStore();

  const tasks = useImportTaskStore((state) => state.tasks);
  const fetchTasks = useImportTaskStore((state) => state.fetchTasks);

  const [showBuildInProgressAlert, setShowBuildInProgressAlert] = useState(false);
  const [showLLMConfigRequired, setShowLLMConfigRequired] = useState(false);

  const currentBuildTask = tasks.find(
    (t) => t.task_type === 'knowledge_graph_build' &&
    (t.status === 'running' || t.status === 'pending')
  );

  useEffect(() => {
    fetchStatus();
    fetchData();
    const pollTasks = setInterval(() => {
      fetchTasks();
    }, 2000);
    return () => clearInterval(pollTasks);
  }, []);

  useEffect(() => {
    if (showBuildInProgressAlert) {
      Alert.alert('构建进行中', '已有全量构建任务正在进行中，请等待完成后再试', [
        { text: '知道了', onPress: () => setShowBuildInProgressAlert(false) },
      ]);
    }
  }, [showBuildInProgressAlert]);

  useEffect(() => {
    if (showLLMConfigRequired) {
      Alert.alert('需要配置大模型', '请先在设置中配置大模型 API Key 才能构建知识图谱', [
        { text: '取消', style: 'cancel', onPress: () => setShowLLMConfigRequired(false) },
      ]);
    }
  }, [showLLMConfigRequired]);

  const needsLLMConfig = status && !status.has_llm_config;
  const needsBuild = status && !status.graph_exists && status.has_llm_config;
  const isBuilding = status?.is_building;
  const isFullBuildInProgress = status?.is_building && status?.is_full_build;
  const hasData = graphData && graphData.nodes.length > 0;
  const hasLLMConfig = status?.has_llm_config;
  const needsBuildWithData = status && status.has_llm_config && !hasData && !isBuilding;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          style={{ paddingHorizontal: 8, paddingVertical: 4, opacity: isFullBuildInProgress ? 0.5 : 1 }}
          onPress={handleBuildGraph}
          disabled={isFullBuildInProgress}
        >
          <Text style={{ fontSize: 17, fontWeight: '400', color: colors.primary }}>
            {isFullBuildInProgress ? '构建中' : (hasData ? '重新构建' : '构建')}
          </Text>
        </Pressable>
      ),
    });
  }, [navigation, colors.primary, isFullBuildInProgress, hasData]);

  const handleBuildGraph = () => {
    if (isFullBuildInProgress) {
      setShowBuildInProgressAlert(true);
      return;
    }
    if (!hasLLMConfig) {
      setShowLLMConfigRequired(true);
      return;
    }
    const title = hasData ? '重新构建知识图谱' : '构建知识图谱';
    const message = hasData
      ? '确定要重新构建知识图谱吗？这将清空现有的图谱数据。'
      : '确定要开始构建知识图谱吗？这可能需要几分钟时间。';
    if (Platform.OS === 'ios') {
      Alert.alert(title, message, [
        { text: '取消', style: 'cancel' },
        { text: '确定', style: hasData ? 'destructive' : 'default', onPress: () => startBuild(!!hasData) },
      ]);
    } else {
      Alert.alert(title, message, [
        { text: '取消', style: 'cancel' },
        { text: '确定', onPress: () => startBuild(!!hasData) },
      ]);
    }
  };

  // 未配置 LLM
  if (needsLLMConfig) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <BrainIcon size={64} color={colors.textSecondary} strokeWidth={1.5} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>需要配置大模型</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            知识图谱功能需要使用大模型来提取概念和发现关系。{'\n'}
            请先在设置中配置大模型 API Key。
          </Text>
          <Pressable
            style={[styles.configButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowLLMConfigRequired(true)}
          >
            <Text style={[styles.configButtonText, { color: colors.primaryForeground }]}>去配置大模型</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // 构建中
  if (isBuilding) {
    const progress = currentBuildTask?.progress || status?.building_progress || 0;
    const message = (currentBuildTask as any)?.progress_message || '正在处理...';

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.buildingState}>
          <View style={[styles.buildingIconContainer, { backgroundColor: colors.primary + '10' }]}>
            <NetworkIcon size={80} color={colors.primary} strokeWidth={1} />
          </View>
          <Text style={[styles.buildingTitle, { color: colors.text }]}>正在构建知识图谱</Text>
          <Text style={[styles.buildingProgress, { color: colors.primary }]}>{progress}%</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.backgroundSecondary }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress}%`, backgroundColor: colors.primary },
                ]}
              />
            </View>
          </View>
          <Text style={[styles.buildingMessage, { color: colors.textSecondary }]}>{message}</Text>
          <Text style={[styles.buildingHint, { color: colors.textSecondary }]}>
            构建完成后将自动显示图谱，您可以稍后查看
          </Text>
        </View>
      </View>
    );
  }

  // 需要构建
  if (needsBuild || needsBuildWithData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <SproutIcon size={64} color={colors.textSecondary} strokeWidth={1.5} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>开始构建知识图谱</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            检测到您已有笔记，但尚未构建知识图谱。{'\n'}
            点击按钮开始构建，系统将自动：
          </Text>
          <View style={[styles.stepsContainer, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={styles.stepRow}>
              <View style={[styles.stepIcon, { backgroundColor: colors.background }]}><SproutIcon size={16} color={colors.primary} /></View>
              <Text style={[styles.step, { color: colors.text }]}>从笔记中提取核心概念</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepIcon}><NetworkIcon size={16} color={colors.primary} /></View>
              <Text style={styles.step}>分析概念间的关系</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepIcon}><WorkflowIcon size={16} color={colors.primary} /></View>
              <Text style={styles.step}>生成可视化知识网络</Text>
            </View>
          </View>
          <Pressable
            style={[styles.buildButton, { backgroundColor: colors.primary }]}
            onPress={handleBuildGraph}
          >
            <Text style={[styles.buildButtonText, { color: colors.primaryForeground }]}>开始构建</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // 正常显示图谱
  const edges = graphData?.edges || [];
  const nodesByType = graphData ? groupNodesByType(graphData.nodes) : {};

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 状态信息 */}
      <View style={styles.statusBar}>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          {status?.node_count || 0} 个概念 · {status?.edge_count || 0} 个关系
        </Text>
      </View>

      {/* 错误提示 */}
      {error && !isBuilding && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerIcon}>⚠️</Text>
          <Text style={styles.errorBannerText}>{error}</Text>
          <Pressable onPress={() => { useKnowledgeGraphStore.getState().error = null; }}>
            <Text style={styles.errorBannerClose}>✕</Text>
          </Pressable>
        </View>
      )}

      {/* 图谱可视化 */}
      {graphData && graphData.nodes.length > 0 ? (
        <View style={styles.graphContainer}>
          {/* 统计卡片 */}
          <View style={styles.statsRow}>
            <StatCard
              icon={<TagIcon size={20} color={colors.primary} />}
              label="概念"
              value={status?.node_count || 0}
              colors={colors}
            />
            <StatCard
              icon={<NetworkIcon size={20} color={colors.success} />}
              label="关系"
              value={status?.edge_count || 0}
              colors={colors}
            />
            <StatCard
              icon={<LayersIcon size={20} color={colors.warning} />}
              label="类型"
              value={Object.keys(nodesByType).length}
              colors={colors}
            />
          </View>

          {/* WebView 力导向图 */}
          <View style={styles.graphView}>
            <MobileKnowledgeGraphView
              nodes={graphData.nodes}
              edges={edges}
              onNodeClick={(node) => {
                navigation.navigate('GraphNodeDetail', {
                  nodeId: node.id,
                  nodeName: node.name,
                  nodeType: (node as any).node_type ?? (node as any).type ?? '',
                  nodeDescription: node.description,
                });
              }}
            />
          </View>
        </View>
      ) : (
        <View style={styles.graphPlaceholder}>
          <NetworkIcon size={48} color={colors.textTertiary} strokeWidth={1.5} />
          <Text style={[styles.placeholderText, { color: colors.text }]}>暂无图谱数据</Text>
          <Text style={[styles.placeholderSubtext, { color: colors.textSecondary }]}>
            点击「构建」开始生成知识图谱
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  statusText: {
    fontSize: 13,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  stepsContainer: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stepIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  step: {
    fontSize: 14,
    flex: 1,
  },
  configButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  configButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
  },
  buildButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  buildButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buildingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  buildingIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  buildingTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  buildingProgress: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  progressBarContainer: {
    width: '100%',
    maxWidth: 300,
    marginBottom: spacing.lg,
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  buildingMessage: {
    fontSize: 14,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  buildingHint: {
    fontSize: 13,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  errorBannerIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
  },
  errorBannerClose: {
    fontSize: 18,
    padding: spacing.xs,
  },
  graphPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  placeholderSubtext: {
    fontSize: 14,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  graphContainer: {
    flex: 1,
  },
  graphView: {
    flex: 1,
  },
});

export default KnowledgeGraphScreen;
