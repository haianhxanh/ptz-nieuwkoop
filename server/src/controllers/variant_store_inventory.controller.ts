import { Request, Response } from "express";
import { promisify } from "util";
import dotenv from "dotenv";

import { get_stores } from "../app_stores_sync/utils";
import { GraphQLClient } from "graphql-request";
import { inventoryQuery } from "../queries/inventory";
import { metafieldsSet } from "../queries/metafieldsSetMutation";
dotenv.config();

const API_VERSION = "2026-01";
export const variant_store_inventory = async (req: Request, res: Response) => {
  try {
    const storeDomain = req.query.store as string;
    const variantId = req.query.id as string;
    if (!storeDomain || !variantId) {
      return res.status(200).json({ message: "Store domain and variant id are required" });
    }
    const stores = get_stores(storeDomain);
    if (!stores?.origin.storeUrl) {
      return res.status(200).json({ message: "Store not found" });
    }
    const shopifyClient = new GraphQLClient(`https://${stores?.origin.storeUrl}/admin/api/${API_VERSION}/graphql.json`, {
      // @ts-ignore
      headers: {
        "X-Shopify-Access-Token": stores?.origin.accessToken,
      },
    });

    const apiVariant = await shopifyClient.request(inventoryQuery, {
      id: variantId,
      locationId: stores?.origin.locationId,
    });

    if (!apiVariant?.productVariant?.id) {
      return res.status(200).json({ message: "Variant not found" });
    }

    let metafields = [];
    metafields.push({
      namespace: "custom",
      type: "number_integer",
      key: "store_availability",
      value: apiVariant?.productVariant?.inventoryItem?.inventoryLevel?.quantities[1]?.quantity?.toString() || "0",
      ownerId: variantId,
    });

    try {
      await shopifyClient.request(metafieldsSet, {
        metafields: metafields,
      });
    } catch (error) {
      console.log(error);
      return res.status(200).json(error);
    }

    return res.status(200).json({ message: `Variant inventory updated for ${variantId}` });
  } catch (error) {
    res.status(200).json({ message: "Internal server error" });
  }
};
