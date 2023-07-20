import axios from 'axios';

import { Filters } from "./filters";
import {ServiceConfig} from "../interfaces/config.interface";
import config from "config";

export class Api {

  static firstCrm: ServiceConfig = config.get('crm.first');
  static chbCrm: ServiceConfig = config.get('crm.chb');
  static info11Crm: ServiceConfig = config.get('crm.info11');

  static request_category = {
    "orders": 'orders',
    "inventory": 'store/products'
  }

  static create_URL = function(crm_api_url: any, request_category: string, filters: Array<string>) {

    let api_key: any = '';

    if (crm_api_url == Api.firstCrm.url) {
      api_key = Api.firstCrm.key;
    }

    if (crm_api_url == Api.chbCrm.url) {
      api_key = Api.chbCrm.key;
    }

    if (crm_api_url == Api.info11Crm.url) {
      api_key = Api.info11Crm.key;
    }

    const filter_string = `${filters.toString().split(',').join('')}`;

    return {
      url: `${crm_api_url}/api/v5/${request_category}?apiKey=${api_key}${filter_string}${Filters.LIMIT}`,
      request_category: request_category,
    }

  }

  static getData = async (url_data: any) => {

    const url_string = url_data.url;
    const request_category = url_data.request_category;

    console.log(url_string);

    const pagesCount: any = await Api.getPagesCount(url_string);
    console.log('total pages = ' + pagesCount)

    const foreach_promise = new Promise(async (res, rej) => {

      let orders:Array<object> = [];

      if (pagesCount == 0) {
        res(orders);
      }

      for (let i = 1; i <= pagesCount; i++) {

        async function send_with_timeout() {

          setTimeout(async () => {

            let onePageOrders = await Api.getOnePageOfData(url_string, request_category, i)
              .catch((e) => {
                throw new Error(`CRM error - cant get one page orders. Message - ${e.message}`);
              });

            if (onePageOrders != undefined) {

              orders.push(...onePageOrders);
              console.log('pushed ' + i);

            } else {
              throw new Error('CRM error - no orders on page');
            }

            if (i == pagesCount) {
              res(orders);
            }

          }, 1500 * i)

        }

        send_with_timeout();

      }

    })

    let orders: any = await foreach_promise;

    return orders;
  }

  static getPagesCount = async (url: string) => {
    try {
      let response = await axios.get(`${url}&page=1`);
      return Number.parseInt(response.data.pagination.totalPageCount);
    } catch(e: any) {
      throw new Error(`CRM error - cant get pages count. Message - ${e.message}`);
    }
  }

  static getOnePageOfData = async (url: string, request_category: string, pageNumber: number) => {
    try {
      let response = await axios.get(`${url}&page=${pageNumber}`);

      if (request_category == Api.request_category.inventory) {
        return response.data.products;
      }

      if (request_category == Api.request_category.orders) {
        return response.data.orders;
      }

    } catch(e: any) {
      throw new Error(`CRM error - cant get one page of data. Message - ${e.message}`);
    }
  }

}
