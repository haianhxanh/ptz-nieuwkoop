import express from "express";
import { clientAuth } from "../utilities/clientAuth";
import { createOffer, listOffers, getOffer, updateOffer, deleteOffer, listCustomers, addItemsToOffer, updateCustomer } from "../controllers/offer.controller";
import { exchangeRate } from "../controllers/exchange_rate.controller";
import { getMe } from "../controllers/user.controller";
import { imageProxy } from "../controllers/image_proxy.controller";

const router = express.Router();

router.get("/me", clientAuth, getMe);
router.get("/image-proxy", imageProxy);

router.post("/", clientAuth, createOffer);
router.get("/", clientAuth, listOffers);
router.get("/customers", clientAuth, listCustomers);
router.put("/customers/:id", clientAuth, updateCustomer);
router.get("/exchange-rate", exchangeRate);
router.get("/:id", clientAuth, getOffer);
router.put("/:id", clientAuth, updateOffer);
router.post("/:id/items", clientAuth, addItemsToOffer);
router.delete("/:id", clientAuth, deleteOffer);

export default router;
