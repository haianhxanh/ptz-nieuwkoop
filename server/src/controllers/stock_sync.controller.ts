import axios from "axios";
import { Op } from "sequelize";
import dotenv from "dotenv";
import ProductStock from "../model/product_stock.model";

dotenv.config();

const { NIEUWKOOP_API_ENDPOINT, NIEUWKOOP_API_STOCK_ENDPOINT, NIEUWKOOP_USERNAME, NIEUWKOOP_PASSWORD } = process.env;

const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getAllItemcodes(): Promise<string[]> {
  const auth = Buffer.from(`${NIEUWKOOP_USERNAME}:${NIEUWKOOP_PASSWORD}`).toString("base64");
  const res = await axios.get(NIEUWKOOP_API_ENDPOINT || "", {
    headers: { Authorization: `Basic ${auth}` },
    timeout: 60000,
  });

  const products = res.data.filter((p: any) => p.IsStockItem === true && p.ItemStatus !== "E" && p.DeliveryTimeInDays !== 999 && p.ShowOnWebsite === true);

  return products.map((p: any) => p.Itemcode).filter(Boolean);
}

async function fetchStock(itemcode: string) {
  const auth = Buffer.from(`${NIEUWKOOP_USERNAME}:${NIEUWKOOP_PASSWORD}`).toString("base64");
  const url = NIEUWKOOP_API_STOCK_ENDPOINT + `&itemCode=${itemcode}`;

  const res = await axios.get(url, {
    headers: { Authorization: `Basic ${auth}` },
    timeout: 15000,
  });

  if (res.data && res.data.length > 0) {
    return res.data[0];
  }
  return null;
}

export async function syncAllStock() {
  console.log("[StockSync] Starting stock sync...");
  const startTime = Date.now();

  let itemcodes: string[];
  try {
    itemcodes = await getAllItemcodes();
  } catch (err) {
    console.error("[StockSync] Failed to fetch product list:", err);
    return;
  }

  console.log(`[StockSync] Found ${itemcodes.length} products total`);

  const cutoff = new Date(Date.now() - SYNC_INTERVAL_MS);
  const recentlyUpdated = await ProductStock.findAll({
    attributes: ["itemcode"],
    where: { updated_at: { [Op.gte]: cutoff } },
  });
  const recentSet = new Set(recentlyUpdated.map((r) => r.get("itemcode") as string));
  const toSync = itemcodes.filter((code) => !recentSet.has(code));

  console.log(`[StockSync] Skipping ${itemcodes.length - toSync.length} recently synced, syncing ${toSync.length}`);

  let synced = 0;
  let failed = 0;

  for (const itemcode of toSync) {
    try {
      const stockData = await fetchStock(itemcode);

      if (stockData) {
        await ProductStock.upsert({
          itemcode: stockData.Itemcode,
          stock_available: stockData.StockAvailable ?? 0,
          first_available: stockData.FirstAvailable ? new Date(stockData.FirstAvailable) : null,
          sysmodified: stockData.Sysmodified ? new Date(stockData.Sysmodified) : null,
          updated_at: new Date(),
        });
        synced++;
      } else {
        await ProductStock.upsert({
          itemcode,
          stock_available: 0,
          first_available: null,
          sysmodified: null,
          updated_at: new Date(),
        });
        synced++;
      }
    } catch (err) {
      failed++;
      if (failed <= 5) {
        console.error(`[StockSync] Failed for ${itemcode}:`, (err as Error).message);
      }
    }

    await sleep(150);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[StockSync] Done in ${elapsed}s — synced: ${synced}, failed: ${failed}`);
}
