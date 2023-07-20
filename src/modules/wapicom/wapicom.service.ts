import axios from "axios";
import crypto from "crypto";
import moment from "moment";
import { URLSearchParams } from "url";
import { Api } from "../../api/api";
import { Filters } from "../../api/filters";
import { Client } from "../../database/client";
import { sleep } from "../../helpers/ArrayHelpers";
import TelegramService from "../telegram/telegram.service";
import {WapicomConfig} from "../../interfaces/config.interface";
import config from "config";

export default class WapicomService {

  static wapicom: WapicomConfig = config.get('wapicom');

  static async getOrdersFromCrmInStatus() {
    try {
      const url = Api.create_URL(
        Api.info11Crm.url,
        Api.request_category.orders,
        [
          // Filters.createFilter(Filters.methods.DELIVERY_TYPE, 'courier'),
          Filters.createFilter(Filters.methods.STATUS, 'send-to-assembling'),
        ]
      );

      const orders = await Api.getData(url);
      return orders;
    } catch (e: any) {
      throw new Error(`WapicomService > getOrdersFromCrmInStatus :: ${e.message} -> ${e.response?.data?.errorMsg}`);
    }
  }

  static async sendOrdersToWapicomAndChangeStatusInCrm(orders: Array<any>) {
    try {
      await orders.reduce(async (memo, order) => {
        await memo;
        await sleep(1000);
        const result = await this.sendOneOrderToWapicom(order);

        if (result.hasOwnProperty('trackingNumber')) {
          const trackingNumber = result.trackingNumber;

          await this.saveOrderToDatabase(order, trackingNumber)
          await this.changeOrderStatusInCrm(order, trackingNumber);
        }
      }, undefined);

      return 'Заказы отправлены.'
    } catch (e: any) {
      throw new Error(`WapicomService > sendOrdersToWapicomAndChangeStatusInCrm :: ${e.message}`);
    }
  }

  static async sendOneOrderToWapicom(order: any) {
    try {
      const url = `${this.wapicom.baseUrl}/outbounds`;

      const products = order.items.map((item: any) => {
        return {
          "name": item.offer.displayName,
          "quantity": item.prices[0].quantity,
          "price": item.prices[0].price,
          "UnitPriceForInvoice": 0,
        }
      })

      const mainProduct = products.length > 0 ? products.shift() : {};

      const params = {
        "orderNumber": order.id,
        "product": mainProduct,
        "additionalProducts": products,
        "cashOnDelivery": order.totalSumm,
        "receiver":
        {
          "firstName": order.firstName,
          "lastName": order.lastName,
          "phoneNumber": order.phone,
          "houseNumber": order?.delivery?.address?.building,
          "addressText": order?.delivery?.address?.street,
          "addressAdditionalInfo": order?.delivery?.address?.flat,
          "city": order?.delivery?.address?.city,
          "country": order?.delivery?.address?.countryIso,
          "zipCode": order?.delivery?.address?.index,
        },
        "comment": order?.customFields?.comment_cour,
        "CurrencyForInvoice": "EUR",
        "attachments": []
      }

      const body = JSON.stringify(params);

      const key: any = this.wapicom.hash;

      const hash = crypto.createHmac('sha1', key)
        .update(body)
        .digest('hex')

      const config = {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-client-id': this.wapicom.clientId,
          'x-signature': hash,
        }
      }

      const response: any = await axios.post(url, body, config);

      if (response.data.hasOwnProperty('error')) {
        await this.sendMessageToBot(`Заказ: https://info11.retailcrm.ru/orders/${order.id}/edit,
Ошибка: ${JSON.stringify(response.data.error)}`);
      }

      return response.data;
    } catch (e: any) {
      console.log(`WapicomService > sendOneOrderToWapicom :: ${e.message}`);
    }
  }

  static async changeOrderStatusInCrm(order: any, trackingNumber: string) {
    try {
      const newOrderData = {
        status: 'send-to-delivery',
        customFields: {
          partner_tracking_number: trackingNumber,
        }
      };

      const url = `${Api.info11Crm.url}/api/v5/orders/${order.id}/edit?apiKey=${Api.info11Crm.key}&by=id`;

      const params = new URLSearchParams();
      params.append('order', JSON.stringify(newOrderData));
      params.append('by', 'id');
      params.append('site', order.site);

      const config = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };

      const response = await axios.post(url, params, config);
      console.log(`updated status for order ${order.id}`);

      return response;
    } catch (e: any) {
      throw new Error(`WapicomService > changeOrderStatusInCrm :: ${e.message} -> ${e.response?.data?.errorMsg}`);
    }
  }

  static async saveOrderToDatabase(order: any, trackingNumber: string) {
    try {
      await Client
        .db('wapicom')
        .collection('orders')
        .updateOne(
          {
            "trackingNumber": trackingNumber,
          },
          {
            $set: {
              orderId: order.id,
              site: order.site,
              status: 'sent_to_wapicom',
              time: moment().format("YYYY-MM-DD HH:mm:ss"),
            }
          },
          { upsert: true }
        );

      console.log(`WapicomService > saveOrderToDatabase :: saved order ${order.id} with trackingNumber ${trackingNumber}`);
    } catch (e: any) {
      throw new Error(`ERROR WapicomService > saveOrderToDatabase :: ${e.message}`);
    }
  }

  static async sendMessageToBot(message: string) {
    try {
      await TelegramService.sendMessage(message, 'wapicom');
    } catch (e: any) {
      throw new Error(`WapicomService > sendMessageToBot :: ${e.message}`);
    }
  }

  static async getOrdersSentToWapicomFromDatabase() {
    try {
      const orders = await Client
        .db('wapicom')
        .collection('orders')
        .find({ status: 'sent_to_wapicom' })
        .toArray()

      return orders;
    } catch (e: any) {
      throw new Error(`WapicomService > getTrackingNumbersArray :: ${e.message}`);
    }
  }

  static async getOrdersTrackingStatusFromWapicom(orders: Array<any>) {
    try {
      const url = `${this.wapicom.baseUrl}/tracking`;

      const trackingNumbersArray = orders.map((order) => {
        return order.trackingNumber;
      })

      const params = {
        "trackingNumbers": trackingNumbersArray,
      }

      const body = JSON.stringify(params);
      const key: any = this.wapicom.hash;

      const hash = crypto.createHmac('sha1', key)
        .update(body)
        .digest('hex')

      const config = {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-client-id': this.wapicom.clientId,
          'x-signature': hash,
        }
      }

      const response: any = await axios.post(url, body, config);

      return response.data.statuses;
    } catch (e: any) {
      throw new Error(`WapicomService > getOrdersTrackingStatusFromWapicom :: ${e.message}`);
    }
  }

  static async changeAllOrdersTrackingStatusInCrm(orders: Array<any>, trackingStatuses: Array<any>) {
    try {
      await orders.reduce(async (memo, order) => {
        await memo;
        await sleep(1000);

        const trackingStatus = trackingStatuses.find(item => item.trackingNumber === order.trackingNumber);

        const result = await this.changeOneOrderTrackingStatusInCrm(order, trackingStatus);

        const completedStatuses = ['Delivered', 'ReturnedToSender', 'Lost', 'Damaged'];

        if (result && completedStatuses.includes(trackingStatus.deliveryStatus)) {
          await this.changeOneOrderTrackingStatusInDatabase(order, trackingStatus.deliveryStatus);
        }
      }, undefined);
    } catch (e: any) {
      throw new Error(`WapicomService > changeAllOrdersTrackingStatusInCrm :: ${e.message}`);
    }
  }

  static async changeOneOrderTrackingStatusInDatabase(order: any, trackingStatus: string) {
    try {
      await Client
        .db('wapicom')
        .collection('orders')
        .findOneAndUpdate({ orderId: order.orderId }, { $set: { status: trackingStatus } } )

    } catch (e: any) {
      throw new Error(`WapicomService > changeOneOrderTrackingStatusInDatabase :: ${e.message}`);
    }
  }

  static async changeOneOrderTrackingStatusInCrm(order: any, trackingStatus: any) {
    try {
      const deliveryStatus = trackingStatus?.deliveryStatus?.toLowerCase();
      const troubleStatus = trackingStatus?.troubleStatus?.toLowerCase();

      const newOrderData = {
        customFields: {
          status_wapi_field: deliveryStatus,
          trouble_status_wapi_field: troubleStatus,
        }
      };

      const url = `${Api.info11Crm.url}/api/v5/orders/${order.orderId}/edit?apiKey=${Api.info11Crm.key}&by=id`;

      const params = new URLSearchParams();
      params.append('order', JSON.stringify(newOrderData));
      params.append('by', 'id');
      params.append('site', order.site);

      const config = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };

      const response = await axios.post(url, params, config);
      console.log(`updated tracking status for order ${order.orderId}`);

      return response;
    } catch (e: any) {
      throw new Error(`WapicomService > changeOneOrderTrackingStatusInCrm :: ${e.message} -> ${e.response?.data?.errorMsg}`);
    }
  }
}
