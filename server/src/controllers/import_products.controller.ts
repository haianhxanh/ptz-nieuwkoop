import { Request, Response } from "express";
import { promisify } from "util";
const sleep = promisify(setTimeout);
import dotenv from "dotenv";
import axios from "axios";

import { createVariantSpecs, getTag, extractSizeInTitles } from "../utilities/specs";

import {
  createOptionTitle,
  createRangeTags,
  isFutureDate,
  createAiDescription,
  createProduct,
  getApiVariant,
  getVariantStock,
  variantExists,
  shopifyClient,
  createVariantImage,
} from "./../utilities/helper";
import { productVariantsBulkCreate, tagsAdd, variantsQuery } from "../app_stores_sync/queries";
import { productVariantsBulkCreateMutation } from "../queries/productVariantsBulkCreateMutation";
import { productVariantsBulkDeleteMutation } from "../queries/productVariantsBulkDelete";

dotenv.config();

/*-------------------------------------MAIN FUNCTION-----------------------------------------------*/
// From FE, receive products array consisting of array of variant SKUs

// Finally, update product tags with tagsAdd and metafields

// TODO: Check existing product and variants and add missing variants
/*-----------------------------------END MAIN FUNCTION---------------------------------------------*/

const { PTZ_STORE_LOCATION_ID, SLACK_WEBHOOK_URL, SLACK_DEVELOPER_WEBHOOK_URL } = process.env;

export const import_products = async (req: Request, res: Response) => {
  try {
    const products = req.body;
    const today = new Date();

    for (const [index, product] of products.entries()) {
      let newProduct: any = {
        product: {},
        media: [],
        variants: [],
      } as any;
      let existingProduct;
      const matchingProduct = await getApiVariant(product[0]);
      const itemVariety = matchingProduct?.ItemVariety_EN;
      const productTitle = itemVariety ? matchingProduct.ItemDescription_EN + " " + itemVariety : matchingProduct.ItemDescription_EN;
      let tags = "Nieuwkoop, Pending approval,";
      if (matchingProduct?.Tags) {
        for (const tagObj of matchingProduct.Tags) {
          const tagValue = await getTag(tagObj);
          if (tagValue) {
            tags += tagValue + ",";
          }
        }
      }

      for (const [index, variantSku] of product.entries()) {
        const isVariant = await variantExists(variantSku);
        if (isVariant) {
          const existingVariant = await shopifyClient.request(variantsQuery, {
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
        // If no product in Shopify, create the product
        if (matchingProduct) {
          const productMetafields = createProductMetafields(matchingProduct);

          // Loop through all variants and create objects
          if (product.length > 0) {
            for (const [index, variantSku] of product.entries()) {
              const matchingVariant = await getApiVariant(variantSku);
              const variantObject = await createVariantObject(variantSku);
              const variantRangeTags = await createRangeTags(matchingVariant);
              newProduct.variants.push(variantObject);
              if (variantRangeTags) {
                tags += variantRangeTags + ",";
              }
              await sleep(500);
            }
          }

          // Get image from API
          const variantImageUrl = await createVariantImage(product[0]);
          if (variantImageUrl) {
            newProduct.media.push({
              alt: `${matchingProduct.ItemDescription_EN} ${matchingProduct.ItemVariety_EN} ${product[0]}`,
              originalSource: variantImageUrl,
              mediaContentType: "IMAGE",
            });
          }

          // Finally, create the product object
          newProduct.product = createProductObject(productTitle, tags, productMetafields);
        }
      } else {
        // TODO
        // if there's an existing product, update the inventory quantity
        for (const [index, variantSku] of product.entries()) {
          const existingVariant = await shopifyClient.request(variantsQuery, {
            query: `sku:${variantSku}`,
          });
          if (existingVariant?.productVariants?.edges.length > 0) continue;

          // Create object for the new variant
          const matchingVariant = await getApiVariant(variantSku);
          const variantObject = await createVariantObject(variantSku);
          const variantRangeTags = await createRangeTags(matchingVariant);
          existingProduct.product.tags += variantRangeTags + ",";
          existingProduct.product.variants.push(variantObject);
          await sleep(500);
        }
      }

      if (newProduct && newProduct.product && Object.keys(newProduct.product).length > 0) {
        let newProductRes;
        try {
          const productBodyHtml = await createAiDescription(newProduct, matchingProduct);
          if (productBodyHtml) {
            newProduct.product.descriptionHtml = productBodyHtml;
          }
        } catch (error) {
          const errorMessage = (error as any)?.response?.data?.error?.message;
          if (errorMessage) {
            const errorMessageNotification = `Error creating product AI description: ${errorMessage}`;
            console.error(errorMessageNotification);
            sendErrorNotification(errorMessageNotification);
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
          // create the variants and remove the first default variant
          await shopifyClient.request(productVariantsBulkCreateMutation, {
            productId: newProductId,
            variants: newProduct.variants,
          });

          // cleanup default variant with Default Variant
          const defaultVariantId = newProductRes.variants?.edges?.find((variant: any) => variant.node.title === "Default Variant")?.node?.id;
          await shopifyClient.request(productVariantsBulkDeleteMutation, {
            productId: newProductId,
            variantsIds: [defaultVariantId],
          });
        }
      }

      if (existingProduct && Object.keys(existingProduct.product).length > 0) {
        try {
          const productVariantsCreate = await shopifyClient.request(productVariantsBulkCreate, {
            productId: existingProduct.product.id,
            variants: existingProduct.product.variants,
          });

          if (productVariantsCreate?.productVariantsBulkCreate?.userErrors?.length > 0) {
            const errorMessage = `Error creating product variants (422): ${JSON.stringify(productVariantsCreate.productVariantsBulkCreate.userErrors)}`;
            console.error(errorMessage);
            sendErrorNotification(errorMessage);
          }
        } catch (error: any) {
          const errorData = error?.response?.data || error?.data || error;
          const errorStatus = error?.response?.status || error?.status;
          const errorMessage = `Error creating product variants (${errorStatus || 422}): ${JSON.stringify(errorData)}`;
          console.error(errorMessage);
          console.error("Full error object:", error);
          sendErrorNotification(errorMessage);
        }

        try {
          const tagsAdded = await shopifyClient.request(tagsAdd, {
            id: existingProduct.product.id,
            tags: existingProduct.product.tags,
          });

          if (tagsAdded?.tagsAdd?.userErrors?.length > 0) {
            const errorMessage = `Error adding tags (422): ${JSON.stringify(tagsAdded.tagsAdd.userErrors)}`;
            console.error(errorMessage);
            sendErrorNotification(errorMessage);
          }
        } catch (error: any) {
          const errorData = error?.response?.data || error?.data || error;
          const errorStatus = error?.response?.status || error?.status;
          const errorMessage = `Error adding tags (${errorStatus || 422}): ${JSON.stringify(errorData)}`;
          console.error(errorMessage);
          console.error("Full error object:", error);
          sendErrorNotification(errorMessage);
        }

        await sleep(300);
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

function createProductMetafields(matchingProduct: any) {
  const productMetafields = [];
  const hasDrainageHole = matchingProduct?.Tags.find((tag: any) => tag.Code == "MaterialProperties")?.Values?.find((value: any) =>
    value.Description_EN.includes("With drainage hole")
  )
    ? true
    : false;

  if (hasDrainageHole) {
    productMetafields.push({
      namespace: "custom",
      type: "boolean",
      key: "drainage_hole",
      value: "true",
    });
  }
  return productMetafields;
}

function calculateVariantDeliveryTime(variantStock: any, matchingProduct: any) {
  let deliveryTime;
  if (variantStock.StockAvailable > 0) {
    deliveryTime = 7;
  } else {
    if (isFutureDate(variantStock.FirstAvailable)) {
      const futureDate = new Date(variantStock.FirstAvailable);
      // @ts-ignore
      const diffTime = Math.abs(futureDate - new Date());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      deliveryTime = diffDays + 7 + matchingProduct.DeliveryTimeInDays;
    } else {
      deliveryTime = matchingProduct.DeliveryTimeInDays + 7;
    }
  }
  return deliveryTime;
}

async function setVariantInventoryPolicy(variantSku: string) {
  const matchingVariant = await getApiVariant(variantSku);
  const variantStock = await getVariantStock(variantSku);
  if (variantStock.StockAvailable <= 0 && isFutureDate(variantStock.FirstAvailable)) {
    return "CONTINUE";
  }
  if (variantStock.StockAvailable <= 0 && matchingVariant.DeliveryTimeInDays == 999) {
    return "DENY";
  }
  return "CONTINUE";
}

async function createVariantObject(variantSku: string) {
  const matchingVariant = await getApiVariant(variantSku);
  const variantStock = await getVariantStock(variantSku);
  const optionSize = extractSizeInTitles(matchingVariant.ItemDescription_EN);
  const optionTitle = createOptionTitle(optionSize, matchingVariant);
  const variantSpecs = await createVariantSpecs(matchingVariant);
  const variantDeliveryTime = calculateVariantDeliveryTime(variantStock, matchingVariant);
  const variant = {
    barcode: matchingVariant.GTINCode,
    inventoryItem: {
      cost: Math.ceil(matchingVariant.Salesprice * 26).toFixed(2),
      measurement: {
        weight: {
          unit: "KILOGRAMS",
          value: parseFloat(matchingVariant.Weight.toFixed(2)),
        },
      },
      requiresShipping: true,
      sku: variantSku,
      tracked: true,
    },
    inventoryPolicy: await setVariantInventoryPolicy(variantSku),
    metafields: [
      {
        key: "specifikace",
        value: variantSpecs,
        type: "multi_line_text_field",
        namespace: "custom",
      },
      {
        key: "available_date",
        value: variantStock.FirstAvailable.toString(),
        type: "date_time",
        namespace: "custom",
      },
      {
        key: "delivery_time",
        value: variantDeliveryTime.toString(),
        type: "number_integer",
        namespace: "custom",
      },
      {
        key: "inventory_qty",
        value: variantStock.StockAvailable.toString(),
        type: "number_integer",
        namespace: "custom",
      },
      {
        key: "cost_eur",
        value: matchingVariant.Salesprice.toString(),
        type: "number_decimal",
        namespace: "custom",
      },
    ],
    optionValues: [
      {
        name: optionTitle,
        optionName: "Velikost",
      },
    ],
    price: Math.ceil(matchingVariant.Salesprice * 26 * 2 * 1.21).toFixed(0),
  };
  return variant;
}

const createProductObject = (productTitle: string, tags: string, productMetafields: any) => {
  const productObject = {
    title: productTitle,
    vendor: "Potzillas",
    status: "DRAFT",
    giftCard: false,
    tags: tags,
    descriptionHtml: "",
    metafields: productMetafields,
    productOptions: [
      {
        name: "Velikost",
        values: [{ name: "Default Variant" }],
      },
    ],
  };
  return productObject;
};

const sendErrorNotification = (errorMessage: string) => {
  axios.post(SLACK_WEBHOOK_URL || "", errorMessage);
  axios.post(SLACK_DEVELOPER_WEBHOOK_URL || "", errorMessage);
};
