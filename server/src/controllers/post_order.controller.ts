import { updateOrderAttributesAndTags } from "./../utilities/helper";
import { Request, Response } from "express";
import { promisify } from "util";
const sleep = promisify(setTimeout);
import dotenv from "dotenv";

import { createApiSalesOrder, get_order_by_id, getNextMonday, getVariantStock, tagOrder } from "../utilities/helper";

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
    const order_id = (req.query.order_id as string).replace("gid://shopify/Order/", "");
    const order = await get_order_by_id(order_id);

    if (order == null || order.length == 0) {
      return res.status(200).json({
        message: `Order ${order?.name || order_id} is not a Nieuwkoop order or is POS order`,
      });
    }

    let nieuwkoop = [] as Item[];
    const ORDER_IS_PAID_OR_COD = order?.displayFinancialStatus === "PAID" || order?.paymentGatewayNames?.includes("Cash on Delivery (COD)");
    const ORDER_EXPORTED = order?.tags?.includes("NP_EXPORTED") || order?.tags?.includes("NP_MANUAL");
    const ORDER_HAS_NIEUWKOOP_ATTRIBUTES = order?.customAttributes?.find((attr: any) => attr.key === "Nieuwkoop" && attr.value != "");

    if (ORDER_EXPORTED) {
      return res.status(200).json({ message: `Order ${order?.name} was already exported` });
    }

    const npItems = order?.lineItems?.edges?.filter(
      (item: any) =>
        item?.node?.variant?.inventoryQuantity < 0 &&
        item?.node?.product?.tags.includes("Nieuwkoop") &&
        !item?.node?.product?.tags.includes("Exclude API orders")
    );

    // Check how many items need to be purchased from NP and update order attributes
    if (!ORDER_HAS_NIEUWKOOP_ATTRIBUTES) {
      for (const item of npItems) {
        const purchasedQty = item?.node?.quantity;
        const originalQty = item?.node?.variant?.inventoryQuantity + purchasedQty;

        const qtyToOrder = originalQty > 0 ? purchasedQty - originalQty : purchasedQty;

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
      const tags = order?.tags + ", NP";
      await updateOrderAttributesAndTags(order_id, orderAttributes, tags);
    } else {
      nieuwkoop = JSON.parse(order?.customAttributes?.find((attr: any) => attr.key === "Nieuwkoop")?.value);
    }

    const salesOrders = [] as SalesOrder[];

    if (nieuwkoop.length == 0) {
      return res.status(200).json({
        message: `Order ${order?.name} No items to order from Nieuwkoop`,
      });
    }

    if (ORDER_IS_PAID_OR_COD) {
      for (const item of nieuwkoop) {
        const stockVariant = await getVariantStock(item.sku);
        const line = {
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
          const today = new Date();
          calculateDeliveryDate = getNextMonday(today);
        }
        if (calculateDeliveryDate != undefined) await createSalesOrder(salesOrders, calculateDeliveryDate, line, order?.name);
      }

      if (!req.query.test && ORDER_IS_PAID_OR_COD) {
        if (salesOrders.length > 0)
          for (let salesOrder of salesOrders) {
            await createApiSalesOrder(salesOrder);
            await sleep(1000);
          }
      }

      if (salesOrders.length > 0) {
        // tag the order as NP_EXPORTED
        const order_id = order.id.replace("gid://shopify/Order/", "");
        const tags = order.tags;
        let tag = "NP_EXPORTED, NP";
        if (req.query.test) tag = tag + ",  NP_TEST";
        await tagOrder(order_id, tags, tag);
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

const createSalesOrder = async (salesOrders: SalesOrder[], calculateDeliveryDate: any, line: SalesOrderLine, orderName: string) => {
  // check if there's any sales order with the same delivery date
  const date = new Date(calculateDeliveryDate);
  const dateString = date.toISOString();

  const sameOrder = salesOrders.find((x: SalesOrder) => {
    const deliveryDate = new Date(x.DeliveryDate);
    const deliveryDateString = deliveryDate.toISOString();
    if (deliveryDateString == dateString) {
      return x;
    }
  });

  if (sameOrder != undefined) {
    const salesOrderLine = {
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
    const salesOrder = {
      DeliveryDate: calculateDeliveryDate,
      Notes: `DMP Internal orders: ${orderName}`,
      Reference: orderName,
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
