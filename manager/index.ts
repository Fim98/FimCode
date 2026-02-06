import { SkillLoader } from "./SkillLoader";
import { SKILLS_DIR } from "../config";

const loader = new SkillLoader(SKILLS_DIR);
await loader.load();

/** 全局技能加载器实例 */
export const SKILLS = loader;

export { SkillLoader } from "./SkillLoader";
export { TodoManager, type TodoItem } from "./TodoManager";
