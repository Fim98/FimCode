#!/usr/bin/env bun
/**
 * 项目入口（兼容旧版本）
 *
 * 推荐使用新的入口方式：
 * - 开发: bun run dev 或 bun ./src/cli/index.ts
 * - 生产: bun run start 或 bun ./bin/fimcode.ts
 * - 单命令: bun run cli -- "your command"
 */
import { runRepl } from "./src/cli/repl";

// 运行 REPL
runRepl().catch((error) => {
  console.error("错误:", error);
  process.exit(1);
});
