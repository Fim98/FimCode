import type Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, TextBlock } from "@anthropic-ai/sdk/resources/index.mjs";
import { client, model, maxTokens, runtimeLimits, workDir } from "../config";
import { skillLoader } from "../managers";
import { baseTools, executeTool, taskTool, skillTool } from "../tools";
import { getAgentDescriptions } from "../tools/subagents/types";
import { logger } from "../utils/logger";
import type { AgentState } from "./types";

/**
 * 提醒标记：超过10轮没有更新待办事项时提醒
 */
const NAG_REMINDER =
  "<reminder>已超过 10 轮没有更新待办事项。请更新待办事项。</reminder>";

/**
 * 构建系统提示词
 */
function buildSystemPrompt(): string {
  return `你是位于${workDir}的编程代理。
循环：规划 -> 使用工具行动 -> 报告。

**可用技能** (使用Skill工具调用，当任务匹配时)：
${skillLoader.getDescriptions()}

**可用的子代理**（使用Task工具进行专注的子任务）：
${getAgentDescriptions()}

规则：
- 当任务匹配技能描述时立即使用Skill工具
- 对于需要专注探索或实现的子任务使用Task工具
- 使用todo_write跟踪多步骤工作
- 优先使用工具而不是解释。行动，而不仅仅是解释。
- 完成后，总结发生了什么变化。
`;
}

/**
 * 初始化 Agent 状态
 */
function createInitialState(): AgentState {
  return {
    round: 0,
    roundsWithoutTodo: 0,
    isActive: true,
  };
}

/**
 * Agent 主循环：调用模型、执行工具、更新对话
 *
 * 这是整个系统的核心循环：
 * 1. 调用 LLM API 获取响应
 * 2. 解析响应中的文本和工具调用
 * 3. 执行工具调用
 * 4. 将结果返回给 LLM
 * 5. 重复直到没有更多工具调用
 */
export async function agentLoop(
  messages: MessageParam[],
  onToken?: (token: string) => void
): Promise<void> {
  const systemPrompt = buildSystemPrompt();
  const state = createInitialState();

  // 组合所有可用工具（基础工具 + Task + Skill）
  const allTools = [...baseTools, taskTool, skillTool];

  logger.info("Agent 循环开始");

  while (state.isActive) {
    state.round++;
    logger.debug(`第 ${state.round} 轮`);

    const response = await client.messages.create({
      model,
      system: systemPrompt,
      messages,
      tools: allTools,
      max_tokens: maxTokens,
    });

    const toolCalls: Anthropic.ToolUseBlock[] = [];

    // 处理响应内容
    for (const block of response?.content ?? []) {
      if (block.type === "text") {
        process.stdout.write(block.text);
        onToken?.(block.text);
      } else if (block.type === "tool_use") {
        toolCalls.push(block);
      }
    }

    // 如果没有工具调用，循环结束
    if (response.stop_reason !== "tool_use") {
      messages.push({ role: "assistant", content: response.content });
      logger.info("Agent 循环结束（无工具调用）");
      return;
    }

    // 执行工具调用
    const results: Anthropic.ToolResultBlockParam[] = [];
    let usedTodo = false;

    for (const tc of toolCalls) {
      // 显示进度
      if (tc.name === "Task") {
        const desc = (tc.input as { description?: string }).description;
        console.log(`\n> 任务： ${desc}`);
      } else if (tc.name === "Skill") {
        const skill = (tc.input as { skill?: string }).skill;
        console.log(`\n> 正在加载技能: ${skill}`);
      } else {
        console.log(`\n> ${tc.name}`);
      }

      // 执行工具
      const output = await executeTool(tc.name, tc.input as Record<string, unknown>);

      // 显示输出预览
      if (tc.name === "Skill") {
        console.log(`  技能已加载(${output.length} 字符)`);
      } else if (tc.name !== "Task") {
        const preview =
          output.length > 200 ? output.slice(0, 200) + "..." : output;
        console.log(`  ${preview}`);
      }

      results.push({
        type: "tool_result",
        tool_use_id: tc.id,
        content: output,
      });

      if (tc.name === "todo_write") usedTodo = true;
    }

    // 更新无待办轮次计数
    state.roundsWithoutTodo = usedTodo ? 0 : state.roundsWithoutTodo + 1;

    // 添加助手响应到消息历史
    messages.push({ role: "assistant", content: response.content });

    // 如果超过10轮没有更新待办，添加提醒
    if (state.roundsWithoutTodo > runtimeLimits.maxRoundsWithoutTodo) {
      results.unshift({ type: "tool_result", tool_use_id: "nag", content: NAG_REMINDER });
    }

    // 添加工具结果到消息历史
    messages.push({ role: "user", content: results });

    logger.debug(`第 ${state.round} 轮完成，工具调用: ${toolCalls.length}`);
  }
}

// 导出类型
export type { AgentState } from "./types";
