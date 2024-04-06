import {
  createOptionTitle,
  createVariantSpecs,
  extractSizeInTitles,
  isFutureDate,
  updateVariantCost,
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
      let productMetafields: any = [];
      let matchingProduct = await getApiVariant(product[0]);
      let tags = (await getTag(matchingProduct[0].Tags, "Brand")) + ",";
      let collection = await getTag(matchingProduct[0].Tags, "Collection");
      let shape = await getTag(matchingProduct[0].Tags, "Shape");
      let material = await getTag(matchingProduct[0].Tags, "Material");
      let materialProperties = await getTag(
        matchingProduct[0].Tags,
        "MaterialProperties"
      );
      let itemVariety = matchingProduct[0].ItemVariety_EN;

      let color = await getTag(matchingProduct[0].Tags, "ColourPlanter");
      let location = await getTag(matchingProduct[0].Tags, "Location");
      let deliveryTime = matchingProduct[0].DeliveryTimeInDays;

      if (collection) {
        tags += collection + ",";
      }
      if (shape) {
        tags += shape + ",";
      }
      if (material) {
        tags += material + ",";
      }
      if (color) {
        tags += color + ",";
      }
      if (materialProperties) {
        tags += materialProperties + ",";
      }
      if (location) {
        tags += location + ",";
      }
      tags += "Pending approval";

      let productTitle = matchingProduct[0].ItemDescription_EN;
      if (itemVariety) {
        productTitle = productTitle + " " + itemVariety;
      }

      let isVariant = await variantExists(matchingProduct[0].Itemcode);
      if (isVariant) {
        continue;
      }

      if (matchingProduct && matchingProduct.length > 0) {
        let firstVariantInventoryPolicy = "deny";
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
            metafields: [
              {
                key: "available_date",
                value: firstVariantAvailable,
                value_type: "date_time",
                namespace: "custom",
              },
              {
                key: "delivery_time",
                value: deliveryTime,
                value_type: "number_integer",
                namespace: "custom",
              },
            ],
            variants: [
              {
                option1: firstOptionTitle,
                sku: matchingProduct[0].Itemcode,
                price: 0,
                inventory_quantity: firstVariantStock.StockAvailable,
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
                ],
              },
            ],
          },
        };

        if (product.length > 1) {
          for (const [index, variant] of product.entries()) {
            let matchingVariant = await getApiVariant(variant);
            let variantInventoryPolicy = "deny";
            let variantStock = await getVariantStock(
              matchingProduct[0].Itemcode
            );

            let firstVariantAvailable = firstVariantStock.FirstAvailable;

            if (
              variantStock.StockAvailable <= 0 &&
              isFutureDate(firstVariantAvailable)
            ) {
              variantInventoryPolicy = "continue";
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
                price: 0,
                inventory_quantity: variantStock.StockAvailable,
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
              undefined
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
              await sleep(500);
            } catch (error) {
              console.error("App Error getting variant cost:", error);
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
