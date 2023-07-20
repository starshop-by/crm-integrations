const ORDERS_LIMIT = 100;

export class Filters {

  static LIMIT = `&limit=${ORDERS_LIMIT}`;

  static methods = {
    "STATUS": "[extendedStatus][]",
    "ORDER_METHODS": "[orderMethods][]",
    "TYPE_SALE": "[customFields][type_sales][]",
    "DELIVERY_TYPE": "[deliveryTypes][]",
    "DELIVERY_DATE_TO": "[deliveryDateTo]",
    "SHOP_COUNTRY": '[sites][]',
    "CREATED_FROM": "[createdAtFrom]",
    "CREATED_TO": "[createdAtTo]",
    "DATE_OF_SALE_FROM": "[customFields][date_of_sale][min]",
    "DATE_OF_SALE_TO": "[customFields][date_of_sale][max]",
    "DATE_OF_SALE_TODAY_FROM": "[customFields][date_of_sale_today][min]",
    "DATE_OF_SALE_TODAY_TO": "[customFields][date_of_sale_today][max]",
    "STATUS_UPDATED_FROM": "[statusUpdatedAtFrom]",
    "STATUS_UPDATED_TO": "[statusUpdatedAtTo]",
  }

  static createFilter(method: any, params: any) {
    return `&filter${method}=${params.toString()}`
  }

}