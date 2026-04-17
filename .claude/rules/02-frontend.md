# 前端开发规范

## 技术栈

- React Native 0.83.4 + Expo SDK 55
- TypeScript 5.9+
- React Navigation v7
- Zustand 状态管理
- lucide-react-native 图标

## 组件规范

### 文件组织

```
src/
├── components/
│   ├── common/          # 通用基础组件
│   ├── layout/          # 布局组件
│   ├── icons/           # 图标统一入口
│   └── [Feature].tsx    # 功能组件
├── screens/
│   ├── auth/            # 认证页面
│   └── main/            # 主功能页面
├── stores/              # Zustand stores
├── api/                 # API 客户端
├── theme/               # 主题配置
└── types/               # 类型定义
```

### 组件写法

```tsx
// 使用 React.FC 定义组件
interface Props {
  title: string;
  onPress?: () => void;
}

export const MyComponent: React.FC<Props> = ({ title, onPress }) => {
  // 组件逻辑
  return (
    // JSX
  );
};

export default MyComponent;
```

### 样式规范

- 使用 `StyleSheet.create` 创建样式
- 优先使用主题中的颜色、间距、字体大小
- 避免硬编码数值

```tsx
import { colors, spacing, fontSizes } from '../theme';

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSizes.lg,
    color: colors.text,
  },
});
```

## 状态管理

### Store 规范

```tsx
import { create } from 'zustand';

interface StoreState {
  // State
  data: DataType[];
  loading: boolean;

  // Actions
  setData: (data: DataType[]) => void;
  fetchData: () => Promise<void>;
}

export const useStore = create<StoreState>((set) => ({
  data: [],
  loading: false,
  setData: (data) => set({ data }),
  fetchData: async () => {
    set({ loading: true });
    // async logic
    set({ loading: false });
  },
}));
```

## API 调用

- 统一使用 `src/api/client.ts` 中的 axios 实例
- API 函数按模块分文件存放于 `src/api/`
- 使用 try-catch 处理错误，配合 Toast 或 Alert 提示

```tsx
import apiClient from './client';

export const fetchNotes = async () => {
  const response = await apiClient.get('/api/notes');
  return response.data;
};
```

## 导航规范

- 使用 React Navigation v7 的类型安全导航
- 在 `src/navigation/types.ts` 定义导航参数类型
- 页面组件统一放在 `src/screens/` 目录

## 类型定义

- 优先使用接口（`interface`）而非类型别名（`type`）
- 组件 Props 必须显式定义
- 复用类型定义于 `src/types/` 或 `@sparknoteai/shared`

## 性能优化

- 使用 `React.memo` 优化纯展示组件
- 使用 `useCallback` 缓存事件处理函数
- 列表使用 `FlatList` 或 `FlashList`，避免直接渲染大数组
