// Mock 数据 - Fragment（知识片段）

export interface Fragment {
  id: string;
  type: 'note' | 'import';
  title: string;
  content: string;
  source_type?: string;
  source_url?: string;
  platform?: string;  // original, wechat, xiaohongshu, bilibili, youtube, other
  tags: string[];
  summary?: string;
  entities?: string[];
  created_at: string;
  updated_at: string;
}

export const MOCK_FRAGMENTS: Fragment[] = [
  // 原创笔记
  {
    id: '1',
    type: 'note',
    title: 'React Hooks 最佳实践',
    content: `# React Hooks 最佳实践

## useState
- 初始状态只设置一次
- 更新函数形式用于依赖前一个状态
- 可以多次使用 useState

## useEffect
- 注意依赖数组的设置
- 清理函数用于副作用清理
- 可以多次使用 useEffect

## useCallback & useMemo
- 用于性能优化
- 避免不必要的重新渲染
- 不要过早优化

## 自定义 Hook
- 提取可复用逻辑
- 命名以 use 开头
- 可以在多个组件间共享状态`,
    tags: ['React', 'Hooks', '前端'],
    summary: '本文总结了 React Hooks 的使用技巧和注意事项，包括 useState、useEffect、useCallback 等核心 Hook 的最佳实践。',
    entities: ['React', 'Hooks', 'useState', 'useEffect'],
    created_at: '2024-01-15 10:30:00',
    updated_at: '2024-01-15 14:20:00',
  },
  {
    id: '2',
    type: 'note',
    title: 'TypeScript 泛型详解',
    content: `# TypeScript 泛型详解

## 什么是泛型
泛型允许我们创建可重用的、灵活的组件和函数。

## 基础用法
\`\`\`typescript
function identity<T>(arg: T): T {
  return arg;
}
\`\`\`

## 泛型约束
\`\`\`typescript
interface Lengthwise {
  length: number;
}

function loggingIdentity<T extends Lengthwise>(arg: T): T {
  console.log(arg.length);
  return arg;
}
\`\`\`

## 常用场景
- 数组和列表
- Promise
- React 组件 Props`,
    tags: ['TypeScript', '泛型'],
    summary: '详细讲解 TypeScript 泛型的概念、用法和常见场景。',
    entities: ['TypeScript', '泛型'],
    created_at: '2024-01-14 09:00:00',
    updated_at: '2024-01-14 11:30:00',
  },
  {
    id: '3',
    type: 'note',
    title: '知识图谱构建方法',
    content: `# 知识图谱构建方法

## 自顶向下
1. 定义本体层
2. 模式层设计
3. 数据层填充

## 自底向上
1. 数据采集
2. 实体抽取
3. 关系抽取
4. 知识融合

## 关键技术
- 命名实体识别 (NER)
- 关系抽取 (RE)
- 实体消歧
- 知识融合`,
    tags: ['知识图谱', 'AI', 'NLP'],
    summary: '介绍知识图谱的构建方法，包括自顶向下和自底向上两种方式。',
    entities: ['知识图谱', '实体抽取', '关系抽取'],
    created_at: '2024-01-13 15:00:00',
    updated_at: '2024-01-13 16:45:00',
  },

  // 导入内容
  {
    id: '4',
    type: 'import',
    title: '深入理解 JavaScript 闭包',
    content: `闭包是 JavaScript 中最重要也最难理解的概念之一...

闭包是指那些能够访问自由变量的函数。自由变量是指在函数中使用的，但既不是函数参数也不是函数局部变量的变量。

## 核心要点
1. 闭包让你可以在外部访问函数内部的变量
2. 闭包会导致内存泄漏风险
3. 闭包在实际开发中应用广泛`,
    source_type: 'wechat',
    source_url: 'https://mp.weixin.qq.com/s/xxx',
    tags: ['JavaScript', '闭包', '前端'],
    summary: '本文深入讲解了 JavaScript 闭包的概念、原理和实际应用，帮助读者彻底理解这个重要概念。',
    entities: ['JavaScript', '闭包', '作用域'],
    created_at: '2024-01-12 20:00:00',
    updated_at: '2024-01-12 20:00:00',
  },
  {
    id: '5',
    type: 'import',
    title: '2024 年前端开发趋势',
    content: `2024 年前端开发有哪些新趋势？

1. React Server Components 逐渐成熟
2. TypeScript 成为标配
3. 构建工具更加快速
4. AI 辅助编程普及
5. WebAssembly 应用增多`,
    source_type: 'xiaohongshu',
    source_url: 'https://xiaohongshu.com/explore/xxx',
    tags: ['前端', '趋势', '2024'],
    summary: '盘点 2024 年前端开发的主要趋势，包括 RSC、TypeScript 普及、AI 编程等。',
    entities: ['React', 'TypeScript', 'WebAssembly'],
    created_at: '2024-01-11 18:30:00',
    updated_at: '2024-01-11 18:30:00',
  },
  {
    id: '6',
    type: 'import',
    title: '如何学习机器学习',
    content: `机器学习入门指南

## 前置知识
- 线性代数
- 概率统计
- Python 编程

## 学习路线
1. 基础算法（线性回归、逻辑回归）
2. 常用算法（决策树、SVM）
3. 深度学习（CNN、RNN、Transformer）

## 实践项目
- Kaggle 竞赛
- 个人项目`,
    source_type: 'bilibili',
    source_url: 'https://bilibili.com/video/BVxxx',
    tags: ['机器学习', 'AI', '学习路线'],
    summary: '机器学习入门指南，包含前置知识、学习路线和实践项目建议。',
    entities: ['机器学习', '深度学习', 'CNN', 'RNN'],
    created_at: '2024-01-10 14:00:00',
    updated_at: '2024-01-10 14:00:00',
  },
  {
    id: '7',
    type: 'import',
    title: '高效学习法：费曼技巧',
    content: `费曼技巧是一种高效的学习方法，由诺贝尔物理学奖得主理查德·费曼提出。

## 四个步骤
1. 选择概念
2. 教给别人（或假装教）
3. 遇到问题回头学习
4. 简化和类比

## 核心思想
如果你不能简单地解释它，你就没有真正理解它。`,
    source_type: 'wechat',
    source_url: 'https://mp.weixin.qq.com/s/yyy',
    tags: ['学习方法', '效率'],
    summary: '介绍费曼技巧的四个步骤和核心思想，帮助提高学习效率。',
    entities: ['费曼技巧', '学习方法'],
    created_at: '2024-01-09 10:00:00',
    updated_at: '2024-01-09 10:00:00',
  },
];

// Mock 数据 - 知识图谱实体
export interface GraphEntity {
  id: string;
  name: string;
  type: 'concept' | 'technology' | 'person' | 'organization';
  description?: string;
  relations: GraphRelation[];
}

export interface GraphRelation {
  targetId: string;
  type: string;
}

export const MOCK_ENTITIES: GraphEntity[] = [
  {
    id: 'e1',
    name: 'React',
    type: 'technology',
    description: 'Facebook 开发的 JavaScript UI 库',
    relations: [
      { targetId: 'e2', type: 'RELATED_TO' },
      { targetId: 'e3', type: 'USES' },
      { targetId: 'e4', type: 'USES' },
    ],
  },
  {
    id: 'e2',
    name: '前端',
    type: 'concept',
    description: 'Web 开发的前端领域',
    relations: [
      { targetId: 'e3', type: 'INCLUDES' },
      { targetId: 'e5', type: 'INCLUDES' },
    ],
  },
  {
    id: 'e3',
    name: 'JavaScript',
    type: 'technology',
    description: 'Web 编程语言',
    relations: [
      { targetId: 'e6', type: 'HAS_CONCEPT' },
    ],
  },
  {
    id: 'e4',
    name: 'Hooks',
    type: 'concept',
    description: 'React 16.8 引入的新特性',
    relations: [],
  },
  {
    id: 'e5',
    name: 'TypeScript',
    type: 'technology',
    description: 'Microsoft 开发的 TypeScript 超集',
    relations: [
      { targetId: 'e7', type: 'HAS_CONCEPT' },
    ],
  },
  {
    id: 'e6',
    name: '闭包',
    type: 'concept',
    description: 'JavaScript 重要概念',
    relations: [],
  },
  {
    id: 'e7',
    name: '泛型',
    type: 'concept',
    description: 'TypeScript 类型系统特性',
    relations: [],
  },
  {
    id: 'e8',
    name: '知识图谱',
    type: 'concept',
    description: '结构化的语义知识库',
    relations: [
      { targetId: 'e9', type: 'USES' },
      { targetId: 'e10', type: 'USES' },
    ],
  },
  {
    id: 'e9',
    name: '实体抽取',
    type: 'technology',
    description: '从文本中识别实体',
    relations: [],
  },
  {
    id: 'e10',
    name: '关系抽取',
    type: 'technology',
    description: '从文本中抽取实体关系',
    relations: [],
  },
  {
    id: 'e11',
    name: '机器学习',
    type: 'concept',
    description: 'AI 的核心领域',
    relations: [
      { targetId: 'e12', type: 'INCLUDES' },
    ],
  },
  {
    id: 'e12',
    name: '深度学习',
    type: 'concept',
    description: '机器学习的子领域',
    relations: [
      { targetId: 'e13', type: 'INCLUDES' },
      { targetId: 'e14', type: 'INCLUDES' },
    ],
  },
  {
    id: 'e13',
    name: 'CNN',
    type: 'technology',
    description: '卷积神经网络',
    relations: [],
  },
  {
    id: 'e14',
    name: 'RNN',
    type: 'technology',
    description: '循环神经网络',
    relations: [],
  },
];

// Mock 数据 - 标签
export const MOCK_TAGS = [
  { id: 't1', name: 'React', color: '#61DAFB', count: 5 },
  { id: 't2', name: 'TypeScript', color: '#3178C6', count: 3 },
  { id: 't3', name: '前端', color: '#E34C26', count: 8 },
  { id: 't4', name: 'JavaScript', color: '#F7DF1E', count: 4 },
  { id: 't5', name: 'AI', color: '#10B981', count: 3 },
  { id: 't6', name: '知识图谱', color: '#8B5CF6', count: 2 },
  { id: 't7', name: '学习方法', color: '#F59E0B', count: 2 },
  { id: 't8', name: '机器学习', color: '#EF4444', count: 2 },
];

// Mock 搜索建议
export const MOCK_SEARCH_SUGGESTIONS = [
  'React Hooks',
  'TypeScript 泛型',
  '知识图谱构建',
  '机器学习入门',
  '前端 2024 趋势',
];

// Mock 插件列表
export interface Plugin {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: string;
}

export const MOCK_PLUGINS: Plugin[] = [
  {
    id: 'p1',
    name: '自媒体助手',
    description: '多平台格式转换、爆款分析',
    enabled: false,
    icon: '📱',
  },
  {
    id: 'p2',
    name: '论文助手',
    description: '文献管理、引用生成',
    enabled: false,
    icon: '📚',
  },
  {
    id: 'p3',
    name: '知乎导入',
    description: '一键导入知乎回答和文章',
    enabled: true,
    icon: '📝',
  },
  {
    id: 'p4',
    name: 'GitHub 集成',
    description: '同步 GitHub 项目和 Issue',
    enabled: false,
    icon: '🐙',
  },
];
