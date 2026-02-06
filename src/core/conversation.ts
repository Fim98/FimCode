import type { MessageParam, ContentBlockParam } from "@anthropic-ai/sdk/resources/index.mjs";
import { logger } from "../utils/logger";

/**
 * 对话管理器
 *
 * 管理消息历史的增删改查，提供便捷的操作方法
 */
export class ConversationManager {
  private messages: MessageParam[] = [];

  /**
   * 添加用户消息
   */
  addUserMessage(content: string): void {
    this.messages.push({ role: "user", content });
    logger.debug(`添加用户消息: ${content.slice(0, 50)}...`);
  }

  /**
   * 添加助手消息
   */
  addAssistantMessage(content: ContentBlockParam[]): void {
    this.messages.push({ role: "assistant", content });
    logger.debug(`添加助手消息: ${content.length} 个内容块`);
  }

  /**
   * 添加工具结果
   */
  addToolResults(results: ContentBlockParam[]): void {
    this.messages.push({ role: "user", content: results });
    logger.debug(`添加工具结果: ${results.length} 个结果`);
  }

  /**
   * 获取所有消息
   */
  getMessages(): MessageParam[] {
    return [...this.messages];
  }

  /**
   * 获取消息数量
   */
  get count(): number {
    return this.messages.length;
  }

  /**
   * 清空消息历史
   */
  clear(): void {
    this.messages = [];
    logger.info("对话历史已清空");
  }

  /**
   * 获取最近的 N 条消息
   */
  getRecentMessages(n: number): MessageParam[] {
    return this.messages.slice(-n);
  }

  /**
   * 序列化为 JSON
   */
  toJSON(): string {
    return JSON.stringify(this.messages, null, 2);
  }

  /**
   * 从 JSON 恢复
   */
  fromJSON(json: string): void {
    try {
      this.messages = JSON.parse(json) as MessageParam[];
      logger.info(`从 JSON 恢复了 ${this.messages.length} 条消息`);
    } catch (error) {
      logger.error(`恢复消息失败: ${error}`);
      this.messages = [];
    }
  }
}

/**
 * 创建新的对话管理器实例
 */
export function createConversationManager(): ConversationManager {
  return new ConversationManager();
}
