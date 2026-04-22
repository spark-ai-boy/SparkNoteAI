// 知识图谱节点详情页（手机端）

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { notesApi, type Note } from '../../api/note';

const NODE_COLORS: Record<string, string> = {
  concept: '#10B981',
  topic: '#8B5CF6',
  entity: '#06B6D4',
  fragment: '#4F46E5',
  tag: '#F59E0B',
};

const TYPE_LABELS: Record<string, string> = {
  concept: '概念',
  topic: '主题',
  entity: '实体',
  fragment: '片段',
  tag: '标签',
};

type GraphNodeDetailNav = NativeStackNavigationProp<{
  NotesHome: undefined;
  NoteDetail: { noteId: number };
  AIAgent: undefined;
  KnowledgeGraph: undefined;
  Settings: undefined;
  Tasks: undefined;
  GraphNodeDetail: { nodeId: number; nodeName: string; nodeType: string; nodeDescription?: string };
}, 'GraphNodeDetail'>;

export const GraphNodeDetailScreen: React.FC = () => {
  const navigation = useNavigation<GraphNodeDetailNav>();
  const route = useRoute<any>();
  const { nodeId, nodeName, nodeType, nodeDescription } = route.params as {
    nodeId: number;
    nodeName: string;
    nodeType: string;
    nodeDescription?: string;
  };
  const colors = useTheme();

  const [relatedNotes, setRelatedNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    fetchRelatedNotes();
  }, [nodeId]);

  const fetchRelatedNotes = async () => {
    // source_note_ids 在 API 中返回为数组
    // 先获取节点数据
    const { knowledgeGraphApi } = await import('../../api/knowledgeGraph');
    try {
      const nodes = await knowledgeGraphApi.getNodes();
      const node = nodes.find((n) => n.id === nodeId);
      const sourceIds = (node as any)?.source_note_ids;
      if (!sourceIds || sourceIds.length === 0) {
        setRelatedNotes([]);
        return;
      }

      setLoadingNotes(true);
      const ids = typeof sourceIds === 'string'
        ? sourceIds.split(',').map((s: string) => parseInt(s.trim())).filter((n: number) => !isNaN(n))
        : sourceIds;

      const notes = await Promise.all(
        ids.map(async (id: number) => {
          try {
            return await notesApi.getNote(id);
          } catch {
            return null;
          }
        })
      );
      setRelatedNotes(notes.filter((n): n is Note => n !== null));
    } catch {
      setRelatedNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const nodeColor = NODE_COLORS[nodeType] || '#666666';
  const typeLabel = TYPE_LABELS[nodeType] || nodeType;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 节点名称 */}
        <Text style={[styles.nodeName, { color: colors.text }]}>{nodeName}</Text>

        {/* 类型标签 */}
        <View style={[styles.badge, { backgroundColor: nodeColor + '20' }]}>
          <View style={[styles.badgeDot, { backgroundColor: nodeColor }]} />
          <Text style={[styles.badgeText, { color: nodeColor }]}>{typeLabel}</Text>
        </View>

        {/* 描述 */}
        {nodeDescription ? (
          <View style={styles.descSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>描述</Text>
            <Text style={[styles.descText, { color: colors.textSecondary }]}>{nodeDescription}</Text>
          </View>
        ) : null}

        {/* 关联笔记 */}
        <View style={styles.notesSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            关联笔记
            {relatedNotes.length > 0 && (
              <Text style={[styles.noteCount, { color: colors.textSecondary }]}>
                {' '}{relatedNotes.length} 篇
              </Text>
            )}
          </Text>

          {loadingNotes ? (
            <View style={styles.loadingNotes}>
              <ActivityIndicator size="small" color={colors.textTertiary} />
            </View>
          ) : relatedNotes.length > 0 ? (
            relatedNotes.map((note) => (
              <Pressable
                key={note.id}
                style={[styles.noteItem, { borderBottomColor: colors.border }]}
                onPress={() => navigation.navigate('NoteDetail', { noteId: note.id })}
              >
                <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={2}>
                  {note.title}
                </Text>
                <Text style={[styles.noteDate, { color: colors.textTertiary }]}>
                  {formatDate(note.created_at)}
                </Text>
              </Pressable>
            ))
          ) : (
            <Text style={[styles.emptyNotes, { color: colors.textTertiary }]}>
              暂无关联笔记
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  nodeName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.md,
    lineHeight: 30,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    marginBottom: spacing.lg,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  descSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  descText: {
    fontSize: 14,
    lineHeight: 22,
  },
  notesSection: {
    marginTop: spacing.sm,
  },
  noteCount: {
    fontSize: 13,
    fontWeight: '400',
  },
  loadingNotes: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  noteItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  noteDate: {
    fontSize: 12,
  },
  emptyNotes: {
    fontSize: 14,
    paddingVertical: spacing.xl,
    textAlign: 'center',
  },
});

export default GraphNodeDetailScreen;
