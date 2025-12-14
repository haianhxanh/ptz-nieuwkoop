import { Request, Response } from "express";
import axios from "axios";
import { promisify } from "util";
const sleep = promisify(setTimeout);
import dotenv from "dotenv";
import { allVariants, getApiVariant, shopifyClient } from "../utilities/helper";
const { PTZ_ACCESS_TOKEN, PTZ_STORE_URL, API_VERSION } = process.env;

import { productVariantsBulkUpdateQuery } from "../queries/productVariantsBulkUpdate";
import { createVariantSpecs } from "../utilities/specs";
import { tagsAdd } from "../app_stores_sync/queries";

dotenv.config();

export const update_specs = async (req: Request, res: Response) => {
  try {
    const query = "tag:'Nieuwkoop'";
    const tagToAdd = req.query.tag as string;
    let variants = await allVariants(query, PTZ_STORE_URL as string, PTZ_ACCESS_TOKEN as string);
    for (const [index, variant] of variants.entries()) {
      const specs = variant.node.metafields.edges.find((meta: any) => meta.node.key == "specifikace");
      if (variant.node.sku && variant.node.sku != "") {
        const matchingApiVariant = await getApiVariant(variant.node.sku);
        if (!matchingApiVariant) {
          continue;
        }
        const variantSpecs = await createVariantSpecs(matchingApiVariant);
        const specsMetaId = specs?.node?.id ? specs.node.id : null;

        const updatedVariant = await axios
          .post(
            `https://${PTZ_STORE_URL}/admin/api/${API_VERSION}/graphql.json`,
            {
              query: productVariantsBulkUpdateQuery,
              variables: {
                productId: variant.node.product.id,
                variants: {
                  id: variant.node.id,
                  metafields: [
                    {
                      id: specsMetaId,
                      key: "specifikace",
                      value: variantSpecs,
                      type: "multi_line_text_field",
                      namespace: "custom",
                    },
                  ],
                },
              },
            },
            {
              headers: {
                "X-Shopify-Access-Token": PTZ_ACCESS_TOKEN!,
                "Content-Type": "application/json",
              },
            }
          )
          .then((response) => {
            return response.data;
          })
          .catch((error) => {
            console.error(error);
          });

        if (tagToAdd) {
          await shopifyClient.request(tagsAdd, {
            id: variant.node.product.id,
            tags: [tagToAdd],
          });
        }
        await sleep(500);
        console.log(index + ". " + updatedVariant?.data?.productVariantsBulkUpdate?.productVariants[0]?.sku);
      }
    }
    return res.status(200).json({ message: "Specs updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
