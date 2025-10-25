import axios from "axios";
import { Plugin } from "@plugin/BasePlugin.ts";
import type { Client } from "tdl";
import { sendMessage } from "@TDLib/function/message.ts";
import fs from "fs";
import kfc from "./kfc.vue?raw";
import { generateImage } from "@function/genImg.ts";

export default class KfcPlugin extends Plugin {
  type = "general";
  name = "kfc";
  version = "1.0.0";
  description = "点个肯德基吧";
  constructor(client: Client) {
    super(client);

    this.cmdHandlers = {
      kfc: {
        description: "找你的好友索要一份肯德基吧",
        handler: async (message, _args) => {
          const response = await axios.get("https://api.pearktrue.cn/api/kfc");
          let content = response.data;
          if (typeof content === "string") {
            content = content.replace(/\\n|\/n/g, "\n");
          }
          const imagePath = await generateImage(
            {
              width: 800,
              height: "auto",
            },
            kfc,
            {
              content,
            }
          );
          await sendMessage(this.client, message.message.chat_id, {
            reply_to_message_id: message.message.id,
            media: {
              photo: {
                path: imagePath.path,
              },
            },
          });
          await fs.promises.unlink(imagePath.path!);
        },
      },
    };
  }
}
