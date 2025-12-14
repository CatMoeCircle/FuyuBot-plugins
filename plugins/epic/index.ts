import type { Client } from "tdl";
import { Plugin } from "@plugin/BasePlugin.ts";
import { sendMessage } from "@TDLib/function/message.ts";
import axios from "axios";
import logger from "@log/index.ts";
import epic from "./epic.vue?raw";
import { generateImage } from "@function/genImg.ts";
import fs from "fs";

export default class epicPlugin extends Plugin {
  type = "general";
  name = "epic";
  version = "1.0.2";
  description = "发现 Epic 免费游戏";
  constructor(client: Client) {
    super(client);
    this.cmdHandlers = {
      epic: {
        description: "发现epic免费游戏",
        handler: async (message, _args) => {
          try {
            const freeGames = await getEpicFreeGames();
            const result = await generateImage(
              {
                width: "auto",
                height: "auto",
                quality: 1.5,
              },
              epic,
              {
                present: freeGames.currentFree,
                Coming: freeGames.upcomingFree,
              }
            );

            await sendMessage(this.client, message.message.chat_id, {
              reply_to_message_id: message.message.id,
              media: {
                photo: {
                  path: result.path,
                },
              },
            });
            await fs.promises.unlink(result.path!);
          } catch (error) {
            await sendMessage(this.client, message.message.chat_id, {
              reply_to_message_id: message.message.id,
              text: "获取Epic免费游戏信息失败。",
            });
            logger.error("处理 epic 命令时出错:", error);
          }
        },
      },
    };
  }
}

interface FreeGame {
  title: string;
  startDate: string;
  endDate: string;
  offerImage?: string | null;
}

interface FreeGamesResponse {
  currentFree: FreeGame[];
  upcomingFree: FreeGame[];
}

export async function getEpicFreeGames(): Promise<FreeGamesResponse> {
  try {
    const response = await axios.get(
      "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=zh-CN&country=CN&allowCountries=CN"
    );
    const data = response.data;

    const currentFree: FreeGame[] = [];
    const upcomingFree: FreeGame[] = [];

    const formatDate = (isoString: string): string => {
      const date = new Date(isoString);
      date.setHours(date.getHours() + 8); // 转北京时间
      return date.toISOString().split("T")[0];
    };

    // 封面提取逻辑（新增容错）
    const getOfferImage = (images: any[]): string | null => {
      if (!images) return null;

      // 优先获取常规封面
      const normal = images.find((img) => img.type === "OfferImageWide");
      if (normal?.url) return normal.url;

      // 尝试从视频封面中提取 cover= 后的真实图片链接
      const video = images.find((img) => img.type === "heroCarouselVideo");
      if (video?.url?.includes("cover=")) {
        const match = video.url.match(/cover=([^&]+)/);
        if (match && match[1]) {
          return decodeURIComponent(match[1]);
        }
      }
      // 神秘游戏封面
      const mystery = images.find((img) => img.type === "DieselStoreFrontWide");
      if (mystery?.url) return mystery.url;

      return null;
    };

    if (data?.data?.Catalog?.searchStore?.elements) {
      const games = data.data.Catalog.searchStore.elements;

      games.forEach((game: any) => {
        const gamePromotions = game.promotions?.promotionalOffers;
        const upcomingPromotions = game.promotions?.upcomingPromotionalOffers;

        // 当前免费
        if (gamePromotions && gamePromotions.length > 0) {
          const offer = gamePromotions[0].promotionalOffers?.[0];
          if (!offer) return;

          const { discountType, discountPercentage } =
            offer.discountSetting || {};

          if (discountType === "PERCENTAGE" && discountPercentage === 0) {
            currentFree.push({
              title: game.title.startsWith("Mystery Game")
                ? "神秘游戏"
                : game.title,
              startDate: formatDate(offer.startDate),
              endDate: formatDate(offer.endDate),
              offerImage: getOfferImage(game.keyImages),
            });
          }
        }

        // 即将免费
        if (upcomingPromotions && upcomingPromotions.length > 0) {
          const offer = upcomingPromotions[0].promotionalOffers?.[0];
          if (!offer) return;

          const { discountType, discountPercentage } =
            offer.discountSetting || {};

          if (discountType === "PERCENTAGE" && discountPercentage === 0) {
            upcomingFree.push({
              title: game.title.startsWith("Mystery Game")
                ? "神秘游戏"
                : game.title,
              startDate: formatDate(offer.startDate),
              endDate: formatDate(offer.endDate),
              offerImage: getOfferImage(game.keyImages),
            });
          }
        }
      });
    }

    return { currentFree, upcomingFree };
  } catch (error) {
    logger.error("获取Epic免费游戏信息失败:", error);
    return { currentFree: [], upcomingFree: [] };
  }
}
