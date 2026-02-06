import type Anthropic from "@anthropic-ai/sdk";

export type ToolHandler = (args: Record<string, unknown>) => Promise<string>;

interface ToolEntry {
  tool: Anthropic.Tool;
  handler: ToolHandler;
}

const registry = new Map<string, ToolEntry>();

/**
 * 注册工具：定义 + 执行函数
 */
export function register(
  name: string,
  tool: Anthropic.Tool,
  handler: ToolHandler
): void {
  registry.set(name, { tool, handler });
}

/**
 * 获取所有已注册的工具定义
 */
export function getTools(): Anthropic.Tool[] {
  return Array.from(registry.values()).map((e) => e.tool);
}

/**
 * 获取基础工具（不含 Task、Skill，供子代理使用）
 */
export function getBaseTools(): Anthropic.Tool[] {
  return getTools().filter((t) => t.name !== "Task" && t.name !== "Skill");
}

/**
 * 执行工具调用
 */
export async function execute(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  const entry = registry.get(name);
  if (!entry) {
    return `未知工具：${name}`;
  }
  return entry.handler(args);
}
