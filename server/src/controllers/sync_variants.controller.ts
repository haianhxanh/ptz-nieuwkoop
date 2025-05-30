import { Request, Response } from "express";
import { promisify } from "util";
const sleep = promisify(setTimeout);
import dotenv from "dotenv";

import { allVariants, getApiVariant, getVariantStock, syncVariantStock } from "../utilities/helper";
import { send_slack_notification } from "../utilities/notifications";

dotenv.config();

const { STORE_ADMIN_PRODUCT_URL, PTZ_STORE_URL, PTZ_ACCESS_TOKEN } = process.env;

export const sync_variants = async (req: Request, res: Response) => {
  try {
    let syncStart = performance.now();
    const query = "tag:'Nieuwkoop'";
    let variants = await allVariants(query, PTZ_STORE_URL as string, PTZ_ACCESS_TOKEN as string);

    // check for variants without metafields of namespace custom and key nieuwkoop_last_inventory_sync or variants with metafields of namespace custom and key nieuwkoop_last_inventory_sync with value less than 12 hours ago

    variants = variants.filter((variant) => {
      let metafields = variant.node.metafields.edges;
      let lastSyncMeta = metafields.find((metafield: any) => metafield.node.key == "nieuwkoop_last_inventory_sync");
      let discontinuedItemMeta = metafields.find((metafield: any) => metafield.node.key == "item_discontinued");

      if (discontinuedItemMeta) {
        if (discontinuedItemMeta.node.value == "true") {
          return false;
        }
      }
      if (!lastSyncMeta) {
        return true;
      } else {
        let lastSyncDate = new Date(lastSyncMeta.node.value);
        let currentDate = new Date();
        let diff = currentDate.getTime() - lastSyncDate.getTime();
        let diffHours = diff / (1000 * 3600);
        if (diffHours > 6) {
          return true;
        } else {
          return false;
        }
      }
    });

    if (variants.length > 250) {
      variants = variants.slice(0, 250);
    }

    let resVariants = [];
    let discontinuedItems = [];
    let costUpdatedItems = [];
    for (const [index, variant] of variants.entries()) {
      if (variant.node.sku && variant.node.sku != "") {
        let matchingStockVariant = await getVariantStock(variant.node.sku);
        let matchingApiVariant = await getApiVariant(variant.node.sku);
        if (!matchingApiVariant || !matchingStockVariant) {
          if (!matchingApiVariant) console.log(variant.node.sku + " not found in API");
          if (!matchingStockVariant) console.log(variant.node.sku + " not found in Stock");
        }
        let storeAdminProductUrl =
          STORE_ADMIN_PRODUCT_URL +
          variant.node.product.id.replace("gid://shopify/Product/", "") +
          "/variants/" +
          variant.node.id.replace("gid://shopify/ProductVariant/", "");
        if (matchingApiVariant && matchingStockVariant) {
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

        if ((!matchingApiVariant && !matchingStockVariant) || matchingApiVariant?.ShowOnWebsite == false) {
          // discontinuedItems
          const discontinuedItemMeta = variant.node.metafields.edges.find(
            (metafield: any) => metafield.node.namespace == "custom" && metafield.node.key == "item_discontinued"
          );
          if (discontinuedItemMeta == undefined || discontinuedItemMeta.node.value == "false") {
            discontinuedItems.push({
              sku: variant.node.sku,
              product: storeAdminProductUrl,
            });
          }
        } else {
          // if not discontinued, check price difference
          let costEurMeta = variant.node.metafields.edges.find((meta: any) => meta.node.key == "cost_eur");
          let costEur = costEurMeta ? parseFloat(costEurMeta.node.value) : 0;
          if (matchingApiVariant && costEurMeta && matchingApiVariant.Salesprice.toFixed(2) != costEur.toFixed(2)) {
            let costUpdatedItem = {
              sku: variant.node.sku,
              product: storeAdminProductUrl,
              oldCost: costEur.toFixed(2),
              newCost: matchingApiVariant.Salesprice.toFixed(2),
            };
            costUpdatedItems.push(costUpdatedItem);
          }
        }

        let syncVariantStockRes = await syncVariantStock(variant, matchingStockVariant, matchingApiVariant ? matchingApiVariant : null);

        await sleep(200);
      }
    }
    if (discontinuedItems.length > 0 || costUpdatedItems.length > 0) {
      let slackNotification = send_slack_notification(discontinuedItems, costUpdatedItems);
    }
    let syncFinish = performance.now();
    let syncTime = ((syncFinish - syncStart) / 1000 / 60).toFixed(2);
    console.log("Sync time: " + syncTime + " minutes");
    return res.status(200).json({
      message: "Inventory synced successfully",
      time: new Date().toLocaleString(),
      variants: resVariants,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
