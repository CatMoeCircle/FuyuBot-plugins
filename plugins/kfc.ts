import axios from "axios";
import { Plugin } from "@plugin/BasePlugin.ts";
import type { Client } from "tdl";
import { sendMessage } from "@TDLib/function/message.ts";
import fs from "fs";
import crypto from "crypto";
const md5 = (data: string) => {
  return crypto.createHash("md5").update(data).digest("hex");
};

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
          // URL 前缀
          const urlPrefix = "https://image.edgeone.app";
          // 模板中设置的图片格式，可在 Settings 中查看
          const format = "png";
          // 用户 Id，可在 Settings 中查看
          const userId = "8b8cff6b6f4d4afdaf2d2b70c07c0d2f";
          // 模板 Id，可在 Settings 中查看
          const templateId = "ep-n2wgWTNM3uD1";
          // 生成签名的API Key，可在 Settings 中查看
          const apiKey = "QhsJaY42bhxH";

          // 在这里填入要修改的模板参数
          let params: Record<string, string> = {
            username: "KFC",
            handle: "@KFC_ES · 刚刚",
            content: response.data,
          };
          // 对参数key进行排序
          const sortedKeys = Object.keys(params).sort();
          // 对参数进行拼接
          const searchParams = sortedKeys
            .map((key) => `${key}=${params[key]}`)
            .join("&");

          // 待签名的数据
          const signData = JSON.stringify({
            apiKey: apiKey,
            searchParams: searchParams,
          });
          // 调用 md5 生成签名
          const sign = md5(signData);

          // 对 URL 参数的值执行 encodeURIComponent，以编码 URL 中的特殊字符

          const encodedSearchParams = sortedKeys
            .map((key) => `${key}=${encodeURIComponent(params[key])}`)
            .join("&");
          const finalUrl =
            urlPrefix +
            "/" +
            sign +
            "/" +
            userId +
            "/" +
            templateId +
            "." +
            format +
            "?" +
            encodedSearchParams;
          const image = await axios.get(finalUrl, {
            responseType: "arraybuffer",
          });

          fs.writeFileSync(process.cwd() + "/cache/kfc.png", image.data);

          await sendMessage(this.client, message.message.chat_id, {
            reply_to_message_id: message.message.id,
            text: "您的肯德基到了，请注意查收~",
            media: {
              photo: {
                path: process.cwd() + "/cache/kfc.png",
              },
            },
          });
          fs.unlinkSync(process.cwd() + "/cache/kfc.png");
        },
      },
    };
  }
}
