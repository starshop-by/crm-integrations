import { ViberService } from "./viber.service";

export class ViberController {

  static async recieveMessageFromTriggerAndSendToViber(orderId: string, site: string, tel: string, message: string, prevMessagesStatus: string) {
    try {
      const sendMessageResponse = await ViberService.sendMessage(tel, message);
      console.log(sendMessageResponse);

      await ViberService.saveMessageToDatabase(sendMessageResponse.message_id, orderId, site, prevMessagesStatus);
      
      return 'saved';
    } catch(e: any) {
      console.log(`ERROR ViberController > recieveMessageFromTriggerAndSendToViber :: ${e.message}`);
    }
  }

  static async getMessagesStatusFromViberAndUpdateOrders() {
    try {
      const messages: any = await ViberService.getAllSentMessagesFromDatabase();
      const messageStatuses: any = await ViberService.getAllMessagesStatus(messages);

      console.log(`ViberController > getMessagesStatusFromViberAndUpdateOder :: done`);
      return messageStatuses;
    } catch (e: any) {
      console.log(`ERROR ViberController > getMessagesStatusFromViberAndUpdateOder :: ${e.message}`);
    }
  }

}