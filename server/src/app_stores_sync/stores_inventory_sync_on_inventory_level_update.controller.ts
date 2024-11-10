import { Request, Response } from "express";
import dotenv from "dotenv";
import { get_stores_by_location_id } from "./utils";
import { GraphQLClient } from "graphql-request";
import {
  inventoryItemQuery,
  inventorySetQuantitiesMutation,
  productVariantsQuery,
} from "./queries";

dotenv.config();
const { API_VERSION, WEBHOOK_INVENTORY_LEVEL_UPDATE_ENABLED } = process.env;

export const stores_inventory_sync_on_inventory_level_update = async (
  req: Request,
  res: Response
) => {
  try {
    if (WEBHOOK_INVENTORY_LEVEL_UPDATE_ENABLED !== "true") {
      console.log("Webhook inventory level update is not enabled");
      return res.status(400).json({
        message: "Webhook inventory level update is not enabled",
      });
    }
    // receive webhook
    let stores = get_stores_by_location_id(req.body.location_id?.toString());

    if (!stores) return res.status(400).json({ message: "Store not found" });

    const STORE_ORIGIN = new GraphQLClient(
      `https://${stores.origin.storeUrl}/admin/api/${API_VERSION}/graphql.json`,
      {
        // @ts-ignore
        headers: {
          "X-Shopify-Access-Token": stores.origin.accessToken,
        },
      }
    );

    let originInventoryItemId =
      "gid://shopify/InventoryItem/" + req.body?.inventory_item_id?.toString();

    let originInventoryItem = await STORE_ORIGIN.request(inventoryItemQuery, {
      id: originInventoryItemId,
    });

    let isVariantToSync =
      originInventoryItem?.inventoryItem?.variant?.product?.tags?.includes(
        "propojeni"
      );

    if (!isVariantToSync) {
      console.log("Variant not to sync");
      return res.status(200).json({ message: "Variant not to sync" });
    }

    let originQuantity = req.body?.available;
    let sku = originInventoryItem?.inventoryItem?.variant?.sku;

    if (!sku) {
      console.log(
        `Invalid SKU of variant ${originInventoryItem?.inventoryItem?.variant?.id} from ${stores.origin.storeUrl}`
      );
      return res.status(400).json({
        message: `Invalid SKU of variant ${originInventoryItem?.inventoryItem?.variant?.id} from ${stores.origin.storeUrl}`,
      });
    }

    let alreadySynced = 0;

    for (let destination of stores.destinations) {
      const STORE_DESTINATION = new GraphQLClient(
        `https://${destination.storeUrl}/admin/api/${API_VERSION}/graphql.json`,
        {
          // @ts-ignore
          headers: {
            "X-Shopify-Access-Token": destination.accessToken,
          },
        }
      );

      const destinationVariant = await STORE_DESTINATION.request(
        productVariantsQuery,
        {
          query: `sku:${sku}`,
          locationId: destination.locationId,
        }
      );

      let destinationQuantity =
        destinationVariant?.productVariants?.edges[0].node?.inventoryItem
          ?.inventoryLevel?.quantities[0]?.quantity;

      if (originQuantity === destinationQuantity) {
        console.log(`Variant ${sku} already synced`);
        alreadySynced++;
        break;
      }

      let destinationVariantInventoryItemId =
        destinationVariant?.productVariants?.edges[0]?.node?.inventoryItem?.id;

      const syncedVariant = await STORE_DESTINATION.request(
        inventorySetQuantitiesMutation,
        {
          input: {
            ignoreCompareQuantity: true,
            name: "available",
            quantities: [
              {
                inventoryItemId: destinationVariantInventoryItemId,
                locationId: destination.locationId,
                quantity: originQuantity,
              },
            ],
            reason: "other",
          },
        }
      );
    }

    if (alreadySynced) {
      return res.status(200).json({ message: `Variant ${sku} already synced` });
    }

    console.log(
      `Variant ${sku} synced from location ${stores.origin.locationId.replace(
        "gid://shopify/Location/",
        ""
      )} to locations [${stores.destinations
        .map((d) => d.locationId.replace("gid://shopify/Location/", ""))
        .join(", ")}]`
    );
    return res.status(200).json({
      message: `Variant ${sku} synced from location ${
        stores.origin.locationId
      } to locations [${stores.destinations
        .map((d) => d.locationId.replace("gid://shopify/Location/", ""))
        .join(", ")}]`,
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
