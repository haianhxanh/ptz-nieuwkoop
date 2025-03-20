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
import { order_pickup_notification_sms } from "../controllers/order_pickup_notification_sms";
import { codes_prepopulate } from "../app_gift_cards/codes_prepopulate.controller";
import { gift_card_create } from "../app_gift_cards/gift_card_create.controller";
import { gift_card_update } from "../app_gift_cards/gift_card_update.controller";
import { order_update_ready_for_pickup } from "../controllers/order_update_ready_for_pickup.controller";
import { stores_price_sync } from "../app_stores_sync/stores_price_sync.controller";
const router = express.Router();
interface QueueItem {
  req: Request;
  res: Response;
}
const requestQueue: QueueItem[] = [];
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
router.post("/stores/order-pickup-notification-sms", order_pickup_notification_sms);

// ====================== INVENTORY SYNC ======================
let isProcessingInventorySync = false;
const requestSet = new Set<string>(); // Store unique request identifiers

const generateRequestKey = (req: Request): string => {
  return JSON.stringify(req.body);
};

const processQueueInventorySync = async () => {
  if (isProcessingInventorySync || requestQueue.length === 0) {
    return;
  }
  isProcessingInventorySync = true;

  const { req, res } = requestQueue.shift()!;
  const requestKey = generateRequestKey(req);
  requestSet.delete(requestKey); // Remove from tracking set

  try {
    await stores_inventory_sync_on_inventory_level_update(req, res);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(200).json({ message: "Internal server error" });
  } finally {
    await delay(500);
    isProcessingInventorySync = false;
    processQueueInventorySync();
  }
};

router.post("/stores/inventory-sync", (req: Request, res: Response) => {
  const requestKey = generateRequestKey(req);

  if (!requestSet.has(requestKey)) {
    requestSet.add(requestKey); // Track unique request
    requestQueue.push({ req, res });
    processQueueInventorySync();
  } else {
    return res.status(200).json({ message: "Duplicate request ignored" });
  }
});
// ====================== END INVENTORY SYNC ======================

// ====================== GIFT CARDS ======================
router.get("/giftcard/prepolulate-codes", codes_prepopulate);
router.post("/giftcard/create", gift_card_create);
router.post("/giftcard/update", gift_card_update);
// ====================== END GIFT CARDS ======================

// ====================== ORDER UPATE ======================
router.post("/order/update/ready-for-pickup", order_update_ready_for_pickup);

// ====================== VARIANT PRICE SYNC ======================
router.get("/stores/sync/price", stores_price_sync);

export default router;
