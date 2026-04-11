import axios from "axios";
import dotenv from "dotenv";
import DmpProductStock from "../model/dmp_product_stock.model";

dotenv.config();

const { NIEUWKOOP_API_STOCK_ENDPOINT, NIEUWKOOP_USERNAME, NIEUWKOOP_PASSWORD } = process.env;

async function fetchAllStock() {
  const auth = Buffer.from(`${NIEUWKOOP_USERNAME}:${NIEUWKOOP_PASSWORD}`).toString("base64");

  const res = await axios.get(NIEUWKOOP_API_STOCK_ENDPOINT || "", {
    headers: { Authorization: `Basic ${auth}` },
    timeout: 60000,
  });

  return res.data;
}

export async function syncAllStock() {
  console.log("[StockSync] Starting stock sync...");
  const startTime = Date.now();

  let stockData: any[];
  try {
    stockData = await fetchAllStock();
  } catch (err) {
    console.error("[StockSync] Failed to fetch stock:", err);
    return;
  }

  console.log(`[StockSync] Found ${stockData.length} items to sync`);

  let synced = 0;
  let failed = 0;

  for (const item of stockData) {
    try {
      await DmpProductStock.upsert({
        itemCode: item.Itemcode,
        stockAvailable: item.StockAvailable ?? 0,
        firstAvailable: item.FirstAvailable ? new Date(item.FirstAvailable) : null,
        sysmodified: item.Sysmodified ? new Date(item.Sysmodified) : null,
        updatedAt: new Date(),
      });
      synced++;
    } catch (err) {
      failed++;
      if (failed <= 5) {
        console.error(`[StockSync] Failed for ${item.Itemcode}:`, (err as Error).message);
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[StockSync] Done in ${elapsed}s — synced: ${synced}, failed: ${failed}`);
}
