import express from "express";
import { order_webhook } from "./order_webhook.controller";
const router = express.Router();

router.post("/order", order_webhook);

export default router;
