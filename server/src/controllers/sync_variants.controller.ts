import { Request, Response } from "express";
import { products } from "../data_storage/sample_data";
import axios from "axios";
import { promisify } from "util";
const sleep = promisify(setTimeout);
import dotenv from "dotenv";

import {
  allVariants,
  getApiVariant,
  getVariantStock,
  syncVariantStock,
} from "../utilities/helper";

dotenv.config();

export const sync_variants = async (req: Request, res: Response) => {
  try {
    let variants = await allVariants();

    // check for variants without metafields of namespace custom and key nieuwkoop_last_inventory_sync or variants with metafields of namespace custom and key nieuwkoop_last_inventory_sync with value less than 12 hours ago

    variants = variants.filter((variant) => {
      let metafields = variant.node.metafields.edges;
      let lastSyncMeta = metafields.find(
        (metafield: any) =>
          metafield.node.namespace == "custom" &&
          metafield.node.key == "nieuwkoop_last_inventory_sync"
      );
      if (!lastSyncMeta) {
        return true;
      } else {
        let lastSyncDate = new Date(lastSyncMeta.node.value);
        let currentDate = new Date();
        let diff = currentDate.getTime() - lastSyncDate.getTime();
        let diffHours = diff / (1000 * 3600);
        if (diffHours > 4) {
          return true;
        } else {
          return false;
        }
      }
    });

    if (variants.length > 150) {
      variants = variants.slice(0, 150);
    }

    let resVariants = [];
    for (const [index, variant] of variants.entries()) {
      if (variant.node.sku && variant.node.sku != "") {
        let matchingStockVariant = await getVariantStock(variant.node.sku);
        let matchingApiVariant = await getApiVariant(variant.node.sku);
        if (matchingStockVariant && matchingStockVariant) {
          resVariants.push({
            sku: matchingStockVariant.Itemcode,
            qty: matchingStockVariant.StockAvailable,
          });
        } else {
          resVariants.push({
            sku: variant.node.sku,
            qty: 0,
          });
        }

        let syncVariantStockRes = await syncVariantStock(
          variant,
          matchingStockVariant,
          matchingApiVariant[0]
        );

        await sleep(750);
      }
    }
    res.status(200).json({
      message: "Inventory synced successfully",
      time: new Date().toLocaleString(),
      variants: resVariants,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
