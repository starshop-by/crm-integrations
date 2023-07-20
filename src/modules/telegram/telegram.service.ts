import { Context, Telegraf, Telegram } from 'telegraf';
import { Update } from 'typegram';
import config from "config";
import {WapicomConfig, YouSendConfig} from "../../interfaces/config.interface";

export default class TelegramService {

  static youSend: YouSendConfig = config.get('youSend');
  static wapicom: WapicomConfig = config.get('wapicom');

  static getBotCredentials() {
    const token: string = this.youSend.token;
    const telegram: Telegram = new Telegram(token);
    const bot: Telegraf<Context<Update>> = new Telegraf(token);

    return {
      token,
      telegram,
      bot,
    }
  }

  static getBotChatId(chatName: string) {
    if (chatName === 'wapicom') {
      return this.wapicom.chatId
    }
    return this.youSend.chatId;
  }

  static startTelegramBot() {
    try {
      const { bot } = this.getBotCredentials();

      bot.start(ctx => {
        ctx.reply(`${ctx.chat.id}`);
      });

      bot.launch();
      console.info(`Telegram bot successfully started`);
    } catch (e: any) {
      console.error(`TelegramService > startTelegramBot :: ${e.message}`);
    }
  }

  static async sendMessage(message: string, chatName: string) {
    const { telegram } = this.getBotCredentials();
    const chatId = this.getBotChatId(chatName);

    const sendResult = await telegram.sendMessage(chatId, message);
    return sendResult;
  }
}
