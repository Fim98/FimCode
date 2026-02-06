#!/usr/bin/env bun
import { runRepl, runCommand } from "./repl";
import { logger } from "../utils/logger";

/**
 * CLI 入口
 *
 * 使用方法:
 * - 交互模式: bun ./src/cli/index.ts
 * - 单命令模式: bun ./src/cli/index.ts "your command here"
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  try {
    if (args.length === 0) {
      // 交互模式
      await runRepl();
    } else {
      // 单命令模式
      const command = args.join(" ");
      const output = await runCommand(command);
      console.log(output);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`CLI 错误: ${message}`);
    console.error(`错误: ${message}`);
    process.exit(1);
  }
}

// 运行主函数
main();
