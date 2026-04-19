// 知识图谱页面

console.log('[KnowledgeGraphScreen] 文件已加载!!!');

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, typography } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { NetworkIcon, SproutIcon, BrainIcon, WorkflowIcon } from '../../components/icons';
import KnowledgeGraph from '../web/components/KnowledgeGraph';
import { useKnowledgeGraphStore } from '../../stores/knowledgeGraphStore';
import { useImportTaskStore } from '../../stores/importTaskStore';
import type { Node } from '../web/components/KnowledgeGraph';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const KnowledgeGraphScreen: React.FC = () => {
  const colors = useWebTheme();
  console.log('[KnowledgeGraphScreen] 组件函数开始执行!!!');
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

  // 获取任务列表用于获取构建进度
  const tasks = useImportTaskStore((state) => state.tasks);
  const fetchTasks = useImportTaskStore((state) => state.fetchTasks);

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Dialog states
  const [showBuildConfirm, setShowBuildConfirm] = useState(false);
  const [showBuildInProgressAlert, setShowBuildInProgressAlert] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showLLMConfigHint, setShowLLMConfigHint] = useState(false);
  const [showLLMConfigRequired, setShowLLMConfigRequired] = useState(false);

  // 获取当前构建任务
  const currentBuildTask = tasks.find(
    (t) => t.task_type === 'knowledge_graph_build' &&
    (t.status === 'running' || t.status === 'pending')
  );

  useEffect(() => {
    // 加载图谱状态和数据
    fetchStatus();
    fetchData();
    // 轮询任务列表获取进度
    const pollTasks = setInterval(() => {
      fetchTasks();
    }, 2000);
    return () => clearInterval(pollTasks);
  }, []);

  // 检查是否需要配置 LLM
  const needsLLMConfig = status && !status.has_llm_config;
  const needsBuild = status && !status.graph_exists && status.has_llm_config;
  const isBuilding = status?.is_building;
  const isFullBuildInProgress = status?.is_building && status?.is_full_build;
  const hasData = graphData && graphData.nodes.length > 0;
  const hasLLMConfig = status?.has_llm_config;

  // 有 LLM 配置但图谱数据为空时，也需要显示构建提示
  const needsBuildWithData = status && status.has_llm_config && !hasData && !isBuilding;

  // 调试：打印状态
  useEffect(() => {
    console.log('[KnowledgeGraphScreen] status:', status);
    console.log('[KnowledgeGraphScreen] graphData:', graphData);
    console.log('[KnowledgeGraphScreen] hasLLMConfig:', hasLLMConfig);
    console.log('[KnowledgeGraphScreen] needsLLMConfig:', needsLLMConfig);
    console.log('[KnowledgeGraphScreen] needsBuild:', needsBuild);
    console.log('[KnowledgeGraphScreen] needsBuildWithData:', needsBuildWithData);
    console.log('[KnowledgeGraphScreen] hasData:', hasData);
  }, [status, graphData, hasLLMConfig, needsLLMConfig, needsBuild, needsBuildWithData, hasData]);

  // 加载中状态或 status 未加载完成
  if (isLoadingStatus || !status) {
    console.log('[KnowledgeGraphScreen] 加载中：isLoadingStatus=', isLoadingStatus, 'status=', status);
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>🕸️ 知识图谱</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>加载中...</Text>
        </View>
        <View style={styles.loadingState}>
          <View style={[styles.loadingSpinner, { backgroundColor: colors.primary + '10' }]}>
            <NetworkIcon size={48} color={colors.primary} strokeWidth={1.5} />
          </View>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>正在加载知识图谱状态...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 调试：渲染前打印
  console.log('[KnowledgeGraphScreen] 渲染 - status:', JSON.stringify(status));
  console.log('[KnowledgeGraphScreen] 渲染 - needsLLMConfig:', needsLLMConfig, 'needsBuild:', needsBuild, 'needsBuildWithData:', needsBuildWithData, 'isBuilding:', isBuilding);

  if (needsLLMConfig) {
    console.log('[KnowledgeGraphScreen] 进入 needsLLMConfig 分支');
  } else if (isBuilding) {
    console.log('[KnowledgeGraphScreen] 进入 isBuilding 分支');
  } else if (needsBuild || needsBuildWithData) {
    console.log('[KnowledgeGraphScreen] 进入 needsBuild 分支');
  } else {
    console.log('[KnowledgeGraphScreen] 进入正常渲染分支');
  }

  const handleBuildGraph = () => {
    console.log('[KnowledgeGraphScreen] handleBuildGraph 被点击');
    console.log('[KnowledgeGraphScreen] isFullBuildInProgress:', isFullBuildInProgress);
    console.log('[KnowledgeGraphScreen] hasLLMConfig:', hasLLMConfig);
    console.log('[KnowledgeGraphScreen] hasData:', hasData);
    console.log('[KnowledgeGraphScreen] isLoadingStatus:', isLoadingStatus);
    console.log('[KnowledgeGraphScreen] isLoadingData:', isLoadingData);

    // 检查是否有全量构建正在进行
    if (isFullBuildInProgress) {
      console.log('[KnowledgeGraphScreen] 阻止构建: 全量构建正在进行中');
      setShowBuildInProgressAlert(true);
      return;
    }

    if (!hasLLMConfig) {
      // 需要配置大模型，显示提示
      console.log('[KnowledgeGraphScreen] 阻止构建: 未配置LLM');
      setShowLLMConfigRequired(true);
      return;
    }

    console.log('[KnowledgeGraphScreen] 显示构建确认对话框');
    setShowBuildConfirm(true);
  };

  const handleClearGraph = () => {
    setShowClearConfirm(true);
  };

  const handleNodeClick = (node: Node) => {
    setSelectedNode(node);
  };

  const handleNodeSelect = (node: Node | null) => {
    setSelectedNode(node);
  };

  // 渲染未配置 LLM 的提示
  if (needsLLMConfig) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>🕸️ 知识图谱</Text>
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
          <TouchableOpacity
            style={[styles.configButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowLLMConfigHint(true)}
          >
            <Text style={[styles.configButtonText, { color: colors.primaryForeground }]}>去配置大模型</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 渲染构建中状态
  if (isBuilding) {
    const progress = currentBuildTask?.progress || status?.building_progress || 0;
    const message = currentBuildTask?.progress_message || '正在处理...';

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>🕸️ 知识图谱</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>正在构建中...</Text>
        </View>
        <View style={styles.buildingState}>
          {/* 中心图标 */}
          <View style={[styles.buildingIconContainer, { backgroundColor: colors.primary + '10' }]}>
            <NetworkIcon size={80} color={colors.primary} strokeWidth={1} />
          </View>

          {/* 标题 */}
          <Text style={[styles.buildingTitle, { color: colors.text }]}>正在构建知识图谱</Text>

          {/* 进度百分比 */}
          <Text style={[styles.buildingProgress, { color: colors.primary }]}>{progress}%</Text>

          {/* 进度条 */}
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

          {/* 进度消息 */}
          <Text style={[styles.buildingMessage, { color: colors.textSecondary }]}>{message}</Text>

          {/* 提示信息 */}
          <Text style={[styles.buildingHint, { color: colors.textSecondary }]}>
            构建完成后将自动显示图谱，您可以稍后查看
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // 渲染需要构建的提示（包括 graph_exists=false 或有 LLM 配置但数据为空）
  if (needsBuild || needsBuildWithData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>🕸️ 知识图谱</Text>
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
          <TouchableOpacity
            style={[styles.buildButton, { backgroundColor: colors.primary }]}
            onPress={handleBuildGraph}
          >
            <Text style={[styles.buildButtonText, { color: colors.primaryForeground }]}>开始构建</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 正常渲染图谱界面
  return (
    <>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>🕸️ 知识图谱</Text>
          <Text style={styles.subtitle}>
            {status?.node_count || 0} 个概念 · {status?.edge_count || 0} 个关系
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionButton, isFullBuildInProgress && styles.actionButtonDisabled]}
            onPress={handleBuildGraph}
            disabled={isLoadingStatus || isLoadingData || isFullBuildInProgress}
          >
            <Text style={[styles.actionButtonText, isFullBuildInProgress && styles.actionButtonTextDisabled]}>
              {isFullBuildInProgress ? '⏳ 构建中' : (hasData ? '🔄 重新构建' : '🔨 构建')}
            </Text>
          </TouchableOpacity>
          {hasData && (
            <TouchableOpacity
              style={[styles.actionButton, styles.clearButton]}
              onPress={handleClearGraph}
              disabled={isLoadingStatus || isLoadingData}
            >
              <Text style={styles.clearButtonText}>🗑️ 清空</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 构建进度提示条 */}
      {isBuilding && (
        <View style={styles.buildingBanner}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.buildingBannerText}>
            正在构建：{buildProgress?.message || '请稍候...'}
          </Text>
          <Text style={styles.buildingBannerProgress}>
            {status?.building_progress || 0}%
          </Text>
        </View>
      )}

      {/* 错误提示条 */}
      {error && !isBuilding && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerIcon}>⚠️</Text>
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={() => useKnowledgeGraphStore.getState().error = null}>
            <Text style={styles.errorBannerClose}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 知识图谱可视化 */}
      <View style={styles.graphContainer}>
        <KnowledgeGraph
          selectedNode={selectedNode}
          onNodeClick={handleNodeClick}
          onNodeSelect={handleNodeSelect}
          initialData={graphData}
          isLoading={isLoadingData}
          onRebuild={handleBuildGraph}
        />
      </View>

      {/* 右侧节点详情面板 */}
      {selectedNode && (
        <View style={styles.detailPanel}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>{selectedNode.label}</Text>
            <TouchableOpacity onPress={() => setSelectedNode(null)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.detailContent}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>类型：</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNode.type}</Text>
            </View>
            {selectedNode.description && (
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>描述</Text>
                <Text style={[styles.detailDescription, { color: colors.text }]}>
                  {selectedNode.description}
                </Text>
              </View>
            )}
            {selectedNode.source_note_ids && selectedNode.source_note_ids.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>来源笔记</Text>
                <Text style={[styles.detailDescription, { color: colors.text }]}>
                  笔记 ID: {selectedNode.source_note_ids.join(', ')}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>

    {/* 构建进行中提示对话框 */}
    <ConfirmDialog
      visible={showBuildInProgressAlert}
      title="构建进行中"
      message="已有全量构建任务正在进行中，请等待完成后再试"
      confirmText="知道了"
      cancelText=""
      onConfirm={() => setShowBuildInProgressAlert(false)}
      onCancel={() => setShowBuildInProgressAlert(false)}
    />

    {/* 构建知识图谱确认对话框 */}
    <ConfirmDialog
      visible={showBuildConfirm}
      title="构建知识图谱"
      message={hasData
        ? '确定要重新构建知识图谱吗？这将清空现有的图谱数据。'
        : '确定要开始构建知识图谱吗？这可能需要几分钟时间。'}
      confirmText="确定"
      cancelText="取消"
      isDestructive={hasData}
      onConfirm={() => {
        console.log('[KnowledgeGraphScreen] 确认构建知识图谱, hasData:', hasData);
        setShowBuildConfirm(false);
        startBuild(hasData);
      }}
      onCancel={() => setShowBuildConfirm(false)}
    />

    {/* 清空知识图谱确认对话框 */}
    <ConfirmDialog
      visible={showClearConfirm}
      title="清空知识图谱"
      message="确定要清空知识图谱吗？此操作不可恢复。"
      confirmText="确定"
      cancelText="取消"
      isDestructive
      onConfirm={() => {
        setShowClearConfirm(false);
        clearGraph();
      }}
      onCancel={() => setShowClearConfirm(false)}
    />

    {/* LLM 配置提示对话框 */}
    <ConfirmDialog
      visible={showLLMConfigHint}
      title="提示"
      message="请前往设置页面配置大模型"
      confirmText="好的"
      cancelText=""
      onConfirm={() => setShowLLMConfigHint(false)}
      onCancel={() => setShowLLMConfigHint(false)}
    />

    {/* LLM 配置必需提示对话框 */}
    <ConfirmDialog
      visible={showLLMConfigRequired}
      title="需要配置大模型"
      message="请先在设置中配置大模型 API Key 才能构建知识图谱"
      confirmText="去配置"
      cancelText="取消"
      onConfirm={() => {
        setShowLLMConfigRequired(false);
        // TODO: Navigate to settings page if needed
      }}
      onCancel={() => setShowLLMConfigRequired(false)}
    />
  </>
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
    ...typography.h2,
    marginBottom: 2,
  },
  subtitle: {
    ...typography.body,
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
  clearButtonText: {
    fontSize: 13,
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
  buildingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  buildingBannerText: {
    flex: 1,
    fontSize: 13,
    marginLeft: spacing.sm,
  },
  buildingBannerProgress: {
    fontSize: 13,
    fontWeight: '600',
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
  graphContainer: {
    flex: 1,
    position: 'relative',
  },
  detailPanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 320,
    borderLeftWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    fontSize: 20,
    width: 32,
    height: 32,
    textAlign: 'center',
    lineHeight: 32,
  },
  detailContent: {
    padding: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    width: 50,
  },
  detailValue: {
    fontSize: 13,
    flex: 1,
    textTransform: 'capitalize',
  },
  detailSection: {
    marginBottom: spacing.md,
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  detailDescription: {
    fontSize: 13,
    lineHeight: 20,
  },
});

export default KnowledgeGraphScreen;
