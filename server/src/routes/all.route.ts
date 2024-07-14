import express from "express";
import { auth } from "../utilities/auth";
import { delete_products_from_stores } from "../controllers/delete_products.controller";
import { get_products } from "../controllers/get_products.controller";
import { get_app_metaobject } from "../controllers/get_app_metaobject.controller";
import { update_app_metaobject } from "../controllers/update_app_metaobject.controller";
import { import_products } from "../controllers/import_products.controller";
import { sync_variants } from "../controllers/sync_variants.controller";
import { all_variants } from "../controllers/all_variants.controller";
import { post_order } from "../controllers/post_order.controller";
const router = express.Router();

router.delete("/delete-products", auth, delete_products_from_stores);
router.get("/get-products", get_products);
router.get("/get-app-metaobject", get_app_metaobject);
router.post("/update-app-metaobject", update_app_metaobject);
router.post("/import-products", import_products);
router.get("/sync-variants", auth, sync_variants);
router.get("/all-variants", all_variants);
router.post("/post-order", auth, post_order);

export default router;
