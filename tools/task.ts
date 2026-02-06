import type Anthropic from "@anthropic-ai/sdk";
import { client, MODEL } from "../config";
import { execute, getBaseTools } from "./registry";
/**
 * 代理类型配置
 */
export type AgentType = 'explore' | 'code' | 'plan';

interface AgentConfig {
  description: string;
  tools: string[] | '*';  // '*' 表示所有工具
  prompt: string;
}

/**
 * 代理类型注册表
 * 
 * 每种类型有：
 * - description: 给模型的说明
 * - tools: 允许的工具列表（'*'表示全部，但子代理不会获得Task工具以防止无限递归）
 * - prompt: 专门的系统提示
 */
export const AGENT_TYPES: Record<AgentType, AgentConfig> = {
  // 探索: 用于搜索和分析的只读代理
  // 不能修改文件 - 适合广泛探索
  explore: {
    description: '探索代码、查找文件、搜索的只读代理',
    tools: ['bash', 'read_file'],
    prompt: '你是一个探索代理。搜索和分析，但绝不修改文件。返回简洁的摘要。'
  },
  
  // 代码: 用于实现的完整功能代理
  // 拥有所有工具 - 用于实际的编码工作
  code: {
    description: '实现功能和修复错误的完整代理',
    tools: '*',
    prompt: '你是一个编码代理。高效地实现请求的更改。'
  },
  
  // 计划: 用于设计工作的分析代理
  // 只读，专注于生成计划和策略
  plan: {
    description: '设计实现策略的规划代理',
    tools: ['bash', 'read_file'],
    prompt: '你是一个规划代理。分析代码库并输出编号的实现计划。不要进行更改。'
  }
};

/**
 * 为系统提示生成代理类型描述
 */
export function getAgentDescriptions(): string {
  return Object.entries(AGENT_TYPES)
    .map(([name, cfg]) => `- ${name}: ${cfg.description}`)
    .join('\n');
}


export const TASK: Anthropic.Tool = {
  name: 'Task',
  description: `为专注的子任务生成一个子代理。
子代理在隔离上下文中运行 - 它们看不到父代理的历史记录。
使用这个工具来保持主对话的清洁。

代码类型：
${getAgentDescriptions()}

使用示例：
- Task(explore): "找到所有使用认证模块的文件"
- Task(plan): "设计数据库迁移策略"
- Task(code): "实现用户注册表单"
  `,
  input_schema: {
    type: 'object',
    properties: {
      description: {
        type: 'string',
        description: '简短的任务名称(3-5个词)用于进度显示'
      },
      prompt: {
        type: 'string',
        description: '给子代理的详细指令'
      },
      agent_type: {
        type: 'string',
        enum: Object.keys(AGENT_TYPES),
        description: '要生成的代理类型'
      }
    },
    required: ['description', 'prompt', 'agent_type']
  }
}

/**
 * 根据代理类型过滤工具
 * 
 * 每个代理类型都有一个允许工具的白名单
 * '*' 表示所有工具（但子代理不会获得Task工具以防止无限递归）
 */
function getToolsForAgent(agentType: AgentType): Anthropic.Tool[] {
  const allowed = AGENT_TYPES[agentType].tools;
  const base = getBaseTools();

  if (allowed === "*") return base;
  return base.filter((t) => allowed.includes(t.name));
}

/**
 * 在隔离上下文中执行子代理任务
 * 
 * 这是子代理机制的核心：
 * 1. 创建隔离的消息历史（关键：无父上下文）
 * 2. 使用代理特定的系统提示
 * 3. 根据代理类型过滤可用工具
 * 4. 进行与主代理相同的查询循环
 * 5. 仅返回最终文本（而非中间细节）
 * 
 * 父代理只看到摘要，保持其上下文干净。
 * 
 * 进度显示：
 * 运行时，我们显示：
 * [explore] 查找认证文件 ... 5个工具,3.2秒
 * 
 * 这提供了可见性，而不会污染主对话
 */
export async function runTask(description: string, prompt: string, agentType: AgentType): Promise<string>{
  const startTime = Date.now()
  let toolCount = 0
  
  process.stdout.write(` [${agentType}] ${description} ...`)

  const config = AGENT_TYPES[agentType]

  // 代理特定的系统提示
  const subSystem = `你是一个在${process.cwd()}的${agentType}子代理。
  ${config.prompt}
  完成任务并返回清晰、简洁的摘要。
  `

  // 此代理类型的过滤工具
  const subTools = getToolsForAgent(agentType)

  // 隔离的消息历史 - 这是关键
  // 子代理从头开始，看不到父代理的对话
  const subMessages: Anthropic.MessageParam[] = [
    {role: 'user', content: prompt}
  ]

  // 运行相同的代理循环（静默 - 不打印到主聊天）
  while(true){
    const response = await client.messages.create({
      model: MODEL,
      system: subSystem,
      messages: subMessages,
      tools: subTools,
      max_tokens: 8000
    })

    if(response.stop_reason !== 'tool_use'){
      break
    }

    const toolCalls = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')

    const results: Anthropic.ToolResultBlockParam[] = []

    for(const tc of toolCalls){
      toolCount++
      const output = await execute(tc.name, tc.input as Record<string, unknown>)
      results.push({
        type: 'tool_result',
        tool_use_id: tc.id,
        content: output
      })

      // 更新进度提示
      const elapsed = ((Date.now() - startTime) /1000).toFixed(1)
      process.stdout.write(`\r [${agentType}] ${description} ... ${toolCount} 个工具, ${elapsed}秒`)
    }

    subMessages.push({role: 'assistant', content: response.content})
    subMessages.push({role: 'user', content: results})
  }

  // 最终进度更新
  const elapsed = ((Date.now() - startTime) /1000).toFixed(1)
  process.stdout.write(`\r  [${agentType}] ${description} - 完成 (${toolCount} 个工具, ${elapsed}s)\n`);

  // 提取最后一条助手消息的文本作为摘要
  const lastAssistant = subMessages
    .filter((m) => m.role === "assistant")
    .pop() as { role: "assistant"; content: Anthropic.ContentBlockParam[] } | undefined;
  if (lastAssistant) {
    const content = lastAssistant.content;
    const blocks = Array.isArray(content)
      ? content.filter(
          (b): b is Anthropic.TextBlock => b.type === "text"
        )
      : [];
    if (blocks.length > 0) {
      return blocks.map((b) => b.text).join("\n");
    }
  }

  return "(子代理未返回文本)";
}