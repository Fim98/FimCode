import type Anthropic from "@anthropic-ai/sdk";
import type { ToolHandler, ToolEntry } from "../types";

/**
 * 工具注册表
 *
 * 集中管理所有工具的注册和执行分发
 */
class ToolRegistry {
  private registry = new Map<string, ToolEntry>();

  /**
   * 注册工具：定义 + 执行函数
   */
  register(name: string, tool: Anthropic.Tool, handler: ToolHandler): void {
    if (this.registry.has(name)) {
      console.warn(`[ToolRegistry] 工具 ${name} 已存在，将被覆盖`);
    }
    this.registry.set(name, { tool, handler });
  }

  /**
   * 获取所有已注册的工具定义
   */
  getTools(): Anthropic.Tool[] {
    return Array.from(this.registry.values()).map((e) => e.tool);
  }

  /**
   * 获取基础工具（不含 Task、Skill，供子代理使用）
   */
  getBaseTools(): Anthropic.Tool[] {
    return this.getTools().filter(
      (t) => t.name !== "Task" && t.name !== "Skill"
    );
  }

  /**
   * 根据名称列表获取工具
   */
  getToolsByNames(names: string[]): Anthropic.Tool[] {
    return this.getTools().filter((t) => names.includes(t.name));
  }

  /**
   * 执行工具调用
   */
  async execute(name: string, args: Record<string, unknown>): Promise<string> {
    const entry = this.registry.get(name);
    if (!entry) {
      return `未知工具：${name}`;
    }
    return entry.handler(args);
  }

  /**
   * 检查工具是否存在
   */
  has(name: string): boolean {
    return this.registry.has(name);
  }

  /**
   * 获取已注册的工具名称列表
   */
  getToolNames(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * 获取工具定义
   */
  getTool(name: string): Anthropic.Tool | undefined {
    return this.registry.get(name)?.tool;
  }
}

/**
 * 全局工具注册表实例
 */
export const registry = new ToolRegistry();

/**
 * 导出便捷方法
 */
export function register(
  name: string,
  tool: Anthropic.Tool,
  handler: ToolHandler
): void {
  registry.register(name, tool, handler);
}

export function getTools(): Anthropic.Tool[] {
  return registry.getTools();
}

export function getBaseTools(): Anthropic.Tool[] {
  return registry.getBaseTools();
}

export function execute(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  return registry.execute(name, args);
}
