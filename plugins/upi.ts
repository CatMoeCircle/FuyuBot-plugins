import axios from "axios";
import type { Client } from "tdl";
import { Plugin } from "@plugin/BasePlugin.ts";
import fs from "fs";
import { deleteFile, downloadFile } from "@TDLib/function/index.ts";
import { sendMessage } from "@TDLib/function/message.ts";
import { getMessage } from "@TDLib/function/get.ts";

export default class UpiPlugin extends Plugin {
  type = "general";
  name = "upi";
  version = "1.0.0";
  description = "图床";

  constructor(client: Client) {
    super(client);
    this.cmdHandlers = {
      upi: {
        description: "上传图片到 UPI 图床",
        handler: async (update, _args) => {
          if (
            update.message.reply_to &&
            update.message.reply_to._ === "messageReplyToMessage"
          ) {
            const message = await getMessage(
              client,
              update.message.reply_to.chat_id,
              update.message.reply_to.message_id
            );
            if (message.content._ !== "messagePhoto") return;

            const file = await downloadFile(
              client,
              message.content.photo.sizes.slice(-1)[0].photo.remote.id,
              {
                _: "fileTypePhoto",
              }
            );

            if (!file) {
              return;
            }
            const FormData = (await import("form-data")).default;
            const form = new FormData();
            form.append("reqtype", "fileupload");
            form.append("fileToUpload", fs.createReadStream(file.local.path));

            const response = await axios.post(
              "https://catbox.moe/user/api.php",
              form,
              {
                headers: {
                  ...form.getHeaders(),
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
              }
            );
            sendMessage(this.client, update.message.chat_id, {
              text: `图片上传成功：\`${response.data}\``,
            });
            deleteFile(client, file.id);
          }
        },
      },
    };
  }
}
