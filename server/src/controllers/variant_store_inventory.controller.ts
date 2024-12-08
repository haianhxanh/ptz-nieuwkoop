import { Request, Response } from "express";
import { promisify } from "util";
const sleep = promisify(setTimeout);
import dotenv from "dotenv";

import { getInventory, updateVariantMetafield } from "../utilities/helper";

dotenv.config();

export const variant_store_inventory = async (req: Request, res: Response) => {
  try {
    let variant_sku = req.query.sku as string;
    let api_variant = await getInventory(variant_sku);
    let variant_id = api_variant?.variant?.id;
    let metafields = [];
    metafields.push({
      namespace: "custom",
      type: "number_integer",
      key: "store_availability",
      value: api_variant?.inventoryLevel?.quantities[1]?.quantity?.toString(),
      ownerId: variant_id,
    });
    sleep(500);
    let variant_stock = await updateVariantMetafield(metafields);
    return res.status(200).json(variant_stock);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
