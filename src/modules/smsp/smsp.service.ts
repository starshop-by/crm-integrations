import axios from "axios";
import { response } from "express";
import _, { result } from "lodash";
import moment from "moment";
import { URLSearchParams } from "url";
import { Client } from "../../database/client";
import { sleep } from "../../helpers/ArrayHelpers";
import {Api} from "../../api/api";
import config from "config";
import {ServiceConfig} from "../../interfaces/config.interface";

const DEFAULT_SENDER = {
  apikey: '161v5010ae',
  user: 'yekommers@bk.ru',
  sms_sender: 'STAR-DOSTAV',
  sender: 'DOSTAVKASTAR',
}

const ALDI_SENDER = {
  apikey: 'IHAcyLkNpQ3NavW7LoGW',
  user: 'aldishopinfo@gmail.com',
  sms_sender: 'ALDISHOP',
  sender: 'ALDISHOP',
}

export class SmspService {

  private static smsp: ServiceConfig = config.get('smsp');

  static async sendMessageToViber(body: { tel: string, message: string, id: string, company?: string }) {
    const { tel, message, id, company } = body;

    try {
      const url = `${this.smsp.url}/send/viber`;

      const formattedTel = tel.replace(/\D/g, '');
      const senderObj = company === 'ООО АльдиШоп' ? ALDI_SENDER : DEFAULT_SENDER;

      const params = new URLSearchParams(
        senderObj.sender === DEFAULT_SENDER.sender
        ? [
          ['user', senderObj.user],
          ['apikey', senderObj.apikey],
          ['sender', senderObj.sender],
          ['msisdn', formattedTel],
          ['text', message],
          ['sms_sender', senderObj.sms_sender],
          ['sms_text', message],
        ] : [
          ['user', senderObj.user],
          ['apikey', senderObj.apikey],
          ['sender', senderObj.sender],
          ['msisdn', formattedTel],
          ['text', message],
        ]);

      const config = {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }

      console.log('sender', senderObj.sender);
      const response = await axios.post(url, params, config).then((response) => response.data);
      if (response?.status === false) {
        return {
          ...response,
          sender: senderObj.sender,
        };
      }

      console.log(`sent message to tel ${tel} and order ${id}`);
      return {
        ...response,
        sender: senderObj.sender,
      };
    } catch (e: any) {
      console.error(`ERROR SmspService > sendMessageToViber :: ${e.message}`);
    }
  }

  static async saveMessagesWithErrorToDatabase(body) {
    try {
      const result = await Client
        .db('viber')
        .collection('delayed')
        .updateOne(
          { orderId: body.id, },
          {
            $set: {
              ...body,
              time: moment().format("YYYY-MM-DD HH:mm:ss"),
            }
          },
          { upsert: true }
        )

      console.log(`Error - delayed message for ${body.tel} and order ${body.id}`);
      return result;
    } catch (e: any) {
      throw new Error(`SmspService > saveMessagesWithErrorToDatabase :: ${e.message}`);
    }
  }

  static async saveMessageToDatabase(messageId: number, body) {
    try {
      const result = await Client
        .db('viber')
        .collection('messages')
        .updateOne(
          { "messageId": messageId.toString() },
          {
            $set: {
              ...body,
              time: moment().format("YYYY-MM-DD HH:mm:ss"),
            }
          },
          { upsert: true }
        );

      console.log(`saved message for ${body.tel} and order ${body.id}`);
      return result;
    } catch (e: any) {
      throw new Error(`SmspService > saveMessageToDatabase :: ${e.message}`);
    }
  }

  static async getAllMessagesWithErrorFromDatabase() {
    try {
      const messages = await Client.db('viber').collection('delayed').find({}).toArray();
      return messages;
    } catch (e: any) {
      throw new Error(`SmspService > getAllMessagesWithErrorFromDatabase :: ${e.message}`);
    }
  }

  static async sendAllDelayedMessagesToViber(messages: Array<any>) {
    try {
      for (let item of messages) {
        await sleep(1000);
        await SmspService.sendMessageToViber(item);
        await Client.db('viber').collection('delayed').findOneAndDelete({ _id: item._id });
        console.log(`sent delayed message to number ${item.tel} for order ${item.id}`);
      }
    } catch (e: any) {
      throw new Error(`SmspService > sendAllDelayedMessagesToViber :: ${e.message}`);
    }
  }

  static async getAllSentMessagesFromDatabase () {
    try {
      const messages = await Client.db('viber').collection('messages').find({}).toArray();
      return messages;
    } catch (e: any) {
      throw new Error(`SmspService > getAllSentMessagesFromDatabase :: ${e.message}`);
    }
  }

  static async getAllMessagesStatusFromSmsp(messageItems: Array<any>) {
    try {
      const [defaultStatuses, aldiStatuses] = await Promise.all([DEFAULT_SENDER.sender, ALDI_SENDER.sender].map(async (sender) => {
        const messageIds = messageItems
          .filter(item => (item.sender || DEFAULT_SENDER.sender) === sender)
          .map(item => item.messageId);
        const chunks = _.chunk(messageIds, 490);

        const messageStatuses = await chunks.reduce(async (total: any, chunk: any) => {
          const currentTotal = await total;
          await sleep(1000);

          const messageIdsString = chunk.toString();
          const currentChunkStatuses = await SmspService.getOneChunkOfMessageStatusesFromSmsp(messageIdsString, sender);
          console.log('recieved message statuses chunk');

          currentTotal.push(...currentChunkStatuses);
          return currentTotal;
        }, [] as any);
      
        return messageStatuses;
      }));

      console.log(`recieved all messageStatuses`);
      return [...defaultStatuses, ...aldiStatuses];
    } catch (e: any) {
      throw new Error(`SmspService > getAllMessagesStatusFromSmsp :: ${e.message}`);
    }
  }

  static async getOneChunkOfMessageStatusesFromSmsp(messageIdsString: string, sender: string) {
    try {
      const url = `${this.smsp.url}/statusBulk/viber`;
      const senderObj = sender === DEFAULT_SENDER.sender ? DEFAULT_SENDER : ALDI_SENDER;

      const params = new URLSearchParams([
        ['user', senderObj.user],
        ['apikey', senderObj.apikey],
        ['message_ids', messageIdsString]
      ]);

      const config = {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }

      const response = await axios.post(url, params, config).then(response => response.data);
      if (response.status === false) {
        throw new Error(`SmspService > getOneChunkOfMessageStatusesFromSmsp :: ${response.error.description}`);
      }

      return response.messages_status;
    } catch (e: any) {
      throw new Error(`SmspService > getOneChunkOfMessageStatusesFromSmsp :: ${e.message}`);
    }
  }

  static async updateOneOrderWithMessageStatus(tel: string, messageId: number, statusCode: number, statusName: string, orderId: string, prevMessagesStatus: string, site: string, time: string) {
    try {
      const completedStatuses = [
        4, // Доставлено
        3, // Не доставлено
        5, // Прочитано
        2, // Заблокировано
        8, // Ошибка
        7, // Просрочено
      ];

      if (!orderId) {
        console.log('no order id');
        return;
      }

      if (completedStatuses.includes(statusCode)) {
        const url = `${Api.firstCrm.url}/api/v5/orders/${orderId}/edit?&apiKey=${Api.firstCrm.key}`;

        const order_data = {
          "customFields": {
            "viber_messages_status_log": `${prevMessagesStatus}${prevMessagesStatus ? '\r\n' : ''}[${time}][${messageId}]: ${statusName}`,
            "delivering_status_viber_field": `${statusCode}`,
          }
        }

        const params = new URLSearchParams();
        params.append('by', 'id');
        params.append('site', site);
        params.append('order', JSON.stringify(order_data));

        const config = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };

        const response = await axios.post(url, params, config)
          .then(async result => {
            if (result.data.success === true) {
              const dbResponse = await Client.db('viber').collection('messages').findOneAndDelete({ messageId: messageId.toString() });
              console.log(`updated mesage status for order ${result.data.order.id} and tel ${tel}`);
            }
          })
          .catch(async e => {
            if (e.response.data.errorMsg === 'Not found' || e.response.data.errorMsg.includes('site')) {
              const orderData = await SmspService.getOneOrderFromCrm(orderId);
              await SmspService.updateOneOrderWithMessageStatus(tel, messageId, statusCode, statusName, orderId, prevMessagesStatus, orderData.site, time);
              console.log(orderId + ' heh');
            }
          });

        return;
      }

      console.log('hi');
      return;
    } catch (e: any) {
      console.error(`ERROR SmspService > updateOneOrderWithMessageStatus :: ${e.message}`);
    }
  }

  static async getOneOrderFromCrm(id: string) {
    try {
      const url = `${Api.firstCrm.url}/api/v5/orders/${id}?apiKey=${Api.firstCrm.key}&by=id`;
      const result = await axios.get(url).catch(e => {
        throw new Error(`${e.response.data.errorMsg}`);
      });
      const order = result.data.order;
      return order;
    } catch (e: any) {
      throw new Error(`SmspService > getOneOrderFromCrm :: ${e.message}`);
    }
  }


  static async updateAllOrdersWithMessageStatus(messageStatuses: Array<any>) {
    try {

      const result = await messageStatuses.reduce(async (memo, messageStatus) => {
        await memo;
        await sleep(100);
        const { message_id, code, name } = messageStatus;
        const messageInDb = await Client.db('viber').collection('messages').findOne({ messageId: message_id.toString() });
        const { id: orderId, tel, prevMessagesStatus, site, time } = messageInDb;

        await SmspService.updateOneOrderWithMessageStatus(tel, message_id, code, name, orderId, prevMessagesStatus, site, time);
        return;
      }, undefined);

      console.log('upldated all orders with message status');
      return result;
    } catch (e: any) {
      throw new Error(`SmspService > updateAllOrdersWithMessageStatus :: ${e.message}`);
    }
  }

}
