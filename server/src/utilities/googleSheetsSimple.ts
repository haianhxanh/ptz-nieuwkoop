import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const { DMP_STORE_URL } = process.env;

/**
 * Simple Google Sheets integration using API Key (for reading) or Service Account (for writing)
 */

// Option 1: Using API Key (for reading public sheets only)
export const readGoogleSheetWithApiKey = async (spreadsheetId: string, range: string = "Sheet1!A:Z") => {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY not found in environment variables");
    }

    const sheets = google.sheets({
      version: "v4",
      auth: apiKey,
    });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return response.data.values;
  } catch (error) {
    console.error("Error reading Google Sheet with API key:", error);
    throw error;
  }
};

// Option 2: Using Service Account (for reading and writing)
export const writeToGoogleSheetWithServiceAccount = async (spreadsheetId: string, data: any[], range: string = "Sheet1!A:Z") => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const request = {
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      resource: {
        values: data,
      },
    };

    const response = await sheets.spreadsheets.values.append(request);
    console.log("Data written to Google Sheet:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error writing to Google Sheet:", error);
    throw error;
  }
};

// Option 3: Using Service Account with credentials from environment
export const writeToGoogleSheetWithCredentials = async (store: any, spreadsheetId: string, data: any[], range: string = "Sheet1!A:Z") => {
  try {
    let auth;
    const GOOGLE_SERVICE_ACCOUNT_CREDENTIALS =
      store.storeUrl === DMP_STORE_URL ? process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_DMP : process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_PTZ;

    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
      console.log("Using service account key file...");
      auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
    } else if (GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
      console.log("Using service account credentials from environment...");
      try {
        const credentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
        auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
      } catch (jsonError) {
        throw new Error(`Invalid JSON in GOOGLE_SERVICE_ACCOUNT_CREDENTIALS: ${(jsonError as Error).message}`);
      }
    } else {
      throw new Error("Neither GOOGLE_SERVICE_ACCOUNT_KEY_FILE nor GOOGLE_SERVICE_ACCOUNT_CREDENTIALS found in environment variables");
    }

    const sheets = google.sheets({ version: "v4", auth });

    const request = {
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      resource: {
        values: data,
      },
    };

    const response = await sheets.spreadsheets.values.append(request);
    console.log("Data written to Google Sheet:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error writing to Google Sheet:", error);
    throw error;
  }
};

// Format order data for Google Sheets
export const formatOrderDataForSheets = (orders: any[], storeUrl: string) => {
  const rows: any[][] = [];
  orders.forEach((order: any) => {
    order.lineItems.forEach((item: any) => {
      const totalDiscount =
        item.discountAllocations?.reduce((acc: number, discount: any) => acc + parseFloat(discount.allocatedAmountSet?.shopMoney?.amount || 0), 0) || 0;

      const isWorkshopItem = item.title.toLowerCase().includes("workshop");

      rows.push([
        order.date,
        order.name,
        item.title,
        item.sku,
        item.quantity,
        (parseFloat(item.originalUnitPriceSet?.shopMoney?.amount || 0) - totalDiscount / item.quantity).toFixed(2),
        (parseFloat(item.originalTotalSet?.shopMoney?.amount || 0) - totalDiscount).toFixed(2),
        totalDiscount > 0 ? totalDiscount.toFixed(2) : "",
        order.sourceName,
        storeUrl === DMP_STORE_URL ? (isWorkshopItem ? "TRUE" : "FALSE") : "",
      ]);
    });

    // Add shipping row if there's shipping cost
    if (order.shippingPrice > 0) {
      rows.push([order.date, order.name, "Doprava", "", 1, order.shippingPrice, order.shippingPrice, "", order.sourceName]);
    }
  });

  return rows;
};
