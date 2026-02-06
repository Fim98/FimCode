import { randomUUID } from "node:crypto";
import { logsDir, runtimeLimits } from "../config";
import { logger } from "../utils/logger";

/**
 * 会话信息
 */
export interface Session {
  /** 会话 ID */
  id: string;
  /** 会话名称 */
  name: string;
  /** 创建时间 */
  createdAt: Date;
  /** 最后活跃时间 */
  lastActiveAt: Date;
  /** 对话轮数 */
  messageCount: number;
  /** 工作目录 */
  workDir: string;
}

/**
 * 会话管理器
 *
 * 管理会话生命周期，包括创建、保存、恢复和清理
 */
export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private activeSessionId: string | null = null;

  /**
   * 创建新会话
   */
  createSession(name?: string): Session {
    const session: Session = {
      id: randomUUID(),
      name: name || `会话 ${this.sessions.size + 1}`,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      messageCount: 0,
      workDir: process.cwd(),
    };

    this.sessions.set(session.id, session);
    this.activeSessionId = session.id;

    logger.logSession(session.id, "创建会话");
    return session;
  }

  /**
   * 获取活跃会话
   */
  getActiveSession(): Session | null {
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) || null;
  }

  /**
   * 设置活跃会话
   */
  setActiveSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    this.activeSessionId = sessionId;
    session.lastActiveAt = new Date();
    logger.logSession(sessionId, "切换为活跃会话");
    return true;
  }

  /**
   * 更新会话消息计数
   */
  incrementMessageCount(sessionId?: string): void {
    const id = sessionId || this.activeSessionId;
    if (!id) return;

    const session = this.sessions.get(id);
    if (session) {
      session.messageCount++;
      session.lastActiveAt = new Date();
    }
  }

  /**
   * 列出所有会话
   */
  listSessions(): Session[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime()
    );
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string): Session | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * 删除会话
   */
  deleteSession(sessionId: string): boolean {
    const existed = this.sessions.delete(sessionId);
    if (existed) {
      logger.logSession(sessionId, "删除会话");
      if (this.activeSessionId === sessionId) {
        this.activeSessionId = null;
      }
    }
    return existed;
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions(): number {
    const now = Date.now();
    const expiredIds: string[] = [];

    for (const [id, session] of this.sessions) {
      const elapsed = now - session.lastActiveAt.getTime();
      if (elapsed > runtimeLimits.sessionTimeoutMs) {
        expiredIds.push(id);
      }
    }

    for (const id of expiredIds) {
      this.sessions.delete(id);
      logger.logSession(id, "过期清理");
    }

    return expiredIds.length;
  }

  /**
   * 获取会话统计
   */
  getStats(): { total: number; active: number } {
    return {
      total: this.sessions.size,
      active: this.activeSessionId ? 1 : 0,
    };
  }
}

/**
 * 全局会话管理器实例
 */
export const sessionManager = new SessionManager();
