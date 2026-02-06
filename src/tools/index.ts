import type Anthropic from "@anthropic-ai/sdk";
import { registry } from "./registry";

// 导入工具处理器
import { bashTool, executeBashCommand } from "./handlers/bash";
import { readFileTool, readFileContent } from "./handlers/readFile";
import { writeFileTool, writeFileContent } from "./handlers/writeFile";
import { editFileTool, editFileContent } from "./handlers/editFile";
import { todoWriteTool, updateTodoItems } from "./handlers/todo";
import { taskTool, runTaskAgent } from "./handlers/task";
import { skillTool, loadSkill } from "./handlers/skill";

// 导入类型
import type { TodoItem } from "../types";

/**
 * 初始化工具注册表
 */
function initializeRegistry(): void {
  // 注册基础工具
  registry.register("bash", bashTool, (a) =>
    executeBashCommand(a.command as string)
  );
  registry.register("read_file", readFileTool, (a) =>
    readFileContent(a.path as string, a.limit as number | undefined)
  );
  registry.register("write_file", writeFileTool, (a) =>
    writeFileContent(a.path as string, a.content as string)
  );
  registry.register("edit_file", editFileTool, (a) =>
    editFileContent(
      a.path as string,
      a.old_text as string,
      a.new_text as string
    )
  );
  registry.register("todo_write", todoWriteTool, (a) =>
    Promise.resolve(updateTodoItems(a.items as TodoItem[]))
  );
  registry.register("Task", taskTool, (a) =>
    runTaskAgent(
      a.description as string,
      a.prompt as string,
      a.agent_type as string
    )
  );
  registry.register("Skill", skillTool, (a) =>
    Promise.resolve(loadSkill(a.skill as string))
  );
}

// 初始化注册表
initializeRegistry();

/**
 * 基础工具列表（不含 Task、Skill，供子代理使用）
 */
export const baseTools: Anthropic.Tool[] = registry.getBaseTools();

/**
 * 所有可用工具列表
 */
export const allTools: Anthropic.Tool[] = registry.getTools();

/**
 * 执行工具调用
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  return registry.execute(name, args);
}

// 导出工具定义
export { taskTool, skillTool } from "./handlers";

// 导出类型
export type { TodoItem } from "../types";
export type { AgentType } from "./subagents/types";
export type { AgentConfig } from "./subagents/types";

// 导出注册表相关
export { registry, register, getTools, getBaseTools } from "./registry";

// 导出子代理类型
export { AGENT_CONFIGS, getAgentDescriptions, isValidAgentType, getAgentConfig } from "./subagents/types";
