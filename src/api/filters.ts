const ORDERS_LIMIT = 100;

export class Filters {

  static LIMIT = `&limit=${ORDERS_LIMIT}`;

  static methods = {
    "STATUS": "[extendedStatus][]",
    "ORDER_METHODS": "[orderMethods][]",
    "TYPE_SALE": "[customFields][type_sales][]",
    "SHOP_COUNTRY": '[sites][]',
    "CREATED_FROM": "[createdAtFrom]",
    "CREATED_TO": "[createdAtTo]",
    "DATE_OF_SALE_FROM": "[customFields][date_of_sale][min]",
    "DATE_OF_SALE_TO": "[customFields][date_of_sale][max]",
    "DATE_OF_SALE_TODAY_FROM": "[customFields][date_of_sale_today][min]",
    "DATE_OF_SALE_TODAY_TO": "[customFields][date_of_sale_today][max]",
    "CUSTOMER": "[customer]",
    "PRODUCT_ACTIVE": "[active]",
    "PRODUCT_GROUP": "[groups][]",
    "DELIVERY_TYPE": "[deliveryTypes][]",
    "DELIVERY_DATE_TO": "[deliveryDateTo]",
  }

  static createFilter(method: string, params: any) {
    return `&filter${method}=${params.toString()}`
  }

}