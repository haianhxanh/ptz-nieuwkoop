import { Request, Response } from "express";
import axios from "axios";
import { promisify } from "util";
const sleep = promisify(setTimeout);
import dotenv from "dotenv";

import { allVariants, getApiVariant } from "../utilities/helper";

const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;

import { productVariantsBulkUpdateQuery } from "../queries/productVariantsBulkUpdate";
import { createVariantSpecs } from "../utilities/specs";

dotenv.config();

const { STORE_ADMIN_PRODUCT_URL } = process.env;

export const update_specs = async (req: Request, res: Response) => {
  try {
    let variants = await allVariants();
    for (const [index, variant] of variants.entries()) {
      let specs = variant.node.metafields.edges.find(
        (meta: any) => meta.node.key == "specifikace"
      );
      if (!specs || !specs.node.value.includes("undefined")) {
        continue;
      }
      if (
        specs.node.value.includes("undefined") &&
        variant.node.sku &&
        variant.node.sku != ""
      ) {
        let matchingApiVariant = await getApiVariant(variant.node.sku);
        if (matchingApiVariant.length == 0) {
          continue;
        }
        let variantSpecs = await createVariantSpecs(matchingApiVariant[0]);
        let specsMetaId = specs.node.id;

        let updatedVariant = await axios
          .post(
            `https://${STORE}/admin/api/${API_VERSION}/graphql.json`,
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
                "X-Shopify-Access-Token": ACCESS_TOKEN!,
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
        await sleep(500);
        console.log(
          index +
            ". " +
            updatedVariant?.data?.productVariantsBulkUpdate?.productVariants[0]
              ?.sku
        );
      }
    }
    res.status(200).json({ message: "Cost EUR updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};