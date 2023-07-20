import { SmspService } from "./smsp.service"

export default class SmspController {

  static async sendMessageToViber(tel: string, message: string, orderId: string, site: string, prevMessagesStatus: string) {
    try {
      const response = await SmspService.sendMessageToViber(tel, message, orderId);
      
      if (response.status === false) {
        if (response?.error?.code === 7) {
          const dbResponse = await SmspService.saveMessagesWithErrorToDatabase(tel, message, orderId, site, prevMessagesStatus);
          return dbResponse;
        } else {
          throw new Error(`${response.error.description}`);
        }  
      }

      const message_id = response.message_id;

      const dbResponse = await SmspService.saveMessageToDatabase(tel, message_id, orderId, site, prevMessagesStatus);

      return dbResponse;
    } catch (e: any) {
      console.error(`ERROR SmspController > sendMessageToViber :: ${e.message} for tel ${tel} and order ${orderId}`)
    }
  }

  static async sendDelayedMessagesToViber() {
    try {
      const messages = await SmspService.getAllMessagesWithErrorFromDatabase();
      await SmspService.sendAllDelayedMessagesToViber(messages);
      return;
    } catch (e: any) {
      console.error(`ERROR SmspController > sendDelayedMessagesToViber :: ${e.message}`)
    }
  }

  static async getStatusesFromSmspAndUpdateInOrders() {
    try {
      const messageItems = await SmspService.getAllSentMessagesFromDatabase();
      const messageStatuses = await SmspService.getAllMessagesStatusFromSmsp(messageItems);
      await SmspService.updateAllOrdersWithMessageStatus(messageStatuses);
    } catch (e: any) {
      console.error(`ERROR SmspController > getStatusesFromSmspAndUpdateInOrders :: ${e.message}`)
    }
  }

}