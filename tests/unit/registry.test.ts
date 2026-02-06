import { test, expect, beforeEach } from "bun:test";
// 导入 tools/index.ts 触发注册表初始化
import "../../src/tools/index";
import { registry } from "../../src/tools/registry";

test("registry: 应该包含基础工具", () => {
  const tools = registry.getTools();
  const toolNames = registry.getToolNames();

  expect(toolNames).toContain("bash");
  expect(toolNames).toContain("read_file");
  expect(toolNames).toContain("write_file");
  expect(toolNames).toContain("edit_file");
  expect(toolNames).toContain("todo_write");
  expect(toolNames).toContain("Task");
  expect(toolNames).toContain("Skill");
});

test("registry: getBaseTools 不应该包含 Task 和 Skill", () => {
  const baseTools = registry.getBaseTools();
  const baseToolNames = baseTools.map((t) => t.name);

  expect(baseToolNames).not.toContain("Task");
  expect(baseToolNames).not.toContain("Skill");
});

test("registry: 可以通过名称获取工具", () => {
  const tool = registry.getTool("bash");
  expect(tool).toBeDefined();
  expect(tool?.name).toBe("bash");
});
