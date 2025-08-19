import { Request, Response } from "express";
import { promisify } from "util";
const sleep = promisify(setTimeout);
import dotenv from "dotenv";

import { createVariantSpecs, getTag, extractSizeInTitles } from "../utilities/specs";

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
  shopifyClient,
} from "./../utilities/helper";
import { productVariantsBulkCreate, tagsAdd, variantsQuery } from "../app_stores_sync/queries";
import axios from "axios";

dotenv.config();

type Variant = {
  productId: string;
  sku: string;
};

const { PTZ_STORE_LOCATION_ID, SLACK_WEBHOOK_URL, SLACK_DEVELOPER_WEBHOOK_URL } = process.env;

export const import_products = async (req: Request, res: Response) => {
  try {
    let products = req.body;
    let variants = [];
    let today = new Date();

    products = [
      ["6ACPW0503", "6ACPW0505"],
      ["6ACPW0506", "6ACPW0507", "6ACPW0508"],
    ];

    for (const [index, product] of products.entries()) {
      let newProduct;
      let existingProduct;
      let matchingProduct = await getApiVariant(product[0]);
      let itemVariety = matchingProduct?.ItemVariety_EN;
      let tags = ",";

      if (matchingProduct?.Tags) {
        for (const tagObj of matchingProduct.Tags) {
          const tagValue = await getTag(tagObj);
          if (tagValue) {
            tags += tagValue + ",";
          }
        }
      }

      let firstVariantHeightAndDiameterTag = await createRangeTags(matchingProduct);
      tags += firstVariantHeightAndDiameterTag + ",";
      tags += "Nieuwkoop ,";
      tags += "Pending approval" + ",";

      let productTitle = matchingProduct.ItemDescription_EN;
      if (itemVariety) {
        productTitle = productTitle + " " + itemVariety;
      }

      for (const [index, variantSku] of product.entries()) {
        let isVariant = await variantExists(variantSku);
        if (isVariant) {
          let existingVariant = await shopifyClient.request(variantsQuery, {
            query: `sku:${variantSku}`,
          });
          if (existingVariant?.productVariants?.edges.length > 0 && existingVariant?.productVariants?.edges[0]?.node?.product) {
            existingProduct = {
              product: existingVariant.productVariants.edges[0].node.product,
            };
            existingProduct.product.variants = [];
          }
        }
      }

      if (!existingProduct) {
        if (matchingProduct) {
          let firstVariantInventoryPolicy = "continue";
          let firstVariantStock = await getVariantStock(matchingProduct.Itemcode);
          let firstVariantAvailable = firstVariantStock.FirstAvailable;
          if (firstVariantStock.StockAvailable <= 0 && isFutureDate(firstVariantAvailable)) {
            firstVariantInventoryPolicy = "continue";
          }
          if (firstVariantStock.StockAvailable <= 0 && matchingProduct.DeliveryTimeInDays == 999) {
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
              firstVariantDeliveryTime = diffDays + 7 + matchingProduct.DeliveryTimeInDays;
            } else {
              firstVariantDeliveryTime = matchingProduct.DeliveryTimeInDays + 7;
            }
          }

          let firstOptionSize = extractSizeInTitles(matchingProduct.ItemDescription_EN);

          let firstOptionTitle = createOptionTitle(firstOptionSize, matchingProduct);

          let firstVariantSpecs = await createVariantSpecs(matchingProduct);

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
                  sku: matchingProduct.Itemcode,
                  price: Math.ceil(matchingProduct.Salesprice * 26 * 2 * 1.21).toFixed(0),
                  inventory_quantity: 0,
                  grams: matchingProduct.Weight.toFixed(2) * 1000,
                  barcode: matchingProduct.GTINCode,
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
                    {
                      key: "cost_eur",
                      value: matchingProduct.Salesprice,
                      value_type: "number_decimal",
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
              let variantStock = await getVariantStock(matchingVariant.Itemcode);
              let variantAvailable = variantStock.FirstAvailable;

              let variantHeightAndDiameterTag = await createRangeTags(matchingVariant);
              newProduct.product.tags += variantHeightAndDiameterTag + ",";

              if (variantStock.StockAvailable <= 0 && isFutureDate(variantAvailable)) {
                variantInventoryPolicy = "continue";
              }
              if (variantStock.StockAvailable <= 0 && matchingProduct.DeliveryTimeInDays == 999) {
                variantInventoryPolicy = "deny";
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
                  variantDeliveryTime = diffDays + 7 + matchingVariant.DeliveryTimeInDays;
                } else {
                  variantDeliveryTime = matchingVariant.DeliveryTimeInDays + 7;
                }
              }

              let optionSize = extractSizeInTitles(matchingVariant.ItemDescription_EN);

              let optionTitle = createOptionTitle(optionSize, matchingVariant);
              let variantSpecs = await createVariantSpecs(matchingVariant);

              if (index > 0) {
                const assembledVariant = assembleVariant(
                  optionTitle,
                  matchingVariant,
                  variantInventoryPolicy,
                  variantSpecs,
                  variantAvailable,
                  variantDeliveryTime,
                  variantStock
                );
                newProduct.product.variants.push(assembledVariant);
              }
              await sleep(500);
            }
          }
        }
      } else {
        // if there's an existing product, update the inventory quantity
        for (const [index, variant] of product.entries()) {
          const existingVariant = await shopifyClient.request(variantsQuery, {
            query: `sku:${variant}`,
          });
          if (existingVariant?.productVariants?.edges.length > 0) continue;

          let matchingVariant = await getApiVariant(variant);
          let variantInventoryPolicy = "continue";
          let variantStock = await getVariantStock(matchingVariant.Itemcode);
          let variantAvailable = variantStock.FirstAvailable;

          let variantHeightAndDiameterTag = await createRangeTags(matchingVariant);

          existingProduct.product.tags += variantHeightAndDiameterTag + ",";

          if (variantStock.StockAvailable <= 0 && isFutureDate(variantAvailable)) {
            variantInventoryPolicy = "continue";
          }
          if (variantStock.StockAvailable <= 0 && matchingProduct.DeliveryTimeInDays == 999) {
            variantInventoryPolicy = "deny";
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
              variantDeliveryTime = diffDays + 7 + matchingVariant.DeliveryTimeInDays;
            } else {
              variantDeliveryTime = matchingVariant.DeliveryTimeInDays + 7;
            }
          }

          let optionSize = extractSizeInTitles(matchingVariant.ItemDescription_EN);

          let optionTitle = createOptionTitle(optionSize, matchingVariant);
          let variantSpecs = await createVariantSpecs(matchingVariant);

          const assembledVariant = assembleVariant(
            optionTitle,
            matchingVariant,
            variantInventoryPolicy,
            variantSpecs,
            variantAvailable,
            variantDeliveryTime,
            variantStock
          );
          existingProduct.product.variants.push(assembledVariant);

          await sleep(500);
        }
      }

      if (newProduct) {
        let newProductRes;
        try {
          let productBodyHtml = await createAiDescription(newProduct, matchingProduct);
          if (productBodyHtml) {
            newProduct.product.body_html = productBodyHtml;
          }
        } catch (error) {
          const errorMessage = (error as any)?.response?.data?.error?.message;
          if (errorMessage) {
            const errorMessageNotification = `Error creating product AI description: ${errorMessage}`;
            console.error(errorMessageNotification);
            const slackMessage = await axios.post(SLACK_WEBHOOK_URL || "", errorMessageNotification);
            const devSlackMessage = await axios.post(SLACK_DEVELOPER_WEBHOOK_URL || "", errorMessageNotification);
          }
        }

        try {
          newProductRes = await createProduct(newProduct);
          await sleep(500);
        } catch (error) {
          console.error("App Error creating product:", error);
        }

        if (newProductRes) {
          let newProductId = newProductRes.id;
          try {
            let newImage = await createImages(newProductId, matchingProduct.Itemcode, undefined, newProductRes.handle);
            await sleep(500);
          } catch (error) {
            console.error("App Error creating image:", error);
          }

          for (const variant of newProductRes.variants) {
            try {
              let inventoryItemId = variant.inventory_item_id;
              let apiVariant = await getApiVariant(variant.sku);
              let variantCost = Math.ceil(apiVariant.Salesprice * 26).toFixed(2);
              let addVariantCost = await updateVariantCost(inventoryItemId, variantCost);
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

      if (existingProduct) {
        const productVariantsCreate = await shopifyClient.request(productVariantsBulkCreate, {
          productId: existingProduct.product.id,
          variants: existingProduct.product.variants.map((variant: any) => {
            return {
              price: variant.price,
              inventoryPolicy: variant.inventory_policy.toUpperCase(),
              inventoryQuantities: {
                availableQuantity: variant.inventory_quantity,
                locationId: "gid://shopify/Location/" + PTZ_STORE_LOCATION_ID,
              },
              inventoryItem: {
                sku: variant.sku,
                cost: variant.metafields.find((metafield: any) => metafield.key === "cost_eur").value * 26,
                requiresShipping: variant.requires_shipping,
                measurement: {
                  weight: {
                    value: variant.grams,
                    unit: "GRAMS",
                  },
                },
              },
              barcode: variant.barcode,
              metafields: variant.metafields.map((metafield: any) => {
                if (metafield.value !== null) {
                  return {
                    key: metafield.key,
                    value: metafield.value.toString(),
                    type: metafield.value_type,
                    namespace: metafield.namespace,
                  };
                }
              }),
              optionValues: [
                {
                  name: variant.option1,
                  optionId: existingProduct?.product?.options[0]?.id,
                },
              ],
            };
          }),
        });

        const tagsAdded = await shopifyClient.request(tagsAdd, {
          id: existingProduct.product.id,
          tags: existingProduct.product.tags,
        });

        await sleep(300);
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

function assembleVariant(
  optionTitle: string,
  matchingVariant: any,
  variantInventoryPolicy: string,
  variantSpecs: string,
  variantAvailable: string,
  variantDeliveryTime: number,
  variantStock: any
) {
  const variant = {
    option1: optionTitle,
    sku: matchingVariant.Itemcode,
    price: Math.ceil(matchingVariant.Salesprice * 26 * 2 * 1.21).toFixed(0),
    inventory_quantity: 0,
    grams: matchingVariant.Weight.toFixed(2) * 1000,
    barcode: matchingVariant.GTINCode,
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
      {
        key: "cost_eur",
        value: matchingVariant.Salesprice,
        value_type: "number_decimal",
        namespace: "custom",
      },
    ],
  };
  return variant;
}
