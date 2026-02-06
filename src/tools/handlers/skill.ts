import type Anthropic from "@anthropic-ai/sdk";
import { skillLoader } from "../../managers";
import { logger } from "../../utils/logger";

/**
 * 技能加载工具定义
 */
export const skillTool: Anthropic.Tool = {
  name: "Skill",
  description: `加载技能以获取任务的专门知识。

可用时机：
- 当用户任务匹配技能描述时立即使用
- 在尝试特定领域工作之前（PDF、MCP等）

技能内容将被注入到对话中，给你详细的说明和对资源的访问权限。
  `,
  input_schema: {
    type: "object",
    properties: {
      skill: {
        type: "string",
        description: "要加载的技能名称",
      },
    },
    required: ["skill"],
  },
};

/**
 * 加载技能内容。
 *
 * 这是关键机制：
 * 1. 获取技能内容（SKILL.md主体 + 资源提示）
 * 2. 用<skill-loaded>标签包装返回
 * 3. 模型将此作为tool_result(用户消息)接收
 * 4. 模型现在"知道"如何完成任务
 *
 * 为什么是tool_result而不是系统提示？
 * - 系统提示更改会使缓存失效(20-50x 成本增加)
 * - 工具结果附加到末尾（前缀不变，缓存命中）
 *
 * 这就是生产系统如何保持成本效益
 */
export function loadSkill(skillName: string): string {
  logger.logToolCall("Skill", skillName);

  const content = skillLoader.getSkillContent(skillName);

  if (content === null) {
    const available = skillLoader.listSkills().join(", ") || "无";
    logger.warn(`尝试加载未知技能: ${skillName}`);
    return `错误：未知的技能 '${skillName}'。可用技能：${available}`;
  }

  logger.info(`技能已加载: ${skillName} (${content.length} 字符)`);

  // 用标签包裹以便模型知道这是技能内容
  return `<skill-loaded name="${skillName}">
${content}
</skill-loaded>

按照上面技能的说明完成用户的任务。
`;
}
