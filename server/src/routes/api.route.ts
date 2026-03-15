import express from "express";
import offerRoutes from "./offer.route";
import { clientAuth } from "../utilities/clientAuth";
import { fakturoidCreateInvoice, fakturoidUpdateInvoice } from "./../controllers/fakturoid.controller";

const router = express.Router();

router.use("/offers", offerRoutes);
router.post("/fakturoid/invoice", clientAuth, fakturoidCreateInvoice);
router.patch("/fakturoid/invoice/:id", clientAuth, fakturoidUpdateInvoice);

export default router;
