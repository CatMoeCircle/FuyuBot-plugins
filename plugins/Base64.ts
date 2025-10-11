import { Plugin } from "@plugin/BasePlugin.ts";
import type { Client } from "tdl";
import { sendMessage } from "@TDLib/function/message.ts";

export default class Base64Plugin extends Plugin {
  type = "general";
  name = "Base64";
  version = "1.0.0";
  description = "Base64 编码和解码";
  constructor(client: Client) {
    super(client);
    this.cmdHandlers = {
      base64: {
        description: "Base64 编码和解码",
        handler: async (message, args) => {
          if (!args || args.length < 2) {
            await sendMessage(this.client, message.message.chat_id, {
              text: "用法:\n/base64 encode <文本> [字符编码]\n/base64 decode <Base64字符串> [字符编码]\n字符编码默认为 utf8",
            });
            return;
          }

          const action = args[0].toLowerCase();
          const input = args[1];
          const encoding = (args[2] || "utf8") as BufferEncoding;

          // 验证编码是否有效
          const validEncodings: BufferEncoding[] = [
            "ascii",
            "utf8",
            "utf-8",
            "utf16le",
            "ucs2",
            "ucs-2",
            "base64",
            "base64url",
            "latin1",
            "binary",
            "hex",
          ];
          if (!validEncodings.includes(encoding)) {
            await sendMessage(this.client, message.message.chat_id, {
              text: `无效的字符编码。支持的编码: ${validEncodings.join(", ")}`,
            });
            return;
          }

          try {
            let result: string;
            if (action === "encode") {
              result = Buffer.from(input, encoding).toString("base64");
              await sendMessage(this.client, message.message.chat_id, {
                text: `编码结果 (${encoding}): ${result}`,
              });
            } else if (action === "decode") {
              result = Buffer.from(input, "base64").toString(encoding);
              await sendMessage(this.client, message.message.chat_id, {
                text: `解码结果 (${encoding}): ${result}`,
              });
            } else {
              await sendMessage(this.client, message.message.chat_id, {
                text: "无效操作。请使用 'encode' 或 'decode'",
              });
            }
          } catch {
            await sendMessage(this.client, message.message.chat_id, {
              text: "处理失败，请检查输入格式和字符编码",
            });
          }
        },
      },
    };
  }
}
