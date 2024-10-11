import { Request, Response } from "express";
import { promisify } from "util";
import * as XLSX from "xlsx";
import axios from "axios";
const sleep = promisify(setTimeout);
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;

import { send_slack_notification } from "../utilities/notifications";
import { ordersQuery } from "../queries/orders";

dotenv.config();

const { STORE_ADMIN_PRODUCT_URL } = process.env;

export const orders = async (req: Request, res: Response) => {
  try {
    let items = [] as any;
    const allOrders = await fetchAllOrders();

    let npOrders = allOrders.filter((order: any) => {
      return order.node.lineItems.edges.some((lineItem: any) => {
        return (
          lineItem.node.product &&
          lineItem.node.product.tags.includes("Nieuwkoop")
        );
      });
    });

    for (const [index, order] of npOrders.entries()) {
      order.node.lineItems.edges.forEach((lineItem: any) => {
        if (
          lineItem.node.variant?.sku &&
          lineItem.node.product?.tags.includes("Nieuwkoop")
        ) {
          items.push({
            sku: lineItem.node.variant.sku,
            price: lineItem.node.originalUnitPriceSet.shopMoney.amount,
            date: order.node.createdAt,
            order: order.node.name,
          });
        }
      });
    }

    const cutoffDate = new Date("2024-10-03");
    const uniqueItems = Object.values(
      items.reduce((acc: any, item: any) => {
        const itemDate = new Date(item.date);
        if (itemDate < cutoffDate) {
          if (!acc[item.sku] || new Date(acc[item.sku].date) < itemDate) {
            acc[item.sku] = item;
          }
        }
        return acc;
      }, {} as { [key: string]: any })
    );

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(uniqueItems);

    // Append the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

    // Write the workbook to a file
    const filePath = "./orders.xlsx";
    XLSX.writeFile(workbook, filePath);

    return res.status(200).json(uniqueItems);
  } catch (error) {
    res.status(500).json({ message: "Internal server error ..." });
  }
};

const fetchAllOrders = async () => {
  try {
    const client = new GraphQLClient(
      `https://${STORE}/admin/api/${API_VERSION}/graphql.json`,
      {
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN!,
          "Content-Type": "application/json",
        },
      }
    );

    let allOrders = [] as any;
    let hasNextPage = true;
    let after = null;

    while (hasNextPage) {
      const variables = {
        first: 250,
        after: after,
      } as any;

      const response = await client.request(ordersQuery, variables);
      const orders = response.orders.edges;

      allOrders = allOrders.concat(orders);
      console.log(allOrders.length);

      hasNextPage = response.orders.pageInfo.hasNextPage;
      if (hasNextPage) {
        after = orders[orders.length - 1].cursor;
        await sleep(1000);
      }
      // if (allOrders.length >= 250) {
      //   break;
      // }
    }

    return allOrders;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
