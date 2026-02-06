#!/usr/bin/env bun
import type Anthropic from "@anthropic-ai/sdk";
import { AGENT_TYPES, SKILLS, agentLoop } from "./agent";
import { WORKDIR } from "./config";

async function main() {
  console.log(`\n🤖 Mini Claude Code v4 (带技能) - ${WORKDIR}`);
  console.log(`技能: ${SKILLS.listSkills().join(", ") || "无"}`);
  console.log(`代理类型: ${Object.keys(AGENT_TYPES).join(", ")}`);
  console.log('输入任务请求，或输入 "exit" 退出\n');

  const history: Anthropic.MessageParam[] = [];

  while (true) {
    try {
      const userInput = await prompt("你：")?.trim();

      if (
        !userInput ||
        ["exit", "quit", "q"].includes(userInput.toLowerCase())
      ) {
        break;
      }

      history.push({ role: "user", content: userInput });

      try {
        await agentLoop(history);
      } catch (error) {
        console.error(
          `错误: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      console.log();
    } catch (error) {
      if (error instanceof Error && error.message.includes("EOF")) {
        break;
      }
      throw error;
    }
  }

  console.log("再见！");
}

main().catch(console.error);
