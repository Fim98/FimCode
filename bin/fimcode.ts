#!/usr/bin/env bun
import { runRepl } from "../src/cli/repl";

/**
 * CLI 可执行入口
 *
 * 安装后可通过 `fimcode` 命令直接调用
 */
runRepl().catch((error) => {
  console.error("错误:", error);
  process.exit(1);
});
