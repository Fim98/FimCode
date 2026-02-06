/**
 * 技能系统类型定义
 */

/**
 * 技能数据结构
 */
export interface Skill {
  /** 技能名称 */
  name: string;
  /** 技能描述 */
  description: string;
  /** 技能主体内容 */
  body: string;
  /** 技能文件路径 */
  path: string;
  /** 技能所在目录 */
  dir: string;
}

/**
 * 技能资源类型
 */
export type SkillResourceType = "scripts" | "references" | "assets";

/**
 * 技能资源映射
 */
export const SKILL_RESOURCE_LABELS: Record<SkillResourceType, string> = {
  scripts: "脚本",
  references: "参考文档",
  assets: "资源",
};
