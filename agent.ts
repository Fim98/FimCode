import type Anthropic from "@anthropic-ai/sdk";
import { client, MODEL, WORKDIR } from "./config";
import { SKILLS } from "./manager";
import { BASE_TOOLS, executeTool } from "./tools";
import { AGENT_TYPES, getAgentDescriptions, TASK } from "./tools/task";
import { SKILL } from "./tools/skill";

const ALL_TOOLS: Anthropic.Tool[] = [...BASE_TOOLS, TASK, SKILL];

const NAG_REMINDER =
  "<reminder>已超过 10 轮没有更新待办事项。请更新待办事项。</reminder>";

function buildSystemPrompt(): string {
  return `你是位于${WORKDIR}的编程代理。
循环：规划 -> 使用工具行动 -> 报告。

**可用技能** (使用Skill工具调用，当任务匹配时)：
${SKILLS.getDescriptions()}

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
 * Agent 主循环：调用模型、执行工具、更新对话
 */
export async function agentLoop(
  messages: Anthropic.MessageParam[]
): Promise<void> {
  const systemPrompt = buildSystemPrompt();
  let roundsWithoutTodo = 0;

  while (true) {
    const response = await client.messages.create({
      model: MODEL,
      system: systemPrompt,
      messages,
      tools: ALL_TOOLS,
      max_tokens: 8000,
    });

    const toolCalls: Anthropic.ToolUseBlock[] = [];

    for (const block of response?.content ?? []) {
      if (block.type === "text") {
        process.stdout.write(block.text);
      } else if (block.type === "tool_use") {
        toolCalls.push(block);
      }
    }

    if (response.stop_reason !== "tool_use") {
      messages.push({ role: "assistant", content: response.content });
      return;
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    let usedTodo = false;

    for (const tc of toolCalls) {
      if (tc.name === "Task") {
        console.log(`\n> 任务： ${tc.input.description}`);
      } else if (tc.name === "Skill") {
        console.log(`\n> 正在加载技能: ${tc.input.skill}`);
      } else {
        console.log(`\n> ${tc.name}`);
      }

      const output = await executeTool(tc.name, tc.input);

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

    roundsWithoutTodo = usedTodo ? 0 : roundsWithoutTodo + 1;

    messages.push({ role: "assistant", content: response.content });

    if (roundsWithoutTodo > 10) {
      results.unshift({ type: "text", text: NAG_REMINDER });
    }
    messages.push({ role: "user", content: results });
  }
}

export { AGENT_TYPES, SKILLS };
