import axios from "axios";
import { Plugin } from "@plugin/BasePlugin.ts";
import type { Client } from "tdl";
import { sendMessage } from "@TDLib/function/message.ts";
import { generatePng } from "@function/gen_png.ts";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import yiyanvue from "./yiyan.vue?raw";

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class yiyanPlugin extends Plugin {
  type = "general";
  name = "yiyan";
  version = "1.0.0";
  description = "一言";

  constructor(client: Client) {
    super(client);

    this.cmdHandlers = {
      yiyan: {
        description: "获取一言",
        handler: async (message, _args) => {
          try {
            const res = await axios.get("https://v1.hitokoto.cn/?encode=text");
            const hitokoto = res.data?.trim() || "获取一言失败";
            if (hitokoto === "获取一言失败") {
              return;
            }
            const templateStr = yiyanvue;
            const props = { hitokoto };
            const imagePath = await generatePng(
              {
                width: 800,
                height: 400,
              },
              templateStr,
              props
            );
            await sendMessage(this.client, message.message.chat_id, {
              media: {
                photo: {
                  path: imagePath,
                },
              },
            });
            await fs.promises.unlink(imagePath);
          } catch {
            await sendMessage(this.client, message.message.chat_id, {
              text: "喵呜～获取一言失败，请稍后再试吧~",
            });
          }
        },
      },
    };
  }
}
