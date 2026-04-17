# 图标使用规范

## 规则

- **所有图标必须使用 `lucide-react-native`**
- 禁止直接使用其他图标库（如 `@expo/vector-icons` 等）
- 图标统一从 `src/components/icons/index.tsx` 导入

## 使用方法

### 1. 导入图标

```tsx
import { SparklesIcon, SettingsIcon, PlusIcon } from '../components/icons';
// 或
import { SparklesIcon } from '@/components/icons';
```

### 2. 使用图标

```tsx
<SparklesIcon size={24} color={colors.primary} />
```

### 3. 添加新图标

如需使用新图标，按以下步骤操作：

1. 打开 `src/components/icons/index.tsx`
2. 从 `lucide-react-native` 导入所需图标
3. 导出带 `Icon` 后缀的别名

```tsx
// 1. 导入
import { NewIcon, AnotherIcon } from 'lucide-react-native';

// 2. 导出
export { NewIcon as NewIcon };
export { AnotherIcon as AnotherIcon };
```

## 图标命名规范

- 导出时使用 `XXXIcon` 格式（如 `SettingsIcon` 而非 `Settings`）
- 保持与 lucide 原始名称一致，仅添加 Icon 后缀
- 常用图标已预定义：
  - `SparklesIcon` - Logo/AI 相关
  - `BookIcon` - 笔记
  - `NetworkIcon` - 知识图谱
  - `SettingsIcon` - 设置
  - `PlusIcon` - 添加
  - `EditIcon` - 编辑
  - `TrashIcon` - 删除
  - `CloseIcon` - 关闭

## 图标尺寸规范

- 小图标：16-20px（列表项、按钮内）
- 中图标：24px（默认，导航、工具栏）
- 大图标：32-40px（空状态、功能入口）

## 图标颜色规范

- 使用主题颜色：`colors.primary`, `colors.text`, `colors.secondary`
- 禁用状态：`colors.disabled` 或 opacity: 0.5
- 始终通过 `color` 属性传入，避免硬编码
