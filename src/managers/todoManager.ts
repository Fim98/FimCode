import type { TodoItem, TodoStatus } from "../types";
import { runtimeLimits } from "../config";
import { logger } from "../utils/logger";
import { validateTodoItems } from "../utils/validation";

/**
 * 管理带强制约束的结构化任务列表。
 *
 * 关键设计决策：
 * 1. 最多20项：防止模型创建无尽的列表
 * 2. 仅一项进行中：强制专注 - 一次只能做一件事
 * 3. 必填字段：每项需要 content、status和activeForm
 *
 * activeForm字段值的解释：
 * - 它是正在发生的事情和现在时形式
 * - 在状态为"in_progress"时显示
 * - 示例：content="添加测试", activeForm="正在添加单元测试..."
 *
 * 这提供了对代理正在做什么的实时可见性
 */
export class TodoManager {
  private items: TodoItem[] = [];

  /**
   * 验证并更新待办事项列表
   */
  update(items: TodoItem[]): string {
    try {
      validateTodoItems(items);
      this.items = items.map((item) => ({
        content: String(item.content || "").trim(),
        status: (item.status || "pending").toLowerCase() as TodoStatus,
        activeForm: String(item.activeForm || "").trim(),
      }));

      logger.logToolCall("todo_write", `更新 ${items.length} 项待办`);
      return this.render();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`待办事项更新失败: ${message}`);
      throw error;
    }
  }

  /**
   * 将待办事项列表渲染为人类可读的文本。
   *
   * 格式:
   *   [x] 已完成的任务
   *   [>] 进行中的任务 <- 正在做某事...
   *   [ ] 待处理的任务
   *
   *   (2/3 已完成)
   *
   * 这个渲染后的文本是模型作为工具结果看到的内容。
   * 然后它可以根据当前状态更新列表。
   */
  render(): string {
    if (this.items.length === 0) {
      return "没有待办事项。";
    }

    const lines: string[] = [];

    for (const item of this.items) {
      if (item.status === "completed") {
        lines.push(`[x] ${item.content}`);
      } else if (item.status === "in_progress") {
        lines.push(`[>] ${item.content} <- ${item.activeForm}`);
      } else {
        lines.push(`[ ] ${item.content}`);
      }
    }

    const completed = this.items.filter((t) => t.status === "completed").length;
    lines.push(`\n(${completed}/${this.items.length} 已完成)`);

    return lines.join("\n");
  }

  /**
   * 获取当前待办事项数量
   */
  get count(): number {
    return this.items.length;
  }

  /**
   * 获取已完成的数量
   */
  get completedCount(): number {
    return this.items.filter((t) => t.status === "completed").length;
  }

  /**
   * 获取进行中的任务
   */
  get inProgressItem(): TodoItem | null {
    return this.items.find((t) => t.status === "in_progress") || null;
  }

  /**
   * 获取所有待办事项
   */
  get allItems(): TodoItem[] {
    return [...this.items];
  }
}

/**
 * 全局待办事项管理器实例
 */
export const todoManager = new TodoManager();
