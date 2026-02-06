import type Anthropic from "@anthropic-ai/sdk";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { safePath } from "../../utils/path";
import { logger } from "../../utils/logger";
import { validateFilePath } from "../../utils/validation";

/**
 * 写入文件工具定义
 */
export const writeFileTool: Anthropic.Tool = {
  name: "write_file",
  description: "向文件写入内容。如需要会创建父目录。",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "文件的相对路径",
      },
      content: {
        type: "string",
        description: "要写入的内容",
      },
    },
    required: ["path", "content"],
  },
};

/**
 * 将内容写入文件，如需要会创建父目录。
 *
 * 这用于完整的文件创建/重写。
 * 对于部分编辑，请使用edit_file。
 */
export async function writeFileContent(
  path: string,
  content: string
): Promise<string> {
  logger.logToolCall("write_file", path);

  // 验证路径
  const pathError = validateFilePath(path);
  if (pathError) {
    return `错误：${pathError}`;
  }

  try {
    const safe = safePath(path);

    // 创建父目录
    const dir = dirname(safe);
    mkdirSync(dir, { recursive: true });

    // 使用Bun.write API写入文件
    await Bun.write(safe, content);

    logger.info(`已写入文件: ${path} (${content.length} 字节)`);
    return `向 ${path} 写入了 ${content.length} 字节`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`写入文件错误: ${message}`);
    return `错误：${message}`;
  }
}
