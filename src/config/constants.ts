/**
 * 全局常量定义
 */

// 应用信息
export const APP_NAME = "FimCode";
export const APP_VERSION = "1.0.0";

// 路径常量
export const HOME_DIR = process.env.HOME || process.env.USERPROFILE || "/tmp";
export const CONFIG_DIR = `${HOME_DIR}/.${APP_NAME}`;
export const LOGS_DIR = `${CONFIG_DIR}/logs`;
export const DEFAULT_SKILLS_DIR = "skills";

// 模型配置常量
export const DEFAULT_MODEL = "gemini-3-flash-preview";
export const DEFAULT_MAX_TOKENS = 8000;

// 运行时限制常量
export const MAX_TODO_ITEMS = 20;
export const MAX_ROUNDS_WITHOUT_TODO = 10;
export const BASH_TIMEOUT_MS = 60000;
export const MAX_OUTPUT_SIZE = 50000;

// 会话常量
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30分钟
