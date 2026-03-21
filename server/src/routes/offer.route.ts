import express from "express";
import { clientAuth } from "../utilities/clientAuth";
import { createOffer, listOffers, getOffer, updateOffer, deleteOffer, duplicateOffer, listClients, createClient, addItemsToOffer, updateClient } from "../controllers/offer.controller";
import { createConfig, listConfigs, updateConfig } from "../controllers/config.controller";
import { exchangeRate } from "../controllers/exchange_rate.controller";
import { getMe } from "../controllers/user.controller";
import { imageProxy } from "../controllers/image_proxy.controller";
import { exportOfferPdf } from "../controllers/pdf.controller";

const router = express.Router();

router.get("/me", clientAuth, getMe);
router.get("/image-proxy", imageProxy);
router.post("/export-pdf", clientAuth, exportOfferPdf);

router.post("/", clientAuth, createOffer);
router.get("/", clientAuth, listOffers);
router.get("/clients", clientAuth, listClients);
router.post("/clients", clientAuth, createClient);
router.put("/clients/:id", clientAuth, updateClient);
router.get("/configs", clientAuth, listConfigs);
router.post("/configs", clientAuth, createConfig);
router.put("/configs/:key", clientAuth, updateConfig);
router.get("/customers", clientAuth, listClients);
router.post("/customers", clientAuth, createClient);
router.put("/customers/:id", clientAuth, updateClient);
router.get("/exchange-rate", exchangeRate);
router.get("/:id", clientAuth, getOffer);
router.put("/:id", clientAuth, updateOffer);
router.post("/:id/items", clientAuth, addItemsToOffer);
router.post("/:id/duplicate", clientAuth, duplicateOffer);
router.delete("/:id", clientAuth, deleteOffer);

export default router;
