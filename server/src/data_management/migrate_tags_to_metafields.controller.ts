import { Request, Response } from "express";
import { promisify } from "util";
const sleep = promisify(setTimeout);
import dotenv from "dotenv";

import { tagsValues } from "./tags_values";
import { checkBulkOperationStatus, downloadBulkResults, initiateShopifyBulkOperation, mapProductsData } from "../utilities/bulkOperations";
import { GraphQLClient } from "graphql-request";
import { bulkQueryGetProducts } from "../queries/products";
import { get_store } from "../app_stores_sync/utils";
import { metafieldsSet } from "../queries/metafieldsSetMutation";
import { tagsAdd } from "../app_stores_sync/queries";

dotenv.config();

const { API_VERSION } = process.env;

export const migrate_tags_to_metafields = async (req: Request, res: Response) => {
  const store = get_store(req.query.store as string);
  if (!store) {
    return res.status(400).json({ message: `Store not found for storeHandle: ${req.query.store}` });
  }
  const shopifyClient = new GraphQLClient(`https://${store.storeUrl}/admin/api/${API_VERSION}/graphql.json`, {
    // @ts-ignore
    headers: {
      "X-Shopify-Access-Token": store.accessToken,
    },
  });

  try {
    let bulkOperation: any;
    let isCompleted = false;

    const client: GraphQLClient = shopifyClient;
    await initiateShopifyBulkOperation(client, bulkQueryGetProducts("tag_not:'FILTER_TAGS_MIGRATED'"));

    while (!isCompleted) {
      bulkOperation = await checkBulkOperationStatus(client);
      if (bulkOperation?.status === "COMPLETED") {
        isCompleted = true;
      } else if (["FAILED", "CANCELLED"].includes(bulkOperation.status)) {
        throw new Error(`Bulk operation ${bulkOperation.status}: ${bulkOperation.errorCode || "Unknown error"}`);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    const bulkOperationUrl = bulkOperation.url;

    const results = await downloadBulkResults(bulkOperationUrl);
    const products = await mapProductsData(results);

    for (const [index, product] of products.entries()) {
      console.log(`Processing product ${index + 1} of ${products.length}`);
      const metafields = ["vyska", "svetlo_pro_rostlinu", "narocnost", "barva"];
      const metafieldsToUpdate = [];

      for (const metafield of metafields) {
        const tags = tagsValues[metafield as keyof typeof tagsValues].split(", ").map((value: string) => value.trim());
        const matchingTagValues = tags.filter((tag: string) => product.tags.includes(tag));
        if (matchingTagValues.length > 0) {
          metafieldsToUpdate.push({
            ownerId: product.id,
            key: metafield,
            namespace: "custom",
            type: "list.single_line_text_field",
            value: JSON.stringify(matchingTagValues),
          });
        }
      }

      if (metafieldsToUpdate.length > 0) {
        const updatedProduct = await shopifyClient.request(metafieldsSet, {
          metafields: metafieldsToUpdate,
        });
        if (updatedProduct.metafieldsSet.userErrors && updatedProduct.metafieldsSet.userErrors.length > 0) {
          return res.status(500).json({ message: "Error migrating tags to metafields", errors: updatedProduct.metafieldsSet.userErrors });
        } else {
          const tagsAdded = await shopifyClient.request(tagsAdd, {
            id: product.id,
            tags: "FILTER_TAGS_MIGRATED",
          });
          if (tagsAdded.tagsAdd.userErrors && tagsAdded.tagsAdd.userErrors.length > 0) {
            return res.status(500).json({ message: "Error migrating tags to metafields", errors: tagsAdded.tagsAdd.userErrors });
          } else {
            console.log("Tags migrated to metafields", product.id);
            await sleep(200);
          }
        }
      }
    }

    return res.status(200).json({ products });
  } catch (error) {
    console.error("Error migrating tags to metafields:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
