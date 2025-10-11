import { Plugin } from "@plugin/BasePlugin.ts";
import axios from "axios";
import type { Client } from "tdl";
import { downloadFile } from "@function/downloadFile.ts";
import { sendMessage } from "@TDLib/function/message.ts";
import fs from "fs";
import logger from "@log/index.ts";
export default class BilibiliPlugin extends Plugin {
  type = "general";
  name = "bilibili";
  version = "1.0.0";
  description = "获取B站个人主页信息";
  constructor(client: Client) {
    super(client);
    this.cmdHandlers = {
      bilibili: {
        description: "获取B站个人主页信息",
        handler: async (message, args) => {
          const uid = args?.[0];
          if (!uid) {
            await sendMessage(client, message.message.chat_id, {
              text: "请提供用户UID，例如 /bilibili 123456",
            });
            return;
          }
          try {
            const result = await getBiliUserInfo(uid);
            if (!result.success || !result.messageChain) {
              await sendMessage(client, message.message.chat_id, {
                text: `获取用户信息失败：${result.error}`,
              });
              return;
            }
            const avatarItem = result.messageChain.find(
              (m) => m.type === "image"
            );
            let localAvatarPath: string | undefined;
            if (avatarItem?.url) {
              localAvatarPath = await downloadFile(avatarItem.url);
            }
            const textItems = result.messageChain.filter(
              (m) => m.type === "text"
            );
            const text = textItems.map((m) => m.text).join("\n");
            await sendMessage(client, message.message.chat_id, {
              text,
              media: localAvatarPath
                ? { photo: { path: localAvatarPath } }
                : undefined,
            });
            // 删除文件
            if (localAvatarPath && fs.existsSync(localAvatarPath)) {
              fs.unlinkSync(localAvatarPath);
            }
          } catch (error) {
            logger.error("Bilibili plugin error:", error);
            await sendMessage(client, message.message.chat_id, {
              text: "处理请求时出错",
            });
          }
        },
      },
    };
  }
}

/**
 * 查询 B 站用户信息并返回标准化结果
 * @param {string|number} uid - 用户 UID
 * @param {{timeout?:number, headers?:Record<string,string>}} [options]
 * @returns {Promise<{success:boolean, error?:string, messageChain?:Array}>}
 */
export async function getBiliUserInfo(
  uid: string | number,
  options: { timeout?: number; headers?: Record<string, string> } = {}
) {
  const apiUrl = "http://api.bilibili.com/x/web-interface/card";
  const headers = Object.assign(
    {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AstrBotPlugin/1.0",
    },
    options.headers || {}
  );

  try {
    const resp = await axios.get(apiUrl, {
      params: { mid: uid },
      headers,
      timeout: options.timeout ?? 10000,
    });

    if (resp.status !== 200) {
      return { success: false, error: `接口请求失败，状态码：${resp.status}` };
    }

    const data = resp.data;

    if (data?.code !== 0) {
      const errorMapping: Record<number, string> = {
        [-400]: "请求参数错误",
        [-404]: "用户不存在",
        [-412]: "请求被拦截",
        [-500]: "服务器内部错误",
      };
      const msg = `接口返回错误：${errorMapping[data?.code] ?? "未知错误"} (${
        data?.message ?? ""
      })`;
      return { success: false, error: msg };
    }

    const user_data = data.data || {};
    const card = user_data.card || {};
    const level_info = card.level_info || {};
    const vip_info = card.vip || {};

    const messageChain = [];

    // 头像
    if (card.face) {
      // 约定 Image.fromURL 的表示方式为对象 { type: 'image', url }
      messageChain.push({ type: "image", url: card.face + "@200w.jpg" });
    }

    // 基础信息
    const infoLines = [
      `🔍 用户昵称：${card.name ?? "未知"}`,
      `🆔 UID：${card.mid ?? "未知"}`,
      `⭐ 等级：Lv${level_info.current_level ?? 0}`,
      `👤 性别：${
        card.sex === "男" ? "男" : card.sex === "女" ? "女" : "未知"
      }`,
      `💎 大会员状态：${parseVipType(vip_info.type ?? 1)}`,
      `💎 大会员等级：${vip_info.label?.text ?? "无会员"}`,
    ];
    messageChain.push({ type: "text", text: infoLines.join("\n") });

    const statsLines = [
      "",
      `👥 粉丝数：${formatNumber(user_data.follower ?? 0)}`,
      `❤️ 关注数：${formatNumber(card.attention ?? 0)}`,
      `📺 视频数：${formatNumber(user_data.archive_count ?? 0)}`,
      `👍 获赞数：${formatNumber(user_data.like_num ?? 0)}`,
    ];
    messageChain.push({ type: "text", text: statsLines.join("\n") });

    return { success: true, messageChain };
  } catch (err: any) {
    // axios 错误有很多种可能性
    if (err.code === "ECONNABORTED") {
      return { success: false, error: "请求超时，请稍后重试" };
    }

    if (err.response) {
      return {
        success: false,
        error: `接口请求失败，状态码：${err.response.status}`,
      };
    }

    return { success: false, error: `网络请求错误：${err.message}` };
  }
}

function parseVipType(vipType: number) {
  const vip_map: Record<number, string> = { 1: "无会员", 2: "有会员" };
  return vip_map[vipType] ?? "未知";
}

function formatNumber(num: number) {
  const n = Number(num) || 0;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return String(n);
}
