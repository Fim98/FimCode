import type Anthropic from "@anthropic-ai/sdk";
import { runtimeLimits } from "../../config";
import { safePath } from "../../utils/path";
import { logger } from "../../utils/logger";
import { validateFilePath } from "../../utils/validation";

/**
 * 读取文件工具定义
 */
export const readFileTool: Anthropic.Tool = {
  name: "read_file",
  description: "读取文件内容。返回UTF-8文本。",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "文件的相对路径",
      },
      limit: {
        type: "integer",
        description: "最大读取行数（默认：全部）",
      },
    },
    required: ["path"],
  },
};

/**
 * 读取文件内容，可选择行数限制。
 *
 * 对于大文件，使用limit只读取前N行。
 * 输出截断至50KB防止上下文溢出。
 */
export async function readFileContent(
  path: string,
  limit?: number
): Promise<string> {
  logger.logToolCall("read_file", path);

  // 验证路径
  const pathError = validateFilePath(path);
  if (pathError) {
    return `错误：${pathError}`;
  }

  try {
    const safe = safePath(path);

    // 检查文件是否存在
    const file = Bun.file(safe);
    const exists = await file.exists();
    if (!exists) {
      return `错误：文件不存在 ${path}`;
    }

    const content = await file.text();
    const lines = content.split("\n");

    if (limit && limit < lines.length) {
      const truncated = lines.slice(0, limit);
      truncated.push(`... (还有 ${lines.length - limit} 行)`);
      return truncated.join("\n").slice(0, runtimeLimits.maxOutputSize);
    }

    return content.slice(0, runtimeLimits.maxOutputSize);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`读取文件错误: ${message}`);
    return `错误：${message}`;
  }
}
