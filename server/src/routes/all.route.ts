import express, { Request, Response } from "express";
import { auth } from "../utilities/auth";
import { delete_products_from_stores } from "../controllers/delete_products.controller";
import { get_products } from "../controllers/get_products.controller";
import { get_app_metaobject } from "../controllers/get_app_metaobject.controller";
import { update_app_metaobject } from "../controllers/update_app_metaobject.controller";
import { import_products } from "../controllers/import_products.controller";
import { sync_variants } from "../controllers/sync_variants.controller";
import { all_variants } from "../controllers/all_variants.controller";
import { post_order } from "../controllers/post_order.controller";
import { tags } from "../controllers/tags.controller";
import { variant_store_inventory } from "../controllers/variant_store_inventory.controller";
import { update_cost_eur } from "../one_off_functions/update_cost_eur";
import { update_specs } from "../one_off_functions/update_specs";
import { stores_inventory_sync_on_inventory_level_update } from "../app_stores_sync/stores_inventory_sync_on_inventory_level_update.controller";
import { stores_inventory_sync_on_order_update } from "../app_stores_sync/stores_inventory_sync_on_order_update.controller";
const router = express.Router();

router.delete("/delete-products", auth, delete_products_from_stores);
router.get("/get-products", get_products);
router.get("/get-app-metaobject", get_app_metaobject);
router.post("/update-app-metaobject", update_app_metaobject);
router.post("/import-products", import_products);
router.get("/sync-variants", auth, sync_variants);
router.get("/all-variants", all_variants);
router.post("/post-order", auth, post_order);
router.get("/tags", tags);
router.get("/variant-store-inventory", variant_store_inventory);
router.get("/variants/update/cost/eur", update_cost_eur);
router.get("/variants/update/specs", update_specs);

interface QueueItem {
  req: Request;
  res: Response;
}

const requestQueue: QueueItem[] = [];
let isProcessing = false;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const processQueue = async () => {
  if (isProcessing || requestQueue.length === 0) {
    return;
  }

  isProcessing = true;
  const { req, res } = requestQueue.shift()!;

  try {
    await stores_inventory_sync_on_inventory_level_update(req, res);
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    await delay(500);
    isProcessing = false;
    processQueue();
  }
};

router.post("/stores/inventory-sync", (req: Request, res: Response) => {
  requestQueue.push({ req, res });
  processQueue();
});

// router.post(
//   "/stores/order-create/inventory-sync",
//   stores_inventory_sync_on_order_update
// );

export default router;
