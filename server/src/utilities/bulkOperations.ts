import { queryCurrentBulkOperation } from "../queries/bulkOperations";
import { shopifyClient } from "./helper";

export async function initiateShopifyBulkOperation(query: string) {
  const response = await shopifyClient.request(query);
  if (response.data?.bulkOperationRunQuery?.userErrors?.length > 0) {
    throw new Error(`Shopify bulk operation errors: ${JSON.stringify(response.data.bulkOperationRunQuery.userErrors)}`);
  }
  return response.data?.bulkOperationRunQuery?.bulkOperation?.id;
}

export async function checkBulkOperationStatus() {
  const response = await shopifyClient.request(queryCurrentBulkOperation);
  if (response?.errorCode) {
    throw new Error(`Shopify bulk operation errors: ${JSON.stringify(response.data.errorCode)}`);
  }
  return response.currentBulkOperation;
}

export async function downloadBulkResults(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download Shopify bulk results: ${response.status} ${response.statusText}`);
  }
  const jsonlData = await response.text();
  const lines = jsonlData.trim().split("\n");
  const shopifyItems = lines.map((line) => JSON.parse(line));

  return shopifyItems;
}

export async function mapVariantsData(objects: any[]) {
  const variantsData = [];
  for (const object of objects) {
    if (object.id && object.id.includes("gid://shopify/ProductVariant/")) {
      const variantMetafields = objects.filter((variant) => variant.__parentId === object.id);
      const variant = {
        id: object.id,
        sku: object.sku,
        price: object.price,
        compareAtPrice: object.compareAtPrice,
        title: object.title,
        product: object.product,
        inventoryItem: object.inventoryItem,
        metafields: variantMetafields,
      };
      variantsData.push(variant);
    }
  }
  return variantsData;
}

export async function mapProductsData(objects: any[]) {
  const productsData = [];
  for (const object of objects) {
    if (object.id && object.id.includes("gid://shopify/Product/")) {
      const variants = objects.filter((variant) => variant.__parentId === object.id);
      const variantsData = [];
      if (variants.length > 0) {
        for (const variant of variants) {
          const variantMetafields = objects.filter((meta) => meta.__parentId === variant.id);
          const variantData = {
            id: variant.id,
            sku: variant.sku,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            inventoryItem: variant.inventoryItem,
            metafields: variantMetafields,
          };
          variantsData.push(variantData);
        }
      }
      const product = {
        id: object.id,
        tags: object.tags,
        status: object.status,
        variants: variantsData,
        nieuwkoop_last_inventory_sync: object.metafield?.value ? new Date(object.metafield?.value) : "2000-01-01T00:00:00.000Z",
      };
      productsData.push(product);
    }
  }
  return productsData;
}
