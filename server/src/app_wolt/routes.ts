import express from "express";
import { order_webhook } from "./order_webhook.controller";
import { wolt_callback } from "./callback.controller";

const router = express.Router();

router.post("/order", order_webhook);
router.get("/callback", wolt_callback);

export default router;
