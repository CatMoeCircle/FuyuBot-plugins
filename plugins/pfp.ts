import { Plugin } from "@plugin/BasePlugin.ts";
import type { Client } from "tdl";
import { sendMessage } from "@TDLib/function/message.ts";
import { getMessage } from "@TDLib/function/get.ts";
import { downloadFile } from "@TDLib/function/index.ts";

export default class LifePlugin extends Plugin {
  type = "user";
  name = "修改头像";
  version = "1.0.0";
  description = "修改头像";
  constructor(client: Client) {
    super(client);
    this.cmdHandlers = {
      pfp: {
        description: "修改头像",
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
            if (message.content._ !== "messagePhoto") {
              await sendMessage(this.client, update.message.chat_id, {
                reply_to_message_id: update.message.id,
                text: "请回复一条包含照片的消息以修改头像。",
              });
              return;
            }
            const sizes = message.content?.photo?.sizes;
            if (!sizes || sizes.length === 0) {
              await sendMessage(this.client, update.message.chat_id, {
                reply_to_message_id: update.message.id,
                text: "未找到照片尺寸信息。",
              });
              return;
            }

            const lastSize = sizes[sizes.length - 1];
            const remote = lastSize.photo?.remote;
            if (!remote || !remote.id) {
              return;
            }

            const remoteId = remote.id;
            const file = await downloadFile(this.client, remoteId, {
              _: "fileTypePhoto",
            });
            if (!file || !file.local || !file.local.path) {
              return;
            }

            await this.client.invoke({
              _: "setProfilePhoto",
              photo: {
                _: "inputChatPhotoStatic",
                photo: {
                  _: "inputFileLocal",
                  path: file.local.path,
                },
              },
            });
            await sendMessage(this.client, update.message.chat_id, {
              reply_to_message_id: update.message.id,
              text: "头像修改成功！",
            });
          } else {
            await sendMessage(this.client, update.message.chat_id, {
              reply_to_message_id: update.message.id,
              text: "请回复一条包含照片的消息以修改头像。",
            });
          }
        },
      },
    };
  }
}
