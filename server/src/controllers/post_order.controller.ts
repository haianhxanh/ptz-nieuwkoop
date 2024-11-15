import { updateOrderAttributesAndTags } from "./../utilities/helper";
import { Request, Response } from "express";
import { promisify } from "util";
const sleep = promisify(setTimeout);
import dotenv from "dotenv";

import {
  createApiSalesOrder,
  get_order_by_id,
  getNextMonday,
  getVariantStock,
  tagOrder,
} from "../utilities/helper";

dotenv.config();

type SalesOrder = {
  DeliveryDate: string;
  SalesOrderLines: SalesOrderLine[];
};

type SalesOrderLine = {
  Itemcode: string;
  Quantity: number;
};

type Item = {
  sku: string;
  qty: number;
  sellableQty?: number | null;
};

export const post_order = async (req: Request, res: Response) => {
  try {
    let order_id = (req.query.order_id as string).replace(
      "gid://shopify/Order/",
      ""
    );
    let order = await get_order_by_id(order_id);

    if (order == null || order.length == 0) {
      return res.status(200).json({
        message: `Order ${
          order?.name || order_id
        } is not a Nieuwkoop order or is POS order`,
      });
    }

    let nieuwkoop = [] as Item[];
    let ORDER_IS_PAID_OR_COD =
      order?.displayFinancialStatus === "PAID" ||
      order?.paymentGatewayNames?.includes("Cash on Delivery (COD)");
    let ORDER_EXPORTED =
      order?.tags?.includes("NP_EXPORTED") ||
      order?.tags?.includes("NP_MANUAL");
    let ORDER_HAS_NIEUWKOOP_ATTRIBUTES = order?.customAttributes?.find(
      (attr: any) => attr.key === "Nieuwkoop" && attr.value != ""
    );

    if (ORDER_EXPORTED) {
      return res
        .status(200)
        .json({ message: `Order ${order?.name} was already exported` });
    }

    let npItems = order?.lineItems?.edges?.filter(
      (item: any) =>
        item?.node?.variant?.inventoryQuantity < 0 &&
        item?.node?.product?.tags.includes("Nieuwkoop") &&
        !item?.node?.product?.tags.includes("Exclude API orders")
    );

    // Check how many items need to be purchased from NP and update order attributes
    if (!ORDER_HAS_NIEUWKOOP_ATTRIBUTES) {
      for (let item of npItems) {
        let purchasedQty = item?.node?.quantity;
        let originalQty = item?.node?.variant?.inventoryQuantity + purchasedQty;

        let qtyToOrder =
          originalQty > 0 ? purchasedQty - originalQty : purchasedQty;

        if (qtyToOrder <= 0) continue;
        nieuwkoop.push({
          sku: item?.node?.sku,
          qty: qtyToOrder,
        });
      }

      let orderAttributes = order.customAttributes;
      orderAttributes.push({
        key: "Nieuwkoop",
        value: JSON.stringify(nieuwkoop),
      });
      let tags = order?.tags + ", NP";
      let updateOrderAttributesRes = await updateOrderAttributesAndTags(
        order_id,
        orderAttributes,
        tags
      );
    } else {
      nieuwkoop = JSON.parse(
        order?.customAttributes?.find((attr: any) => attr.key === "Nieuwkoop")
          ?.value
      );
    }

    let salesOrders = [] as SalesOrder[];

    if (nieuwkoop.length == 0) {
      return res.status(200).json({
        message: `Order ${order?.name} No items to order from Nieuwkoop`,
      });
    }

    if (ORDER_IS_PAID_OR_COD) {
      for (let item of nieuwkoop) {
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
            order?.name
          );
      }

      if (!req.query.test && ORDER_IS_PAID_OR_COD) {
        if (salesOrders.length > 0)
          for (let salesOrder of salesOrders) {
            const api_order = await createApiSalesOrder(salesOrder);
            await sleep(1000);
          }
      }

      if (salesOrders.length > 0) {
        // tag the order as NP_EXPORTED
        const order_id = order.id.replace("gid://shopify/Order/", "");
        const tags = order.tags;
        let tag = "NP_EXPORTED, NP";
        if (req.query.test) tag = tag + ",  NP_TEST";
        const tagShopifyOrder = await tagOrder(order_id, tags, tag);
        await sleep(1000);
      }
      console.log("Sales Orders: ", salesOrders);
      res.status(200).json({ salesOrders });
    } else {
      res.status(200).json({
        message: `Order ${order?.name} pending payment was updated with order attributes, will be exported to Nieuwkoop once paid`,
      });
    }
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
      Notes: `DMP Internal orders: ${orderName}`,
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
