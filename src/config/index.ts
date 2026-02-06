import Anthropic from "@anthropic-ai/sdk";
import { env, validateEnv } from "./env";
import {
  CONFIG_DIR,
  LOGS_DIR,
  DEFAULT_SKILLS_DIR,
  MAX_TODO_ITEMS,
  MAX_ROUNDS_WITHOUT_TODO,
  BASH_TIMEOUT_MS,
  MAX_OUTPUT_SIZE,
  SESSION_TIMEOUT_MS,
} from "./constants";

/**
 * 验证环境变量
 */
validateEnv();

/**
 * 工作目录
 */
export const workDir = process.cwd();

/**
 * 技能目录
 */
export const skillsDir = `${workDir}/${DEFAULT_SKILLS_DIR}`;

/**
 * 配置目录（~/.FimCode）
 */
export const configDir = CONFIG_DIR;

/**
 * 日志目录
 */
export const logsDir = LOGS_DIR;

/**
 * Anthropic 客户端单例
 */
export const client = new Anthropic({
  baseURL: env.anthropicBaseUrl,
  apiKey: env.anthropicApiKey,
});

/**
 * 模型名称
 */
export const model = env.modelName;

/**
 * 最大 token 数
 */
export const maxTokens = env.maxTokens;

/**
 * 日志级别
 */
export const logLevel = env.logLevel;

/**
 * 是否启用文件日志
 */
export const enableFileLog = env.enableFileLog;

/**
 * 运行环境
 */
export const nodeEnv = env.nodeEnv;

/**
 * 运行时限制配置
 */
export const runtimeLimits = {
  maxTodoItems: MAX_TODO_ITEMS,
  maxRoundsWithoutTodo: MAX_ROUNDS_WITHOUT_TODO,
  bashTimeoutMs: BASH_TIMEOUT_MS,
  maxOutputSize: MAX_OUTPUT_SIZE,
  sessionTimeoutMs: SESSION_TIMEOUT_MS,
} as const;

/**
 * 完整配置对象（用于调试）
 */
export const config = {
  workDir,
  skillsDir,
  configDir,
  logsDir,
  model,
  maxTokens,
  logLevel,
  enableFileLog,
  nodeEnv,
  runtimeLimits,
} as const;

// 导出子模块
export * from "./constants";
export { env } from "./env";
