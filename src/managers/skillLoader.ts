import type { Skill, SkillResourceType } from "../types";
import { skillsDir } from "../config";
import { logger } from "../utils/logger";

/**
 * 技能资源标签映射
 */
const RESOURCE_LABELS: Record<SkillResourceType, string> = {
  scripts: "脚本",
  references: "参考文档",
  assets: "资源",
};

/**
 * 从 SKILL.md 文件加载和管理技能。
 *
 * 技能是一个包含以下内容的文件夹:
 * - SKILL.md (必需): YAML 前置元数据 + markdown 说明
 * - scripts/ (可选): 模型可以运行的辅助脚本
 * - references/ (可选): 附加文档
 * - assets/ (可选): 模板、输出文件
 *
 * SKILL.md 格式:
 * ----------------
 *     ---
 *     name: pdf
 *     description: 处理 PDF 文件。用于读取、创建或合并 PDF。
 *     ---
 *
 *     # PDF 处理技能
 *     ...
 */
export class SkillLoader {
  private skills: Map<string, Skill> = new Map();

  constructor(private readonly skillsDir: string) {}

  /**
   * 将 SKILL.md 文件解析为元数据和主体。
   * 使用 Bun.file 读取文件。
   */
  private async parseSkillMd(path: string): Promise<Skill | null> {
    try {
      const file = Bun.file(path);
      if (!(await file.exists())) return null;

      const content = await file.text();

      // 匹配 --- 标记之间的 YAML 前置元数据
      const yamlMatch = content.match(/^---\s*\n(.*?)\n---\s*\n(.*)$/s);
      if (!yamlMatch) return null;

      const [, frontmatter, body] = yamlMatch;
      if (frontmatter === undefined || body === undefined) return null;

      const metadata: Record<string, string> = {};
      for (const line of frontmatter.trim().split("\n")) {
        const colonIndex = line.indexOf(":");
        if (colonIndex > 0) {
          const key = line.slice(0, colonIndex).trim();
          const value = line
            .slice(colonIndex + 1)
            .trim()
            .replace(/^["']|["']$/g, "");
          metadata[key] = value;
        }
      }

      if (!metadata.name || !metadata.description) return null;

      return {
        name: metadata.name,
        description: metadata.description,
        body: body.trim(),
        path,
        dir: path.replace(/\/SKILL\.md$/, ""),
      };
    } catch {
      return null;
    }
  }

  /**
   * 扫描技能目录并加载所有有效的 SKILL.md 文件。
   * 启动时只加载元数据 - 主体按需加载。
   */
  async load(): Promise<void> {
    logger.logToolCall("SkillLoader", "开始加载技能");

    try {
      const entries = Array.from(
        new Bun.Glob("*").scanSync({ cwd: this.skillsDir, onlyFiles: false })
      );

      for (const entry of entries) {
        const skillDir = `${this.skillsDir}/${entry}`;
        const skillMdPath = `${skillDir}/SKILL.md`;

        try {
          const skill = await this.parseSkillMd(skillMdPath);
          if (skill) {
            this.skills.set(skill.name, skill);
            logger.debug(`已加载技能: ${skill.name}`);
          }
        } catch {
          // 跳过无效目录
        }
      }

      logger.logToolCall("SkillLoader", `加载完成，共 ${this.skills.size} 个技能`);
    } catch (error) {
      logger.warn(`技能目录加载失败: ${error}`);
    }
  }

  /**
   * 为系统提示生成技能描述。
   */
  getDescriptions(): string {
    if (this.skills.size === 0) {
      return "(没有可用的技能)";
    }

    return Array.from(this.skills.entries())
      .map(([name, skill]) => `- ${name}: ${skill.description}`)
      .join("\n");
  }

  /**
   * 获取完整技能内容以注入。
   */
  getSkillContent(name: string): string | null {
    const skill = this.skills.get(name);
    if (!skill) return null;

    let content = `# 技能: ${skill.name}\n\n${skill.body}`;

    const resources: string[] = [];
    for (const [folder, label] of Object.entries(RESOURCE_LABELS) as [
      SkillResourceType,
      string
    ][]) {
      const folderPath = `${skill.dir}/${folder}`;
      try {
        const files = Array.from(
          new Bun.Glob("*").scanSync({ cwd: folderPath, onlyFiles: true })
        );
        if (files.length > 0) {
          resources.push(`${label}: ${files.join(", ")}`);
        }
      } catch {
        // 文件夹不存在
      }
    }

    if (resources.length > 0) {
      content += `\n\n**${skill.dir} 中可用的资源:**\n`;
      content += resources.map((r) => `- ${r}`).join("\n");
    }

    return content;
  }

  /**
   * 列出所有技能名称
   */
  listSkills(): string[] {
    return Array.from(this.skills.keys());
  }

  /**
   * 获取技能数量
   */
  get count(): number {
    return this.skills.size;
  }
}

/**
 * 全局技能加载器实例
 */
export const skillLoader = new SkillLoader(skillsDir);
