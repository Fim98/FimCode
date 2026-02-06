import type Anthropic from "@anthropic-ai/sdk";

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

/**
 * 代理类型配置映射
 */
export const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  // 探索: 用于搜索和分析的只读代理
  // 不能修改文件 - 适合广泛探索
  explore: {
    description: "探索代码、查找文件、搜索的只读代理",
    tools: ["bash", "read_file"],
    prompt:
      "你是一个探索代理。搜索和分析，但绝不修改文件。返回简洁的摘要。",
  },

  // 代码: 用于实现的完整功能代理
  // 拥有所有工具 - 用于实际的编码工作
  code: {
    description: "实现功能和修复错误的完整代理",
    tools: "*",
    prompt: "你是一个编码代理。高效地实现请求的更改。",
  },

  // 计划: 用于设计工作的分析代理
  // 只读，专注于生成计划和策略
  plan: {
    description: "设计实现策略的规划代理",
    tools: ["bash", "read_file"],
    prompt:
      "你是一个规划代理。分析代码库并输出编号的实现计划。不要进行更改。",
  },
};

/**
 * 获取所有代理类型描述
 */
export function getAgentDescriptions(): string {
  return Object.entries(AGENT_CONFIGS)
    .map(([name, cfg]) => `- ${name}: ${cfg.description}`)
    .join("\n");
}

/**
 * 验证代理类型
 */
export function isValidAgentType(type: string): type is AgentType {
  return type in AGENT_CONFIGS;
}

/**
 * 获取代理配置
 */
export function getAgentConfig(type: AgentType): AgentConfig {
  return AGENT_CONFIGS[type];
}
