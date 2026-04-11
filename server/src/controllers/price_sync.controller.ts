import axios from "axios";
import dotenv from "dotenv";
import DmpProductPrice from "../model/dmp_product_price.model";

dotenv.config();

const { NIEUWKOOP_API_PRICE_ENDPOINT, NIEUWKOOP_USERNAME, NIEUWKOOP_PASSWORD } = process.env;

async function fetchAllPrices() {
  const auth = Buffer.from(`${NIEUWKOOP_USERNAME}:${NIEUWKOOP_PASSWORD}`).toString("base64");

  const res = await axios.get(NIEUWKOOP_API_PRICE_ENDPOINT || "", {
    headers: { Authorization: `Basic ${auth}` },
    timeout: 60000,
  });

  return res.data;
}

export async function syncAllPrices() {
  console.log("[PriceSync] Starting price sync...");
  const startTime = Date.now();

  let pricesData: any[];
  try {
    pricesData = await fetchAllPrices();
  } catch (err) {
    console.error("[PriceSync] Failed to fetch prices:", err);
    return;
  }

  console.log(`[PriceSync] Found ${pricesData.length} prices to sync`);

  let synced = 0;
  let failed = 0;

  for (const priceData of pricesData) {
    try {
      await DmpProductPrice.upsert({
        itemCode: priceData.ItemCode,
        priceGross: priceData.PriceGross ?? 0,
        discountPercentage: priceData.DiscountPercentage ?? 0,
        priceNett: priceData.PriceNett ?? 0,
        sysmodified: priceData.Sysmodified ? new Date(priceData.Sysmodified) : null,
        updatedAt: new Date(),
      });
      synced++;
    } catch (err) {
      failed++;
      if (failed <= 5) {
        console.error(`[PriceSync] Failed for ${priceData.ItemCode}:`, (err as Error).message);
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[PriceSync] Done in ${elapsed}s — synced: ${synced}, failed: ${failed}`);
}
