# 技能目录 (skills)

每个技能占一个子目录，目录名建议与 frontmatter 中的 `name` 一致（小写、简短）。

## SKILL.md 约定

- **name**：技能标识，小写短名（如 `pdf`、`mcp`），对应 Skill 工具的参数。
- **description**：一行描述，用于系统提示中的「可用技能」列表。建议格式：
  - 「能力简述。用于/适用于 XXX。」
  - 示例：`处理 PDF 文件。用于读取、提取文本、合并或创建 PDF。`

正文为 Markdown，写具体操作步骤与示例即可。

## 可选子目录

- `scripts/`：辅助脚本
- `references/`：参考文档
- `assets/`：模板、静态资源
