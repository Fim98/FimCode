import type { MessageParam } from "@anthropic-ai/sdk/resources/index.mjs";

/**
 * 核心 Agent 类型定义
 */

/**
 * Agent 状态
 */
export interface AgentState {
  /** 当前轮次 */
  round: number;
  /** 无待办更新的轮次计数 */
  roundsWithoutTodo: number;
  /** 是否活跃 */
  isActive: boolean;
}

/**
 * Agent 配置
 */
export interface AgentConfig {
  /** 最大轮次 */
  maxRounds: number;
  /** 最大无待办更新轮次 */
  maxRoundsWithoutTodo: number;
  /** 最大 token 数 */
  maxTokens: number;
}

/**
 * Agent 上下文
 */
export interface AgentContext {
  /** 消息历史 */
  messages: MessageParam[];
  /** 当前状态 */
  state: AgentState;
}

/**
 * 工具调用结果
 */
export interface ToolCallResult {
  /** 工具名称 */
  name: string;
  /** 输出内容 */
  output: string;
  /** 是否使用了待办工具 */
  usedTodo: boolean;
}

/**
 * Agent 响应
 */
export interface AgentResponse {
  /** 是否成功 */
  success: boolean;
  /** 响应文本 */
  text?: string;
  /** 错误信息 */
  error?: string;
  /** 使用的工具数量 */
  toolCount: number;
}
