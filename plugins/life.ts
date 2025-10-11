import axios from "axios";
import { Plugin } from "@plugin/BasePlugin.ts";
import type { Client } from "tdl";
import { sendMessage } from "@TDLib/function/message.ts";
import type { updateNewMessage } from "tdlib-types";

export default class LifePlugin extends Plugin {
  type = "general";
  name = "life";
  version = "1.0.0";
  description = "人生进度条";
  constructor(client: Client) {
    super(client);
    this.cmdHandlers = {
      life: {
        description: "人生进度条",
        handler: async (message: updateNewMessage, _args?: string[]) => {
          const date = _args?.[0];
          if (!date) {
            await sendMessage(this.client, message.message.chat_id, {
              text: "请提供出生日期，例如：/life 20060101 或 /life 2006-01-01",
            });
            return;
          }
          try {
            const response = await axios.get(
              `https://cyapi.top/API/life_progress.php?date=${encodeURIComponent(
                date
              )}`
            );
            const data = response.data;
            await sendMessage(this.client, message.message.chat_id, {
              text: data + "仅供娱乐，请勿当真" || "获取失败，请稍后再试。",
            });
          } catch {
            await sendMessage(this.client, message.message.chat_id, {
              text: "请求失败，请检查日期格式。",
            });
          }
        },
      },
    };
  }
}
