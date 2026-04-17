// 知识图谱可视化组件 - 基于 react-force-graph-2d
// 仅支持 Web 端

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Platform, TouchableOpacity } from 'react-native';
import { spacing } from '../theme';
import { useWebTheme } from '../hooks/useWebTheme';
import { knowledgeGraphApi, type GraphNode as ApiGraphNode, type GraphEdge as ApiGraphEdge } from '../api/knowledgeGraph';

// 平台 Web 端专用
import ForceGraph2D from 'react-force-graph-2d';
// 图例图标 (Web 端使用 lucide-react 图标)
import { Lightbulb, Layers, Users, Tag, FileText } from 'lucide-react';

export interface Node {
  id: string | number;
  label: string;
  type: 'concept' | 'topic' | 'entity' | 'fragment' | 'tag';
  group?: string;
  description?: string;
  source_note_ids?: string[];
}

interface Link {
  source: string | number;
  target: string | number;
  type?: string;
  description?: string;
  strength?: number;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface KnowledgeGraphProps {
  onNodeClick?: (node: Node) => void;
  onNodeSelect?: (node: Node | null) => void;
  selectedNode?: Node | null;
  initialData?: GraphData | { nodes: any[]; edges: any[] } | null;
  isLoading?: boolean;
  onRebuild?: () => void;
}

// 节点类型配置
const ICON_SIZE = 16;
export const NODE_TYPE_CONFIG: Record<string, { icon: React.FC<{ size?: number; color?: string }>; label: string; color: string }> = {
  fragment: { icon: FileText, label: '知识片段', color: '#4F46E5' },
  concept: { icon: Lightbulb, label: '核心概念', color: '#10B981' },
  entity: { icon: Users, label: '实体概念', color: '#10B981' },
  topic: { icon: Layers, label: '主题', color: '#8B5CF6' },
  tag: { icon: Tag, label: '标签分类', color: '#F59E0B' },
};

// 将后端 API 数据转换为组件数据格式
const convertApiData = (apiNodes: ApiGraphNode[], apiEdges: ApiGraphEdge[]): GraphData => {
  const nodes: Node[] = apiNodes.map(node => {
    const nodeType = (node as any).type ?? (node as any).node_type;
    const converted = {
      id: node.id,
      label: node.name,
      type: nodeType as any,
      description: node.description,
      source_note_ids: node.source_note_ids,
    };
    return converted;
  });

  const links: Link[] = apiEdges.map(edge => {
    // 后端返回的字段可能是 source/target 或 source_node_id/target_node_id
    const source = (edge as any).source ?? (edge as any).source_node_id;
    const target = (edge as any).target ?? (edge as any).target_node_id;
    return {
      source,
      target,
      type: (edge as any).edge_type ?? (edge as any).type,
      description: edge.description,
      strength: edge.strength,
    };
  }).filter(link => link.source != null && link.target != null); // 过滤掉无效的边

  return { nodes, links };
};

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  onNodeClick,
  onNodeSelect,
  selectedNode,
  initialData,
  isLoading,
  onRebuild,
}) => {
  const colors = useWebTheme();
  const fgRef = useRef<any>(null);
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 高亮与选中节点相关的节点和边
  const highlightedNodeId = selectedNode?.id;

  useEffect(() => {
    // 如果有初始数据，需要转换格式（后端返回 edges，需要转换为 links）
    if (initialData) {
      const data = initialData as any;
      const convertedData = convertApiData(
        data.nodes ?? [],
        data.edges ?? data.links ?? []
      );
      setData(convertedData);
    }
  }, [initialData]);

  useEffect(() => {
    // 更新容器尺寸
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleNodeClick = (node: any) => {
    const nodeData: Node = {
      id: node.id,
      label: node.label || node.name,
      type: node.type,
      group: node.group,
      description: node.description,
      source_note_ids: node.source_note_ids,
    };
    onNodeClick?.(nodeData);
    onNodeSelect?.(nodeData);
  };

  const handleBackgroundClick = () => {
    onNodeSelect?.(null);
  };

  // 处理列表项点击
  const handleListItemClick = (node: Node) => {
    handleNodeClick(node);
  };

  // 节点类型颜色配置
  const getNodeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      fragment: '#4F46E5',
      concept: '#10B981',
      entity: '#10B981',
      topic: '#8B5CF6',
      tag: '#F59E0B',
    };
    return colorMap[type] || '#666666';
  };

  // 加载状态
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>正在加载知识图谱...</Text>
        </View>
      </View>
    );
  }

  // 非 Web 平台显示提示
  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.notSupportedContainer}>
          <Text style={styles.notSupportedIcon}>🕸️</Text>
          <Text style={styles.notSupportedTitle}>知识图谱</Text>
          <Text style={styles.notSupportedText}>请在 Web 浏览器中查看知识图谱可视化</Text>
          {onRebuild && (
            <TouchableOpacity style={[styles.rebuildButton, { backgroundColor: colors.primary }]} onPress={onRebuild}>
              <Text style={[styles.rebuildButtonText, { color: colors.primaryForeground }]}>重新构建图谱</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Web 端 - 使用 ForceGraph
  return (
    <View style={styles.container} ref={containerRef as any}>
      {console.log('[KnowledgeGraph] data.nodes.length:', data.nodes.length, 'onRebuild:', onRebuild)}
      {data.nodes.length > 0 && (
        <>
          <ForceGraph2D
            ref={fgRef}
            graphData={data}
            // 悬浮提示显示完整标签和描述
            nodeLabel={(node: any) => {
              const typeLabels: Record<string, string> = {
                fragment: '知识片段',
                concept: '核心概念',
                entity: '实体概念',
                topic: '主题',
                tag: '标签分类',
              };
              return `${node.label}\n类型：${typeLabels[node.type] || node.type}\n\n${node.description || ''}`;
            }}
            nodeColor={(node: any) => {
              const colorMap: Record<string, string> = {
                fragment: '#4F46E5',
                concept: '#10B981',
                entity: '#10B981',
                topic: '#8B5CF6',
                tag: '#F59E0B',
              };
              // 高亮选中的节点
              if (highlightedNodeId && node.id !== highlightedNodeId) {
                return colors.border;
              }
              return colorMap[node.type] || '#666666';
            }}
            // 节点大小
            nodeRelSize={6}
            // 节点画布对象 - 绘制带颜色的节点和文字标签
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const label = node.label || '';
              const type = node.type || node.node_type || '';
              const nodeColor = getNodeColor(type);
              const isHighlighted = highlightedNodeId && node.id !== highlightedNodeId;
              const radius = 6;

              // 绘制节点圆点
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
              ctx.fillStyle = isHighlighted ? colors.border : nodeColor;
              ctx.fill();

              // 节点边框
              ctx.strokeStyle = colors.background;
              ctx.lineWidth = 2;
              ctx.stroke();

              // 绘制文字标签
              if (label) {
                ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                const textWidth = ctx.measureText(label).width;
                const padding = 4;
                const bgX = node.x - textWidth / 2 - padding;
                const bgY = node.y + radius + 4;
                const bgW = textWidth + padding * 2;
                const bgH = 18;
                // 文字背景
                ctx.fillStyle = colors.background + 'D0';
                ctx.beginPath();
                ctx.roundRect(bgX, bgY, bgW, bgH, 4);
                ctx.fill();
                // 文字
                ctx.fillStyle = isHighlighted ? colors.border : colors.text;
                ctx.fillText(label, node.x, bgY + 2);
              }
            }}
            nodeCanvasObjectMode={() => 'replace'}
            linkColor={(link: any) => {
              // 高亮与选中节点相关的边
              if (highlightedNodeId) {
                if (link.source.id === highlightedNodeId || link.target.id === highlightedNodeId) {
                  return colors.primary;
                }
                return colors.border;
              }
              return colors.textSecondary;
            }}
            linkWidth={(link: any) => {
              if (highlightedNodeId) {
                if (link.source.id === highlightedNodeId || link.target.id === highlightedNodeId) {
                  return 3;
                }
                return 1;
              }
              return 2;
            }}
            linkDirectionalArrowLength={8}
            linkDirectionalArrowRelPos={1}
            onNodeClick={handleNodeClick}
            onBackgroundClick={handleBackgroundClick}
            onNodeDragEnd={(node: any) => {
              node.fx = node.x;
              node.fy = node.y;
            }}
            // 增加节点间距离的配置
            cooldownTicks={150}
            warmupTicks={100}
            d3AlphaDecay={0.015}
            d3VelocityDecay={0.4}
            // 添加额外的排斥力，让节点分布更开
            onEngineInit={() => {
              if (fgRef.current) {
                const graph = fgRef.current;
                // 增加电荷强度（负值越大，排斥力越强）
                graph.d3Force('charge').strength(-500);
                // 增加链接距离
                graph.d3Force('link').distance(200);
              }
            }}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor={colors.background}
          />
          {/* 右上角：图例 + 节点列表 */}
          <div style={{
            position: 'absolute',
            top: 10,
            right: 10,
            backgroundColor: colors.background,
            borderRadius: 8,
            padding: 10,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            pointerEvents: 'auto',
            maxHeight: '80%',
            overflowY: 'auto',
            minWidth: 180,
          }}>
            {/* 图例 */}
            <div style={{
              fontSize: 12,
              fontWeight: '600',
              color: colors.text,
              marginBottom: 8,
              paddingBottom: 6,
              borderBottom: `1px solid ${colors.border}`,
            }}>
              图例
            </div>
            <div style={{ marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${colors.border}` }}>
              {Object.entries(NODE_TYPE_CONFIG).map(([key, config]) => {
                const IconComponent = config.icon;
                return (
                  <div key={key} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '3px 0',
                    gap: 8,
                  }}>
                    <IconComponent size={ICON_SIZE} color={config.color} />
                    <span style={{ fontSize: 11, color: colors.textSecondary }}>
                      {config.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* 节点列表 */}
            <div style={{
              fontSize: 12,
              fontWeight: '600',
              color: colors.text,
              marginBottom: 8,
              paddingBottom: 6,
              borderBottom: `1px solid ${colors.border}`,
            }}>
              节点列表 ({data.nodes.length})
            </div>
            {data.nodes.map((node) => {
              const isSelected = highlightedNodeId === node.id;
              const nodeColor = getNodeColor(node.type);
              return (
                <div
                  key={`list-${node.id}`}
                  onClick={() => handleListItemClick(node)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px 8px',
                    marginBottom: 4,
                    borderRadius: 6,
                    cursor: 'pointer',
                    backgroundColor: isSelected ? colors.primaryLight : 'transparent',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = colors.hover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {/* 节点颜色圆点 */}
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: nodeColor,
                    marginRight: 8,
                    flexShrink: 0,
                  }} />
                  {/* 节点标题 */}
                  <span style={{
                    fontSize: 12,
                    color: isSelected ? colors.primary : colors.text,
                    fontWeight: isSelected ? '600' : '400',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {node.label}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
      {data.nodes.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🕸️</Text>
          <Text style={styles.emptyTitle}>暂无知识图谱数据</Text>
          <Text style={styles.emptyText}>
            {onRebuild
              ? '点击右上角按钮开始构建知识图谱'
              : '请先配置大模型 API Key 并构建知识图谱'
            }
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
  notSupportedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  notSupportedIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  notSupportedTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  notSupportedText: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  rebuildButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  rebuildButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default KnowledgeGraph;
