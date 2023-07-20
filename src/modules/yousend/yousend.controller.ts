import YousendService from "./yousend.service";

export default class YousendController {

  static async sendAllOrdersToYousend(plusDays: number) {
    try {
      const orders = await YousendService.getOrdersFromCrmInStatus(plusDays);
      const result = await YousendService.sendOrdersToYousendAndChangeStatusInCrm(orders);
      await YousendService.sendMessageToBot(result);
    } catch (e: any) {
      // await YousendService.sendMessageToBot(e.message);
      console.error(`ERROR YousendController > sendOrdersToYousend :: ${e.message}`);
    }
  }

  static async sendOneOrderToYousend(orderId: string) {
    try {
      const order = await YousendService.getOneOrderFromCrm(orderId);
      const result = await YousendService.sendOneOrderToYousend(order);
      if (result) { await YousendService.changeOrderStatusInCrm(order) }
      await YousendService.sendMessageToBot(`Заказ ${orderId} отправлен`);
    } catch (e: any) {
      console.error(``)
    }
  }

}