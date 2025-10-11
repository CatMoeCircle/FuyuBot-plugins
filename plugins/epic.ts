import type { Client } from "tdl";
import { Plugin } from "@plugin/BasePlugin.ts";
import { sendMessage } from "@TDLib/function/message.ts";
import axios from "axios";
import logger from "@log/index.ts";

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
            const games = await getEpicFreeGames();
            if (games.length === 0) {
              await sendMessage(this.client, message.message.chat_id, {
                text: "目前没有免费游戏。",
              });
            } else {
              let text = "Epic 免费游戏列表：\n\n";
              games.forEach((game, index) => {
                const gameTitle = game.storeUrl
                  ? `[${game.title}](${game.storeUrl})`
                  : game.title;
                text += `${index + 1} ${gameTitle}\n`;
                text += `开始时间: ${game.startDate}\n`;
                text += `结束时间: ${game.endDate}\n`;
                text += "\n";
              });
              await sendMessage(this.client, message.message.chat_id, {
                text,
                link_preview: false,
              });
            }
          } catch (error) {
            logger.error("处理Epic游戏信息失败:", error as any);
            // 尽量使用 message.message.chat_id，如果不存在再回退到 message.chat_id
            const chatId =
              (message as any).message?.chat_id ?? (message as any).chat_id;
            if (chatId) {
              await sendMessage(this.client, chatId, {
                text: "获取Epic免费游戏信息失败。",
              });
            }
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
  storeUrl: string | null;
}

async function getEpicFreeGames(): Promise<FreeGame[]> {
  try {
    const response = await axios.get(
      "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=zh-CN&country=CN&allowCountries=CN"
    );
    const data = response.data;

    const freeGames: FreeGame[] = [];

    // 检查是否有促销游戏数据
    if (data.data && data.data.Catalog && data.data.Catalog.searchStore) {
      const games = data.data.Catalog.searchStore.elements;

      // 遍历每个游戏
      games.forEach((game: any) => {
        // 检查促销信息，类似于Python中的分类逻辑
        const gamePromotions = game.promotions?.promotionalOffers;
        const upcomingPromotions = game.promotions?.upcomingPromotionalOffers;

        // 如果没有当前促销但有即将到来的，跳过
        if (!gamePromotions && upcomingPromotions) {
          return;
        }

        // 如果有当前促销，检查是否免费（折扣类型为PERCENTAGE且折扣百分比不为0，则跳过）
        if (gamePromotions && gamePromotions.length > 0) {
          const offer = gamePromotions[0].promotionalOffers[0];
          if (
            offer.discountSetting?.discountType === "PERCENTAGE" &&
            offer.discountSetting.discountPercentage !== 0
          ) {
            return; // 不免费，跳过
          }

          // 尝试从 catalogNs.mappings 或 offerMappings 中获取 pageSlug，作为商店页面标识
          let pageSlug: string | undefined;
          try {
            pageSlug =
              game.catalogNs?.mappings?.[0]?.pageSlug ||
              game.offerMappings?.[0]?.pageSlug;
          } catch {
            pageSlug = undefined;
          }
          const storeUrl = pageSlug
            ? `https://www.epicgames.com/store/zh-CN/p/${pageSlug}`
            : null;

          // 获取游戏标题
          const title = game.title;

          // 获取促销时间
          const startDate = offer.startDate;
          const endDate = offer.endDate;

          // 只添加有开始和结束时间的游戏
          if (startDate && endDate) {
            freeGames.push({
              title,
              startDate,
              endDate,
              storeUrl,
            });
          }
        }
      });
    }

    return freeGames;
  } catch (error) {
    logger.error("获取Epic免费游戏信息失败:", error as any);
    return [];
  }
}
