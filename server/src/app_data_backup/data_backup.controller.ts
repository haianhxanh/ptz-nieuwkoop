// Metafields
import { Request, Response } from "express";
import { promisify } from "util";
const sleep = promisify(setTimeout);
import dotenv from "dotenv";
import { initiateShopifyBulkOperation, checkBulkOperationStatus, downloadBulkResults } from "../utilities/bulkOperations";
import { bulkQueryGetProductsForBackup } from "./queries/products";
import { get_store } from "../app_stores_sync/utils";
import { GraphQLClient } from "graphql-request";
import ExcelJS from "exceljs";
dotenv.config();

const API_VERSION = "2025-04";

const { DMP_STORE_URL } = process.env;

export const export_products_backup = async (req: Request, res: Response) => {
  try {
    const storeHandle = req.query.storeHandle as string;
    const store = get_store(storeHandle);
    if (!storeHandle) {
      return res.status(400).json({ message: "Missing storeHandle" });
    }
    if (!store) {
      return res.status(400).json({ message: `Store not found for storeHandle: ${storeHandle}` });
    }

    // const bulkOperationUrl = await getBulkOperationUrl(store);

    const shopifyClient = new GraphQLClient(`https://${store.storeUrl}/admin/api/${API_VERSION}/graphql.json`, {
      // @ts-ignore
      headers: {
        "X-Shopify-Access-Token": store.accessToken,
      },
    });

    const currentBulkOperation = await checkBulkOperationStatus(shopifyClient);
    const bulkOperationUrl = currentBulkOperation.url;
    const productsData = await downloadBulkResults(bulkOperationUrl);
    const products = mapProductsData(productsData);

    try {
      const date = new Date().toISOString().split("T")[0];
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(date);
      addDataToSheet(store, worksheet, products);
      await workbook.xlsx.writeFile(`./${storeHandle}_${date}_products_backup.xlsx`);
      return res.status(200).json({ message: `Backup on ${date} exported for ${storeHandle}` });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error generating worksheet" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error exporting products backup" });
  }
};

const mapProductsData = (productsData: any) => {
  return productsData
    .map((product: any) => {
      const variants = productsData.filter((variant: any) => variant.__parentId === product.id);
      const variantsData = variants.map((variant: any) => {
        const variantMetafields = productsData.filter(
          (metafield: any) => metafield.id.includes("gid://shopify/Metafield/") && metafield.__parentId === variant.id
        );
        return {
          id: variant.id,
          sku: variant.sku,
          price: variant.price,
          metafields: variantMetafields,
          image: variant.image,
        };
      });
      const productMetafields = productsData.filter(
        (metafield: any) => metafield.id.includes("gid://shopify/Metafield/") && metafield.__parentId === product.id
      );

      if (product.id.includes("gid://shopify/Product/")) {
        if (product.metafield) {
          productMetafields.push(product.metafield);
        }
        return {
          id: product.id,
          handle: product.handle,
          title: product.title,
          descriptionHtml: product.descriptionHtml,
          vendor: product.vendor,
          productType: product.productType,
          tags: product.tags,
          status: product.status,
          metafields: productMetafields,
          variants: variantsData,
        };
      }
    })
    ?.filter((product: any) => product?.id);
};

const getBulkOperationUrl = async (store: any) => {
  try {
    const shopifyClient = new GraphQLClient(`https://${store.storeUrl}/admin/api/${API_VERSION}/graphql.json`, {
      // @ts-ignore
      headers: {
        "X-Shopify-Access-Token": store.accessToken,
      },
    });

    let bulkOperation: any;
    let isCompleted = false;
    await initiateShopifyBulkOperation(shopifyClient, bulkQueryGetProductsForBackup);
    while (!isCompleted) {
      bulkOperation = await checkBulkOperationStatus(shopifyClient);
      if (bulkOperation?.status === "COMPLETED") {
        isCompleted = true;
      } else if (["FAILED", "CANCELLED"].includes(bulkOperation.status)) {
        throw new Error(`Bulk operation ${bulkOperation.status}: ${bulkOperation.errorCode || "Unknown error"}`);
      } else {
        // Check every 5 seconds
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
    return bulkOperation.url;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const addDataToSheet = (worksheet: any, data: any) => {
  worksheet.addRow([
    "ID",
    "Handle",
    "Title",
    "Body (HTML)",
    "Vendor",
    "Product Type",
    "Tags",
    "Status",
    "Option 1 Name",
    "Option 1 Value",
    "Option 2 Name",
    "Option 2 Value",
    "Option 3 Name",
    "Option 3 Value",
    "Sku",
    "Variant Grams",
    "Variant Price",
    "Variant Compare At Price",
    "Variant Barcode",
    "Image Src",
    "Cost per item",
    "Status",
  ]);
  for (const [index, product] of data.entries()) {
    for (const [variantIndex, variant] of product.variants.entries()) {
      if (variantIndex === 0) {
        worksheet.addRow([
          product.id,
          product.handle,
          product.title,
          product.descriptionHtml,
          product.vendor,
          product.productType,
          product.tags,
          product.status,
        ]);
      }
    }
  }
};
