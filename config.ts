import Anthropic from "@anthropic-ai/sdk";

/** 工作目录 */
export const WORKDIR = process.cwd();

/** 技能目录 */
export const SKILLS_DIR = `${WORKDIR}/skills`;

/** 模型名称 */
export const MODEL = "gemini-3-flash-preview";

/** Anthropic 客户端（单例） */
export const client = new Anthropic({
  baseURL: process.env.ANTHROPIC_BASE_URL,
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
});
