// 知识图谱页面（手机端）

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { NetworkIcon, SproutIcon, BrainIcon, WorkflowIcon, TagIcon, LayersIcon } from '../../components/icons';
import { useKnowledgeGraphStore } from '../../stores/knowledgeGraphStore';
import { useImportTaskStore } from '../../stores/importTaskStore';
import type { GraphNode } from '../../api/knowledgeGraph';

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

function StatCard({ icon, label, value, colors }: { icon: React.ReactNode; label: string; value: number; colors: ReturnType<typeof useWebTheme> }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
      {icon}
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export const KnowledgeGraphScreen: React.FC = () => {
  const colors = useWebTheme();
  const {
    status,
    graphData,
    isLoadingStatus,
    isLoadingData,
    error,
    fetchStatus,
    fetchData,
    startBuild,
    clearGraph,
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

  const handleClearGraph = () => {
    if (Platform.OS === 'ios') {
      Alert.alert('清空知识图谱', '确定要清空知识图谱吗？此操作不可恢复。', [
        { text: '取消', style: 'cancel' },
        { text: '清空', style: 'destructive', onPress: () => clearGraph() },
      ]);
    } else {
      Alert.alert('清空知识图谱', '确定要清空知识图谱吗？此操作不可恢复。', [
        { text: '取消', style: 'cancel' },
        { text: '确定', onPress: () => clearGraph() },
      ]);
    }
  };

  // 未配置 LLM
  if (needsLLMConfig) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>知识图谱</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>基于大模型自动构建的知识网络</Text>
        </View>
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
      </SafeAreaView>
    );
  }

  // 构建中
  if (isBuilding) {
    const progress = currentBuildTask?.progress || status?.building_progress || 0;
    const message = (currentBuildTask as any)?.progress_message || '正在处理...';

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>知识图谱</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>正在构建中...</Text>
        </View>
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
      </SafeAreaView>
    );
  }

  // 需要构建
  if (needsBuild || needsBuildWithData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>知识图谱</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>基于大模型自动构建的知识网络</Text>
        </View>
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
      </SafeAreaView>
    );
  }

  // 正常显示图谱
  const nodesByType = graphData ? groupNodesByType(graphData.nodes) : {};
  const nodeTypes = Object.keys(nodesByType);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.text }]}>知识图谱</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {status?.node_count || 0} 个概念 · {status?.edge_count || 0} 个关系
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.actionButton, isFullBuildInProgress && styles.actionButtonDisabled]}
            onPress={handleBuildGraph}
          >
            <Text style={[styles.actionButtonText, isFullBuildInProgress && styles.actionButtonTextDisabled]}>
              {isFullBuildInProgress ? '构建中' : (hasData ? '重新构建' : '构建')}
            </Text>
          </Pressable>
          {hasData && (
            <Pressable
              style={styles.actionButton}
              onPress={handleClearGraph}
            >
              <Text style={[styles.actionButtonText, { color: colors.error }]}>清空</Text>
            </Pressable>
          )}
        </View>
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
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
            value={nodeTypes.length}
            colors={colors}
          />
        </View>

        {/* 节点按类型分组 */}
        {nodeTypes.length > 0 && (
          <View style={styles.nodesSection}>
            <Text style={[styles.nodesSectionTitle, { color: colors.textSecondary }]}>概念分类</Text>
            {nodeTypes.map((type) => (
              <View key={type} style={styles.nodeGroup}>
                <View style={styles.nodeGroupHeader}>
                  <Text style={[styles.nodeGroupTitle, { color: colors.text }]}>
                    {typeLabel(type)}（{nodesByType[type].length}）
                  </Text>
                </View>
                <View style={[styles.nodeGroupContent, { backgroundColor: colors.backgroundSecondary }]}>
                  {nodesByType[type].map((node) => (
                    <View key={node.id} style={[styles.nodeItem, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.nodeName, { color: colors.text }]}>{node.name}</Text>
                      {node.description ? (
                        <Text style={[styles.nodeDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                          {node.description}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 无数据时的占位 */}
        {(!hasData || !graphData) && (
          <View style={styles.graphPlaceholder}>
            <NetworkIcon size={48} color={colors.textTertiary} strokeWidth={1.5} />
            <Text style={[styles.placeholderText, { color: colors.text }]}>暂无图谱数据</Text>
            <Text style={[styles.placeholderSubtext, { color: colors.textSecondary }]}>
              点击「构建」开始生成知识图谱
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionButtonTextDisabled: {
  },
  clearButton: {
  },
  emptyState: {
    flex: 1,
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
  scrollContent: {
    paddingBottom: spacing.xl,
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
  nodesSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  nodesSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  nodeGroup: {
    marginBottom: spacing.md,
  },
  nodeGroupHeader: {
    marginBottom: spacing.xs,
  },
  nodeGroupTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  nodeGroupContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  nodeItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  nodeName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  nodeDesc: {
    fontSize: 13,
    lineHeight: 20,
  },
});

export default KnowledgeGraphScreen;
