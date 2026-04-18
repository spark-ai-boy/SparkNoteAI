// Web 端三栏布局

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Text, FlatList, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import Sidebar from './Sidebar';
import ContentList from './ContentList';
import ContentDetail from './ContentDetail';
import AIAssistant from './AIAssistant';
import KnowledgeGraph, { type Node } from '../KnowledgeGraph';
import NoteEditor from '../NoteEditor';
import SettingsView from './SettingsView';
import SettingsDetailView from './SettingsDetailView';
import { ConfirmDialog } from './ConfirmDialog';
import { HammerIcon, BotIcon, SproutIcon, BrainIcon, WorkflowIcon, NetworkIcon, DownloadIcon, LinkIcon, FileIcon, FileTextIcon, MessageSquareIcon, MonitorIcon, PlayCircleIcon, InfoIcon, PlugIcon, SmartphoneIcon, BookIcon, GlobeIcon, LightbulbIcon, LayersIcon, UsersIcon, TagIcon } from '../icons';
import { spacing, typography } from '../../theme';
import { useWebTheme } from '../../hooks/useWebTheme';
import { useServerConfigStore } from '../../stores/serverConfigStore';
import { Fragment, MOCK_FRAGMENTS, fragmentService } from '../../mock';
import { useImportTaskStore, TaskStatus, TaskType } from '../../stores/importTaskStore';
import { useNoteStore } from '../../stores/noteStore';
import { useAuthStore } from '../../stores/authStore';
import { useKnowledgeGraphStore } from '../../stores/knowledgeGraphStore';
import { Note as NoteType } from '../../api/note';

// 转换图片 URL 函数，保持相对路径（生产环境同源）
const transformImageUrl = (src: string, _baseUrl?: string): string => {
  return src;
};

// 知识图谱链接类型
interface GraphLink {
  source: string;
  target: string;
  type?: string;
}

// 获取图谱连接关系（与 KnowledgeGraph 中的 mock 数据一致）
const getGraphLinks = (): GraphLink[] => {
  return [
    { source: '1', target: '5', type: 'belongs_to' },
    { source: '2', target: '5', type: 'belongs_to' },
    { source: '3', target: '5', type: 'belongs_to' },
    { source: '1', target: '11', type: 'contains' },
    { source: '1', target: '12', type: 'contains' },
    { source: '1', target: '13', type: 'contains' },
    { source: '2', target: '14', type: 'contains' },
    { source: '3', target: '4', type: 'uses' },
    { source: '4', target: '6', type: 'related_to' },
    { source: '7', target: '6', type: 'implements' },
    { source: '8', target: '6', type: 'implements' },
    { source: '1', target: '9', type: 'related_to' },
    { source: '10', target: '13', type: 'uses' },
    { source: '10', target: '4', type: 'related_to' },
    { source: '7', target: '2', type: 'uses' },
    { source: '9', target: '2', type: 'uses' },
    { source: '11', target: '12', type: 'related_to' },
    { source: '13', target: '12', type: 'related_to' },
  ];
};

// 平台选项（暂未使用）
const PLATFORMS = [
  { key: 'wechat', name: '微信公众号' },
  { key: 'xiaohongshu', name: '小红书' },
  { key: 'bilibili', name: 'B 站' },
  { key: 'youtube', name: 'YouTube' },
  { key: 'web', name: '网页' },
  { key: 'other', name: '其他' },
];

export const ThreeColumnLayout: React.FC = () => {
  const colors = useWebTheme();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedFragment, setSelectedFragment] = useState<Fragment | undefined>(undefined);
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [filteredFragments, setFilteredFragments] = useState<Fragment[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  // 存储原始笔记数量，不受标签筛选影响
  const [originalCounts, setOriginalCounts] = useState({ note: 0, import: 0, all: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [rightPanelView, setRightPanelView] = useState<'detail' | 'import'>('detail');
  const [selectedGraphNode, setSelectedGraphNode] = useState<Node | null>(null);
  const [showNoteDetailPanel, setShowNoteDetailPanel] = useState(false); // 控制笔记详情侧滑面板

  // Dialog states
  const [showBuildGraphConfirm, setShowBuildGraphConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteTagConfirm, setShowDeleteTagConfirm] = useState(false);
  const [pendingDeleteTag, setPendingDeleteTag] = useState<{ id: number; name: string } | null>(null);

  // 知识图谱状态管理
  const { status, graphData, fetchStatus, fetchData, startBuild, error: kgError } = useKnowledgeGraphStore();

  // 加载知识图谱状态和数据
  useEffect(() => {
    if (activeTab === 'graph') {
      fetchStatus();
      fetchData();
    }
  }, [activeTab]);

  // 处理构建知识图谱
  const handleBuildGraph = () => {
    console.log('[ThreeColumnLayout] handleBuildGraph called');
    const hasData = graphData && graphData.nodes.length > 0;
    console.log('[ThreeColumnLayout] hasData:', hasData);
    setShowBuildGraphConfirm(true);
  };

  const [selectedFragmentId, setSelectedFragmentId] = useState<string | null>(null);

  // 设置相关状态
  const [selectedSettingsCategory, setSelectedSettingsCategory] = useState<string>('account');

  // 笔记相关状态
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isNoteViewMode, setIsNoteViewMode] = useState(true);
  const {
    notes,
    currentNote,
    tags,
    isLoading: notesLoading,
    isSaving,
    fetchNotes,
    fetchNote,
    createNote,
    updateNote,
    deleteNote,
    fetchTags,
    setCurrentNote,
  } = useNoteStore();

  // 计算选中节点的关联笔记
  const selectedNodeRelatedNotes = React.useMemo(() => {
    if (!selectedGraphNode || !selectedGraphNode.source_note_ids || !selectedGraphNode.source_note_ids.length) {
      return [];
    }
    // 根据 source_note_ids 查找对应的笔记
    return notes.filter(note =>
      selectedGraphNode.source_note_ids?.includes(String(note.id))
    );
  }, [selectedGraphNode, notes]);

  // 计算笔记数量（使用原始数量，不受筛选影响）
  const noteCount = originalCounts.note;
  const importCount = originalCounts.import;
  const allCount = originalCounts.all;

  // 获取后端服务器地址（用于图片 URL 转换）
  const { baseUrl } = useServerConfigStore();

  // 导入相关状态
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedImportPlatform, setSelectedImportPlatform] = useState('all');

  const { tasks, fetchTasks, cancelTask, createTask, activeTask, setActiveTask, pollActiveTask } = useImportTaskStore();

  // 计算运行中的任务数
  const runningTaskCount = tasks.filter(t => t.status === TaskStatus.RUNNING || t.status === TaskStatus.PENDING).length;

  // 加载任务列表（启动时获取一次）
  useEffect(() => {
    fetchTasks();
  }, []);

  // 加载任务列表（当在任务标签页时切换）
  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchTasks();
    }
  }, [activeTab, fetchTasks]);

  // 轮询活动任务状态（Web 端）
  useEffect(() => {
    if (!activeTask) return;

    const isCompleted = activeTask.status === TaskStatus.COMPLETED;
    const isFailed = activeTask.status === TaskStatus.FAILED;
    const isCancelled = activeTask.status === TaskStatus.CANCELLED;

    if (isCompleted || isFailed || isCancelled) {
      // 任务完成/失败/取消，延迟后刷新列表
      const timer = setTimeout(() => {
        fetchTasks();
        fetchNotes().then(() => {
          const allNotes = useNoteStore.getState().notes;
          setOriginalCounts({
            note: allNotes.filter((n) => n.platform === 'original' || !n.platform).length,
            import: allNotes.filter((n) => n.platform && n.platform !== 'original').length,
            all: allNotes.length,
          });
        });
        setActiveTask(null);
      }, 2000);
      return () => clearTimeout(timer);
    }

    // 任务进行中，继续轮询
    const pollInterval = setInterval(() => {
      pollActiveTask();
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [activeTask]);

  // 获取认证状态
  const { user: authUser, logout } = useAuthStore();

  // 当前用户显示数据
  const currentUser = authUser ? {
    name: authUser.username,
    email: authUser.email,
  } : {
    name: 'sparknoteai',
    email: 'sparknoteai@example.com',
  };

  // 处理设置点击
  const handleSettingsClick = () => {
    setActiveTab('settings');
    setSelectedSettingsCategory('account'); // 默认选择账号设置
  };

  // 处理退出点击
  const handleLogoutClick = async () => {
    setShowLogoutConfirm(true);
  };

  // 执行退出登录
  const executeLogout = async () => {
    try {
      // 清除本地存储的 token
      localStorage.removeItem('auth_token');
      // 调用 logout 清除状态
      await logout();
      // 刷新页面，会重新路由到登录页
      window.location.reload();
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  // 根据 URL 自动识别平台
  const detectPlatformFromUrl = (url: string): string => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('mp.weixin.qq.com') || lowerUrl.includes('wechat')) {
      return 'wechat';
    }
    if (lowerUrl.includes('xiaohongshu.com') || lowerUrl.includes('xhslink.com') || lowerUrl.includes('小红书')) {
      return 'xiaohongshu';
    }
    if (lowerUrl.includes('bilibili.com') || lowerUrl.includes('b23.tv')) {
      return 'bilibili';
    }
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
      return 'youtube';
    }
    if (lowerUrl.includes('zhihu.com')) {
      return 'zhihu';
    }
    return 'other';
  };

  // 处理导入
  const handleImport = async () => {
    if (!importUrl.trim()) return;

    setIsImporting(true);
    try {
      const platform = detectPlatformFromUrl(importUrl.trim());
      await createTask({
        url: importUrl.trim(),
        platform,
      });
      setImportUrl('');
      // 刷新任务列表
      await fetchTasks();
    } catch (error) {
      console.error('导入失败:', error);
    } finally {
      setIsImporting(false);
    }
  };

  // 加载数据
  useEffect(() => {
    loadFragments();
  }, []);

  // 加载标签（启动时获取一次）
  useEffect(() => {
    fetchTags();
  }, []);

  // 加载笔记列表（启动时获取一次）
  useEffect(() => {
    fetchNotes().then(() => {
      // 初次加载后存储原始数量
      const allNotes = useNoteStore.getState().notes;
      setOriginalCounts({
        note: allNotes.filter((n) => n.platform === 'original' || !n.platform).length,
        import: allNotes.filter((n) => n.platform && n.platform !== 'original').length,
        all: allNotes.length,
      });
    });
  }, []);

  // 加载笔记列表（当在笔记、全部、导入标签页时切换）
  useEffect(() => {
    if (activeTab === 'note' || activeTab === 'all' || activeTab === 'import') {
      fetchNotes().then(() => {
        // 切换标签页后存储原始数量
        const allNotes = useNoteStore.getState().notes;
        setOriginalCounts({
          note: allNotes.filter((n) => n.platform === 'original' || !n.platform).length,
          import: allNotes.filter((n) => n.platform && n.platform !== 'original').length,
          all: allNotes.length,
        });
      });
    }
  }, [activeTab]);

  // 当切换 activeTab 时，重置笔记编辑状态和右侧面板视图
  useEffect(() => {
    // 切换标签页时关闭编辑模式，回到预览模式
    setIsNoteViewMode(true);
    setCurrentNote(null);
    // 切换到导入标签页时，显示导入面板
    if (activeTab === 'import') {
      setRightPanelView('import');
    } else {
      setRightPanelView('detail');
    }
  }, [activeTab]);

  // 根据 activeTab 筛选
  useEffect(() => {
    filterFragments();
  }, [activeTab, fragments]);

  // 当 selectedFragmentId 改变时，加载对应的笔记（从知识图谱跳转过来）
  useEffect(() => {
    if (selectedFragmentId && activeTab === 'all') {
      const noteId = parseInt(selectedFragmentId);
      if (!isNaN(noteId)) {
        fetchNote(noteId);
        setIsCreatingNote(true);
        setIsNoteViewMode(true);
        setRightPanelView('detail');
      }
    }
  }, [selectedFragmentId, activeTab]);

  // 根据搜索查询过滤
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = fragments.filter(
        (f) =>
          f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredFragments(results);
    } else {
      filterFragments();
    }
  }, [searchQuery, fragments]);

  const loadFragments = async () => {
    setIsLoading(true);
    const data = await fragmentService.getAll();
    setFragments(data);
    setFilteredFragments(data);
    setIsLoading(false);
  };

  const filterFragments = () => {
    let filtered = fragments;

    if (activeTab === 'note' || activeTab === 'import') {
      filtered = fragments.filter((f) => f.type === activeTab);
    } else if (activeTab === 'graph') {
      // 知识图谱视图
      filtered = [];
    }

    setFilteredFragments(filtered);
  };

  const handleSelectFragment = (fragment: Fragment) => {
    setSelectedFragment(fragment);
    setIsEditing(false);
    setRightPanelView('detail');
  };

  const handleShowImportPanel = () => {
    setRightPanelView('import');
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    // Mock 保存
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (selectedFragment) {
      await fragmentService.delete(selectedFragment.id);
      setFragments(fragments.filter((f) => f.id !== selectedFragment.id));
      setSelectedFragment(undefined);
    }
  };

  const handleTagClick = (tag: string) => {
    // 切换标签过滤
    if (activeTag === tag) {
      setActiveTag(null);
      fetchNotes().then(() => {
        const allNotes = useNoteStore.getState().notes;
        setOriginalCounts({
          note: allNotes.filter((n) => n.platform === 'original' || !n.platform).length,
          import: allNotes.filter((n) => n.platform && n.platform !== 'original').length,
          all: allNotes.length,
        });
      });
    } else {
      setActiveTag(tag);
      fetchNotes({ tag });
    }
  };

  const handleDeleteTag = async (tagId: number, tagName: string) => {
    // 显示自定义确认对话框
    setPendingDeleteTag({ id: tagId, name: tagName });
    setShowDeleteTagConfirm(true);
  };

  const handleConfirmDeleteTag = async () => {
    if (!pendingDeleteTag) return;
    try {
      await useNoteStore.getState().deleteTag(pendingDeleteTag.id);
    } catch (error) {
      console.error('删除标签失败:', error);
    } finally {
      setPendingDeleteTag(null);
      setShowDeleteTagConfirm(false);
    }
  };

  const handleCreateNew = () => {
    if (activeTab === 'note' || activeTab === 'all') {
      // 笔记/全部标签页 - 创建新笔记
      setIsCreatingNote(true);
      setCurrentNote(null);
      setIsNoteViewMode(false); // 新建时直接进入编辑模式
      setRightPanelView('detail');
    } else if (activeTab === 'import') {
      // 导入标签页 - 显示导入面板
      setRightPanelView('import');
    } else {
      // 其他标签页 - 创建碎片
      const newFragment: Fragment = {
        id: String(Date.now()),
        type: activeTab === 'import' ? 'import' : 'note',
        title: '新笔记',
        content: '开始编写内容...',
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setFragments([newFragment, ...fragments]);
      setSelectedFragment(newFragment);
      setIsEditing(true);
    }
  };

  // 保存笔记
  const handleSaveNote = async (noteData: { title: string; content: string; tag_ids: number[] }) => {
    try {
      if (currentNote?.id) {
        // 更新现有笔记
        await updateNote(currentNote.id, noteData);
      } else {
        // 创建新笔记
        await createNote(noteData);
      }
      setIsNoteViewMode(true); // 保存后切换到预览模式
      fetchNotes().then(() => {
        const allNotes = useNoteStore.getState().notes;
        setOriginalCounts({
          note: allNotes.filter((n) => n.platform === 'original' || !n.platform).length,
          import: allNotes.filter((n) => n.platform && n.platform !== 'original').length,
          all: allNotes.length,
        });
      });
    } catch (error) {
      console.error('保存笔记失败:', error);
    }
  };

  // 取消编辑
  const handleCancelNote = () => {
    setIsNoteViewMode(true);
  };

  // 选中笔记查看详情
  const handleSelectNote = async (note: NoteType) => {
    await fetchNote(note.id);
    // 选择笔记时，显示预览模式（使用 ContentDetail）
    setIsCreatingNote(true);
    setIsNoteViewMode(true);
    setRightPanelView('detail');
    // 更新 selectedFragmentId 以便在列表中显示选中状态
    setSelectedFragmentId(String(note.id));
  };

  // 切换到编辑模式
  const handleEditNote = () => {
    setIsNoteViewMode(false);
  };

  // 删除笔记
  const handleDeleteNote = async () => {
    if (currentNote) {
      await deleteNote(currentNote.id);
      setIsCreatingNote(false);
      setCurrentNote(null);
    }
  };

  // 从知识图谱跳转到全部知识并显示笔记详情
  const handleViewNoteFromGraph = async (noteId: string) => {
    // 设置选中的笔记 ID
    setSelectedFragmentId(noteId);
    // 加载笔记详情
    await fetchNote(parseInt(noteId));
    // 打开侧滑面板
    setShowNoteDetailPanel(true);
  };

  // 关闭笔记详情侧滑面板
  const handleCloseNoteDetailPanel = () => {
    setShowNoteDetailPanel(false);
    setSelectedFragmentId(null);
  };

  // 从侧滑面板跳转到全部知识并显示笔记预览
  const handleViewOriginalNote = async (noteId: string) => {
    // 关闭侧滑面板
    setShowNoteDetailPanel(false);
    // 切换到全部知识标签页
    setActiveTab('all');
    // 设置选中的笔记 ID
    setSelectedFragmentId(noteId);
    // 加载笔记详情
    await fetchNote(parseInt(noteId));
    setIsCreatingNote(true);
    setIsNoteViewMode(true);
    setRightPanelView('detail');
  };

  // 从知识图谱节点详情中选择关联笔记
  const handleSelectNoteFromGraph = async (noteId: string) => {
    setSelectedFragmentId(noteId);
    // 加载笔记详情
    const note = selectedNodeRelatedNotes.find(n => String(n.id) === noteId);
    if (note) {
      await fetchNote(note.id);
      // 打开侧滑面板
      setShowNoteDetailPanel(true);
    }
  };

  const handleAISearch = (query: string) => {
    console.log('AI Search:', query);
    // 后续处理：调用 AI API
  };

  // AI 助手视图 - 全屏显示，不需要右侧栏
  if (activeTab === 'ai') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onTagClick={handleTagClick} user={currentUser} onSettingsClick={handleSettingsClick} onLogoutClick={handleLogoutClick} runningTaskCount={runningTaskCount} tags={tags} onDeleteTag={handleDeleteTag} noteCount={noteCount} importCount={importCount} allCount={allCount} />
        <View style={[styles.aiContainerFull, { backgroundColor: colors.background }]}>
          <AIAssistant onSearch={handleAISearch} />
        </View>

        {/* 共享对话框 - 必须在 return 内才能渲染 */}
        <ConfirmDialog
          visible={showLogoutConfirm}
          title="确认退出"
          message="确定要退出登录吗？"
          confirmText="退出"
          cancelText="取消"
          isDestructive
          onConfirm={executeLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
        <ConfirmDialog
          visible={showDeleteTagConfirm}
          title="删除标签"
          message={`确定要删除标签「${pendingDeleteTag?.name}」吗？所有笔记中的该标签也会被移除。`}
          confirmText="确定"
          cancelText="取消"
          isDestructive
          onConfirm={handleConfirmDeleteTag}
          onCancel={() => { setShowDeleteTagConfirm(false); setPendingDeleteTag(null); }}
        />
      </View>
    );
  }

  // 知识图谱视图
  if (activeTab === 'graph') {
    // 知识图谱场景判断
    const hasLLMConfig = status?.has_llm_config ?? false;
    const hasGraphData = graphData && graphData.nodes.length > 0;
    const isBuilding = status?.is_building ?? false;
    const buildingProgress = status?.building_progress ?? 0;

    // 处理跳转到设置页面配置大模型
    const handleGoToSettings = () => {
      setActiveTab('settings');
      setSelectedSettingsCategory('llm');
    };

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onTagClick={handleTagClick} user={currentUser} onSettingsClick={handleSettingsClick} onLogoutClick={handleLogoutClick} runningTaskCount={runningTaskCount} tags={tags} onDeleteTag={handleDeleteTag} noteCount={noteCount} importCount={importCount} allCount={allCount} />

        {/* 构建知识图谱确认对话框 - 必须放在 graph view 的 return 内 */}
        <ConfirmDialog
          visible={showBuildGraphConfirm}
          title="构建知识图谱"
          message={graphData && graphData.nodes.length > 0
            ? '确定要重新构建知识图谱吗？这将清空现有的图谱数据。'
            : '确定要开始构建知识图谱吗？这可能需要几分钟时间。'}
          confirmText="确定"
          cancelText="取消"
          isDestructive={graphData && graphData.nodes.length > 0}
          onConfirm={() => {
            console.log('[ThreeColumnLayout] 确认构建知识图谱, hasData:', graphData && graphData.nodes.length > 0);
            setShowBuildGraphConfirm(false);
            console.log('[ThreeColumnLayout] 调用 startBuild...');
            startBuild(graphData && graphData.nodes.length > 0);
            console.log('[ThreeColumnLayout] startBuild 调用完成（异步）');
          }}
          onCancel={() => setShowBuildGraphConfirm(false)}
        />

        <View style={[styles.graphContainer, { backgroundColor: colors.background, borderRightColor: colors.border }]}>
          <View style={[styles.graphHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.graphHeaderLeft}>
              <Text style={[styles.graphTitle, { color: colors.text }]}>🕸️ 知识图谱</Text>
              <Text style={[styles.graphSubtitle, { color: isBuilding ? colors.primary : colors.textSecondary }]}>
                {isBuilding ? `正在构建中... ${buildingProgress}%` : '可视化你的知识网络 - 点击节点查看详情，拖拽节点调整位置'}
              </Text>
            </View>
            {/* 构建按钮 - 根据场景切换状态 */}
            <TouchableOpacity
              style={[
                styles.buildGraphButton,
                { backgroundColor: (hasLLMConfig && !isBuilding) ? colors.primary : colors.backgroundSecondary },
                (!hasLLMConfig || isBuilding) && styles.buildGraphButtonDisabled
              ]}
              onPress={hasLLMConfig && !isBuilding ? handleBuildGraph : undefined}
              disabled={!hasLLMConfig || isBuilding}
            >
              <HammerIcon size={18} color={hasLLMConfig && !isBuilding ? colors.white : colors.textSecondary} />
              <Text style={[
                styles.buildGraphButtonText,
                { color: hasLLMConfig && !isBuilding ? colors.white : colors.textSecondary }
              ]}>
                {isBuilding ? '⏳ 构建中' : (hasGraphData ? '重新构建' : '构建')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 知识图谱构建错误提示 */}
          {kgError && (
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.error + '10', borderBottomWidth: 1, borderBottomColor: colors.error }}>
              <Text style={{ fontSize: 16, marginRight: spacing.sm }}>⚠️</Text>
              <Text style={{ flex: 1, fontSize: 13, color: colors.error }}>{kgError}</Text>
              <TouchableOpacity onPress={() => useKnowledgeGraphStore.setState({ error: null })}>
                <Text style={{ fontSize: 18, color: colors.textSecondary, padding: 4 }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 中间内容区 - 根据场景显示不同内容 */}
          {!hasLLMConfig ? (
            // 场景 1: 未配置大模型
            <View style={[styles.graphEmptyState, { backgroundColor: colors.background }]}>
              <BotIcon size={64} color={colors.primary} style={{ marginBottom: spacing.lg }} />
              <Text style={[styles.graphEmptyTitle, { color: colors.text }]}>需要配置大模型</Text>
              <Text style={[styles.graphEmptyText, { color: colors.textSecondary }]}>
                知识图谱功能需要使用大模型来提取概念和发现关系。{'\n'}
                请先配置大模型 API Key 才能开始使用。
              </Text>
              <TouchableOpacity
                style={[styles.graphConfigButton, { backgroundColor: colors.primary }]}
                onPress={handleGoToSettings}
              >
                <Text style={[styles.graphConfigButtonText, { color: colors.white }]}>去配置大模型</Text>
              </TouchableOpacity>
            </View>
          ) : isBuilding ? (
            // 场景 2: 构建中 - 在中间显示进度
            <View style={[styles.graphEmptyState, { backgroundColor: colors.background }]}>
              <View style={styles.graphEmptyIconView}>
                <NetworkIcon size={64} color={colors.primary} strokeWidth={1.5} />
              </View>
              <Text style={[styles.graphEmptyTitle, { color: colors.text }]}>正在构建知识图谱</Text>
              <Text style={[styles.graphEmptyProgress, { color: colors.primary }]}>{buildingProgress}%</Text>
              <View style={styles.graphProgressBarContainer}>
                <View style={[styles.graphProgressBar, { backgroundColor: colors.backgroundSecondary }]}>
                  <View
                    style={[
                      styles.graphProgressFill,
                      { width: `${buildingProgress}%`, backgroundColor: colors.primary },
                    ]}
                  />
                </View>
              </View>
              <Text style={[styles.graphEmptyText, { color: colors.textSecondary }]}>
                正在从笔记中提取概念并发现关系，请稍候...
              </Text>
            </View>
          ) : !hasGraphData ? (
            // 场景 2: 已配置大模型但无数据
            <View style={[styles.graphEmptyState, { backgroundColor: colors.background }]}>
              <View style={styles.graphEmptyIconView}>
                <SproutIcon size={64} color={colors.textSecondary} strokeWidth={1.5} />
              </View>
              <Text style={[styles.graphEmptyTitle, { color: colors.text }]}>开始构建知识图谱</Text>
              <Text style={[styles.graphEmptyText, { color: colors.textSecondary }]}>
                检测到您已配置大模型，但尚未构建知识图谱。{'\n'}
                点击右上角"构建"按钮开始构建，系统将自动：
              </Text>
              <View style={[styles.graphStepsContainer, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={styles.graphStepRow}>
                  <View style={[styles.graphStepIcon, { backgroundColor: colors.primary }]}>
                    <SproutIcon size={14} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.graphStep, { color: colors.text }]}>从笔记中提取核心概念</Text>
                </View>
                <View style={styles.graphStepRow}>
                  <View style={[styles.graphStepIcon, { backgroundColor: colors.primary }]}>
                    <NetworkIcon size={14} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.graphStep, { color: colors.text }]}>分析概念间的关系</Text>
                </View>
                <View style={styles.graphStepRow}>
                  <View style={[styles.graphStepIcon, { backgroundColor: colors.primary }]}>
                    <WorkflowIcon size={14} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.graphStep, { color: colors.text }]}>生成可视化知识网络</Text>
                </View>
              </View>
            </View>
          ) : (
            // 场景 3: 已配置大模型且有数据
            <KnowledgeGraph
              onNodeClick={(node) => setSelectedGraphNode(node)}
              onNodeSelect={setSelectedGraphNode}
              selectedNode={selectedGraphNode}
              initialData={graphData}
              isLoading={!graphData}
              onRebuild={handleBuildGraph}
            />
          )}
        </View>
        {graphData && graphData.nodes.length > 0 && (
        <View style={[styles.nodeDetailPanel, { backgroundColor: colors.background, borderLeftColor: colors.border }]}>
          {selectedGraphNode ? (
            <View style={styles.nodeDetailContent}>
              {/* 头部 - 类型标签和关闭按钮 */}
              <View style={[styles.nodeDetailHeader, { borderBottomColor: colors.borderLight }]}>
                <View style={[styles.nodeDetailTypeBadge, { backgroundColor: colors.backgroundSecondary }]}>
                  {(() => {
                    const iconMap: Record<string, React.FC<any>> = {
                      concept: LightbulbIcon,
                      entity: UsersIcon,
                      topic: LayersIcon,
                      tag: TagIcon,
                      fragment: FileTextIcon,
                    };
                    const Icon = iconMap[selectedGraphNode.type] || FileTextIcon;
                    return <Icon size={14} color={colors.textSecondary} />;
                  })()}
                  <Text style={[styles.nodeDetailTypeText, { color: colors.textSecondary }]}>{selectedGraphNode.type}</Text>
                </View>
                <TouchableOpacity style={[styles.nodeDetailClose, { backgroundColor: colors.backgroundSecondary }]} onPress={() => { setSelectedGraphNode(null); setSelectedFragmentId(null); }}>
                  <Text style={[styles.nodeDetailCloseText, { color: colors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* 节点标题 */}
              <Text style={[styles.nodeDetailTitle, { color: colors.text }]}>{selectedGraphNode.label}</Text>

              {/* 分组信息 */}
              {selectedGraphNode.group && (
                <View style={[styles.nodeDetailGroup, { backgroundColor: colors.backgroundSecondary }]}>
                  <View style={styles.nodeDetailGroupHeader}>
                    <Text style={styles.nodeDetailGroupIcon}>📁</Text>
                    <Text style={[styles.nodeDetailGroupLabel, { color: colors.textSecondary }]}>所属分类</Text>
                  </View>
                  <Text style={[styles.nodeDetailGroupValue, { color: colors.text }]}>{selectedGraphNode.group}</Text>
                </View>
              )}

              {/* 简介 */}
              {selectedGraphNode.description && (
                <View style={styles.nodeDetailSection}>
                  <View style={styles.nodeDetailSectionHeader}>
                    <InfoIcon size={14} strokeWidth={2} color={colors.textSecondary} />
                    <Text style={[styles.nodeDetailSectionTitle, { color: colors.text }]}>简介</Text>
                  </View>
                  <View style={[styles.nodeDetailDescriptionBox, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.nodeDetailDescription, { color: colors.text }]}>{selectedGraphNode.description}</Text>
                  </View>
                </View>
              )}

              {/* 统计信息 */}
              <View style={styles.nodeDetailStats}>
                <View style={[styles.nodeDetailStat, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.nodeDetailStatNumber, { color: colors.primary }]}>
                    {selectedNodeRelatedNotes.length}
                  </Text>
                  <Text style={[styles.nodeDetailStatLabel, { color: colors.textSecondary }]}>关联笔记</Text>
                </View>
                <View style={[styles.nodeDetailStat, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.nodeDetailStatNumber, { color: colors.primary }]}>
                    {getGraphLinks().filter((link) =>
                      link.source === selectedGraphNode.id || link.target === selectedGraphNode.id
                    ).length}
                  </Text>
                  <Text style={[styles.nodeDetailStatLabel, { color: colors.textSecondary }]}>连接关系</Text>
                </View>
              </View>

              {/* 关联笔记列表 */}
              <View style={styles.nodeDetailSection}>
                <View style={styles.nodeDetailSectionHeader}>
                  <FileIcon size={14} strokeWidth={2} color={colors.textSecondary} />
                  <Text style={[styles.nodeDetailSectionTitle, { color: colors.text }]}>关联笔记</Text>
                  {selectedNodeRelatedNotes.length > 0 && (
                    <Text style={[styles.nodeDetailSectionCount, { color: colors.primary, backgroundColor: colors.primary + '10' }]}>{selectedNodeRelatedNotes.length}</Text>
                  )}
                </View>
                {selectedNodeRelatedNotes.length > 0 ? (
                  <View style={styles.relatedFragmentsList}>
                    {selectedNodeRelatedNotes.map((note, index) => (
                      <TouchableOpacity
                        key={note.id}
                        style={[
                          styles.relatedFragmentCard,
                          { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                          selectedFragmentId === String(note.id) && styles.relatedFragmentCardActive,
                          selectedFragmentId === String(note.id) && { backgroundColor: colors.background, borderColor: colors.primary, shadowColor: colors.primary },
                        ]}
                        onPress={() => handleSelectNoteFromGraph(String(note.id))}
                      >
                        <View style={[styles.relatedFragmentIndex, { backgroundColor: colors.primary, color: colors.background }]}>{index + 1}</View>
                        <View style={styles.relatedFragmentContent}>
                          <Text style={[styles.relatedFragmentTitle, { color: colors.text }]} numberOfLines={1}>{note.title}</Text>
                          <Text style={[styles.relatedFragmentSummary, { color: colors.textSecondary }]} numberOfLines={2}>
                            {note.summary || note.content?.substring(0, 50) || '无摘要'}
                          </Text>
                        </View>
                        {selectedFragmentId === String(note.id) && (
                          <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={[styles.noRelatedFragmentsBox, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={styles.noRelatedFragmentsIcon}>📭</Text>
                    <Text style={[styles.noRelatedFragments, { color: colors.textSecondary }]}>暂无关联笔记</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={[styles.nodeDetailEmpty, { backgroundColor: colors.background }]}>
              <Text style={styles.nodeDetailEmptyIcon}>👈</Text>
              <Text style={[styles.nodeDetailEmptyTitle, { color: colors.text }]}>点击节点查看详情</Text>
              <Text style={[styles.nodeDetailEmptyText, { color: colors.textSecondary }]}>选择左侧知识图谱中的任意节点，</Text>
              <Text style={[styles.nodeDetailEmptyText, { color: colors.textSecondary }]}>查看其详细信息和关联笔记</Text>
            </View>
          )}
        </View>
        )}

        {/* 笔记详情侧滑面板 */}
        {showNoteDetailPanel && currentNote && (
          <View style={[styles.noteDetailSlidePanel, { backgroundColor: colors.background, borderLeftColor: colors.border }]}>
            <View style={styles.noteDetailSlideContent}>
              {/* 头部 - 标题、查看原文按钮和关闭按钮 */}
              <View style={[styles.noteDetailSlideHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.noteDetailSlideTitle, { color: colors.text }]} numberOfLines={1}>{currentNote.title}</Text>
                <View style={styles.noteDetailSlideHeaderActions}>
                  <TouchableOpacity
                    style={[styles.noteDetailSlideViewOriginal, { backgroundColor: colors.primary + '15' }]}
                    onPress={() => handleViewOriginalNote(String(currentNote.id))}
                  >
                    <Text style={[styles.noteDetailSlideViewOriginalText, { color: colors.primary }]}>📖 查看原文</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.noteDetailSlideClose, { backgroundColor: colors.backgroundSecondary }]}
                    onPress={handleCloseNoteDetailPanel}
                  >
                    <Text style={[styles.noteDetailSlideCloseText, { color: colors.textSecondary }]}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 笔记内容 - Markdown 渲染 */}
              <ScrollView style={styles.noteDetailSlideScroll}>
                <View style={styles.noteDetailSlideBody}>
                  <Markdown
                    remarkPlugins={[remarkGfm]}
                    skipHtml={true}
                    components={{
                      h1: ({node, ...props}) => <h1 style={{ ...StyleSheet.flatten(styles.mdH1) } as any} {...props} />,
                      h2: ({node, ...props}) => <h2 style={{ ...StyleSheet.flatten(styles.mdH2) } as any} {...props} />,
                      h3: ({node, ...props}) => <h3 style={{ ...StyleSheet.flatten(styles.mdH3) } as any} {...props} />,
                      h4: ({node, ...props}) => <h4 style={{ ...StyleSheet.flatten(styles.mdH4) } as any} {...props} />,
                      h5: ({node, ...props}) => <h5 style={{ ...StyleSheet.flatten(styles.mdH5) } as any} {...props} />,
                      h6: ({node, ...props}) => <h6 style={{ ...StyleSheet.flatten(styles.mdH6) } as any} {...props} />,
                      p: ({node, children, ...props}) => {
                        const textContent = React.Children.toArray(children).join('');
                        if (!textContent.trim()) return null;
                        return <p style={{ ...StyleSheet.flatten(styles.mdP), color: colors.text } as any} {...props}>{children}</p>;
                      },
                      a: ({node, ...props}) => (
                        <a
                          style={{ ...StyleSheet.flatten(styles.mdLink), color: colors.primary } as any}
                          {...props}
                          onClick={(e) => {
                            e.preventDefault();
                            const href = props.href;
                            if (href) window.open(href, '_blank');
                          }}
                        />
                      ),
                      img: ({node, ...props}) => (
                        <img
                          style={StyleSheet.flatten(styles.mdImage) as any}
                          {...props}
                          src={transformImageUrl(props.src || '', baseUrl)}
                        />
                      ),
                      code: ({node, inline, className, children, ...props}: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : 'text';
                        const codeContent = String(children).replace(/\n$/, '');
                        return inline ? (
                          <code
                            style={{ ...StyleSheet.flatten(styles.mdCode), backgroundColor: colors.backgroundSecondary, color: colors.error } as any}
                            className={className}
                            {...props}
                          >
                            {codeContent}
                          </code>
                        ) : (
                          <code
                            style={StyleSheet.flatten(styles.mdCode) as any}
                            className={className}
                            {...props}
                          >
                            {codeContent}
                          </code>
                        );
                      },
                      pre: ({node, ...props}) => (
                        <pre style={{ ...StyleSheet.flatten(styles.mdPre), backgroundColor: colors.backgroundSecondary } as any} {...props} />
                      ),
                      ul: ({node, ...props}) => <ul style={StyleSheet.flatten(styles.mdUl) as any} {...props} />,
                      ol: ({node, ...props}) => <ol style={StyleSheet.flatten(styles.mdOl) as any} {...props} />,
                      li: ({node, ...props}) => <li style={{ ...StyleSheet.flatten(styles.mdLi), color: colors.text } as any} {...props} />,
                      blockquote: ({node, ...props}) => (
                        <blockquote style={{ ...StyleSheet.flatten(styles.mdBlockquote), borderLeftColor: colors.primary, color: colors.textSecondary, backgroundColor: colors.backgroundSecondary } as any} {...props} />
                      ),
                    }}
                  >
                    {currentNote.content}
                  </Markdown>
                </View>
              </ScrollView>
            </View>
          </View>
        )}

        {/* 共享对话框 - 必须在 return 内才能渲染 */}
        <ConfirmDialog
          visible={showLogoutConfirm}
          title="确认退出"
          message="确定要退出登录吗？"
          confirmText="退出"
          cancelText="取消"
          isDestructive
          onConfirm={executeLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
        <ConfirmDialog
          visible={showDeleteTagConfirm}
          title="删除标签"
          message={`确定要删除标签「${pendingDeleteTag?.name}」吗？所有笔记中的该标签也会被移除。`}
          confirmText="确定"
          cancelText="取消"
          isDestructive
          onConfirm={handleConfirmDeleteTag}
          onCancel={() => { setShowDeleteTagConfirm(false); setPendingDeleteTag(null); }}
        />
      </View>
    );
  }

  // 插件视图
  if (activeTab === 'plugins') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onTagClick={handleTagClick} user={currentUser} onSettingsClick={handleSettingsClick} onLogoutClick={handleLogoutClick} runningTaskCount={runningTaskCount} tags={tags} onDeleteTag={handleDeleteTag} noteCount={noteCount} importCount={importCount} allCount={allCount} />
        <View style={[styles.pluginsContainer, { backgroundColor: colors.backgroundSecondary, borderRightColor: colors.border }]}>
          <Text style={[styles.pluginsTitle, { color: colors.text }]}>
          <PlugIcon size={24} strokeWidth={2} color={colors.text} />
          {' '}插件中心
        </Text>
          <Text style={[styles.pluginsSubtitle, { color: colors.textSecondary }]}>扩展你的知识管理能力</Text>
          <View style={styles.pluginGrid}>
            {[
              { name: '自媒体助手', desc: '多平台格式转换、爆款分析', icon: <SmartphoneIcon size={28} strokeWidth={2} color={colors.text} />, enabled: false },
              { name: '论文助手', desc: '文献管理、引用生成', icon: <BookIcon size={28} strokeWidth={2} color={colors.text} />, enabled: false },
              { name: '知乎导入', desc: '一键导入知乎回答和文章', icon: <FileTextIcon size={28} strokeWidth={2} color={colors.text} />, enabled: true },
              { name: 'GitHub 集成', desc: '同步 GitHub 项目和 Issue', icon: <FileTextIcon size={28} strokeWidth={2} color={colors.text} />, enabled: false },
            ].map((plugin) => (
              <View key={plugin.name} style={[styles.pluginCard, { backgroundColor: colors.background }]}>
                <View style={styles.pluginIcon}>{plugin.icon}</View>
                <Text style={[styles.pluginName, { color: colors.text }]}>{plugin.name}</Text>
                <Text style={[styles.pluginDesc, { color: colors.textSecondary }]}>{plugin.desc}</Text>
                <View style={[styles.pluginStatus, { backgroundColor: colors.backgroundSecondary }, plugin.enabled && { backgroundColor: colors.success }]}>
                  <Text style={[styles.pluginStatusText, { color: colors.textSecondary }, plugin.enabled && { color: colors.background }]}>
                    {plugin.enabled ? '已启用' : '未启用'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        <View style={[styles.detailPlaceholder, { backgroundColor: colors.background }]}>
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>选择一个插件查看详情</Text>
        </View>

        {/* 共享对话框 */}
        <ConfirmDialog
          visible={showLogoutConfirm}
          title="确认退出"
          message="确定要退出登录吗？"
          confirmText="退出"
          cancelText="取消"
          isDestructive
          onConfirm={executeLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
        <ConfirmDialog
          visible={showDeleteTagConfirm}
          title="删除标签"
          message={`确定要删除标签「${pendingDeleteTag?.name}」吗？所有笔记中的该标签也会被移除。`}
          confirmText="确定"
          cancelText="取消"
          isDestructive
          onConfirm={handleConfirmDeleteTag}
          onCancel={() => { setShowDeleteTagConfirm(false); setPendingDeleteTag(null); }}
        />
      </View>
    );
  }

  // 导入标签页视图 - 与主视图合并，使用相同的逻辑
  // 注意：import 标签页现在显示笔记数据，点击 + 导入 时显示导入面板

  // 后台任务视图 - 双栏布局（左侧边栏 + 任务列表）
  if (activeTab === 'tasks') {
    // 平台图标映射
    const PLATFORM_ICONS: Record<string, React.ReactNode> = {
      wechat: <MessageSquareIcon size={20} strokeWidth={2} />,
      xiaohongshu: <FileTextIcon size={20} strokeWidth={2} />,
      bilibili: <MonitorIcon size={20} strokeWidth={2} />,
      youtube: <PlayCircleIcon size={20} strokeWidth={2} />,
      web: <GlobeIcon size={20} strokeWidth={2} />,
      other: <FileIcon size={20} strokeWidth={2} />,
    };

    const renderTaskItem = ({ item }: { item: any }) => {
      const statusColor = item.status === TaskStatus.COMPLETED
        ? colors.success
        : item.status === TaskStatus.FAILED
          ? colors.error
          : item.status === TaskStatus.RUNNING
            ? '#3b82f6'
            : colors.textSecondary;

      const statusLabel = item.status === TaskStatus.COMPLETED
        ? '完成'
        : item.status === TaskStatus.RUNNING
          ? '进行中'
          : item.status === TaskStatus.PENDING
            ? '等待中'
            : item.status === TaskStatus.FAILED
              ? '失败'
              : '已取消';

      const platformIcon = item.platform ? PLATFORM_ICONS[item.platform] || PLATFORM_ICONS.other : PLATFORM_ICONS.other;

      return (
        <View style={[styles.taskCard, { backgroundColor: colors.background }]}>
          <View style={styles.taskHeader}>
            <View style={styles.taskPlatformIcon}>{platformIcon}</View>
            <View style={styles.taskInfo}>
              <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[styles.taskUrl, { color: colors.textSecondary }]} numberOfLines={1}>{item.url}</Text>
            </View>
          </View>
          {/* 进度条 */}
          {(item.status === TaskStatus.RUNNING || item.status === TaskStatus.PENDING) && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { width: `${item.progress}%`, backgroundColor: colors.blue }]} />
              </View>
              <Text style={[styles.progressText, { color: colors.blue }]}>{item.progress}%</Text>
            </View>
          )}
          <View style={styles.taskFooter}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
            <Text style={[styles.taskTime, { color: colors.textSecondary }]}>
              {new Date(item.created_at).toLocaleString('zh-CN')}
            </Text>
            {item.status === TaskStatus.RUNNING && (
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.destructive + '10' }]}
                onPress={() => cancelTask(item.id)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.destructive }]}>取消</Text>
              </TouchableOpacity>
            )}
          </View>
          {item.status === TaskStatus.FAILED && item.error_message && (
            <Text style={[styles.errorText, { color: colors.error, backgroundColor: colors.error + '10' }]}>{item.error_message}</Text>
          )}
        </View>
      );
    };

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onTagClick={handleTagClick} user={currentUser} onSettingsClick={handleSettingsClick} onLogoutClick={handleLogoutClick} runningTaskCount={runningTaskCount} tags={tags} onDeleteTag={handleDeleteTag} noteCount={noteCount} importCount={importCount} allCount={allCount} />
        <View style={[styles.tasksContainerFull, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={[styles.tasksHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.tasksTitle, { color: colors.text }]}>📋 后台任务</Text>
            <Text style={[styles.tasksSubtitle, { color: colors.textSecondary }]}>查看和管理导入任务</Text>
          </View>
          <FlatList
            data={tasks}
            renderItem={renderTaskItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.tasksListContent}
            ListEmptyComponent={
              <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={[styles.emptyText, { color: colors.text }]}>暂无任务</Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>还没有任何导入任务</Text>
              </View>
            }
          />
        </View>

        {/* 共享对话框 */}
        <ConfirmDialog
          visible={showLogoutConfirm}
          title="确认退出"
          message="确定要退出登录吗？"
          confirmText="退出"
          cancelText="取消"
          isDestructive
          onConfirm={executeLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
        <ConfirmDialog
          visible={showDeleteTagConfirm}
          title="删除标签"
          message={`确定要删除标签「${pendingDeleteTag?.name}」吗？所有笔记中的该标签也会被移除。`}
          confirmText="确定"
          cancelText="取消"
          isDestructive
          onConfirm={handleConfirmDeleteTag}
          onCancel={() => { setShowDeleteTagConfirm(false); setPendingDeleteTag(null); }}
        />
      </View>
    );
  }

  // 设置视图 - 三栏布局
  if (activeTab === 'settings') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onTagClick={handleTagClick} user={currentUser} onSettingsClick={handleSettingsClick} onLogoutClick={handleLogoutClick} runningTaskCount={runningTaskCount} tags={tags} onDeleteTag={handleDeleteTag} noteCount={noteCount} importCount={importCount} allCount={allCount} />
        <SettingsView
          selectedCategory={selectedSettingsCategory}
          onCategorySelect={setSelectedSettingsCategory}
        />
        <SettingsDetailView
          category={selectedSettingsCategory}
        />

        {/* 共享对话框 */}
        <ConfirmDialog
          visible={showLogoutConfirm}
          title="确认退出"
          message="确定要退出登录吗？"
          confirmText="退出"
          cancelText="取消"
          isDestructive
          onConfirm={executeLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
        <ConfirmDialog
          visible={showDeleteTagConfirm}
          title="删除标签"
          message={`确定要删除标签「${pendingDeleteTag?.name}」吗？所有笔记中的该标签也会被移除。`}
          confirmText="确定"
          cancelText="取消"
          isDestructive
          onConfirm={handleConfirmDeleteTag}
          onCancel={() => { setShowDeleteTagConfirm(false); setPendingDeleteTag(null); }}
        />
      </View>
    );
  }

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 左侧边栏 - 导航 */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onTagClick={handleTagClick} user={currentUser} onSettingsClick={handleSettingsClick} onLogoutClick={handleLogoutClick} runningTaskCount={runningTaskCount} tags={tags} onDeleteTag={handleDeleteTag} noteCount={noteCount} importCount={importCount} allCount={allCount} />

      {/* 中间栏 - 内容列表 */}
      <View style={[styles.contentListWrapper, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={[styles.contentListHeader, { borderBottomColor: colors.borderLight }]}>
          <Text style={[styles.contentListTitle, { color: colors.text }]}>
            {activeTab === 'all' ? '全部知识' : activeTab === 'note' ? '我的笔记' : '导入内容'}
          </Text>
        </View>
        {activeTab === 'note' ? (
          // 笔记列表 - 只显示用户原创的笔记
          <ContentList
            title=""
            items={notes
              .filter((note) => !note.platform || note.platform === 'original')
              .map((note) => ({
              id: String(note.id),
              type: 'note' as const,
              title: note.title,
              content: note.content,
              summary: note.summary,
              tags: note.tags,
              created_at: note.created_at,
              updated_at: note.updated_at,
              url: note.source_url || '',
              platform: 'original',
              fragment_id: '',
            }))}
            selectedItem={currentNote ? String(currentNote.id) : undefined}
            onSelectItem={(item) => handleSelectNote({
              id: parseInt(item.id),
              title: item.title,
              content: item.content,
              summary: item.summary || '',
              user_id: 1,
              created_at: item.created_at,
              updated_at: item.updated_at,
              tags: item.tags,
            })}
            onSearch={(query) => {
              setSearchQuery(query);
              fetchNotes({ search: query });
            }}
            onCreateNew={handleCreateNew}
            searchQuery={searchQuery}
            activeTag={activeTag}
            onClearTag={() => { setActiveTag(null); fetchNotes(); }}
            createButtonText="+ 新建"
            tags={tags}
          />
        ) : activeTab === 'all' ? (
          // 全部知识 - 显示原创笔记和导入笔记，按时间排序
          <ContentList
            title=""
            items={notes
              .slice()
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((note) => ({
              id: String(note.id),
              type: 'note' as const,
              title: note.title,
              content: note.content,
              summary: note.summary,
              tags: note.tags,
              created_at: note.created_at,
              updated_at: note.updated_at,
              url: note.source_url || '',
              platform: note.platform || 'original',
              fragment_id: '',
            }))}
            selectedItem={selectedFragmentId || (currentNote ? String(currentNote.id) : undefined)}
            onSelectItem={(item) => handleSelectNote({
              id: parseInt(item.id),
              title: item.title,
              content: item.content,
              summary: item.summary || '',
              user_id: 1,
              created_at: item.created_at,
              updated_at: item.updated_at,
              tags: item.tags,
            })}
            onSearch={(query) => {
              setSearchQuery(query);
              fetchNotes({ search: query });
            }}
            onCreateNew={handleCreateNew}
            searchQuery={searchQuery}
            activeTag={activeTag}
            onClearTag={() => { setActiveTag(null); fetchNotes(); }}
            createButtonText="+ 新建"
            tags={tags}
          />
        ) : activeTab === 'import' ? (
          // 导入列表 - 只显示导入的内容，支持平台筛选
          <ContentList
            title=""
            items={notes
              .filter((note) => note.platform && note.platform !== 'original')
              .map((note) => ({
                id: String(note.id),
                type: 'note' as const,
                title: note.title,
                content: note.content,
                summary: note.summary,
                tags: note.tags,
                created_at: note.created_at,
                updated_at: note.updated_at,
                url: note.source_url || '',
                platform: note.platform || 'import',
                fragment_id: '',
              }))}
            selectedItem={currentNote ? String(currentNote.id) : undefined}
            onSelectItem={(item) => handleSelectNote({
              id: parseInt(item.id),
              title: item.title,
              content: item.content,
              summary: item.summary || '',
              user_id: 1,
              created_at: item.created_at,
              updated_at: item.updated_at,
              tags: item.tags,
            })}
            onSearch={(query) => {
              setSearchQuery(query);
              fetchNotes({ search: query });
            }}
            onCreateNew={handleCreateNew}
            searchQuery={searchQuery}
            activeTag={activeTag}
            onClearTag={() => { setActiveTag(null); fetchNotes(); }}
            createButtonText="+ 导入"
            tags={tags}
            showPlatformFilter
            selectedPlatform={selectedImportPlatform}
            onPlatformChange={setSelectedImportPlatform}
          />
        ) : (
          <ContentList
            title=""
            items={filteredFragments}
            selectedItem={selectedFragment?.id}
            onSelectItem={handleSelectFragment}
            onSearch={setSearchQuery}
            onCreateNew={handleCreateNew}
            searchQuery={searchQuery}
            activeTag={activeTag}
            onClearTag={() => { setActiveTag(null); fetchNotes(); }}
            createButtonText="+ 导入"
            tags={tags}
          />
        )}
      </View>

      {/* 右侧栏 - 根据状态显示 */}
      {rightPanelView === 'import' ? (
        // 导入面板
        <View style={[styles.importPanel, { backgroundColor: colors.background }]}>
          <View style={styles.importPanelContentWrapper}>
            <View style={styles.importPanelInner}>
              {/* 标题 */}
              <View style={styles.importHeader}>
                <View style={styles.importPanelTitleRow}>
                  <DownloadIcon size={22} strokeWidth={2} color={colors.text} />
                  <Text style={[styles.importPanelTitle, { color: colors.text }]}>导入内容</Text>
                </View>
                <Text style={[styles.importPanelSubtitle, { color: colors.textSecondary }]}>粘贴链接，自动识别平台并导入内容</Text>
              </View>

              {/* URL 输入框 - Google 风格 */}
              <View style={styles.importSection}>
                <View style={[styles.urlInputBox, { backgroundColor: colors.background, borderColor: colors.border, shadowColor: colors.primary }, isInputFocused && { borderColor: colors.border, shadowColor: colors.primary, ...styles.urlInputBoxFocused }]}>
                  <View style={styles.urlInputLeft}>
                    <View style={styles.urlInputIcon}>
                      <LinkIcon size={18} strokeWidth={2} color={colors.textSecondary} />
                    </View>
                  </View>
                  <TextInput
                    style={[styles.urlInput, { color: colors.text }]}
                    placeholder="粘贴微信公众号、小红书等链接"
                    placeholderTextColor={colors.textSecondary}
                    value={importUrl}
                    onChangeText={setImportUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    multiline
                    returnKeyType="send"
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    onSubmitEditing={() => handleImport()}
                    textAlignVertical="top"
                  />
                  {importUrl.trim() ? (
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={() => setImportUrl('')}
                    >
                      <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>✕</Text>
                    </TouchableOpacity>
                  ) : null}
                  <View style={[styles.urlInputDivider, { backgroundColor: colors.border }]} />
                  <TouchableOpacity
                    style={[styles.urlInputButton, { backgroundColor: importUrl.trim() ? colors.primary : colors.border }, !importUrl.trim() && styles.urlInputButtonDisabled]}
                    onPress={handleImport}
                    disabled={!importUrl.trim()}
                  >
                    <Text style={[styles.urlInputButtonText, { color: colors.background }]}>
                      {isImporting ? '导入中...' : '导入'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 导入提示 */}
              <View style={[styles.importHint, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.importHintText, { color: colors.textSecondary }]}>
                  导入的内容仅供个人学习使用，请勿用于商业用途。
                </Text>
              </View>

              {/* 活动任务进度显示 */}
              {activeTask && (
                <View style={[styles.activeTaskProgress, { backgroundColor: colors.secondary }]}>
                  <View style={styles.activeTaskHeader}>
                    <Text style={[styles.activeTaskTitle, { color: colors.text }]}>{activeTask.title}</Text>
                    <Text style={[styles.activeTaskStatus, { color:
                      activeTask.status === TaskStatus.COMPLETED ? colors.success :
                      activeTask.status === TaskStatus.FAILED ? colors.error :
                      activeTask.status === TaskStatus.RUNNING ? colors.cta :
                      colors.textSecondary
                    }]}>
                      {activeTask.status === TaskStatus.COMPLETED ? '✅ 已完成' :
                       activeTask.status === TaskStatus.RUNNING ? '⏳ 进行中' :
                       activeTask.status === TaskStatus.FAILED ? '❌ 失败' :
                       activeTask.status === TaskStatus.PENDING ? '⏸️ 等待中' : '⏹️ 已取消'}
                    </Text>
                  </View>
                  <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                      <View style={[styles.progressFill, { width: `${activeTask.progress}%`, backgroundColor: colors.blue }]} />
                    </View>
                    <Text style={[styles.progressText, { color: colors.blue }]}>{activeTask.progress}%</Text>
                  </View>
                  {activeTask.status === TaskStatus.COMPLETED && (
                    <Text style={[styles.successMessage, { color: colors.success }]}>导入完成，内容已添加到列表</Text>
                  )}
                  {activeTask.status === TaskStatus.FAILED && activeTask.error_message && (
                    <Text style={[styles.errorMessage, { color: colors.error }]}>{activeTask.error_message}</Text>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      ) : (activeTab === 'note' || activeTab === 'all' || activeTab === 'import') && isCreatingNote && !isNoteViewMode ? (
        // 笔记编辑器 - 只在编辑模式下显示
        <NoteEditor
          note={currentNote}
          onSave={handleSaveNote}
          onCancel={handleCancelNote}
          onEdit={handleEditNote}
          isLoading={isSaving}
          isViewMode={false}
        />
      ) : (
        // 内容详情 - 预览模式使用 ContentDetail
        <ContentDetail
          note={(activeTab === 'note' || activeTab === 'all' || activeTab === 'import') ? currentNote || undefined : undefined}
          fragment={(activeTab !== 'note' && activeTab !== 'all' && activeTab !== 'import') ? selectedFragment : undefined}
          tags={tags}
          isEditing={(activeTab === 'note' || activeTab === 'all' || activeTab === 'import') ? !isNoteViewMode : isEditing}
          onEdit={(activeTab === 'note' || activeTab === 'all' || activeTab === 'import') ? handleEditNote : handleEdit}
          onSave={(activeTab === 'note' || activeTab === 'all' || activeTab === 'import') ? handleSaveNote : handleSave}
          onDelete={(activeTab === 'note' || activeTab === 'all' || activeTab === 'import') ? handleDeleteNote : handleDelete}
        />
      )}
    </View>

    {/* 退出登录确认对话框 */}
    <ConfirmDialog
      visible={showLogoutConfirm}
      title="确认退出"
      message="确定要退出登录吗？"
      confirmText="退出"
      cancelText="取消"
      isDestructive
      onConfirm={executeLogout}
      onCancel={() => setShowLogoutConfirm(false)}
    />

    {/* 删除标签确认对话框 */}
    <ConfirmDialog
      visible={showDeleteTagConfirm}
      title="删除标签"
      message={`确定要删除标签「${pendingDeleteTag?.name}」吗？所有笔记中的该标签也会被移除。`}
      confirmText="删除"
      cancelText="取消"
      isDestructive
      onConfirm={handleConfirmDeleteTag}
      onCancel={() => {
        setShowDeleteTagConfirm(false);
        setPendingDeleteTag(null);
      }}
    />
  </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    ...Platform.select({
      web: {
        height: '100vh',
        overflow: 'hidden',
      },
    }),
  },
  aiContainerFull: {
    flex: 1,
  },
  graphContainer: {
    flex: 1,
    borderRightWidth: 1,
  },
  graphHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  graphHeaderLeft: {
    flex: 1,
  },
  buildGraphButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  buildGraphButtonDisabled: {
  },
  buildGraphButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buildGraphButtonTextDisabled: {
  },
  graphTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  graphSubtitle: {
    fontSize: 13,
    marginTop: spacing.xs,
  },
  // 知识图谱空状态
  graphEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  graphEmptyIconView: {
    marginBottom: spacing.lg,
  },
  graphEmptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  graphEmptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  graphConfigButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  graphConfigButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  graphStepsContainer: {
    borderRadius: 12,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  graphStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 340,
  },
  graphStepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  graphStep: {
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  graphEmptyProgress: {
    fontSize: 48,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  graphProgressBarContainer: {
    width: '100%',
    maxWidth: 300,
    marginBottom: spacing.md,
  },
  graphProgressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  graphProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  pluginsContainer: {
    flex: 1,
    borderRightWidth: 1,
    padding: spacing.lg,
  },
  pluginsTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  pluginsSubtitle: {
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  pluginGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  pluginCard: {
    width: 140,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  pluginIcon: {
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pluginName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  pluginDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  pluginStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
  },
  pluginStatusEnabled: {
  },
  pluginStatusText: {
    fontSize: 11,
  },
  pluginStatusTextEnabled: {
  },
  detailPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
  },
  // 任务列表样式
  // 任务列表样式（双栏布局 - 占据剩余空间）
  tasksContainerFull: {
    flex: 1,
  },
  tasksContainer: {
    flex: 1,
    borderRightWidth: 1,
  },
  tasksHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  tasksTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  tasksSubtitle: {
    fontSize: 13,
    marginTop: spacing.xs,
  },
  tasksListContent: {
    padding: spacing.md,
  },
  taskCard: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  taskPlatformIcon: {
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  taskUrl: {
    fontSize: 12,
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    width: 35,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  taskTime: {
    fontSize: 12,
  },
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    padding: spacing.sm,
    borderRadius: 6,
    marginTop: spacing.sm,
  },
  emptyContainer: {
    padding: spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
  },
  // 内容列表包装器
  contentListWrapper: {
    width: 360,
    height: '100%',
  },
  contentListHeader: {
    padding: spacing.md,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contentListTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  importButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  importButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // 导入面板样式
  importPanel: {
    flex: 1,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  importPanelContentWrapper: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  importPanelInner: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingBottom: spacing.xl * 2,
  },
  // 活动任务进度显示
  activeTaskProgress: {
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  // 导入提示
  importHint: {
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  importHintText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  activeTaskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  activeTaskTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  activeTaskStatus: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: spacing.sm,
  },
  successMessage: {
    fontSize: 13,
    marginTop: spacing.xs,
  },
  errorMessage: {
    fontSize: 13,
    marginTop: spacing.xs,
  },
  importHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  importPanelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  importPanelTitle: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },
  importPanelSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  importSection: {
    marginBottom: spacing.xl,
  },
  // URL 输入框 - Google 风格
  urlInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 52,
    paddingHorizontal: 12,
  },
  urlInputBoxFocused: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  urlInputLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    minHeight: 50,
  },
  urlInputIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  urlInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    paddingHorizontal: 0,
    paddingTop: 14,
    paddingBottom: 2,
    maxHeight: 120,
    outlineStyle: { width: 0 },
    outlineColor: 'transparent',
  },
  clearButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    marginLeft: 4,
    marginRight: 2,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  urlInputDivider: {
    width: 1,
    height: 24,
    marginLeft: 8,
    marginRight: 8,
  },
  urlInputButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    minHeight: 32,
  },
  urlInputButtonDisabled: {
  },
  urlInputButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  platformHint: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  platformHintText: {
    fontSize: 13,
    lineHeight: 20,
  },
  recentTasksSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
  },
  importSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  recentTask: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderRadius: 8,
  },
  recentTaskInfo: {
    flex: 1,
  },
  recentTaskTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  recentTaskStatus: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: '500',
  },
  cancelTaskButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    marginLeft: spacing.sm,
  },
  cancelTaskButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // 知识图谱节点详情面板
  nodeDetailPanel: {
    width: 360,
    height: '100%',
    borderLeftWidth: 1,
  },
  nodeDetailContent: {
    flex: 1,
    padding: spacing.lg,
  },
  nodeDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  nodeDetailTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    gap: 6,
  },
  nodeDetailTypeIcon: {
    fontSize: 14,
  },
  nodeDetailTypeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nodeDetailClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDetailCloseText: {
    fontSize: 14,
  },
  nodeDetailTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.lg,
    lineHeight: 28,
  },
  nodeDetailGroup: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: 10,
  },
  nodeDetailGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  nodeDetailGroupIcon: {
    fontSize: 12,
  },
  nodeDetailGroupLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nodeDetailGroupValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  nodeDetailSection: {
    marginBottom: spacing.lg,
  },
  nodeDetailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: 6,
  },
  nodeDetailSectionIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDetailSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nodeDetailSectionCount: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  nodeDetailDescriptionBox: {
    borderRadius: 10,
    padding: spacing.md,
  },
  nodeDetailDescription: {
    fontSize: 13,
    lineHeight: 22,
  },
  nodeDetailStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  nodeDetailStat: {
    padding: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
  },
  nodeDetailStatNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  nodeDetailStatLabel: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  nodeDetailEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  nodeDetailEmptyIcon: {
    fontSize: 56,
    marginBottom: spacing.lg,
    opacity: 0.4,
  },
  nodeDetailEmptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  nodeDetailEmptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  // 关联笔记列表
  relatedFragmentsList: {
    gap: spacing.sm,
  },
  relatedFragmentCard: {
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    position: 'relative',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  relatedFragmentCardActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  relatedFragmentIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    fontSize: 11,
    fontWeight: '700',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    lineHeight: 24,
    flexShrink: 0,
  },
  relatedFragmentContent: {
    flex: 1,
  },
  relatedFragmentTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  relatedFragmentSummary: {
    fontSize: 11,
    lineHeight: 16,
  },
  noRelatedFragmentsBox: {
    borderRadius: 10,
    padding: spacing.xl,
    alignItems: 'center',
  },
  noRelatedFragmentsIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
    opacity: 0.5,
  },
  noRelatedFragments: {
    fontSize: 13,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: spacing.md,
    bottom: spacing.md,
    width: 3,
    borderRadius: 2,
  },
  // 笔记预览
  fragmentPreview: {
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
  },
  fragmentPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  fragmentPreviewContent: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  viewFullButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  viewFullButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fragmentNotFound: {
    fontSize: 12,
    fontStyle: 'italic',
    padding: spacing.sm,
  },
  // 笔记详情侧滑面板
  noteDetailSlidePanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 500,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 1000,
    borderLeftWidth: 1,
  },
  noteDetailSlideContent: {
    flex: 1,
    padding: spacing.lg,
  },
  noteDetailSlideScroll: {
    flex: 1,
  },
  noteDetailSlideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  noteDetailSlideHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noteDetailSlideViewOriginal: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  noteDetailSlideViewOriginalText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noteDetailSlideTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  noteDetailSlideClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteDetailSlideCloseText: {
    fontSize: 20,
    fontWeight: '500',
  },
  noteDetailSlideBody: {
    paddingVertical: spacing.md,
    maxWidth: 670,
    width: '100%',
  },
  // Markdown 样式
  mdH1: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 28,
    marginBottom: 12,
    letterSpacing: -0.5,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  mdH2: {
    fontSize: 26,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  mdH3: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  mdH4: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 18,
    marginBottom: 8,
  },
  mdH5: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 6,
  },
  mdH6: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 6,
  },
  mdP: {
    fontSize: 16,
    lineHeight: 1.7,
    marginBottom: 8,
  },
  mdLink: {
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  mdImage: {
    maxWidth: '100%',
    borderRadius: 12,
    marginVertical: 12,
  },
  mdCode: {
    padding: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
  },
  mdPre: {
    padding: 16,
    borderRadius: 8,
    overflowX: 'auto',
    marginVertical: 12,
  },
  mdUl: {
    paddingLeft: 24,
    marginVertical: 10,
  },
  mdOl: {
    paddingLeft: 24,
    marginVertical: 10,
  },
  mdLi: {
    fontSize: 16,
    lineHeight: 1.7,
    marginBottom: 6,
  },
  mdBlockquote: {
    borderLeftWidth: 4,
    paddingLeft: 20,
    fontStyle: 'italic',
    padding: 14,
    marginVertical: 14,
  },
});

export default ThreeColumnLayout;
