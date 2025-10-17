import axios from "axios";
import type { Client } from "tdl";
import { Plugin } from "@plugin/BasePlugin.ts";
import { sendMessage } from "@TDLib/function/message.ts";
import { getChat, getSupergroup, getUser } from "@TDLib/function/get.ts";

export default class dcPlugin extends Plugin {
  type = "general";
  name = "dc";
  version = "1.0.0";
  description = "TG-DC服务器信息查询";
  constructor(client: Client) {
    super(client);
    this.cmdHandlers = {
      dc: {
        description: "查询TG-DC服务器信息",
        handler: async (update, _args) => {
          try {
            const sender_id = update.message.sender_id;
            let username = "";
            if (sender_id._ === "messageSenderUser") {
              const user = await getUser(client, sender_id.user_id);
              username = user.usernames?.active_usernames?.[0] || "";
            }
            if (sender_id._ === "messageSenderChat") {
              const chat = await getChat(client, sender_id.chat_id);
              const Supergroup = await getSupergroup(
                client,
                chat.type._ === "chatTypeSupergroup"
                  ? chat.type.supergroup_id
                  : chat.id
              );
              username = Supergroup.usernames?.active_usernames?.[0] || "";
            }

            if (!username) {
              sendMessage(this.client, update.message.chat_id, {
                text: "查询DC服务器信息失败，确保你已设置用户名和头像",
              });
              return;
            }

            const response = await axios.get(`https://t.me/${username}`);
            const html = response.data;
            // 提取 /html/body/div[2]/div[2]/div/div[1]/a/img 中的 src
            const regex =
              /<div[^>]*class="tgme_page_photo"[^>]*>[\s\S]*?<a[^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["']/;
            const imgMatch = html.match(regex);
            const imgSrc = imgMatch ? imgMatch[1] : null;

            // 从 imgSrc 中提取 CDN 编号
            let cdnNumber = null;
            if (imgSrc) {
              const cdnMatch = imgSrc.match(/cdn(\d+)\.telesco\.pe/);
              cdnNumber = cdnMatch ? cdnMatch[1] : null;
            }

            await sendMessage(this.client, update.message.chat_id, {
              text: `TG-DC 服务器信息查询结果：\n用户名: ${username}\nCDN编号: ${cdnNumber}`,
            });
          } catch (error) {
            console.error("Error fetching DC server info:", error);
          }
        },
      },
    };
  }
}
