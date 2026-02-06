import { APP_NAME, DEFAULT_MODEL, DEFAULT_MAX_TOKENS } from "./constants";

/**
 * 环境变量解析和验证
 */

export interface EnvConfig {
  // API 配置
  anthropicBaseUrl: string;
  anthropicApiKey: string;

  // 模型配置
  modelName: string;
  maxTokens: number;

  // 日志配置
  logLevel: "debug" | "info" | "warn" | "error";
  enableFileLog: boolean;

  // 运行环境
  nodeEnv: "development" | "production" | "test";
}

function parseIntOrDefault(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getEnv(): EnvConfig {
  const nodeEnv = (process.env.NODE_ENV as "development" | "production" | "test") || "development";

  return {
    // API 配置
    anthropicBaseUrl: process.env.ANTHROPIC_BASE_URL || "",
    anthropicApiKey: process.env.ANTHROPIC_AUTH_TOKEN || "",

    // 模型配置（可通过环境变量覆盖）
    modelName: process.env.FIMCODE_MODEL || DEFAULT_MODEL,
    maxTokens: parseIntOrDefault(process.env.FIMCODE_MAX_TOKENS, DEFAULT_MAX_TOKENS),

    // 日志配置
    logLevel: (process.env.FIMCODE_LOG_LEVEL as "debug" | "info" | "warn" | "error") || "info",
    enableFileLog: process.env.FIMCODE_ENABLE_FILE_LOG !== "false",

    // 运行环境
    nodeEnv,
  };
}

// 验证必需的环境变量
export function validateEnv(): void {
  const env = getEnv();

  if (!env.anthropicBaseUrl) {
    console.warn(`[${APP_NAME}] 警告: ANTHROPIC_BASE_URL 未设置`);
  }

  if (!env.anthropicApiKey) {
    console.warn(`[${APP_NAME}] 警告: ANTHROPIC_AUTH_TOKEN 未设置`);
  }
}

export const env = getEnv();
