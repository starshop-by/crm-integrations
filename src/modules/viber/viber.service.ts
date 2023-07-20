import axios from "axios";
import _ from "lodash";
import moment from "moment";
import { URLSearchParams } from "url";
import { Client } from "../../database/client";
import { asyncEvery, sleep } from "../../helpers/ArrayHelpers";
import {Api} from "../../api/api";

export class ViberService {

  static async sendMessage(tel: string, message: string) {
    try {
      const url = `https://cabinet.smsp.by/api/send/viber`;

      const params = new URLSearchParams([
        ['user', 'yekommers@bk.ru'],
        ['apikey', '161v5010ae'],
        ['sender', 'DOSTAVKASTAR'],
        ['msisdn', tel],
        ['text', message],
      ]);

      const config = {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }

      const response = await axios.post(url, params, config);
      if (response.data.status == false) throw new Error(`ERROR ViberService > sendMessage :: ${response.data.message} for tel ${tel}`);

      return response.data;
    } catch (e: any) {
      throw new Error(`ERROR ViberService > sendMessage :: ${e.message}`);
    }
  }

  static async saveMessageToDatabase(messageId: string, orderId: string, site: string, prevMessagesStatus: string) {
    try {
      await Client
        .db('viber')
        .collection('messages')
        .updateOne(
          {
            "messageId": messageId.toString(),
          },
          {
            $set: {
              orderId: orderId,
              site: site,
              status: 'sent',
              prevMessagesStatus: prevMessagesStatus,
              time: moment().format("YYYY-MM-DD HH:mm:ss"),
            }
          },
          { upsert: true }
        );

      console.log(`ViberService > saveMessageToDatabase :: saved message ${messageId} for order ${orderId}`);
    } catch (e: any) {
      throw new Error(`ERROR ViberService > saveMessageToDatabase :: ${e.message}`);
    }
  }

  static async getAllSentMessagesFromDatabase() {
    try {
      const result = await Client
        .db('viber')
        .collection('messages')
        .find({ "status": 'sent' })
        .toArray()

      if (!result) {
        return 'ViberService > getAllSentMessagesFromDatabase :: There are no new messages to check status for'
      }

      return result;
    } catch (e) {
      console.log(e)
    }
  }

  static async getMessagesStatus(messages: any[]) {
    try {
      const messageIds = messages.map((message: any) => {
        return message.messageId;
      });

      const messageIdsString = messageIds.toString();

      const url = `https://cabinet.smsp.by/api/statusBulk/viber`;

      const params = new URLSearchParams([
        ['user', 'yekommers@bk.ru'],
        ['apikey', '161v5010ae'],
        ['message_ids', messageIdsString]
      ]);

      const config = {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }

      const response = await axios.post(url, params, config);
      if (response.data.status == false) throw new Error(`ERROR ViberService > getMessagesStatus :: ${response.data.message} for messages ${messageIdsString}`);

      return response.data.messages_status;
    } catch (e: any) {
      throw new Error(`ERROR ViberService > getMessagesStatus :: ${e.message}`);
    }
  }

  static async getAllMessagesStatus(messages: any[]) {
    const messageChunks = _.chunk(messages, 10);

    const messagesStatusResult = asyncEvery(messageChunks, async (messagesChunk: any) => {
      await sleep(1000);

      const messagesChunkStatuses = await ViberService.getMessagesStatus(messagesChunk);
      const updateOrdersResult = await ViberService.updateOrders(messagesChunkStatuses, messagesChunk);

      return true;
    })

    return messagesStatusResult;
  }

  static async updateOrderWithMessageStatus(orderId: string, site: string, prevMessagesStatus: string, messageId: string, status: number, time: string) {
    try {
      const completedStatuses = [
        4, // Доставлено
        3, // Не доставлено
        5, // Прочитано
        2, // Заблокировано
        8, // Ошибка
        7, // Просрочено
      ]

      const order_data = {
        "customFields": {
          "viber_messages_status_log": `${prevMessagesStatus}${prevMessagesStatus ? '\r\n' : ''}[${time}][${messageId}]: ${status}`,
          "delivering_status_viber_field": `${status}`,
        }
      }

      const url = `${Api.firstCrm.url}/api/v5/orders/${orderId}/edit?&apiKey=${Api.firstCrm.key}`;

      const params = new URLSearchParams();
      params.append('by', 'id');
      params.append('site', site);
      params.append('order', JSON.stringify(order_data));

      const config = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };

      if (completedStatuses.includes(status)) {
        const response = await axios.post(url, params, config);
        if (response.data.success == false) console.log(`ERROR ViberService > updateOrderWithMessageStatus :: ${response.data.errorMsg} for ${orderId}`);

        const deleteMessageResult = await ViberService.deleteMessageFromDatabase(messageId);
        console.log(`ViberService > updateOrderWithMessageStatus :: updated order ${orderId}`);

        return deleteMessageResult;
      }

      return true

    } catch (e: any) {
      // throw new Error(`ERROR ViberService > updateOrderWithMessageStatus :: ${e.message}`);
      console.log(`ERROR ViberService > updateOrderWithMessageStatus :: ${e.message} for ${orderId}`);
    }

  }

  static async updateOrders(messageStatuses: any[], messageObjects: any[]) {

    const updateOrdersResult = await asyncEvery(messageObjects, async (messageOjbect: any) => {
      await sleep(100);

      const { orderId, site, prevMessagesStatus, messageId, time } = messageOjbect;
      // const status = messageStatuses[messageOjbect.messageId].status;
      const message = messageStatuses.find((item) => item.message_id == messageId);
      console.log(message);
      const status = message.code;

      const resultUpdatingOneOrder = await ViberService.updateOrderWithMessageStatus(orderId, site, prevMessagesStatus, messageId, status, time);

      return true;
    })

    return true;

  }

  static async deleteMessageFromDatabase(messageId: string) {
    try {
      const result = await Client
        .db('viber')
        .collection('messages')
        .findOneAndDelete({ "messageId": messageId })
      return result;
    } catch (e) {
      console.log(e)
    }
  }

}
