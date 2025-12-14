import logger from "@log/index.ts";
import { Plugin } from "@plugin/BasePlugin.ts";
import { sendMessage } from "@TDLib/function/message.ts";
import si from "systeminformation";
import type { Client } from "tdl";
import system from "./system.vue?raw";
import { generateImage } from "@function/genImg.ts";
import { getConfig } from "@db/config.ts";
import { getMe, getUser } from "@TDLib/function/get.ts";
import { getPluginManager } from "@function/plugins.ts";
import fs from "fs";
import { downloadFile } from "@TDLib/function/index.ts";
import path from "path";

export default class startPlugin extends Plugin {
  type = "general";
  name = "system";
  version = "1.0.0";
  description = "处理 /system 系统查看命令";
  constructor(client: Client) {
    super(client);
    this.cmdHandlers = {
      system: {
        description: "system 命令",
        handler: async (updateNewMessage, _args) => {
          try {
            const pluginManager = getPluginManager();

            // 获取系统信息
            const systemInfo = await getSystemInformation();

            const version = await this.client.invoke({
              _: "getOption",
              name: "version",
            });
            const versionValue =
              version._ === "optionValueString" ? version.value : "未知";

            const commitHash = await this.client.invoke({
              _: "getOption",
              name: "commit_hash",
            });
            const commitHashValue =
              commitHash._ === "optionValueString" ? commitHash.value : "未知";

            const me = await getMe(this.client);

            let mePhoto: string | undefined = undefined;
            if (me.profile_photo?.big.local.path) {
              // 如果用户有头像，添加到请求中
              mePhoto = me.profile_photo.big.local.path;
            } else if (me.profile_photo?.big.remote.id) {
              const file = await downloadFile(
                this.client,
                me.profile_photo?.big.remote.id,
                { _: "fileTypeProfilePhoto" }
              );
              mePhoto = file.local.path;
            }

            const admin = await getConfig("admin");

            const user_id = admin?.super_admin;
            const userInfo = user_id
              ? await getUser(this.client, user_id)
              : null;

            let adminPhoto: string | undefined = undefined;
            if (userInfo && userInfo.profile_photo?.big.local.path) {
              // 如果用户有头像，添加到请求中
              adminPhoto = userInfo.profile_photo.big.local.path;
            } else if (userInfo && userInfo.profile_photo?.big.remote.id) {
              const file = await downloadFile(
                this.client,
                userInfo.profile_photo?.big.remote.id,
                { _: "fileTypeProfilePhoto" }
              );
              adminPhoto = file.local.path;
            }

            const result = await generateImage(
              {
                width: "auto",
                height: "auto",
                quality: 1.5,
              },
              system,
              {
                bot: {
                  name: me?.first_name || "未知",
                  username: me?.usernames?.editable_username || "未知",
                  id: me?.id || 0,
                  photo: await convertPhotoToBase64(mePhoto),
                },
                admin: {
                  name: userInfo?.first_name || "未知",
                  username: userInfo?.usernames?.editable_username || "未知",
                  id: userInfo?.id || 0,
                  photo: await convertPhotoToBase64(adminPhoto),
                },
                tblib: {
                  version: versionValue || "未知",
                  commitHash: commitHashValue || "未知",
                },
                system: systemInfo,
                plugins: pluginManager?.getPlugins?.() ?? [],
              }
            );

            await sendMessage(this.client, updateNewMessage.message.chat_id, {
              media: {
                photo: {
                  path: result.path,
                },
              },
            });
            await fs.promises.unlink(result.path!);
          } catch (e) {
            logger.error("发送系统信息失败", e);
            // 发送错误消息给用户
            try {
              await sendMessage(this.client, updateNewMessage.message.chat_id, {
                text: "❌ 获取系统信息失败，请稍后重试。",
              });
            } catch (sendError) {
              logger.error("发送错误消息失败", sendError);
            }
          }
        },
      },
    };
  }
}

/**
 * 获取系统信息
 * @returns
 */
async function getSystemInformation() {
  const cpuLoad = await si.currentLoad();
  const memInfo = await si.mem();
  const diskInfo = await si.fsSize();

  const result: {
    system: {
      CPU: { usage: number };
      RAM: { usage: number };
      SWAP?: { usage: number };
    };
    source: Record<
      string,
      {
        used: string;
        total: string;
        usagePercent: number;
      }
    >;
  } = {
    system: {
      CPU: {
        usage: Math.round(cpuLoad.currentLoad),
      },
      RAM: {
        usage: Math.round((memInfo.used / memInfo.total) * 100),
      },
    },
    source: {},
  };

  // 虚拟内存(SWAP)信息
  if (memInfo.swaptotal > 0) {
    result.system.SWAP = {
      usage: Math.round((memInfo.swapused / memInfo.swaptotal) * 100),
    };
  }

  // 处理磁盘信息
  diskInfo.forEach((disk) => {
    const driveLetter = disk.fs.split(":")[0];
    if (driveLetter && disk.size > 0) {
      result.source[driveLetter] = {
        used: formatGB(disk.used),
        total: formatGB(disk.size),
        usagePercent: Math.round(disk.use),
      };
    }
  });

  return result;
}

function formatGB(bytes: number): string {
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";
}

async function convertPhotoToBase64(photoPath: string | undefined) {
  // 将本地图片路径转换为 Base64 Data URL
  if (photoPath) {
    try {
      const buffer = await fs.promises.readFile(photoPath);
      const ext = path.extname(photoPath).slice(1).toLowerCase();
      const mime =
        ext === "png"
          ? "image/png"
          : ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : ext === "webp"
          ? "image/webp"
          : "application/octet-stream";
      return `data:${mime};base64,${buffer.toString("base64")}`;
    } catch (err) {
      logger.warn("转换头像为 base64 失败，将忽略头像", err);
      return undefined;
    }
  }
}
