import axios from "axios";
import { Plugin } from "@plugin/BasePlugin.ts";
import type { Client } from "tdl";
import { sendMessage } from "@TDLib/function/message.ts";

export default class sjzxdPlugin extends Plugin {
  type = "general";
  name = "sjzxd";
  version = "1.0.0";
  description = "三角洲行动密码";
  constructor(client: Client) {
    super(client);
    this.cmdHandlers = {
      sjzxd: {
        description: "三角洲行动密码大约在零点左右更新",
        handler: async (message, _args) => {
          const response = await axios.get(
            "https://cyapi.top/API/sjzxd_password.php"
          );
          const data = response.data;
          if (data && data.passwords) {
            const fullTexts = data.passwords
              .map((item: any) => `> ${item.full_text}`)
              .join("\n");
            await sendMessage(this.client, message.message.chat_id, {
              text: fullTexts,
            });
          } else {
            await sendMessage(this.client, message.message.chat_id, {
              text: "密码获取失败。",
            });
          }
        },
      },
    };
  }
}
