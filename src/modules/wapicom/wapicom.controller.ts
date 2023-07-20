import WapicomService from "./wapicom.service";

export default class WapicomController {
  
  static async sendAllOrders() {
    try {
      const orders = await WapicomService.getOrdersFromCrmInStatus();
      await WapicomService.sendOrdersToWapicomAndChangeStatusInCrm(orders);
    } catch (e: any) {
      console.error(`ERROR WapicomController > sendAllOrders :: ${e.message}`);
    }
  }

  static async getAndChangeTrackingStatuses() {
    try {
      const orders = await WapicomService.getOrdersSentToWapicomFromDatabase();
      const trackingStatuses = await WapicomService.getOrdersTrackingStatusFromWapicom(orders);

      await WapicomService.changeAllOrdersTrackingStatusInCrm(orders, trackingStatuses);
    } catch (e: any) {
      console.error(`ERROR WapicomController > getAndChangeTrackingStatus :: ${e.message}`);
    }
  }

} 