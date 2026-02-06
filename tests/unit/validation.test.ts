import { test, expect } from "bun:test";
import {
  validateTodoItems,
  validateCommand,
  validateFilePath,
  validateAgentType,
} from "../../src/utils/validation";
import type { TodoItem } from "../../src/types";

test("validateTodoItems: 正常待办事项", () => {
  const items: TodoItem[] = [
    { content: "测试任务", status: "pending", activeForm: "正在测试" },
  ];
  expect(() => validateTodoItems(items)).not.toThrow();
});

test("validateTodoItems: 超过最大数量应该抛出错误", () => {
  const items: TodoItem[] = Array.from({ length: 25 }, (_, i) => ({
    content: `任务 ${i}`,
    status: "pending",
    activeForm: `正在做 ${i}`,
  }));
  expect(() => validateTodoItems(items)).toThrow("最多允许 20 项待办事项");
});

test("validateTodoItems: 多个进行中的任务应该抛出错误", () => {
  const items: TodoItem[] = [
    { content: "任务1", status: "in_progress", activeForm: "正在做1" },
    { content: "任务2", status: "in_progress", activeForm: "正在做2" },
  ];
  expect(() => validateTodoItems(items)).toThrow("同一时间只能有一项任务进行中");
});

test("validateCommand: 正常命令", () => {
  expect(validateCommand("ls -la")).toBeNull();
});

test("validateCommand: 危险命令", () => {
  expect(validateCommand("rm -rf /")).toContain("危险命令");
  expect(validateCommand("sudo ls")).toContain("危险命令");
});

test("validateFilePath: 正常路径", () => {
  expect(validateFilePath("test.txt")).toBeNull();
});

test("validateFilePath: 空路径", () => {
  expect(validateFilePath("")).toBe("路径不能为空");
});

test("validateFilePath: 包含非法字符", () => {
  expect(validateFilePath("test\0.txt")).toBe("路径包含非法字符");
});

test("validateAgentType: 有效类型", () => {
  expect(validateAgentType("explore")).toBe(true);
  expect(validateAgentType("code")).toBe(true);
  expect(validateAgentType("plan")).toBe(true);
});

test("validateAgentType: 无效类型", () => {
  expect(validateAgentType("invalid")).toBe(false);
});
