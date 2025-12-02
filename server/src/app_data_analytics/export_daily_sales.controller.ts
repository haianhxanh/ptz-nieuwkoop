import { Request, Response } from "express";
import { promisify } from "util";
const sleep = promisify(setTimeout);
import dotenv from "dotenv";
import { initiateShopifyBulkOperation, checkBulkOperationStatus, downloadBulkResults } from "../utilities/bulkOperations";
import { bulkQueryGetOrders } from "../queries/orders";
import { get_store, getYesterday } from "../app_stores_sync/utils";
import { GraphQLClient } from "graphql-request";
import { writeToGoogleSheetWithCredentials, formatOrderDataForSheets } from "../utilities/googleSheetsSimple";
dotenv.config();

const API_VERSION = "2026-01";

const { DMP_STORE_URL, GOOGLE_SPREADSHEET_ID_PTZ, GOOGLE_SPREADSHEET_ID_DMP } = process.env;

export const export_daily_sales = async (req: Request, res: Response) => {
  try {
    const date = (req.query?.date as string) || getYesterday();
    const dateFrom = (req.query?.dateFrom as string) || null;
    const dateTo = (req.query?.dateTo as string) || null;
    const storeHandle = req.query.storeHandle as string;
    const store = get_store(storeHandle);

    if (!storeHandle || !date) {
      return res.status(400).json({ message: `Missing one or more of the required parameters: storeHandle, date` });
    }

    if (!store) {
      return res.status(400).json({ message: `Store not found for storeHandle: ${storeHandle}` });
    }

    if (dateFrom && dateTo) {
      const dates = getDatesRange(dateFrom, dateTo);
      // return res.status(200).json({ message: "Dates range", dates });
      for (const date of dates) {
        try {
          const bulkOperationUrl = await getBulkOperationUrl(store, date);
          const ordersData = await downloadBulkResults(bulkOperationUrl);
          const orders = mapOrdersData(ordersData, date);
          const processedData = orders;
          const googleSheetResult = await addDataToGoogleSheet(store, processedData);
          if (googleSheetResult) {
            console.log(`Sales on ${date} exported for ${storeHandle}`);
          } else {
            console.error(`Error exporting daily sales on ${date} for ${storeHandle}`);
          }
          await sleep(1000);
        } catch (error) {
          console.error(`Error processing date ${date}:`, error);
          // Continue with next date instead of failing completely
        }
      }
      return res.status(200).json({ message: `Sales exported for dates range ${dateFrom} - ${dateTo} for ${storeHandle}` });
    } else {
      try {
        const bulkOperationUrl = await getBulkOperationUrl(store, date);
        const ordersData = await downloadBulkResults(bulkOperationUrl);
        const orders = mapOrdersData(ordersData, date);

        // const processedData = processOrdersData(store, orders, date); // test gross sales
        const processedData = orders; // test detailed data

        try {
          const googleSheetResult = await addDataToGoogleSheet(store, processedData);
          if (googleSheetResult) {
            return res.status(200).json({ message: `Sales on ${date} exported for ${storeHandle}`, processedData });
          } else {
            return res.status(500).json({ message: "Error exporting daily sales" });
          }
        } catch (error) {
          console.error("Error with Google Sheets:", error);
          return res.status(500).json({ message: "Error generating worksheet" });
        }
      } catch (error) {
        console.error("Error in bulk operation:", error);
        return res.status(500).json({
          message: "Error in bulk operation",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  } catch (error) {
    console.error("Error in export_daily_sales:", error);
    return res.status(500).json({
      message: "Error exporting daily sales",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

const mapOrdersData = (ordersData: any, date: string) => {
  return ordersData
    .map((order: any) => {
      const lineItems = ordersData.filter((item: any) => item.__parentId === order.id);
      return {
        date,
        id: order.id,
        name: order.name,
        subtotalPrice: order.subtotalPrice,
        lineItems,
        sourceName: order.sourceName,
        shippingPrice: order.currentShippingPriceSet?.shopMoney?.amount || 0,
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
  const bulkOperationInitiated = await initiateShopifyBulkOperation(shopifyClient, bulkQueryGetOrders(`created_at:${date}`));

  if (!bulkOperationInitiated) {
    throw new Error("Failed to initiate bulk operation");
  }

  while (!isCompleted && !bulkOperation?.url) {
    bulkOperation = await checkBulkOperationStatus(shopifyClient);

    if (!bulkOperation) {
      throw new Error("Bulk operation not found or failed to check status");
    }

    if (bulkOperation?.status === "COMPLETED") {
      isCompleted = true;
    } else if (["FAILED", "CANCELLED"].includes(bulkOperation.status)) {
      throw new Error(`Bulk operation ${bulkOperation.status}: ${bulkOperation.errorCode || "Unknown error"}`);
    } else {
      // Check every 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  if (!bulkOperation.url) {
    throw new Error("Bulk operation completed but no URL was returned");
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
    worksheet.addRow(["date", "order_number", "product_title", "sku", "quantity", "line_unit_price", "line_total_price", "line_total_discount", "source"]);
    data.forEach((order: any) => {
      order.lineItems.forEach((item: any) => {
        const totalDiscount = item.discountAllocations
          .reduce((acc: number, discount: any) => acc + parseFloat(discount.allocatedAmountSet.shopMoney.amount), 0)
          .toFixed(2);
        worksheet.addRow([
          order.date,
          order.name,
          item.title,
          item.sku,
          item.quantity,
          (item.originalUnitPriceSet?.shopMoney?.amount - totalDiscount / item.quantity).toFixed(2),
          (item.originalTotalSet?.shopMoney?.amount - totalDiscount).toFixed(2),
          totalDiscount > 0 ? totalDiscount : "",
          order.sourceName,
        ]);
      });
      if (order.shippingPrice > 0) {
        worksheet.addRow([order.date, order.name, "Doprava", "", 1, order.shippingPrice, order.shippingPrice, "", order.sourceName]);
      }
    });
  }
};

const addDataToGoogleSheet = async (store: any, data: any) => {
  const formattedData = formatOrderDataForSheets(data, store.storeUrl);
  const spreadsheetId = DMP_STORE_URL === store.storeUrl ? GOOGLE_SPREADSHEET_ID_DMP : GOOGLE_SPREADSHEET_ID_PTZ;
  if (spreadsheetId && formattedData) {
    try {
      const result = await writeToGoogleSheetWithCredentials(store, spreadsheetId, formattedData);
      return result;
    } catch (googleSheetsError) {
      console.error("Google Sheets error:", googleSheetsError);
      return null;
    }
  }
  return null;
};

const getDatesRange = (dateFrom: string, dateTo: string) => {
  const dates = [];
  const startDate = new Date(dateFrom);
  const endDate = new Date(dateTo);
  for (let date = startDate; date <= endDate; date.setDate(date.getDate() + 1)) {
    dates.push(new Date(date).toISOString().split("T")[0]);
  }
  return dates;
};
