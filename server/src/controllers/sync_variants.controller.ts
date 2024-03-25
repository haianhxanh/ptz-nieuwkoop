import { Request, Response } from "express";
import { products } from "../data_storage/sample_data";
import axios from "axios";
import { promisify } from "util";
const sleep = promisify(setTimeout);
import dotenv from "dotenv";

import {
  allVariants,
  getVariantStock,
  syncVariantStock,
} from "../utilities/helper";

dotenv.config();
const {
  ACCESS_TOKEN,
  STORE,
  API_VERSION,
  NIEUWKOOP_API_ENDPOINT,
  NIEUWKOOP_USERNAME,
  NIEUWKOOP_PASSWORD,
  OPEN_AI_KEY,
  OPEN_AI_MODEL,
  VARIANTS_STOCK_SYNC_INTERVAL_MINUTES,
} = process.env;

export const sync_variants = async (req: Request, res: Response) => {
  let interval;
  if (VARIANTS_STOCK_SYNC_INTERVAL_MINUTES) {
    interval = parseInt(VARIANTS_STOCK_SYNC_INTERVAL_MINUTES) * 60 * 1000;
  }
  try {
    setInterval(async () => {
      let variants = await allVariants();
      for (const [index, variant] of variants.entries()) {
        if (variant.node.sku && variant.node.sku != "") {
          let variantStock = await getVariantStock(variant.node.sku);
          if (!variantStock) {
            continue;
          }
          let syncVariantStockRes = await syncVariantStock(
            variant.node.id.replace("gid://shopify/ProductVariant/", ""),
            variantStock
          );
          await sleep(400);
        }
      }
      res.status(200).json({
        message: "Inventory synced successfully",
        time: new Date().toLocaleString(),
      });
    }, interval);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
