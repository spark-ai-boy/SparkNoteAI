// 动态分组图标组件 - 根据后端返回的图标名渲染对应图标

import React from 'react';
import {
  Sparkles,
  FileText,
  Tag,
  Image,
  Network,
  MessageSquare,
  Settings,
  Database,
  Bot,
  Book,
  type LucideProps,
} from 'lucide-react-native';

// 图标名称到组件的映射
const ICON_MAP: Record<string, React.FC<LucideProps>> = {
  sparkles: Sparkles,
  'file-text': FileText,
  tag: Tag,
  image: Image,
  network: Network,
  'message-square': MessageSquare,
  settings: Settings,
  database: Database,
  bot: Bot,
  book: Book,
};

interface GroupIconProps {
  name: string;
  size?: number;
  color?: string;
}

export const GroupIcon: React.FC<GroupIconProps> = ({
  name,
  size = 16,
  color = '#6366f1',
}) => {
  // 图标名转小写并处理连字符
  const iconKey = name.toLowerCase();
  const IconComponent = ICON_MAP[iconKey] || Settings;

  return <IconComponent size={size} color={color} />;
};

export default GroupIcon;
