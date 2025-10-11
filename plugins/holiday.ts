import axios from "axios";
import { Plugin } from "@plugin/BasePlugin.ts";
import type { Client } from "tdl";
import { sendMessage } from "@TDLib/function/message.ts";

export default class HolidayPlugin extends Plugin {
  type = "general";
  name = "holiday";
  version = "1.0.0";
  description = "节日大全";
  constructor(client: Client) {
    super(client);
    this.cmdHandlers = {
      holiday: {
        description: "查询节日信息",
        handler: async (message, _args) => {
          const response = await axios.get(
            "https://www.shuyz.com/githubfiles/china-holiday-calender/master/holidayAPI.json"
          );
          const data = response.data;
          if (data && data.Years) {
            const years = Object.keys(data.Years)
              .map(Number)
              .sort((a, b) => b - a);
            const latestYear = years[0];
            const holidays = data.Years[latestYear];
            let text = `${latestYear}年假期：\n`;
            holidays.forEach((holiday: any) => {
              text += `> ${holiday.Name}：${holiday.StartDate} 至 ${holiday.EndDate} (${holiday.Duration}天)\n`;
              if (holiday.CompDays && holiday.CompDays.length > 0) {
                text += `  调休日：${holiday.CompDays.join(", ")}\n`;
              }
              text += `  ${holiday.Memo}\n\n`;
            });
            await sendMessage(this.client, message.message.chat_id, {
              text: text.trim(),
            });
          } else {
            await sendMessage(this.client, message.message.chat_id, {
              text: "未能查询到有关节日的信息，请稍后再试。",
            });
          }
        },
      },
    };
  }
}
