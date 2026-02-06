# FimCode

基于 [Bun](https://bun.com) + [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript) 构建的 AI 编码代理，支持工具调用、技能加载、子代理与任务规划。

## 功能特性

- **基础工具**：bash、read_file、write_file、edit_file 等
- **任务规划**：`todo_write` 工具 + TodoManager 管理多步骤任务
- **子代理**：Task 工具调用专注子代理，上下文隔离
- **技能系统**：Skill 工具加载 `skills/` 下的领域知识，支持知识外化

## 环境要求

- [Bun](https://bun.sh)（推荐 v1.3+）
- 环境变量：`ANTHROPIC_AUTH_TOKEN`（必需）、`ANTHROPIC_BASE_URL`（可选）

## 快速开始

### 安装依赖

```bash
bun install
```

### 运行

```bash
bun run index.ts
```

启动后进入交互模式，输入任务描述，输入 `exit` 或 `q` 退出。

## VS Code 调试

项目已配置 `.vscode/launch.json`，支持断点调试。

### 前置条件

安装 [Bun for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=oven.bun-vscode) 扩展（由 Oven 发布）。

### 调试配置

| 配置名称 | 说明 |
|---------|------|
| **[Bun] 调试 index.ts** | 调试主入口 `index.ts` |
| **[Bun] 调试当前文件** | 调试当前在编辑器中打开的文件 |
| **[Bun] 运行当前文件** | 运行当前文件（不进入调试） |
| **[Bun] 附加到进程** | 附加到已用 `bun --inspect` 启动的进程（默认端口 6499） |

### 使用方法

1. 在代码行号左侧点击设置断点
2. 按 `F5` 或打开「运行和调试」面板，选择对应配置
3. 程序会在断点处暂停，可查看变量、单步执行等

### 传参调试

调试 `index.ts` 时如需传入参数，可在 `.vscode/launch.json` 中修改 `[Bun] 调试 index.ts` 的 `args` 字段，例如：

```json
"args": ["帮我查看当前项目"]
```

## 项目结构

```
.
├── config.ts         # 统一配置（client、MODEL、WORKDIR）
├── index.ts          # 主入口，REPL 交互循环
├── agent.ts          # Agent 主循环与系统提示
├── manager/          # SkillLoader、TodoManager，导出 SKILLS 实例
├── tools/            # 工具实现（注册表模式）
│   ├── registry.ts   # 工具注册与分发
│   ├── bash.ts
│   ├── skill.ts
│   ├── task.ts
│   └── ...
├── skills/           # 技能目录，每个技能一个子目录含 SKILL.md
└── utils/            # 工具函数（如路径安全）
```
