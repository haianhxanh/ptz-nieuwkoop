import { Request, Response } from "express";
import dotenv from "dotenv";
import { get_stores, is_variant_to_sync, remove_duplicated_objects } from "./utils";
import { GraphQLClient } from "graphql-request";
import { inventorySetQuantitiesMutation, productVariantQuery, productVariantsQuery } from "./queries";

dotenv.config();
const { API_VERSION } = process.env;

interface SkuToSync {
  sku: string;
  quantity: number;
}

export const stores_inventory_sync_on_order_update = async (req: Request, res: Response) => {
  try {
    // receive webhook
    // console.log("req.body", req.body);
    // return res.status(200).json({ message: "Webhook received" });
    let orderItems = req.body.line_items;
    let orderStatusUrl = req.body.order_status_url;
    let stores = get_stores(orderStatusUrl);
    if (!stores) return res.status(400).json({ message: "Store not found" });

    const STORE_TO_SYNC_FROM = new GraphQLClient(`https://${stores.origin.storeUrl}/admin/api/${API_VERSION}/graphql.json`, {
      // @ts-ignore
      headers: {
        "X-Shopify-Access-Token": stores.origin.accessToken,
      },
    });

    let skusToSync: SkuToSync[] = [];

    for (let item of orderItems) {
      let variantId = "gid://shopify/ProductVariant/" + item.variant_id.toString();

      // Test PTZ
      // let variantId = "gid://shopify/ProductVariant/" + "49951188615505";
      // Test DMP
      // let variantId = "gid://shopify/ProductVariant/" + "46112112574731";

      const variant = await STORE_TO_SYNC_FROM.request(productVariantQuery, {
        id: variantId,
        locationId: stores.origin.locationId,
      });

      if (variant?.productVariant?.product?.tags?.includes("propojeni")) {
        skusToSync.push({
          sku: variant?.productVariant?.sku,
          quantity: variant?.productVariant?.inventoryItem?.inventoryLevel?.quantities[0]?.quantity,
        });
      }
    }

    let uniqueSkusToSync = remove_duplicated_objects(skusToSync);

    if (uniqueSkusToSync.length == 0) return res.status(200).json({ message: "No variants to sync" });

    const STORE_TO_SYNC_TO = new GraphQLClient(`https://${stores.destination.storeUrl}/admin/api/${API_VERSION}/graphql.json`, {
      // @ts-ignore
      headers: {
        "X-Shopify-Access-Token": stores.destination.accessToken,
      },
    });
    for (let item of uniqueSkusToSync as SkuToSync[]) {
      const variantToSync = await STORE_TO_SYNC_TO.request(productVariantsQuery, {
        query: `sku:${item.sku}`,
        locationId: stores.destination.locationId,
      });
      let inventoryItemId = variantToSync?.productVariants?.edges[0]?.node?.inventoryItem?.id;
      let quantity = item.quantity;

      const syncedVariant = await STORE_TO_SYNC_TO.request(inventorySetQuantitiesMutation, {
        input: {
          ignoreCompareQuantity: true,
          name: "available",
          quantities: [
            {
              inventoryItemId: inventoryItemId,
              locationId: stores.destination.locationId,
              quantity: quantity,
            },
          ],
          reason: "other",
        },
      });

      console.log("syncedVariant", syncedVariant);
    }

    return res.status(200).json({
      message: `Variants synced based on order ${req.body.order_number}`,
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
