/**
 * 源代码根目录统一导出
 *
 * 提供便捷的模块访问方式
 */

// 配置
export * from "./config";

// 核心模块 - 使用命名空间避免冲突
export * as core from "./core";

// 管理器
export * from "./managers";

// 工具
export * as tools from "./tools";

// 类型
export * from "./types";

// 工具函数
export * from "./utils/path";
export * from "./utils/logger";
export * from "./utils/validation";
