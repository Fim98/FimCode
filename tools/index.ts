import type Anthropic from "@anthropic-ai/sdk";
import type { TodoItem } from "../manager/TodoManager";
import { execute, getBaseTools, register } from "./registry";

import { BASH_TOOL, runBash } from "./bash";
import { EDIT_FILE, runEdit } from "./edit_file";
import { READ_FILE, runRead } from "./read_file";
import { runWrite, WRITE_FILE } from "./write_file";
import { runTodo, TODO_WRITE } from "./todo";
import { AGENT_TYPES, runTask, TASK, type AgentType } from "./task";
import { runSkill, SKILL } from "./skill";

// 注册所有工具
register("bash", BASH_TOOL, (a) => runBash(a.command as string));
register("read_file", READ_FILE, (a) =>
  runRead(a.path as string, a.limit as number | undefined)
);
register("write_file", WRITE_FILE, (a) =>
  runWrite(a.path as string, a.content as string)
);
register("edit_file", EDIT_FILE, (a) =>
  runEdit(
    a.path as string,
    a.old_text as string,
    a.new_text as string
  )
);
register("todo_write", TODO_WRITE, (a) =>
  Promise.resolve(runTodo(a.items as TodoItem[]))
);
register("Task", TASK, (a) =>
  runTask(
    a.description as string,
    a.prompt as string,
    a.agent_type as AgentType
  )
);
register("Skill", SKILL, (a) =>
  Promise.resolve(runSkill(a.skill as string))
);

// BASE_TOOLS 不含 Task 和 Skill（主 agent 单独组合）
export const BASE_TOOLS: Anthropic.Tool[] = getBaseTools();

export { TASK } from "./task";
export { SKILL } from "./skill";

/**
 * 将工具调用分发到相应的实现
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  return execute(name, args);
}
