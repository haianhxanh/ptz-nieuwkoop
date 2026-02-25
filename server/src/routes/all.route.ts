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
import { sync_variants_bulk } from "../controllers/sync_variants_bulk.controller";
import { export_daily_sales } from "../app_data_analytics/export_daily_sales.controller";
import { migrate_tags_to_metafields } from "../data_management/migrate_tags_to_metafields.controller";
const router = express.Router();
interface QueueItem {
  req: Request;
  res: Response;
  timestamp: number;
}
const requestQueue: QueueItem[] = [];
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

router.delete("/delete-products", auth, delete_products_from_stores);
router.get("/get-products", get_products);
router.get("/get-app-metaobject", get_app_metaobject);
router.post("/update-app-metaobject", update_app_metaobject);
router.post("/import-products", import_products);
router.get("/sync-variants", auth, sync_variants);
router.get("/sync-variants-bulk", sync_variants_bulk);
router.get("/all-variants", all_variants);
router.post("/post-order", auth, post_order);
router.get("/tags", tags);
router.get("/variant-store-inventory", variant_store_inventory);
router.get("/variants/update/cost/eur", update_cost_eur);
router.get("/variants/update/specs", update_specs);
router.post("/stores/order-pickup-notification-sms", order_pickup_notification_sms);

// ====================== INVENTORY SYNC ======================
const MAX_REQUEST_AGE_MS = 3 * 60 * 1000;
let isProcessingInventorySync = false;
const requestSet = new Set<string>(); // Store unique request identifiers

const generateRequestKey = (req: Request): string => {
  return JSON.stringify(req.body);
};

const processQueueInventorySync = async (): Promise<any> => {
  if (isProcessingInventorySync || requestQueue.length === 0) {
    return;
  }
  const currentTime = Date.now();
  const { req, res, timestamp } = requestQueue.shift()!;
  const requestKey = generateRequestKey(req);
  requestSet.delete(requestKey); // Remove from tracking set

  if (!timestamp || currentTime - timestamp > MAX_REQUEST_AGE_MS) {
    console.warn("Skipping outdated or invalid request");
    return processQueueInventorySync();
  }
  isProcessingInventorySync = true;

  try {
    await stores_inventory_sync_on_inventory_level_update(req, res);
  } catch (error) {
    console.error("Error processing request:", error);
    if (!res.headersSent) {
      return res.status(200).json({ message: "Internal server error" });
    }
  } finally {
    await delay(500);
    isProcessingInventorySync = false;
    processQueueInventorySync();
  }
  if (!res.headersSent) {
    res.status(200).json({ message: "Inventory sync processed" });
  }
};

router.post("/stores/inventory-sync", (req: Request, res: Response) => {
  const requestKey = generateRequestKey(req);
  const timestamp = Date.now();

  if (!requestSet.has(requestKey)) {
    requestSet.add(requestKey); // Track unique request
    requestQueue.push({ req, res, timestamp });
    processQueueInventorySync();
  } else {
    return res.status(200).json({ message: "Duplicate request ignored" });
  }
});
// ====================== END INVENTORY SYNC ======================

// ====================== GIFT CARD WEBHOOK ======================
// Store processed event IDs in memory to prevent duplicate processing
const processedEventIds = new Set<string>();

const isDuplicateWebhook = (eventId: string): boolean => {
  if (!eventId) return false;
  return processedEventIds.has(eventId);
};

const markEventAsProcessed = (eventId: string): void => {
  if (eventId) {
    processedEventIds.add(eventId);
    // Clean up old event IDs (keep last 1000 to prevent memory leaks)
    if (processedEventIds.size > 1000) {
      const eventIdsArray = Array.from(processedEventIds);
      const idsToRemove = eventIdsArray.slice(0, eventIdsArray.length - 1000);
      idsToRemove.forEach((id) => processedEventIds.delete(id));
    }
  }
};

router.post("/giftcard/create", async (req: Request, res: Response) => {
  const eventId = req.headers["x-shopify-event-id"] as string;
  const orderName = req.body.name || req.body.order_number;

  console.log(`GIFT CARD WEBHOOK: Received event ${eventId} for order ${orderName}`);

  // Check if this webhook has already been processed
  if (isDuplicateWebhook(eventId)) {
    console.log(`GIFT CARD WEBHOOK: Duplicate event ${eventId} for order ${orderName} - skipping`);
    return res.status(200).json({ message: "Duplicate webhook event - already processed" });
  }

  try {
    // Mark event as processed before processing to prevent race conditions
    markEventAsProcessed(eventId);

    console.log(`GIFT CARD WEBHOOK: Processing event ${eventId} for order ${orderName}`);
    await gift_card_create(req, res);
    console.log(`GIFT CARD WEBHOOK: Successfully processed event ${eventId} for order ${orderName}`);
  } catch (error) {
    console.error(`GIFT CARD WEBHOOK: Error processing event ${eventId} for order ${orderName}:`, error);
    // Note: We don't remove from processed events on error to prevent retry loops
    return res.status(200).json({ message: "Internal server error" });
  }
});
// ====================== END GIFT CARD WEBHOOK ======================

// ====================== GIFT CARDS ======================
router.get("/giftcard/prepolulate-codes", codes_prepopulate);
router.post("/giftcard/update", gift_card_update);
// ====================== END GIFT CARDS ======================

// ====================== ORDER UPATE ======================
router.post("/order/update/ready-for-pickup", order_update_ready_for_pickup);

// ====================== VARIANT PRICE SYNC ======================
router.get("/stores/sync/price", stores_price_sync);

// ====================== EXPORT DAILY SALES ======================
router.get("/data/export/sales/daily", export_daily_sales);

// ====================== MIGRATE TAGS TO METAFIELDS ======================
router.get("/data/migrate/tags-to-metafields", migrate_tags_to_metafields);

export default router;
