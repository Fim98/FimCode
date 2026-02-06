/**
 * 待办事项系统类型定义
 */

/**
 * 待办事项状态
 */
export type TodoStatus = "pending" | "in_progress" | "completed";

/**
 * 单个待办事项
 */
export interface TodoItem {
  /** 任务描述 */
  content: string;
  /** 当前状态 */
  status: TodoStatus;
  /** 正在进行的描述（现在时） */
  activeForm: string;
}
