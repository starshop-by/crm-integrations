import axios from "axios";
import { result } from "lodash";
import moment from "moment";
import { URLSearchParams } from "url";
import { Api } from "../../api/api";
import { Filters } from "../../api/filters";
import { sleep } from "../../helpers/ArrayHelpers";
import TelegramService from "../telegram/telegram.service";
import { crmStatusToChangeAfterSending, crmStatusToParseOrdersFrom } from "./yousend.constants";
import config from "config";

export default class YousendService {
  static mode = 'production';

  static youSendApiKey: string = config.get('youSend.apiKey')

  static async getOrdersFromCrmInStatus(plusDays: number) {
    try {
      const deliveryDateTo = moment().add(plusDays, 'days').format('YYYY-MM-DD');

      const url = Api.create_URL(
        Api.chbCrm.url,
        Api.request_category.orders,
        [
          Filters.createFilter(Filters.methods.DELIVERY_DATE_TO, deliveryDateTo),
          Filters.createFilter(Filters.methods.DELIVERY_TYPE, 'yousend-new'),
          Filters.createFilter(Filters.methods.STATUS, crmStatusToParseOrdersFrom),
        ]
      );

      const orders = await Api.getData(url);
      return orders;
    } catch (e: any) {
      throw new Error(`YousendService > getOrders :: ${e.message} -> ${e.response?.data?.errorMsg}`);
    }
  }

  static async sendOrdersToYousendAndChangeStatusInCrm(orders: Array<any>) {
    try {
      await orders.reduce(async (memo, order) => {
        await memo;
        await sleep(1000);
        const result = await this.sendOneOrderToYousend(order);
        if (result) { await this.changeOrderStatusInCrm(order) }
      }, undefined);

      return 'Заказы отправлены.'
    } catch (e: any) {
      throw new Error(`YousendService > sendOrdersToYousendAndChangeStatusInCrm :: ${e.message}`);
    }
  }

  static async sendOneOrderToYousend(order: any) {
    try {
      const orderItems = order.items.map((item: any) => {
        if (item.offer.externalId) {
          return `${item.offer.externalId}${item.prices[0].quantity}`;
        }
        return '';
      });

      const orderItemsString = orderItems.reduce((itemsString: string, item: string) => {
        if (item === '') return itemsString;
        return itemsString.concat('/', item);
      }, '').slice(1);

      const headers: any = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Authorization': `Bearer ${this.youSendApiKey}`
      }

      const body: any = {
        "send_adr": "1",
        "parcel_price": order.site == 'luuk-pol' ? order.customFields.valiyta_nac : order.totalSumm,
        "parcel_currency": order.site == 'luuk-pol' ? "2" : "0",
        "parcel_description": orderItemsString,
        "parcel_sender": "Eduard",
        "parcel_pickup_address": "lacplesa 87",
        "parcel_pickup_date": moment().format("YYYY-MM-DD"),
        "reason_for_export": "sold",

        "weight": ["1"],
        "length": ["10"],
        "height": ["10"],
        "width": ["10"],

        "recipient_house_number": order.delivery.address.building,
        "recipient_address_1": `${order.delivery.address.street} ${order.delivery.address.building} ${order.delivery.address.flat ? '- ' + order.delivery.address.flat : ""}`,
        "recipient_address_2": order.delivery.address.notes,
        "recipient_company_name": `${order.firstName} ${order.lastName}`,

        "recipient_city": order.delivery.address.city,
        "recipient_state_or_province": "none",

        "zip_code": order.delivery.address.index,
        "country_code": order.delivery.address.countryIso,
        "recipient_name": `${order.firstName} ${order.lastName}`,
        "recipient_phone": order.phone.replace(/[^0-9\.]+/g, ""),
        "recipient_email": "none@none.com",

        "package_type": "1",
        "service_code": "dpd_cod"
      }

      const url = `https://yousend.lv/api/${this.mode}/v1/services/order-store`;

      const response = await axios.post(url, body, { 'headers': headers });
      console.log(`ORDER - ${order.id} >> SUCCESS - SHIPMENT ID > ${response.data.data.shipment_id}`);

      return response;
    } catch (error: any) {
        await this.sendMessageToBot(`Заказ: https://s1475963.retailcrm.ru/orders/${order.id}/edit,
Ошибка: ${JSON.stringify(error.response.data.errors)} ${JSON.stringify(error?.response?.data?.message)}`)

      if (error.response.data.errors) {
        console.log('----------------');
        console.log(`ORDER - ${order.id}`);
        console.log(`Ошибка: ${JSON.stringify(error.response.data.errors)} ${JSON.stringify(error?.response?.data?.message)}`);
        // throw new Error('wrong data');
        console.log('----------------');
      }
    }
  }

  static async changeOrderStatusInCrm(orderData: any) {
    try {
      const orderId = orderData.id;
      const site = orderData.site;

      const newOrderData = {
        status: crmStatusToChangeAfterSending,
      };

      const url = `${Api.chbCrm.url}/api/v5/orders/${orderId}/edit?apiKey=${Api.chbCrm.key}&by=id`;

      const params = new URLSearchParams();
      params.append('order', JSON.stringify(newOrderData));
      params.append('by', 'id');
      params.append('site', site);

      const config = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };

      const response = await axios.post(url, params, config);
      console.log('updated status');
      return response;
    } catch (e: any) {
      throw new Error(`YousendService > changeOrderStatusInCrm :: ${e.message} -> ${e.response?.data?.errorMsg}`);
    }
  }

  static async getOneOrderFromCrm(orderId: string) {
    try {
      const url = `${Api.chbCrm.url}/api/v5/orders/${orderId}?apiKey=${Api.chbCrm.key}&by=id`;
      const result = await axios.get(url);
      const order = result.data.order;
      return order;
    } catch (e: any) {
      throw new Error(`YousendService > :: ${e.message} -> ${e.response?.data?.errorMsg}`);
    }
  }

  static async sendMessageToBot(message: string) {
    try {
      await TelegramService.sendMessage(message, 'yousend');
    } catch (e: any) {
      throw new Error(`YousendService > sendMessageToBot :: ${e.message}`);
    }
  }

}
