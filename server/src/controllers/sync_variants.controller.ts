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

        await sleep(500);
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
