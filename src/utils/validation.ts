import type { TodoItem } from "../types";
import { runtimeLimits } from "../config";

/**
 * 数据验证工具函数
 */

/**
 * 验证待办事项列表
 */
export function validateTodoItems(items: TodoItem[]): void {
  if (items.length > runtimeLimits.maxTodoItems) {
    throw new Error(`最多允许 ${runtimeLimits.maxTodoItems} 项待办事项`);
  }

  const inProgressCount = items.filter(
    (item) => item.status === "in_progress"
  ).length;

  if (inProgressCount > 1) {
    throw new Error("同一时间只能有一项任务进行中(in_progress)");
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (!item) {
      throw new Error(`第 ${i + 1} 项: 数据无效`);
    }

    if (!item.content?.trim()) {
      throw new Error(`第 ${i + 1} 项: 需要内容 (content)`);
    }

    if (!["pending", "in_progress", "completed"].includes(item.status)) {
      throw new Error(`第 ${i + 1} 项: 无效状态 '${item.status}'`);
    }

    if (!item.activeForm?.trim()) {
      throw new Error(`第 ${i + 1} 项: 需要 activeForm`);
    }
  }
}

/**
 * 验证命令安全性
 */
export function validateCommand(command: string): string | null {
  const dangerousPatterns = [
    "rm -rf /",
    "sudo",
    "shutdown",
    "reboot",
    ":(){ :|: };", // fork bomb
    "mkfs",
    "dd if=/dev/zero",
  ];

  for (const pattern of dangerousPatterns) {
    if (command.includes(pattern)) {
      return `危险命令被阻止: ${pattern}`;
    }
  }

  return null;
}

/**
 * 验证文件路径
 */
export function validateFilePath(path: string): string | null {
  if (!path || typeof path !== "string") {
    return "路径不能为空";
  }

  if (path.includes("\0")) {
    return "路径包含非法字符";
  }

  // 检测路径遍历攻击
  const normalizedPath = path.replace(/\\/g, "/");
  const parts = normalizedPath.split("/");
  let depth = 0;

  for (const part of parts) {
    if (part === "..") {
      depth--;
    } else if (part !== "." && part !== "") {
      depth++;
    }

    if (depth < 0) {
      return "路径包含非法的目录遍历";
    }
  }

  return null;
}

/**
 * 验证代理类型
 */
export function validateAgentType(type: string): type is "explore" | "code" | "plan" {
  return ["explore", "code", "plan"].includes(type);
}
