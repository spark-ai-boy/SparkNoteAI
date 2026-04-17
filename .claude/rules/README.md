# Claude Rules

本目录包含 SparkNoteAI 项目的开发规范规则，供 Claude Code 参考使用。

## 规则文件

规则按优先级数字前缀排序，数字越小优先级越高。

| 文件 | 说明 |
|------|------|
| `01-icons.md` | 图标使用规范 - **必须使用 lucide-react-native** |
| `02-frontend.md` | 前端开发规范 (React Native + Expo + TypeScript) |
| `03-backend.md` | 后端开发规范 (FastAPI + Python) |
| `04-code-style.md` | 通用代码风格与 Git 提交规范 |

## 使用方式

Claude Code 会自动读取 `.claude/rules` 目录下的规则文件，并在处理相关代码时遵循这些规范。

## 规则更新

如需更新规则：
1. 直接编辑对应 `.md` 文件
2. 保持 Markdown 格式，使用清晰的标题层级
3. 添加代码示例说明规范要求
