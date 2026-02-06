import { mkdirSync, appendFileSync } from "node:fs";
import { logsDir, logLevel, enableFileLog, nodeEnv, APP_NAME } from "../config";

/**
 * 日志级别
 */
type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * 确保日志目录存在
 */
function ensureLogDir(): void {
  if (!enableFileLog) return;
  try {
    mkdirSync(logsDir, { recursive: true });
  } catch {
    // 忽略创建错误
  }
}

/**
 * 获取当前日志文件名
 */
function getLogFileName(): string {
  const date = new Date().toISOString().split("T")[0];
  return `${logsDir}/${date}.log`;
}

/**
 * 格式化日志消息
 */
function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

/**
 * 检查是否应该记录该级别
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[logLevel];
}

/**
 * 写入日志到文件
 */
function writeToFile(formattedMessage: string): void {
  if (!enableFileLog) return;
  try {
    ensureLogDir();
    appendFileSync(getLogFileName(), formattedMessage + "\n");
  } catch {
    // 忽略写入错误
  }
}

/**
 * 控制台输出
 */
function consoleOutput(level: LogLevel, formattedMessage: string): void {
  // 生产环境只输出到文件，不输出到控制台
  if (nodeEnv === "production") return;

  switch (level) {
    case "debug":
      console.debug(formattedMessage);
      break;
    case "info":
      console.info(formattedMessage);
      break;
    case "warn":
      console.warn(formattedMessage);
      break;
    case "error":
      console.error(formattedMessage);
      break;
  }
}

/**
 * 日志记录函数
 */
function log(level: LogLevel, message: string): void {
  if (!shouldLog(level)) return;

  const formatted = formatMessage(level, message);
  writeToFile(formatted);
  consoleOutput(level, formatted);
}

/**
 * 简单日志器
 */
export const logger = {
  debug: (message: string) => log("debug", message),
  info: (message: string) => log("info", message),
  warn: (message: string) => log("warn", message),
  error: (message: string) => log("error", message),

  /**
   * 记录工具调用
   */
  logToolCall: (toolName: string, description?: string) => {
    const msg = description
      ? `Tool: ${toolName} - ${description}`
      : `Tool: ${toolName}`;
    log("debug", msg);
  },

  /**
   * 记录会话信息
   */
  logSession: (sessionId: string, action: string) => {
    log("info", `Session ${sessionId}: ${action}`);
  },
} as const;

/**
 * 快速日志函数（用于简单输出）
 */
export function logInfo(message: string): void {
  console.log(`[${APP_NAME}] ${message}`);
}

export function logError(message: string): void {
  console.error(`[${APP_NAME}] ${message}`);
}

export function logWarn(message: string): void {
  console.warn(`[${APP_NAME}] ${message}`);
}
