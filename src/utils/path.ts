import { resolve, normalize } from "node:path";
import { workDir } from "../config";

/**
 * 确保路径保持在工作区内（安全措施）。
 *
 * 防止模型访问项目目录外的文件。
 * 解析相对路径并检查它们不会通过'../'逃逸。
 */
export function safePath(path: string): string {
  // 使用 resolve 来规范化路径（处理 .. 和 .）
  const resolved = resolve(workDir, path);
  const normalizedWorkDir = resolve(workDir);

  if (!resolved.startsWith(normalizedWorkDir)) {
    throw new Error(`路径超出工作区: ${path}`);
  }
  return resolved;
}

/**
 * 确保配置目录下的路径安全
 */
export function safeConfigPath(baseDir: string, path: string): string {
  const resolved = resolve(baseDir, path);
  const normalizedBaseDir = resolve(baseDir);

  if (!resolved.startsWith(normalizedBaseDir)) {
    throw new Error(`路径超出配置目录: ${path}`);
  }
  return resolved;
}

/**
 * 获取相对工作目录的路径
 */
export function relativeToWorkDir(absolutePath: string): string {
  return absolutePath.replace(workDir, "").replace(/^\//, "") || ".";
}
