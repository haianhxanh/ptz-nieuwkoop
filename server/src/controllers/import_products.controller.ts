import {
  createOptionTitle,
  createVariantSpecs,
  extractSizeInTitles,
} from "./../utilities/helper";
import { Request, Response } from "express";
import { promisify } from "util";
const sleep = promisify(setTimeout);
import dotenv from "dotenv";

import {
  createAiDescription,
  createImages,
  createProduct,
  getApiVariant,
  getTag,
  getVariantStock,
  removeSizeInTitles,
  variantExists,
} from "../utilities/helper";

dotenv.config();

export const import_products = async (req: Request, res: Response) => {
  try {
    let products = req.body;
    // console.log("Products:", products);

    for (const [index, product] of products.entries()) {
      let newProduct;
      let matchingProduct = await getApiVariant(product[0]);

      let tags = (await getTag(matchingProduct[0].Tags, "Brand")) + ",";
      tags += (await getTag(matchingProduct[0].Tags, "Collection")) + ",";
      tags += (await getTag(matchingProduct[0].Tags, "Shape")) + ",";
      tags += "Pending approval";

      let isVariant = await variantExists(matchingProduct[0].Itemcode);
      if (isVariant) {
        continue;
      }

      if (matchingProduct && matchingProduct.length > 0) {
        let firstVariantStock = await getVariantStock(
          matchingProduct[0].Itemcode
        );
        let firstOptionSize = extractSizeInTitles(
          matchingProduct[0].ItemDescription_EN
        );

        let firstOptionTitle = createOptionTitle(
          firstOptionSize,
          matchingProduct[0]
        );

        newProduct = {
          product: {
            title: removeSizeInTitles(matchingProduct[0].ItemDescription_EN),
            vendor: await getTag(matchingProduct[0].Tags, "Brand"),
            status: "draft",
            giftCard: false,
            tags: tags,
            body_html: "",
            variants: [
              {
                option1: firstOptionTitle,
                sku: matchingProduct[0].Itemcode,
                price: Math.ceil(matchingProduct[0].Salesprice * 26).toFixed(2),
                inventory_quantity: firstVariantStock,
                grams: matchingProduct[0].Weight * 1000,
                barcode: matchingProduct[0].GTINCode,
                inventory_management: "shopify",
                inventory_policy: "deny",
                requires_shipping: true,
                metafields: [
                  {
                    key: "specifikace",
                    value: createVariantSpecs(matchingProduct[0]),
                    value_type: "multi_line_text_field",
                    namespace: "custom",
                  },
                ],
              },
            ],
          },
        };

        if (product.length > 1) {
          for (const [index, variant] of product.entries()) {
            let matchingVariant = await getApiVariant(variant);
            // console.log("Matching variant:", matchingVariant);

            let variantStock = await getVariantStock(
              matchingVariant[0].Itemcode
            );

            let optionSize = extractSizeInTitles(
              matchingVariant[0].ItemDescription_EN
            );

            let optionTitle = createOptionTitle(optionSize, matchingVariant[0]);

            if (index > 0) {
              newProduct.product.variants.push({
                option1: optionTitle,
                sku: matchingVariant[0].Itemcode,
                price: Math.ceil(matchingVariant[0].Salesprice * 26).toFixed(2),
                inventory_quantity: variantStock,
                grams: matchingVariant[0].Weight * 1000,
                barcode: matchingVariant[0].GTINCode,
                inventory_management: "shopify",
                inventory_policy: "deny",
                requires_shipping: true,
                metafields: [
                  {
                    key: "specifikace",
                    value: createVariantSpecs(matchingVariant[0]),
                    value_type: "multi_line_text_field",
                    namespace: "custom",
                  },
                ],
              });
            }
            sleep(500);
          }
        }
      }

      if (newProduct) {
        let newProductRes;
        try {
          let productBodyHtml = await createAiDescription(newProduct);
          if (productBodyHtml) {
            newProduct.product.body_html = productBodyHtml;
          }
        } catch (error) {
          console.error("Error creating product body html:", error);
        }

        try {
          newProductRes = await createProduct(newProduct);
          sleep(500);
        } catch (error) {
          console.error("Error creating product:", error);
        }

        if (newProductRes) {
          let newProductId = newProductRes.id;
          for (const variant of newProductRes.variants) {
            try {
              let newImage = await createImages(newProductId, variant);
              await sleep(500);
            } catch (error) {
              console.error("Error creating image for variant:", error);
            }
          }
        }
      }
    }

    return res.status(200).json({
      message: "Products imported successfully",
      time: new Date().toLocaleString(),
    });
  } catch (error) {
    console.error("Error downloading products:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
