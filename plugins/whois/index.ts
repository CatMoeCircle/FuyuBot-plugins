import axios from "axios";
import { Plugin } from "@plugin/BasePlugin.ts";
import type { Client } from "tdl";
import { sendMessage } from "@TDLib/function/message.ts";
import type { updateNewMessage } from "tdlib-types";
import whois from "./whois.vue?raw";
import { generatePng } from "@function/gen_png.ts";
import fs from "fs";

export default class whoisPlugin extends Plugin {
  type = "general";
  name = "whois";
  version = "1.0.0";
  description = "域名信息查询";
  constructor(client: Client) {
    super(client);
    this.cmdHandlers = {
      whois: {
        description: "查询域名的 Whois 信息",
        handler: async (message: updateNewMessage, _args) => {
          const url = _args?.[0];
          if (!url) {
            await sendMessage(this.client, message.message.chat_id, {
              text: "请提供要查询的域名，例如 /whois example.com",
            });
            return;
          }
          try {
            const domain = url
              .replace(/^(https?:\/\/)?(www\.)?/, "")
              .split("/")[0];

            const whoisData = await getWhoisInfo(domain);
            if (!whoisData || whoisData.status === 0) {
              await sendMessage(this.client, message.message.chat_id, {
                text: "域名信息查询失败，请稍后再试。",
              });
              return;
            }
            if (whoisData.data.is_available === 1) {
              await sendMessage(this.client, message.message.chat_id, {
                text: "域名未被注册，未找到相关信息。",
              });
              return;
            }
            // 额外调用 IP 查询接口以获取服务器信息（必须）
            const ipInfo = await getIpInfo(domain);

            const templateStr = whois;
            const props = {
              is_available: whoisData.data.is_available,
              domain: whoisData.data.domain,
              domain_suffix: whoisData.data.domain_suffix,
              query_time: whoisData.data.query_time,
              registrant_name: whoisData.data.info.registrant_name,
              registrant_email: whoisData.data.info.registrant_email,
              registrar_name: whoisData.data.info.registrar_name,
              creation_time: whoisData.data.info.creation_time,
              expiration_time: whoisData.data.info.expiration_time,
              creation_days: whoisData.data.info.creation_days,
              valid_days: whoisData.data.info.valid_days,
              is_expire: whoisData.data.info.is_expire,
              domain_status: whoisData.data.info.domain_status,
              name_server: whoisData.data.info.name_server,
              whois_server: whoisData.data.info.whois_server,
              raw: whoisData.data.raw,
              ip: ipInfo?.data?.ip ?? whoisData.data.ip ?? "",
              country: ipInfo?.data?.country ?? whoisData.data.country ?? "",
              city: ipInfo?.data?.city ?? whoisData.data.city ?? "",
              area: ipInfo?.data?.area ?? whoisData.data.area ?? "",
              isp: ipInfo?.data?.isp ?? whoisData.data.isp ?? "",
            };
            const imagePath = await generatePng(
              {
                width: 800,
                height: 1400,
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
              text: "域名信息查询失败，请稍后再试。",
            });
          }
        },
      },
    };
  }
}

/**
 * 查询域名 Whois 信息
 * @param {string} domain 要查询的域名
 * @returns {Promise<object|null>} Whois 查询结果
 */
async function getWhoisInfo(domain: string) {
  try {
    const response = await axios.get(
      `https://api.whoiscx.com/whois/?domain=${domain}&raw=1`
    );

    return response.data;
  } catch {
    return;
  }
}

// 查询 IP 归属与运营商信息
async function getIpInfo(domain: string) {
  try {
    const response = await axios.get(
      `https://whoiscx.com/api/whois/ip/?domain=${domain}`
    );
    return response.data;
  } catch {
    return;
  }
}
