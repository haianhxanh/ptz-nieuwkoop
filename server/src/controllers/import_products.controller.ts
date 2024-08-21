import { Request, Response } from "express";
import { promisify } from "util";
const sleep = promisify(setTimeout);
import dotenv from "dotenv";

import {
  createVariantSpecs,
  getTag,
  removeSizeInTitles,
  extractSizeInTitles,
} from "../utilities/specs";

import {
  createOptionTitle,
  createRangeTags,
  isFutureDate,
  updateVariantCost,
  createAiDescription,
  createImages,
  createProduct,
  getApiVariant,
  getVariantStock,
  variantExists,
} from "./../utilities/helper";

dotenv.config();

type Variant = {
  productId: string;
  sku: string;
};

export const import_products = async (req: Request, res: Response) => {
  try {
    let products = req.body;
    let variants = [];
    let today = new Date();

    for (const [index, product] of products.entries()) {
      let newProduct;
      let productMetafields: any = [];
      let matchingProduct = await getApiVariant(product[0]);
      let itemVariety = matchingProduct[0]?.ItemVariety_EN;
      let tags = "";

      for (const tagObj of matchingProduct[0].Tags) {
        const tagValue = await getTag(tagObj);
        if (tagValue) {
          tags += tagValue + ",";
        }
      }

      let firstVariantHeightAndDiameterTag = await createRangeTags(
        matchingProduct[0]
      );
      tags += firstVariantHeightAndDiameterTag + ",";
      tags += "Nieuwkoop ,";
      tags += "Pending approval" + ",";

      let productTitle = matchingProduct[0].ItemDescription_EN;
      if (itemVariety) {
        productTitle = productTitle + " " + itemVariety;
      }

      let isVariant = await variantExists(matchingProduct[0].Itemcode);
      if (isVariant) {
        continue;
      }

      if (matchingProduct && matchingProduct.length > 0) {
        let firstVariantInventoryPolicy = "continue";
        let firstVariantStock = await getVariantStock(
          matchingProduct[0].Itemcode
        );
        let firstVariantAvailable = firstVariantStock.FirstAvailable;
        if (
          firstVariantStock.StockAvailable <= 0 &&
          isFutureDate(firstVariantAvailable)
        ) {
          firstVariantInventoryPolicy = "continue";
        }
        if (
          firstVariantStock.StockAvailable <= 0 &&
          matchingProduct.DeliveryTimeInDays == 999
        ) {
          firstVariantInventoryPolicy = "deny";
        }

        let firstVariantDeliveryTime;
        if (firstVariantStock.StockAvailable > 0) {
          firstVariantDeliveryTime = 7;
        } else {
          if (isFutureDate(firstVariantAvailable)) {
            let futureDate = new Date(firstVariantAvailable);
            // @ts-ignore
            const diffTime = Math.abs(futureDate - today);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            firstVariantDeliveryTime =
              diffDays + 7 + matchingProduct[0].DeliveryTimeInDays;
          } else {
            firstVariantDeliveryTime =
              matchingProduct[0].DeliveryTimeInDays + 7;
          }
        }

        let firstOptionSize = extractSizeInTitles(
          matchingProduct[0].ItemDescription_EN
        );

        let firstOptionTitle = createOptionTitle(
          firstOptionSize,
          matchingProduct[0]
        );

        let firstVariantSpecs = await createVariantSpecs(matchingProduct[0]);

        newProduct = {
          product: {
            title: productTitle,
            vendor: "Potzillas",
            status: "draft",
            giftCard: false,
            tags: tags,
            body_html: "",
            product_type: "",
            options: [
              {
                name: "Velikost",
              },
            ],
            variants: [
              {
                option1: firstOptionTitle,
                sku: matchingProduct[0].Itemcode,
                price: Math.ceil(
                  matchingProduct[0].Salesprice * 26 * 2 * 1.21
                ).toFixed(0),
                inventory_quantity: 0,
                grams: matchingProduct[0].Weight.toFixed(2) * 1000,
                barcode: matchingProduct[0].GTINCode,
                inventory_management: "shopify",
                inventory_policy: firstVariantInventoryPolicy,
                requires_shipping: true,
                metafields: [
                  {
                    key: "specifikace",
                    value: firstVariantSpecs,
                    value_type: "multi_line_text_field",
                    namespace: "custom",
                  },
                  {
                    key: "available_date",
                    value: firstVariantAvailable,
                    value_type: "date_time",
                    namespace: "custom",
                  },
                  {
                    key: "delivery_time",
                    value: firstVariantDeliveryTime,
                    value_type: "number_integer",
                    namespace: "custom",
                  },
                  {
                    key: "inventory_qty",
                    value: firstVariantStock.StockAvailable,
                    value_type: "number_integer",
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
            let variantInventoryPolicy = "continue";
            let variantStock = await getVariantStock(
              matchingVariant[0].Itemcode
            );
            let variantAvailable = variantStock.FirstAvailable;

            let variantHeightAndDiameterTag = await createRangeTags(
              matchingVariant[0]
            );
            newProduct.product.tags += variantHeightAndDiameterTag + ",";

            if (
              variantStock.StockAvailable <= 0 &&
              isFutureDate(variantAvailable)
            ) {
              variantInventoryPolicy = "continue";
            }
            if (
              variantStock.StockAvailable <= 0 &&
              matchingProduct.DeliveryTimeInDays == 999
            ) {
              firstVariantInventoryPolicy = "deny";
            }

            let variantDeliveryTime;

            if (variantStock.StockAvailable > 0) {
              variantDeliveryTime = 7;
            } else {
              if (isFutureDate(variantAvailable)) {
                let futureDate = new Date(variantAvailable);
                // @ts-ignore
                const diffTime = Math.abs(futureDate - today);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                variantDeliveryTime =
                  diffDays + 7 + matchingVariant[0].DeliveryTimeInDays;
              } else {
                variantDeliveryTime = matchingVariant[0].DeliveryTimeInDays + 7;
              }
            }

            let optionSize = extractSizeInTitles(
              matchingVariant[0].ItemDescription_EN
            );

            let optionTitle = createOptionTitle(optionSize, matchingVariant[0]);
            let variantSpecs = await createVariantSpecs(matchingVariant[0]);

            if (index > 0) {
              newProduct.product.variants.push({
                option1: optionTitle,
                sku: matchingVariant[0].Itemcode,
                price: Math.ceil(
                  matchingVariant[0].Salesprice * 26 * 2 * 1.21
                ).toFixed(0),
                inventory_quantity: 0,
                grams: matchingVariant[0].Weight.toFixed(2) * 1000,
                barcode: matchingVariant[0].GTINCode,
                inventory_management: "shopify",
                inventory_policy: variantInventoryPolicy,
                requires_shipping: true,
                metafields: [
                  {
                    key: "specifikace",
                    value: variantSpecs,
                    value_type: "multi_line_text_field",
                    namespace: "custom",
                  },
                  {
                    key: "available_date",
                    value: variantAvailable,
                    value_type: "date_time",
                    namespace: "custom",
                  },
                  {
                    key: "delivery_time",
                    value: variantDeliveryTime,
                    value_type: "number_integer",
                    namespace: "custom",
                  },
                  {
                    key: "inventory_qty",
                    value: variantStock.StockAvailable,
                    value_type: "number_integer",
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
          let productBodyHtml = await createAiDescription(
            newProduct,
            matchingProduct
          );
          if (productBodyHtml) {
            newProduct.product.body_html = productBodyHtml;
          }
        } catch (error) {
          console.error("App Error creating product body html:", error);
        }

        try {
          newProductRes = await createProduct(newProduct);
          sleep(500);
        } catch (error) {
          console.error("App Error creating product:", error);
        }

        if (newProductRes) {
          let newProductId = newProductRes.id;
          try {
            let newImage = await createImages(
              newProductId,
              matchingProduct[0].Itemcode,
              undefined,
              newProductRes.handle
            );
            await sleep(500);
          } catch (error) {
            console.error("App Error creating image:", error);
          }

          for (const variant of newProductRes.variants) {
            try {
              let inventoryItemId = variant.inventory_item_id;
              let apiVariant = await getApiVariant(variant.sku);
              let variantCost = Math.ceil(
                apiVariant[0].Salesprice * 26
              ).toFixed(2);
              let addVariantCost = await updateVariantCost(
                inventoryItemId,
                variantCost
              );
              let variantObj = {
                productId: newProductId,
                sku: variant.sku,
              };
              variants.push(variantObj);
              await sleep(500);
            } catch (error) {
              console.error("App Error getting variant cost:", error);
            }
          }
        }
      }
    }

    return res.status(200).json({
      variants: variants,
      message: "Products imported successfully",
      time: new Date().toLocaleString(),
    });
  } catch (error) {
    console.error("Error downloading products:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
