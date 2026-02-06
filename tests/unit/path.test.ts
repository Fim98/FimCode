import { test, expect } from "bun:test";
import { safePath, safeConfigPath, relativeToWorkDir } from "../../src/utils/path";
import { workDir } from "../../src/config";

test("safePath: 正常路径", () => {
  const result = safePath("test/file.txt");
  expect(result).toBe(`${workDir}/test/file.txt`);
});

test("safePath: 路径遍历攻击应该抛出错误", () => {
  expect(() => safePath("../../../etc/passwd")).toThrow("路径超出工作区");
});

test("safeConfigPath: 正常配置路径", () => {
  const baseDir = "/home/user/.config";
  const result = safeConfigPath(baseDir, "settings.json");
  expect(result).toBe("/home/user/.config/settings.json");
});

test("safeConfigPath: 路径遍历攻击应该抛出错误", () => {
  const baseDir = "/home/user/.config";
  expect(() => safeConfigPath(baseDir, "../../etc/passwd")).toThrow("路径超出配置目录");
});

test("relativeToWorkDir: 转换为相对路径", () => {
  const absolutePath = `${workDir}/src/index.ts`;
  const result = relativeToWorkDir(absolutePath);
  expect(result).toBe("src/index.ts");
});
