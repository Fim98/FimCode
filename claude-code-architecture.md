# 从零构建 Claude Code:理解强大 Agent 的工作原理

让 Claude Code 强大的核心其实出奇的简单:它是一个循环,让 AI 读取文件、运行命令,并不断迭代直到任务完成。

复杂性来自于处理边界情况、构建良好的用户体验,以及与实际开发工作流的集成。

在这篇文章中,我将从零开始逐步构建 Claude Code 的架构,展示你如何能从第一性原理自己发明它,只需要一个终端、一个 LLM API 和让 AI 真正有用的愿望。

## 最终目标:学习强大的 agent 如何工作,以便你可以构建自己的

首先,让我们明确我们要解决的问题。

当你在浏览器中使用 ChatGPT 或 Claude 时,你在做很多手工劳动:

- 从聊天中复制粘贴代码到文件
- 自己运行命令,然后将错误复制回去
- 通过上传文件或粘贴内容提供上下文
- 手动迭代修复-测试-调试循环

你本质上充当了 AI 的双手。AI 思考;你执行。

**如果 AI 也能执行呢?**

想象一下告诉 AI:"修复 auth.py 中的 bug",然后离开。当你回来时,bug 已经修复了。AI 读取了文件,理解了它,尝试了修复,运行了测试,看到测试失败,尝试了另一种方法,最终成功了。

这就是 **agent** 所做的。它是一个可以:

1. 在现实世界中采取行动(读取文件、运行命令)
2. 观察结果
3. 决定下一步做什么
4. 重复直到任务完成

让我们从零开始构建一个。

## 最简单的 Agent

让我们从绝对最小开始:一个可以运行单个 bash 命令的 AI。

```typescript
#!/usr/bin/env bun
// agent-v0.ts - 最简单的可能 agent
import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error("ANTHROPIC_API_KEY environment variable is required");
}

const client = new Anthropic({ apiKey });

const prompt = process.argv[2];
if (!prompt) {
  console.log("Usage: bun agent-v0.ts '<your prompt>'");
  process.exit(1);
}

// 询问 Claude 运行什么命令
const response = await client.messages.create({
  model: "claude-opus-4-5-20251101",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: `${prompt}\n\n只用 bash 命令响应。不要 markdown,不要解释,不要代码块。`,
    },
  ],
});

const command =
  response.content[0].type === "text" ? response.content[0].text : "";

console.log(`AI 建议: ${command}`);

const confirm = prompt("运行此命令? (y/n) ");
if (confirm?.toLowerCase() === "y") {
  const proc = Bun.spawn(["bash", "-c", command], {
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
}
```

使用方法:

```bash
bun agent-v0.ts "列出此目录中的所有 Python 文件"
# AI 建议: ls *.py
# 运行此命令? (y/n)
```

这并不是很有用。AI 可以建议**一个**命令,然后你又回到手动操作所有事情。

但这里有一个关键洞察:**如果我们把它放在一个循环中呢?**

## 目标:创建 agent 循环

所有 AI agent 背后的基本洞察是 **agent 循环**:

```plaintext
while (任务未完成):
    1. AI 决定下一步做什么
    2. 执行该动作
    3. 向 AI 展示结果
    4. 返回步骤 1
```

让我们准确实现这一点。AI 需要告诉我们:

- 采取什么行动
- 是否完成

我们将使用一个简单的 JSON 格式:

```typescript
#!/usr/bin/env bun
// agent-v1.ts - 带循环的 Agent
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const SYSTEM_PROMPT = `你是一个可以运行 bash 命令的有用助手。

当用户给你一个任务时,用这个确切的格式响应 JSON:
{"action": "bash", "command": "你的命令在这里"}

当任务完成时,响应:
{"action": "done", "message": "完成内容的解释"}

只响应 JSON。没有其他文本。`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

const messages: Message[] = [];

async function runAgent(userMessage: string) {
  messages.push({ role: "user", content: userMessage });

  while (true) {
    const response = await client.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages,
    });

    const aiText =
      response.content[0].type === "text" ? response.content[0].text : "";

    messages.push({ role: "assistant", content: aiText });

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(aiText);
    } catch {
      console.log(`❌ 无法解析响应: ${aiText}`);
      break;
    }

    const action = parsedResponse.action;

    if (!action) {
      console.log(`❌ 无法解析响应: ${aiText}`);
      break;
    } else if (action === "done") {
      console.log(`✅ ${parsedResponse.message}`);
      break;
    } else if (action === "bash") {
      const command = parsedResponse.command;
      console.log(`🔧 运行: ${command}`);

      const proc = Bun.spawn(["bash", "-c", command], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const output = await new Response(proc.stdout).text();
      const error = await new Response(proc.stderr).text();
      const result = output + error;

      console.log(result);

      messages.push({ role: "user", content: `命令输出: ${result}` });
    } else {
      console.log(`❌ 未知动作: ${action}`);
      break;
    }
  }
}

const task = process.argv[2];
if (!task) {
  console.log("Usage: bun agent-v1.ts '<your task>'");
  process.exit(1);
}

await runAgent(task);
```

现在我们有了可以实际**迭代**的东西:

```bash
bun agent-v1.ts "创建一个名为 hello.py 的文件,打印 hello world,然后运行它"

# 🔧 运行: echo 'print("hello world")' > hello.py
# 🔧 运行: python hello.py
# hello world
# ✅ 创建了 hello.py 并成功执行。它打印 "hello world"。
```

AI 运行了**两个**命令,然后告诉我们完成了。我们创建了一个 agent 循环!

**但是等等!我们在没有安全检查的情况下执行任意命令。** AI 可能会 rm -rf /,我们会盲目执行。

## 目标:添加权限控制

让我们为危险操作添加人工审核。首先,我们定义一个函数,用安全检查包装命令执行:

```typescript
// 在脚本中的 runAgent 之前添加此函数
const DANGEROUS_PATTERNS = ["rm ", "sudo ", "chmod ", "mv ", "cp ", "> ", ">>"];

function checkPermission(command: string): boolean {
  if (DANGEROUS_PATTERNS.some((p) => command.includes(p))) {
    console.log(`\n⚠️  潜在危险命令: ${command}`);
    const confirm = prompt("允许? (y/n): ");
    return confirm?.toLowerCase() === "y";
  }
  return true;
}
```

然后,在 agent 循环内,我们在执行之前检查权限:

```typescript
// 在执行命令之前
if (!checkPermission(command)) {
  const result = "用户拒绝权限";
  console.log(`   🚫 ${result}`);
  messages.push({ role: "user", content: result });
  continue;
}
```

就是这样!该函数位于 AI 的请求和实际执行之间,让你有机会阻止危险命令。被拒绝时,你可以将其反馈给 AI,以便它可以尝试不同的方法。

试试看:

```bash
# 创建一个测试文件
echo 'print("hello world")' > hello.py

# 要求 agent 删除它
bun agent-v1.ts "删除文件 hello.py"

# 🔧 运行: rm hello.py
# ⚠️  潜在危险命令: rm hello.py
# 允许? (y/n)
```

输入 y 允许删除,或输入 n 阻止它。

这是权限系统的开始。Claude Code 在以下方面做得更进一步:

- 特定工具的权限(文件编辑 vs. bash 命令)
- 基于模式的允许列表(Bash(npm test:*) 允许任何 npm test 命令)
- 会话级别的"全部接受"模式,当你信任 AI 时

关键洞察:**人类应该能够控制 AI 可以做什么**,但要有足够的粒度,这样就不会令人烦恼。

## 目标:超越 bash - 添加工具

运行 bash 命令很强大,但它也:

- **危险**:对系统的无限访问
- **低效**:读取文件不应该生成子进程
- **不精确**:输出解析很脆弱

如果我们给 AI **结构化工具**会怎样?

我们将在这里切换到更完整的 TypeScript,因为它更清晰地处理 JSON 和 API 调用:

```typescript
#!/usr/bin/env bun
// agent-v2.ts - 带结构化工具的 Agent
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const TOOLS: Anthropic.Tool[] = [
  {
    name: "read_file",
    description: "读取文件的内容",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "文件路径" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "向文件写入内容",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "文件路径" },
        content: { type: "string", description: "要写入的内容" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "run_bash",
    description: "运行 bash 命令",
    input_schema: {
      type: "object",
      properties: {
        command: { type: "string", description: "要运行的命令" },
      },
      required: ["command"],
    },
  },
];

async function executeTool(name: string, input: any): Promise<string> {
  if (name === "read_file") {
    try {
      const file = Bun.file(input.path);
      const content = await file.text();
      return content;
    } catch (e: any) {
      return `错误: ${e.message}`;
    }
  } else if (name === "write_file") {
    try {
      await Bun.write(input.path, input.content);
      return `成功写入 ${input.path}`;
    } catch (e: any) {
      return `错误: ${e.message}`;
    }
  } else if (name === "run_bash") {
    try {
      const proc = Bun.spawn(["bash", "-c", input.command], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const output = await new Response(proc.stdout).text();
      const error = await new Response(proc.stderr).text();
      return output + error;
    } catch (e: any) {
      return `错误: ${e.message}`;
    }
  }
  return `未知工具: ${name}`;
}

async function runAgent(task: string) {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: task },
  ];

  while (true) {
    const response = await client.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 4096,
      tools: TOOLS,
      messages: messages,
    });

    // 检查是否完成
    if (response.stop_reason === "end_turn") {
      for (const block of response.content) {
        if (block.type === "text") {
          console.log(`✅ ${block.text}`);
        }
      }
      break;
    }

    // 处理工具使用
    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          console.log(`🔧 ${block.name}: ${JSON.stringify(block.input)}`);
          const result = await executeTool(block.name, block.input);
          console.log(
            `   → ${result.substring(0, 200)}${result.length > 200 ? "..." : ""}`
          );

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
    }
  }
}

const task = process.argv[2];
if (!task) {
  console.log("Usage: bun agent-v2.ts '<your task>'");
  process.exit(1);
}

await runAgent(task);
```

现在我们使用 Anthropic 的原生工具使用 API。这要好得多,因为:

1. **类型安全**:AI 确切知道每个工具接受什么参数
2. **显式操作**:读取文件是 *read_file* 调用,而不是 cat
3. **受控表面积**:我们决定存在哪些工具

试试看:

```bash
# 为 agent 创建一个测试文件
cat > main.py << 'EOF'
def calculate(x, y):
    return x + y

def greet(name):
    print(f"Hello, {name}!")
EOF

# 运行 agent
bun agent-v2.ts "读取 main.py 并为第一个函数添加文档字符串"

# 🔧 read_file: {"path": "main.py"}
#    → def calculate(x, y):...
# 🔧 write_file: {"path": "main.py", "content": "def calculate(x, y):\n    \"\"\"Calculate..."}
#    → 成功写入 main.py
# ✅ 我已经为 calculate 函数添加了文档字符串,解释了它的目的。
```

## 目标:使编辑精确

我们的 **write_file** 工具有一个问题:它替换整个文件。如果 AI 对 1000 行文件进行小改动,它必须输出所有 1000 行。这是:

- **昂贵的**:更多输出 token = 更多成本
- **容易出错**:AI 可能会意外丢失行
- **缓慢**:生成那么多文本需要时间

如果我们有一个用于**精确编辑**的工具呢?

```typescript
{
  name: "edit_file",
  description: "通过替换唯一字符串对文件进行精确编辑",
  input_schema: {
    type: "object",
    properties: {
      path: { type: "string" },
      old_str: { type: "string", description: "要查找的确切字符串(必须在文件中唯一)" },
      new_str: { type: "string", description: "用其替换的字符串" }
    },
    required: ["path", "old_str", "new_str"]
  }
}
```

实现:

```typescript
async function editFile(
  path: string,
  oldStr: string,
  newStr: string
): Promise<string> {
  const file = Bun.file(path);
  const content = await file.text();

  const count = content.split(oldStr).length - 1;
  if (count === 0) {
    return `错误: '${oldStr}' 在文件中未找到`;
  }
  if (count > 1) {
    return `错误: '${oldStr}' 找到 ${count} 次。必须唯一。`;
  }

  const newContent = content.replace(oldStr, newStr);
  await Bun.write(path, newContent);

  return `成功替换了 ${path} 中的文本`;
}
```

这正是 Claude Code 的 [str_replace](https://platform.claude.com/docs/en/agents-and-tools/tool-use/text-editor-tool#str-replace) 工具的工作方式。唯一性要求可能看起来很烦人,但它实际上是一个功能:

- 强制 AI 包含足够的上下文以避免歧义
- 创建易于人类审查的自然差异
- 防止意外的大规模替换

## 目标:搜索代码库

到目前为止,我们的 agent 可以读取它知道的文件。但是像"找到认证 bug 在哪里"这样的任务呢?

AI 需要**搜索**代码库。让我们为此添加工具。

```typescript
const SEARCH_TOOLS: Anthropic.Tool[] = [
  {
    name: "glob",
    description: "查找匹配模式的文件",
    input_schema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Glob 模式(例如,'**/*.ts')",
        },
      },
      required: ["pattern"],
    },
  },
  {
    name: "grep",
    description: "在文件中搜索模式",
    input_schema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "要搜索的正则表达式模式" },
        path: { type: "string", description: "要搜索的目录或文件" },
      },
      required: ["pattern"],
    },
  },
];
```

现在 AI 可以:

1. **glob("**/*.py")** → 查找所有 Python 文件
2. **grep("def authenticate", "src/")** → 查找认证代码
3. **read_file("src/auth.py")** → 读取相关文件
4. **edit_file(...)** → 修复 bug

这就是模式:给 AI 工具来**探索**,它就可以浏览它从未见过的代码库。

## 目标:上下文管理

这是你会很快遇到的问题:**上下文窗口是有限的**。

如果你在一个大型代码库上工作,对话可能看起来像:

- 用户:"修复认证中的 bug"
- AI:读取 10 个文件,运行 20 个命令,尝试 3 种方法
- ...对话现在是 100,000 token
- AI:*用完上下文并开始忘记早期信息*

我们如何处理这个?

**选项 1:总结(压缩)**

当上下文太长时,总结发生了什么:

```typescript
async function compactConversation(
  messages: Anthropic.MessageParam[]
): Promise<Anthropic.MessageParam[]> {
  const summaryPrompt = `简洁地总结此对话,保留:
    - 原始任务
    - 关键发现和决策
    - 工作的当前状态
    - 还需要做什么`;

  const summary = await client.messages.create({
    model: "claude-opus-4-5-20251101",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `${JSON.stringify(messages)}\n\n${summaryPrompt}`,
      },
    ],
  });

  const summaryText =
    summary.content[0].type === "text" ? summary.content[0].text : "";

  return [{ role: "user", content: `先前工作总结:\n${summaryText}` }];
}
```

**选项 2:子 agent(委托)**

对于复杂任务,用自己的上下文生成子 agent:

```typescript
async function delegateToSubagent(
  task: string,
  toolsAllowed: Anthropic.Tool[]
): Promise<string> {
  const result = await runAgent({
    task: task,
    tools: toolsAllowed,
    maxTurns: 10, // 防止无限循环
  });
  // 只返回结果,不返回完整对话
  return result.finalAnswer;
}
```

这就是为什么 Claude Code 有 **subagent** 的概念:专门的 agent 在自己的上下文中处理集中的任务,只返回结果。

## 目标:系统提示

我们一直忽略一些重要的东西:**AI 如何知道如何行为?**

系统提示是你编码的地方:

- AI 的身份和能力
- 工具使用指南
- 项目特定上下文
- 行为规则

这是使 Claude Code 有效的简化版本:

```typescript
const SYSTEM_PROMPT = `你是一个帮助软件开发任务的 AI 助手。
你可以访问以下工具:
- read_file: 读取文件内容
- write_file: 创建或覆盖文件
- edit_file: 对现有文件进行精确编辑
- glob: 按模式查找文件
- grep: 在文件中搜索模式
- bash: 运行 shell 命令

## 指南

### 在进行更改之前:
1. 在行动之前充分理解任务
2. 读取相关文件以理解上下文
3. 计划你的方法

### 编辑代码时:
1. 对小改动使用 edit_file(首选)
2. 仅对新文件或完全重写使用 write_file
3. 在可能时更改后运行测试
4. 如果测试失败,分析错误并迭代

### 一般原则:
- 简洁但彻底
- 简要解释你的推理
- 如果任务不明确,请寻求澄清
- 如果你卡住了,说出来而不是猜测

## 当前目录
你正在工作: ${process.cwd()}
`;
```

但这里有个问题:如果项目有特定的约定怎么办?如果团队使用特定的测试框架,或有非标准的目录结构呢?

## 目标:项目特定上下文(CLAUDE.md)

Claude Code 通过 **CLAUDE.md** 解决这个问题 - 项目根目录的一个文件,自动包含在上下文中:

```markdown
# CLAUDE.md

## 项目概述
这是一个用于用户认证的 FastAPI 应用程序。

## 关键命令
- `make test`: 运行所有测试
- `make lint`: 运行 linting
- `make dev`: 启动开发服务器

## 架构
- `src/api/`: API 路由
- `src/models/`: 数据库模型
- `src/services/`: 业务逻辑
- `tests/`: 测试文件(镜像 src/ 结构)

## 约定
- 所有函数必须有类型提示
- 使用 pydantic 用于请求/响应模型
- 在实现功能之前编写测试(TDD)

## 已知问题
- /auth/refresh 端点有竞态条件(见问题 #142)
```

现在 AI 知道:

- 如何为**这个**项目运行测试
- 在哪里找到东西
- 要遵循什么约定
- 要注意的已知陷阱

这是 Claude Code 最强大的功能之一:随代码传播的项目知识。

## 把它们放在一起

让我们看看我们构建了什么。AI 编码 agent 的核心是这个循环:

**1. 设置(运行一次)**

- 加载**系统提示**与工具描述、行为指南和项目上下文(CLAUDE.md)
- 初始化一个空的**对话历史**

**2. Agent 循环(重复直到完成)**

- 将对话历史发送到 **LLM**
- LLM 决定:*使用工具*或*响应用户*
- 如果**工具使用**:

```plaintext
1. 检查权限(如果危险则提示用户)
2. 执行工具(read_file, edit_file, bash, glob, grep 等)
3. 将结果添加到对话历史
4. 循环回到步骤 2
```

- 如果**最终答案**:

```plaintext
1. 向用户显示响应
2. 完成
```

就是这样。每个 AI 编码 agent,从我们的 50 行 bash 脚本到 Claude Code,都遵循这个模式。

现在让我们构建一个完整的、可工作的迷你 Claude Code,你可以实际使用。它结合了我们学到的一切:agent 循环、结构化工具、权限检查和交互式 REPL:

```typescript
#!/usr/bin/env bun
// mini-claude-code.ts - 一个最小的 Claude Code 克隆
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const TOOLS: Anthropic.Tool[] = [
  {
    name: "read_file",
    description: "读取文件的内容",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "文件路径" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "向文件写入内容(创建或覆盖)",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "文件路径" },
        content: { type: "string", description: "要写入的内容" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_files",
    description: "列出目录中的文件",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "目录路径(默认:当前目录)",
        },
      },
    },
  },
  {
    name: "run_command",
    description: "运行 shell 命令",
    input_schema: {
      type: "object",
      properties: {
        command: { type: "string", description: "要运行的命令" },
      },
      required: ["command"],
    },
  },
];

const DANGEROUS_PATTERNS = ["rm ", "sudo ", "chmod ", "mv ", "cp ", "> ", ">>"];

function checkPermission(toolName: string, toolInput: any): boolean {
  if (toolName === "run_command") {
    const cmd = toolInput.command || "";
    if (DANGEROUS_PATTERNS.some((p) => cmd.includes(p))) {
      console.log(`\n⚠️  潜在危险命令: ${cmd}`);
      const confirm = prompt("允许? (y/n): ");
      return confirm?.toLowerCase() === "y";
    }
  } else if (toolName === "write_file") {
    const path = toolInput.path || "";
    console.log(`\n📝 将写入: ${path}`);
    const confirm = prompt("允许? (y/n): ");
    return confirm?.toLowerCase() === "y";
  }
  return true;
}

async function executeTool(name: string, toolInput: any): Promise<string> {
  if (name === "read_file") {
    const path = toolInput.path;
    try {
      const file = Bun.file(path);
      const content = await file.text();
      return `${path} 的内容:\n${content}`;
    } catch (e: any) {
      return `读取文件错误: ${e.message}`;
    }
  } else if (name === "write_file") {
    const path = toolInput.path;
    const content = toolInput.content;
    try {
      await Bun.write(path, content);
      return `✅ 成功写入 ${path}`;
    } catch (e: any) {
      return `写入文件错误: ${e.message}`;
    }
  } else if (name === "list_files") {
    const path = toolInput.path || ".";
    try {
      const files = await Array.fromAsync(
        new Bun.Glob("*").scan({ cwd: path })
      );
      return `${path} 中的文件:\n${files.map((f) => `  ${f}`).join("\n")}`;
    } catch (e: any) {
      return `列出文件错误: ${e.message}`;
    }
  } else if (name === "run_command") {
    const cmd = toolInput.command;
    try {
      const proc = Bun.spawn(["bash", "-c", cmd], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const output = await new Response(proc.stdout).text();
      const error = await new Response(proc.stderr).text();
      const result = output + error;
      return result ? `$ ${cmd}\n${result}` : `$ ${cmd}\n(无输出)`;
    } catch (e: any) {
      return `运行命令错误: ${e.message}`;
    }
  }

  return `未知工具: ${name}`;
}

async function agentLoop(
  userMessage: string,
  conversationHistory: Anthropic.MessageParam[]
) {
  conversationHistory.push({ role: "user", content: userMessage });

  while (true) {
    const response = await client.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 4096,
      system: `你是一个有用的编码助手。工作目录: ${process.cwd()}`,
      tools: TOOLS,
      messages: conversationHistory,
    });

    conversationHistory.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      for (const block of response.content) {
        if (block.type === "text") {
          console.log(`\n🤖 ${block.text}`);
        }
      }
      break;
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const toolName = block.name;
        const toolInput = block.input;

        console.log(`\n🔧 ${toolName}: ${JSON.stringify(toolInput)}`);

        if (!checkPermission(toolName, toolInput)) {
          const result = "用户拒绝权限";
          console.log(`   🚫 ${result}`);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        } else {
          const result = await executeTool(toolName, toolInput);
          const display =
            result.substring(0, 200) + (result.length > 200 ? "..." : "");
          console.log(`   → ${display}`);

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }
    }

    conversationHistory.push({ role: "user", content: toolResults });
  }

  return conversationHistory;
}

async function main() {
  console.log("迷你 Claude Code");
  console.log(" 输入你的请求,或 'quit' 退出。\n");

  const conversationHistory: Anthropic.MessageParam[] = [];

  while (true) {
    try {
      const userInput = prompt("你: ")?.trim();
      if (!userInput) continue;
      if (["quit", "exit", "q"].includes(userInput.toLowerCase())) {
        console.log("再见!");
        break;
      }

      await agentLoop(userInput, conversationHistory);
    } catch (e) {
      if (e instanceof Error && e.message.includes("EOF")) {
        console.log("\n再见!");
        break;
      }
      throw e;
    }
  }
}

await main();
```

将其保存为 `mini-claude-code.ts` 并运行:

```bash
bun mini-claude-code.ts
```

这是一个会话的样子:

```bash
迷你 Claude Code
 输入你的请求,或 'quit' 退出。

你: 创建一个 python 文件,打印斐波那契数列直到 n

🔧 write_file: {"path": "fibonacci.py", "content": "def fibonacci(n):\n    ..."}

📝 将写入: fibonacci.py
允许? (y/n): y
   → ✅ 成功写入 fibonacci.py

🤖 我已经创建了 fibonacci.py,其中包含一个打印斐波那契数列的函数。
   你想让我运行它来测试吗?

你: 是的,用 n=10 运行它

🔧 run_command: {"command": "python fibonacci.py 10"}
   → $ python fibonacci.py 10
     0 1 1 2 3 5 8 13 21 34

🤖 脚本工作正常!它打印了前 10 个斐波那契数。

你: quit
再见!
```

这是一个约 150 行的可工作的迷你 Claude Code 克隆。它有:

- **交互式 REPL**:在提示之间保持对话上下文
- **多个工具**:读取、写入、列出文件、运行命令
- **权限检查**:在写入文件或运行危险命令之前询问
- **对话记忆**:每个后续都建立在先前的上下文上

这本质上是 Claude Code 所做的,加上:

- 精致的终端 UI
- 复杂的权限系统
- 当对话变长时的上下文压缩
- 复杂任务的子 agent 委托
- 自定义自动化的钩子
- 与 git 和其他开发工具的集成

## Claude Agent SDK

如果你想在这个基础上构建而不重新发明轮子,Anthropic 提供了 [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview)。它是驱动 Claude Code 的相同引擎,作为库公开。

这是我们的简单 agent 使用 SDK 的样子:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "修复 auth.py 中的 bug",
  options: {
    model: "claude-opus-4-5-20251101",
    allowedTools: ["Read", "Edit", "Bash", "Glob", "Grep"],
    maxTurns: 50,
  },
})) {
  if (message.type === "assistant") {
    for (const block of message.message.content) {
      if ("text" in block) {
        console.log(block.text);
      } else if ("name" in block) {
        console.log(`使用工具: ${block.name}`);
      }
    }
  }
}
```

SDK 处理:

- Agent 循环(所以你不必)
- 所有内置工具(Read, Write, Edit, Bash, Glob, Grep 等)
- 权限管理
- 上下文跟踪
- 子 agent 协调

## 我们学到了什么

从一个简单的 bash 脚本开始,我们发现:

1. **Agent 循环**:AI 决定 → 执行 → 观察 → 重复
2. **结构化工具**:比原始 bash 更安全和精确
3. **精确编辑**:str_replace 胜过完整文件重写
4. **搜索工具**:让 AI 探索代码库
5. **上下文管理**:压缩和委托处理长任务
6. **项目知识**:CLAUDE.md 提供项目特定上下文

每一个都源于一个实际问题:

- "我如何让 AI 做不止一件事?" → agent 循环
- "我如何防止它摧毁我的系统?" → 权限系统
- "我如何使编辑高效?" → str_replace 工具
- "它如何找到它不知道的代码?" → 搜索工具
- "当上下文用完时会发生什么?" → 压缩
- "它如何知道我的项目约定?" → CLAUDE.md

这就是你如何能发明 Claude Code。核心思想很简单。

再次强调 - 复杂性来自处理边界情况、构建良好的用户体验以及与实际开发工作流的集成。

## 下一步

如果你想构建自己的 agent:

1. **从简单开始**:一个带有 2-3 个工具的基本 agent 循环
2. **增量添加工具**:每个新能力都应该解决一个实际问题
3. **优雅处理错误**:工具会失败;你的 agent 应该恢复
4. **在实际任务上测试**:边界情况会教你缺少什么
5. **考虑使用 Claude Agent SDK**:为什么重新发明轮子?

软件开发的未来是可以实际**做**事情的 agent。现在我们知道它们是如何工作的!

*资源:*

- [Claude Agent SDK 文档](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Claude Code 文档](https://code.claude.com/docs)
- [Anthropic API 参考](https://docs.anthropic.com/)

> 如果你对构建可验证的 agent 感兴趣,请查看我们在 [@eigencloud](https://x.com/@eigencloud) 所做的工作 [这里](https://developers.eigencloud.xyz/?utm_source=x&utm_medium=social&utm_campaign=claude_from_scratch)。
