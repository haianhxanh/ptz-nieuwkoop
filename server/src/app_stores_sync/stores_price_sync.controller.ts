import { Request, Response } from "express";
import { allVariants } from "../utilities/helper";
import { GraphQLClient } from "graphql-request";
import { inventoryItemUpdate, productVariantsQuery } from "./queries";
import { productVariantsBulkUpdateQuery } from "../queries/productVariantsBulkUpdate";
import { promisify } from "util";
const sleep = promisify(setTimeout);
import dotenv from "dotenv";

dotenv.config();
const {
  DMP_STORE_URL,
  DMP_ACCESS_TOKEN,
  PTZ_STORE_URL,
  PTZ_ACCESS_TOKEN,
  API_VERSION,
  PTZ_STORE_LOCATION_ID,
} = process.env;

// ===================== DESCRIPTION =====================
// This function is used to sync prices of variants of products with tag 'propojeni' from DMP to PTZ

const shopifyClient = new GraphQLClient(
  `https://${PTZ_STORE_URL}/admin/api/${API_VERSION}/graphql.json`,
  {
    // @ts-ignore
    headers: {
      "X-Shopify-Access-Token": PTZ_ACCESS_TOKEN,
    },
  }
);

export const stores_price_sync = async (req: Request, res: Response) => {
  try {
    const query = "tag:'propojeni'";
    let variants = await allVariants(
      query,
      DMP_STORE_URL as string,
      DMP_ACCESS_TOKEN as string
    );

    variants = variants.filter((variant) => {
      return variant?.node?.sku && variant?.node?.product?.status != "ARCHIVED";
    });

    for (const [index, variant] of variants.entries()) {
      await sleep(300);
      const variantToUpdate = await shopifyClient.request(
        productVariantsQuery,
        {
          query: `sku:${variant?.node?.sku}`,
          locationId: "gid://shopify/Location/" + PTZ_STORE_LOCATION_ID,
        }
      );
      if (
        variantToUpdate?.productVariants?.edges.length <= 0 ||
        !variantToUpdate?.productVariants?.edges
      )
        continue;

      const equalPrice =
        variantToUpdate?.productVariants?.edges[0]?.node?.price ===
        variant?.node?.price;

      const equalCost =
        variantToUpdate?.productVariants?.edges[0]?.node?.inventoryItem.unitCost
          .amount === variant?.node?.inventoryItem?.unitCost?.amount;

      const equalCompareAtPrice =
        variantToUpdate?.productVariants?.edges[0]?.node?.compareAtPrice ===
        variant?.node?.compareAtPrice;

      if (equalPrice && equalCost && equalCompareAtPrice) continue;

      const variantUpdated = await shopifyClient.request(
        productVariantsBulkUpdateQuery,
        {
          productId:
            variantToUpdate?.productVariants?.edges[0]?.node?.product?.id,
          variants: [
            {
              id: variantToUpdate?.productVariants?.edges[0]?.node?.id,
              price: variant?.node?.price,
              compareAtPrice: variant?.node?.compareAtPrice,
            },
          ],
        }
      );

      if (!equalCost) {
        const costUpdated = await shopifyClient.request(inventoryItemUpdate, {
          id: variantToUpdate?.productVariants?.edges[0]?.node?.inventoryItem
            ?.id,
          input: {
            cost: variant?.node?.inventoryItem?.unitCost?.amount,
          },
        });
      }

      if (!equalCompareAtPrice) {
        console.log(
          "Variant compareAtPrice updated:",
          variant?.node?.sku,
          `${variantToUpdate?.productVariants?.edges[0]?.node?.compareAtPrice} -> ${variant?.node?.compareAtPrice}`
        );
      }

      if (!equalPrice) {
        console.log(
          "Variant price updated:",
          variant?.node?.sku,
          `${variantToUpdate?.productVariants?.edges[0]?.node?.price} -> ${variant?.node?.price}`
        );
      }

      if (!equalCost) {
        console.log(
          "Variant cost updated:",
          variant?.node?.sku,
          `${variantToUpdate?.productVariants?.edges[0]?.node?.inventoryItem.unitCost.amount} -> ${variant?.node?.inventoryItem.unitCost.amount}`
        );
      }

      await sleep(500);
    }
    return res.status(200).json({ message: "Price sync completed" });
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(200).json({ message: "Internal server error" });
  }
};
