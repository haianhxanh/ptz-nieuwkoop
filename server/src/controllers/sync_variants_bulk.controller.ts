import { Request, Response } from "express";
import dotenv from "dotenv";
import { checkBulkOperationStatus, downloadBulkResults, initiateShopifyBulkOperation, mapProductsData } from "../utilities/bulkOperations";
import { createProductMetafields, getApiVariant, setContinueSelling, shopifyClient, sortProductsByLastInventorySync } from "../utilities/helper";
import { getVariantStock } from "../utilities/helper";
import { notify_dev, send_slack_notification } from "../utilities/notifications";
import { productVariantsBulkUpdateQuery } from "../queries/productVariantsBulkUpdate";
import { bulkQueryGetProducts } from "../queries/products";
import { metafieldsSet } from "../queries/metafieldsSetMutation";
dotenv.config();

const { STORE_ADMIN_PRODUCT_URL } = process.env;

export const sync_variants_bulk = async (req: Request, res: Response) => {
  try {
    // bulk query products with tag 'Nieuwkoop'
    let bulkOperation: any;
    let isCompleted = false;
    await initiateShopifyBulkOperation(bulkQueryGetProducts);
    while (!isCompleted) {
      bulkOperation = await checkBulkOperationStatus();
      if (bulkOperation?.status === "COMPLETED") {
        isCompleted = true;
      } else if (["FAILED", "CANCELLED"].includes(bulkOperation.status)) {
        throw new Error(`Bulk operation ${bulkOperation.status}: ${bulkOperation.errorCode || "Unknown error"}`);
      } else {
        // Check every 5 seconds
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    const bulkOperationUrl = bulkOperation.url;

    const results = await downloadBulkResults(bulkOperationUrl);
    const products = await mapProductsData(results);

    // sort products by nieuwkoop_last_inventory_sync
    let productsToUpdate = sortProductsByLastInventorySync(products);
    productsToUpdate = productsToUpdate.slice(0, 250);

    const discontinuedItems: any[] = [];
    const costUpdatedItems: any[] = [];
    const errors: any[] = [];
    const productsToUpdateSyncMeta: any[] = [];

    for (const [index, product] of productsToUpdate.entries()) {
      const productVariantsToUpdate = [];
      for (const variant of product.variants) {
        const matchingStockVariant = await getVariantStock(variant.sku);
        const matchingApiVariant = await getApiVariant(variant.sku);

        const costEurMeta = variant.metafields.find((meta: any) => meta.key == "cost_eur");
        const costEur = costEurMeta ? parseFloat(costEurMeta.value) : 0;
        const productAdminUrl =
          STORE_ADMIN_PRODUCT_URL + product.id.replace("gid://shopify/Product/", "") + "/variants/" + variant.id.replace("gid://shopify/ProductVariant/", "");
        if (matchingApiVariant && costEurMeta && matchingApiVariant.Salesprice.toFixed(2) != costEur.toFixed(2)) {
          const costUpdatedItem = {
            sku: variant.sku,
            product: productAdminUrl,
            oldCost: costEur.toFixed(2),
            newCost: matchingApiVariant.Salesprice.toFixed(2),
          };
          costUpdatedItems.push(costUpdatedItem);
        }

        const metafields = createProductMetafields(variant, matchingApiVariant, matchingStockVariant);
        const variantToUpdate = {
          id: variant.id,
          inventoryPolicy: setContinueSelling(matchingApiVariant, matchingStockVariant) ? "CONTINUE" : "DENY",
          inventoryItem: {
            cost: matchingApiVariant?.Salesprice ? (matchingApiVariant?.Salesprice * 26).toString() : "0",
          },
          metafields,
        };

        productVariantsToUpdate.push(variantToUpdate);

        if (!matchingApiVariant || !matchingStockVariant) {
          discontinuedItems.push({
            sku: variant.sku,
            product: productAdminUrl,
          });
        }
      }
      const updatedProduct = await shopifyClient.request(productVariantsBulkUpdateQuery, {
        productId: product.id,
        variants: productVariantsToUpdate,
      });

      productsToUpdateSyncMeta.push({
        namespace: "custom",
        type: "date_time",
        key: "nieuwkoop_last_inventory_sync",
        value: new Date().toISOString(),
        ownerId: product.id,
      });

      await shopifyClient.request(metafieldsSet, {
        metafields: productsToUpdateSyncMeta,
      });

      if (updatedProduct.errors) {
        errors.push(updatedProduct.errors);
      }
    }

    // send Slack notifications about cost updated items and discontinued items
    if (discontinuedItems.length > 0 || costUpdatedItems.length > 0) {
      await send_slack_notification(discontinuedItems, costUpdatedItems);
    }

    if (errors.length > 0) {
      await notify_dev("POTZILLAS SYNC VARIANTS BULK ERRORS", errors);
    }

    return res.status(200).json({
      message: "Synced successfully",
    });
  } catch (error) {
    console.log(error);
    await notify_dev("POTZILLAS SYNC VARIANTS BULK ERRORS", error);
    return res.status(500).json({
      message: "Error syncing variants",
    });
  }
};
