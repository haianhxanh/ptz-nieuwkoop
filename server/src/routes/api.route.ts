import express from "express";
import offerRoutes from "./offer.route";
import { clientAuth } from "../utilities/clientAuth";
import { fakturoidCreateInvoice, fakturoidUpdateInvoice } from "./../controllers/fakturoid.controller";
import { getStock, triggerStockSync } from "../controllers/stock.controller";

const router = express.Router();

router.use("/offers", offerRoutes);
router.post("/fakturoid/invoice", clientAuth, fakturoidCreateInvoice);
router.patch("/fakturoid/invoice/:id", clientAuth, fakturoidUpdateInvoice);
router.get("/stock", clientAuth, getStock);
router.get("/stock/sync", triggerStockSync);

export default router;
