import { Request, Response } from "express";
import axios from "axios";
import { promisify } from "util";
const sleep = promisify(setTimeout);
import dotenv from "dotenv";

import {
  createApiSalesOrder,
  get_orders,
  getNextMonday,
  getVariantStock,
  isFutureDate,
  tagOrder,
} from "../utilities/helper";
import { sample_orders } from "../data_storage/sample_orders";

dotenv.config();

type SalesOrder = {
  DeliveryDate: string;
  SalesOrderLines: SalesOrderLine[];
};

type SalesOrderLine = {
  Itemcode: string;
  Quantity: number;
};

export const post_order = async (req: Request, res: Response) => {
  try {
    let orders = await get_orders();
    // let orders = sample_orders;

    orders = orders.filter((order: any) => {
      return (
        order.node.customAttributes &&
        order.node.customAttributes.some((attr: any) => attr.key == "nieuwkoop")
      );
    });

    let salesOrders = [] as SalesOrder[];

    for (let order of orders) {
      let orderNieuwkoopAttributes = order.node.customAttributes.find(
        (attr: any) => attr.key == "nieuwkoop"
      );

      let nieuwkoopItems = JSON.parse(orderNieuwkoopAttributes.value);

      for (let item of nieuwkoopItems) {
        // let attributeItem = nieuwkoopItems.find(
        //   (x: any) => x.sku == item.node.sku
        // );
        let itemQty = item.qty;
        let stockVariant = await getVariantStock(item.sku);
        let line = {
          Itemcode: item.sku,
          Quantity: item.qty,
        };
        let calculateDeliveryDate;

        if (stockVariant.StockAvailable < item.qty) {
          // if StockAvailable is less than the quantity of the item in the order, then delivery date will be according to FirstAvailable date
          if (stockVariant.FirstAvailable != null) {
            let firstAvailableDate = new Date(stockVariant.FirstAvailable);
            calculateDeliveryDate = getNextMonday(firstAvailableDate);
          }
        } else {
          let today = new Date();
          calculateDeliveryDate = getNextMonday(today);
        }
        if (calculateDeliveryDate != undefined)
          await createSalesOrder(
            salesOrders,
            calculateDeliveryDate,
            line,
            order.node.name
          );
      }
    }

    for (let salesOrder of salesOrders) {
      const api_order = await createApiSalesOrder(salesOrder);
      await sleep(1000);
    }

    for (let order of orders) {
      // tag the order as NP_EXPORTED
      const order_id = order.node.id.replace("gid://shopify/Order/", "");
      const tags = order.node.tags;
      const tagShopifyOrder = await tagOrder(order_id, tags, "NP_EXPORTED");
      await sleep(1000);
    }

    res.status(200).json({ salesOrders });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const createSalesOrder = async (
  salesOrders: SalesOrder[],
  calculateDeliveryDate: any,
  line: SalesOrderLine,
  orderName: string
) => {
  // check if there's any sales order with the same delivery date
  let date = new Date(calculateDeliveryDate);
  let dateString = date.toISOString();

  let sameOrder = salesOrders.find((x: SalesOrder) => {
    let deliveryDate = new Date(x.DeliveryDate);
    let deliveryDateString = deliveryDate.toISOString();
    if (deliveryDateString == dateString) {
      return x;
    }
  });

  if (sameOrder != undefined) {
    let salesOrderLine = {
      Itemcode: line.Itemcode,
      Quantity: line.Quantity,
    };
    sameOrder.SalesOrderLines.push(salesOrderLine);
    // @ts-ignore
    if (sameOrder.Notes.includes(orderName) == false) {
      // @ts-ignore
      sameOrder.Notes += `, ${orderName}`;
    }
  } else {
    let salesOrder = {
      DeliveryDate: calculateDeliveryDate,
      ExternalReference: "TEST",
      Notes: `TEST ORDER PLEASE DO NOT FULFILL, ${orderName}`,
      SalesOrderLines: [
        {
          Itemcode: line.Itemcode,
          Quantity: line.Quantity,
        },
      ],
    };
    salesOrders.push(salesOrder);
  }
};
