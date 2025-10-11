import type { Client } from "tdl";
import { Plugin } from "@plugin/BasePlugin.ts";
import logger from "@log/index.ts";
import path from "node:path";
import fs from "node:fs/promises";
import fssync from "node:fs";

export default class CachePlugin extends Plugin {
  type = "general";
  name = "cache";
  version = "1.0.0";
  description = "定期清理缓存(>20分钟)";
  private cacheDir = path.join(process.cwd(), "cache");
  private cleaning = false;

  constructor(client: Client) {
    super(client);
    this.runHandlers = {
      cacheCleaner: {
        description: "每 5 分钟清理 cache 目录中过期(>20分钟)的文件",
        intervalMs: 5 * 60_000,
        immediate: false,
        handler: async () => {
          await this.cleanCacheSafe();
        },
      },
    };
  }

  /** 并发保护包装 */
  private async cleanCacheSafe() {
    if (this.cleaning) {
      logger.debug("[CachePlugin] 上一次清理尚未结束，跳过本轮");
      return;
    }
    this.cleaning = true;
    try {
      await this.cleanCache();
    } catch (e) {
      logger.error("[CachePlugin] 清理缓存时发生错误:", e);
    } finally {
      this.cleaning = false;
    }
  }

  /** 实际清理逻辑：删除超过20分钟未修改的文件，并尝试移除空目录 */
  private async cleanCache() {
    const root = this.cacheDir;
    try {
      // 若目录不存在则不处理
      await fs
        .access(root)
        .catch(() => Promise.reject("cache 目录不存在，跳过"));
    } catch (e) {
      logger.debug(`[CachePlugin] ${e}`);
      return;
    }

    const now = Date.now();
    const ttlMs = 20 * 60_000; // 20 分钟

    let deletedFiles = 0;
    let freedBytes = 0;

    const walkAndClean = async (dir: string): Promise<boolean> => {
      let entries: Array<any> = [];
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch (e) {
        logger.debug(`[CachePlugin] 读取目录失败: ${dir}`, e as any);
        return false;
      }

      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        try {
          if (ent.isDirectory()) {
            await walkAndClean(full);
            // 尝试移除空目录
            try {
              const remain = await fs.readdir(full);
              if (remain.length === 0) {
                await fs.rm(full).catch(() => {});
              }
            } catch {
              // 忽略
            }
          } else if (ent.isFile()) {
            // 使用文件的创建时间（birthtime）作为下载时间参考，若不可用则回退到 ctime 或 mtime
            let st: fssync.Stats | null = null;
            try {
              st = fssync.statSync(full);
            } catch (e) {
              logger.debug(`[CachePlugin] 获取文件信息失败: ${full}`, e as any);
              continue;
            }

            // Node 的 Stats 提供 birthtimeMs（创建时间），在某些文件系统上可能不可用，按优先级回退
            const fileTimeMs =
              (st &&
                (typeof st.birthtimeMs === "number" ? st.birthtimeMs : 0)) ||
              (st && (typeof st.ctimeMs === "number" ? st.ctimeMs : 0)) ||
              (st && (typeof st.mtimeMs === "number" ? st.mtimeMs : 0)) ||
              0;

            if (fileTimeMs === 0) {
              logger.debug(`[CachePlugin] 无法读取时间信息，跳过: ${full}`);
              continue;
            }

            if (now - fileTimeMs > ttlMs) {
              try {
                freedBytes += st.size;
                await fs.unlink(full);
                deletedFiles++;
              } catch (e) {
                logger.debug(`[CachePlugin] 删除文件失败: ${full}`, e as any);
              }
            }
          }
        } catch (e) {
          logger.debug(`[CachePlugin] 处理条目失败: ${full}`, e as any);
        }
      }
      return true;
    };

    logger.debug(`[CachePlugin] 开始清理缓存目录: ${root}`);
    await walkAndClean(root);
    if (deletedFiles > 0) {
      const freedMB = (freedBytes / (1024 * 1024)).toFixed(2);
      logger.info(
        `[CachePlugin] 清理完成，删除 ${deletedFiles} 个文件，释放约 ${freedMB} MB`
      );
    } else {
      logger.debug(`[CachePlugin] 未发现超过 20 分钟的缓存文件`);
    }
  }
}
