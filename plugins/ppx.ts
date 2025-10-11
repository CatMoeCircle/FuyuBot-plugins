import type { Client } from "tdl";
import type { updateNewMessage } from "tdlib-types";
import { Plugin } from "@plugin/BasePlugin.ts";
import axios from "axios";
import { sendMessage } from "@TDLib/function/message.ts";

// Use a stable User-Agent string to avoid adding an extra dependency
const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
export default class ppxPlugin extends Plugin {
  type = "general";
  name = "ppx";
  version = "1.0.0";
  description = "PPX 视频解析";
  constructor(client: Client) {
    super(client);
    this.cmdHandlers = {
      ppx: {
        description: "PPX 视频解析",
        handler: async (message: updateNewMessage, _args?: string[]) => {
          const url = _args?.[0];
          if (!url || typeof url !== "string") {
            await sendMessage(this.client, message.message.chat_id, {
              text: "请提供PPX分享链接，例如：`h5.pipix.com/xxxx`",
            });
            return;
          }

          try {
            const videoId = await parseVideoId(url);
            const videoInfo = await getVideoInfo(videoId);
            const chatId = message.message.chat_id;
            const replyTo = message.message.id;

            const captionParts: string[] = [];
            if (videoInfo.title) captionParts.push(`标题：${videoInfo.title}`);
            if (videoInfo.author?.name)
              captionParts.push(`作者：${videoInfo.author.name}`);
            const caption = captionParts.join("\n") || undefined;

            if (videoInfo.video_url) {
              // send as video media (use URL as inputFile.id)
              await sendMessage(this.client, chatId, {
                reply_to_message_id: replyTo,
                media: {
                  video: { id: videoInfo.video_url },
                  cover: videoInfo.cover_url
                    ? { id: videoInfo.cover_url }
                    : undefined,
                  supports_streaming: true,
                },
                text: caption,
              });
            } else if (videoInfo.cover_url) {
              // send cover image with caption
              await sendMessage(this.client, chatId, {
                reply_to_message_id: replyTo,
                media: {
                  photo: { id: videoInfo.cover_url },
                },
                text: caption,
              });
            } else {
              // fallback: send text with available info
              await sendMessage(this.client, chatId, {
                reply_to_message_id: replyTo,
                text: caption || "未能解析到视频或封面信息",
              });
            }
          } catch (error: any) {
            await sendMessage(this.client, message.message.chat_id, {
              reply_to_message_id: message.message.id,
              text: `解析失败: ${error?.message ?? String(error)}`,
            });
          }
        },
      },
    };
  }
}

async function parseVideoId(shareLink: string): Promise<string> {
  if (!shareLink.includes("h5.pipix.com")) {
    throw new Error("非有效的ppx分享链接");
  }

  try {
    // For direct item URLs
    if (shareLink.includes("/item/")) {
      const match = shareLink.match(/\/item\/(\d+)/);
      if (match) return match[1];
    }

    // For shortened URLs that need redirection
    const response = await axios.get(shareLink, {
      headers: {
        "User-Agent": userAgent.toString(),
      },
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const redirectUrl = response.request.res.responseUrl || response.config.url;
    const match = redirectUrl.match(/\/item\/(\d+)/);
    if (match) {
      return match[1];
    }

    throw new Error("未找到视频ID");
  } catch (err: any) {
    // rethrow as Error to preserve message
    throw new Error(err?.message ?? String(err));
  }
}
async function getVideoInfo(videoId: string): Promise<any> {
  const apiUrl = `https://api5-hl.pipix.com/bds/cell/cell_comment/?cell_id=${videoId}&aid=1319&app_name=super&version_code=507`;
  let videoInfo;

  const response = await axios.get(apiUrl, {
    headers: {
      "User-Agent": userAgent.toString(),
    },
  });

  const data = response.data;
  if (!data.data.cell_comments[0].comment_info.item.video) {
    videoInfo = {
      title: data.data.cell_comments[0].comment_info.item.note.text,
      images: data.data.cell_comments[0].comment_info.item.note.multi_image.map(
        (image: any) => image.download_list[0].url
      ),
      author: {
        uid: data.data.cell_comments[0].comment_info.item.author.id,
        name: data.data.cell_comments[0].comment_info.item.author.name,
        avatar:
          data.data.cell_comments[0].comment_info.item.author.avatar
            .download_list[0].url,
      },
    };
    return videoInfo;
  } else {
    videoInfo = {
      title: data.data.cell_comments[0].comment_info.item.video.text,
      video_url:
        data.data.cell_comments[0].comment_info.item.video.video_high
          .url_list[0].url,
      cover_url:
        data.data.cell_comments[0].comment_info.item.video.cover_image
          .download_list[0].url,
      author: {
        uid: data.data.cell_comments[0].comment_info.item.author.id,
        name: data.data.cell_comments[0].comment_info.item.author.name,
        avatar:
          data.data.cell_comments[0].comment_info.item.author.avatar
            .download_list[0].url,
      },
    };
    return videoInfo;
  }
}
