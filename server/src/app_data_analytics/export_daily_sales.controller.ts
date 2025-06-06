import { Request, Response } from "express";
import { promisify } from "util";
const sleep = promisify(setTimeout);
import dotenv from "dotenv";
import { initiateShopifyBulkOperation, checkBulkOperationStatus, downloadBulkResults } from "../utilities/bulkOperations";
import { bulkQueryGetOrders } from "../queries/orders";
import { get_store, getYesterday } from "../app_stores_sync/utils";
import { GraphQLClient } from "graphql-request";
import ExcelJS from "exceljs";
dotenv.config();

const API_VERSION = "2025-04";

const { DMP_STORE_URL } = process.env;

export const export_daily_sales = async (req: Request, res: Response) => {
  try {
    const date = (req.query?.date as string) || getYesterday();
    const storeHandle = req.query.storeHandle as string;
    const store = get_store(storeHandle);

    if (!storeHandle || !date) {
      return res.status(400).json({ message: `Missing one or more of the required parameters: storeHandle, date` });
    }

    if (!store) {
      return res.status(400).json({ message: `Store not found for storeHandle: ${storeHandle}` });
    }

    const bulkOperationUrl = await getBulkOperationUrl(store, date);
    const ordersData = await downloadBulkResults(bulkOperationUrl);
    const orders = mapOrdersData(ordersData);
    // const processedData = processOrdersData(store, orders, date); // test gross sales
    const processedData = orders; // test detailed data

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Daily Sales");
      addDataToSheet(store, worksheet, processedData);
      await workbook.xlsx.writeFile(`./${storeHandle}_${date}_daily_sales.xlsx`);

      return res.status(200).json({ message: `Sales on ${date} exported for ${storeHandle}`, processedData });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error generating worksheet" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error exporting daily sales" });
  }
};

const mapOrdersData = (ordersData: any) => {
  return ordersData
    .map((order: any) => {
      const lineItems = ordersData.filter((item: any) => item.__parentId === order.id);
      return {
        id: order.id,
        name: order.name,
        subtotalPrice: order.subtotalPrice,
        lineItems,
        sourceName: order.sourceName,
      };
    })
    .filter((order: any) => order.subtotalPrice);
};

const getBulkOperationUrl = async (store: any, date: string) => {
  const shopifyClient = new GraphQLClient(`https://${store.storeUrl}/admin/api/${API_VERSION}/graphql.json`, {
    // @ts-ignore
    headers: {
      "X-Shopify-Access-Token": store.accessToken,
    },
  });

  let bulkOperation: any;
  let isCompleted = false;
  await initiateShopifyBulkOperation(shopifyClient, bulkQueryGetOrders(`created_at:${date}`));
  while (!isCompleted) {
    bulkOperation = await checkBulkOperationStatus(shopifyClient);
    if (bulkOperation?.status === "COMPLETED") {
      isCompleted = true;
    } else if (["FAILED", "CANCELLED"].includes(bulkOperation.status)) {
      throw new Error(`Bulk operation ${bulkOperation.status}: ${bulkOperation.errorCode || "Unknown error"}`);
    } else {
      // Check every 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  return bulkOperation.url;
};

const calculateWorkshopSales = (orders: any[]) => {
  return orders.reduce((total: number, order: any) => {
    const workshopItemsTotal = order.lineItems.reduce((itemTotal: number, item: any) => {
      const isWorkshopItem = item.product?.title?.toLowerCase().includes("workshop");
      if (isWorkshopItem) {
        const itemPrice = item.originalTotalSet?.shopMoney?.amount || item.originalUnitPriceSet?.shopMoney?.amount || item.price || 0;
        return itemTotal + parseFloat(itemPrice);
      }
      return itemTotal;
    }, 0);
    return total + workshopItemsTotal;
  }, 0);
};

const processOrdersData = (store: any, orders: any, date: string) => {
  try {
    const grossSales = orders.reduce((acc: number, order: any) => (order.subtotalPrice ? acc + parseFloat(order.subtotalPrice) : acc), 0);
    const totalWorkshopSales = calculateWorkshopSales(orders);
    const grossSalesBySource = orders.reduce((acc: any, order: any) => {
      const source = order.sourceName;
      if (!acc[source]) {
        acc[source] = 0;
      }
      acc[source] += parseFloat(order.subtotalPrice).toFixed(2);
      return acc;
    }, {});

    if (DMP_STORE_URL === store.storeUrl) {
      return {
        date,
        grossSales: grossSales.toFixed(2),
        totalWorkshopSales: totalWorkshopSales.toFixed(2),
      };
    }
    return {
      date,
      grossSales: grossSales.toFixed(2),
      grossSalesBySource,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};

const addDataToSheet = (store: any, worksheet: any, data: any) => {
  if (DMP_STORE_URL === store.storeUrl) {
    worksheet.addRow(["date", "gross_sales", "total_workshop_sales"]);
    worksheet.addRow([data.date, data.grossSales, data.totalWorkshopSales]);
  } else {
    // worksheet.addRow(["date", "gross_sales", "gross_sales_pos", "gross_sales_web"]);
    // worksheet.addRow([data.date, data.grossSales, data.grossSalesBySource.pos, data.grossSalesBySource.web]);

    worksheet.addRow(["date", "order_number", "product_title", "total_price", "source"]);
    data.forEach((order: any) => {
      order.lineItems.forEach((item: any) => {
        worksheet.addRow([data.date, order.name, item.title, item.originalTotalSet.shopMoney.amount, order.sourceName]);
      });
    });
  }
};
