import logger from "@log/index.ts";
import { Plugin } from "@plugin/BasePlugin.ts";
import { sendMessage } from "@TDLib/function/message.ts";
import si from "systeminformation";
import type { Client } from "tdl";
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
            // 获取系统信息
            const systemInfo = await getSystemInformation();

            // 构建系统信息消息文本
            let messageText = this.formatSystemInfo(systemInfo);

            const version = await this.client.invoke({
              _: "getOption",
              name: "version",
            });

            const commitHash = await this.client.invoke({
              _: "getOption",
              name: "commit_hash",
            });

            messageText += `\n🤖 *TDLib 版本*: ${
              version._ === "optionValueString" ? version.value : "未知"
            }`;

            messageText += `\n🔖 *提交哈希*: ${
              commitHash._ === "optionValueString"
                ? `[${commitHash.value}](https://github.com/tdlib/td/commit/${commitHash.value})`
                : "null"
            }`;

            await sendMessage(this.client, updateNewMessage.message.chat_id, {
              text: messageText,
            });
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

  /**
   * 格式化系统信息为消息文本
   * @param systemInfo 系统信息对象
   * @returns 格式化后的消息文本
   */
  private formatSystemInfo(systemInfo: any): string {
    const { os, cpu, memory, disk } = systemInfo;

    let message = "🖥️ *系统信息*\n\n";

    // 操作系统信息
    message += `📋 *操作系统*\n`;
    message += `• 平台: ${os.platform}\n`;
    message += `• 发行版: ${os.distro}\n\n`;

    // CPU信息
    message += `🔧 **处理器**\n`;
    message += `• 使用率: ${cpu.usage}\n\n`;

    // 内存信息
    message += `💾 **内存**\n`;
    message += `• 总容量: ${memory.total}\n`;
    message += `• 已使用: ${memory.used}\n`;
    message += `• 使用率: ${memory.usage}\n\n`;

    // 磁盘信息
    message += `💿 *磁盘空间*\n`;
    disk.forEach((d: any, index: number) => {
      message += `• 磁盘 ${index + 1} (${d.fs}): ${d.used}/${d.size} (${
        d.usage
      })\n`;
    });

    return message;
  }
}

export async function getSystemInformation() {
  const osInfo = await si.osInfo();
  const cpuInfo = await si.cpu();
  const cpuLoad = await si.currentLoad();
  const memInfo = await si.mem();
  const diskInfo = await si.fsSize();

  return {
    os: {
      platform: osInfo.platform,
      distro: osInfo.distro,
    },
    cpu: {
      brand: cpuInfo.brand,
      usage: Math.round(cpuLoad.currentLoad) + "%",
    },
    memory: {
      total: formatGB(memInfo.total),
      used: formatGB(memInfo.used),
      usage: Math.round((memInfo.used / memInfo.total) * 100) + "%", // 内存占用百分比，取整数
    },
    disk: diskInfo.map((disk) => ({
      fs: disk.fs,
      type: disk.type,
      size: formatGB(disk.size),
      used: formatGB(disk.used),
      usage: Math.round(disk.use) + "%", // 磁盘占用百分比，取整数
    })),
  };
}
function formatGB(bytes: number): string {
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";
}
