import type { MessageParam } from "@anthropic-ai/sdk/resources/index.mjs";
import { agentLoop } from "../core/agent";
import { skillLoader, sessionManager } from "../managers";
import { workDir } from "../config";
import { logger } from "../utils/logger";

/**
 * 欢迎信息
 */
function printWelcome(): void {
  const skills = skillLoader.listSkills().join(", ") || "无";
  console.log(`\n🤖 Mini Claude Code v4 - ${workDir}`);
  console.log(`技能: ${skills}`);
  console.log('输入任务请求，或输入 "exit" 退出\n');
}

/**
 * 退出命令列表
 */
const EXIT_COMMANDS = ["exit", "quit", "q"];

/**
 * 运行 REPL 交互循环
 */
export async function runRepl(): Promise<void> {
  // 加载技能
  await skillLoader.load();

  // 创建会话
  const session = sessionManager.createSession("REPL 会话");
  logger.info(`会话已创建: ${session.id}`);

  printWelcome();

  const messages: MessageParam[] = [];

  while (true) {
    try {
      const userInput = await prompt("你：")?.trim();

      // 检查退出命令
      if (
        !userInput ||
        EXIT_COMMANDS.includes(userInput.toLowerCase())
      ) {
        break;
      }

      // 添加到消息历史
      messages.push({ role: "user", content: userInput });

      // 运行 Agent 循环
      try {
        await agentLoop(messages);
        sessionManager.incrementMessageCount(session.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n错误: ${message}`);
        logger.error(`Agent 循环错误: ${message}`);
      }

      console.log();
    } catch (error) {
      // EOF 处理
      if (error instanceof Error && error.message.includes("EOF")) {
        break;
      }
      throw error;
    }
  }

  console.log("再见！");
  logger.info(`会话结束: ${session.id}`);
}

/**
 * 运行单条命令模式
 */
export async function runCommand(command: string): Promise<string> {
  // 加载技能
  await skillLoader.load();

  // 创建会话
  const session = sessionManager.createSession("命令行会话");

  const messages: MessageParam[] = [{ role: "user", content: command }];

  let output = "";
  try {
    await agentLoop(messages, (token) => {
      output += token;
    });
    sessionManager.incrementMessageCount(session.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`命令执行错误: ${message}`);
    throw error;
  }

  return output;
}
