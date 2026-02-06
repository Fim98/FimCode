import type Anthropic from "@anthropic-ai/sdk";

/**
 * 工具系统类型定义
 */

/**
 * 工具处理函数类型
 */
export type ToolHandler = (args: Record<string, unknown>) => Promise<string>;

/**
 * 工具注册表项
 */
export interface ToolEntry {
  /** 工具定义 */
  tool: Anthropic.Tool;
  /** 工具处理函数 */
  handler: ToolHandler;
}

/**
 * 代理类型
 */
export type AgentType = "explore" | "code" | "plan";

/**
 * 代理配置
 */
export interface AgentConfig {
  /** 代理描述 */
  description: string;
  /** 允许的工具列表（'*' 表示所有工具） */
  tools: string[] | "*";
  /** 系统提示词 */
  prompt: string;
}
