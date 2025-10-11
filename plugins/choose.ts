import { Plugin } from "@plugin/BasePlugin.ts";
import type { Client } from "tdl";
import { sendMessage } from "@TDLib/function/message.ts";
import type { updateNewMessage } from "tdlib-types";

export default class ChoosePlugin extends Plugin {
  type = "general";
  name = "Choose";
  version = "1.0.0";
  description = "从多个选项中随机选择一个";
  constructor(client: Client) {
    super(client);
    this.cmdHandlers = {
      choose: {
        description: "从多个选项中随机选择一个",
        handler: async (message: updateNewMessage, _args?: string[]) => {
          let rawOptions: string[];
          if (_args && _args.length > 0) {
            const joined = _args.join(" ");
            if (joined.includes("还是")) {
              rawOptions = joined
                .split("还是")
                .map((s) => s.trim())
                .filter((s) => s);
            } else {
              rawOptions = _args;
            }
          } else {
            rawOptions =
              ((message.message as any).text || "")
                .split("选择")[1]
                ?.split("还是") || [];
          }
          if (!rawOptions || rawOptions.length < 2) {
            await sendMessage(this.client, message.message.chat_id, {
              text:
                "例:/choose 选择去还是不去\n" +
                "/choose 选择肯德基还是麦当劳还是必胜客\n" +
                "或:/choose 去 不去\n" +
                "/choose 可口可乐还是百事可乐",
            });
            return;
          }
          const options = rawOptions.map((opt, i) => `${i + 1}, ${opt}`);
          const result =
            rawOptions[Math.floor(Math.random() * rawOptions.length)];

          // best-effort sender name (may vary by message shape)
          ((message as any).sender?.nickname as string) ||
            ((message.message as any).from?.first_name as string) ||
            (await sendMessage(this.client, message.message.chat_id, {
              text:
                `>你的选项有:\n` +
                `${options.join("\n")}\n` +
                `>你最终会选: ${result}`,
            }));
        },
      },
    };
  }
}
