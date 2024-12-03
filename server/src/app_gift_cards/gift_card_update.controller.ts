import { Request, Response } from "express";
import { GraphQLClient } from "graphql-request";
import { promisify } from "util";
import dotenv from "dotenv";
import GiftCard from "../model/giftCard.model";
import { GiftCardItemsData } from "../data_storage/sample_gift_card_items";
import { get_dev_stores, get_stores } from "../app_stores_sync/utils";
import {
  giftCardCreate,
  giftCardDebit,
  giftCardQuery,
  giftCardUpdate,
  orderQuery,
} from "./gift_card_queries.controller";
import { generateGiftCardCode } from "./gift_card_utils.controller";
const sleep = promisify(setTimeout);
dotenv.config();
const { API_VERSION } = process.env;

export const gift_card_update = async (req: Request, res: Response) => {
  try {
    let isGiftCardPayment = req.body.gateway == "gift_card";
    if (!isGiftCardPayment) {
      console.log("GIFT CARD UPDATE: Not paid by gift card");
      return res
        .status(200)
        .json({ message: "GIFT CARD UPDATE: Not paid by gift card" });
    }
    let storeUrl = req.query?.store;

    let stores;
    if (req.query.test == "1") stores = get_dev_stores(storeUrl);
    else stores = get_stores(storeUrl);

    if (!stores) {
      console.log("GIFT CARD UPDATE: Store not found");
      return res
        .status(200)
        .json({ message: "GIFT CARD UPDATE: Store not found" });
    }

    const STORE_TO_SYNC_FROM = new GraphQLClient(
      `https://${stores.origin.storeUrl}/admin/api/${API_VERSION}/graphql.json`,
      {
        // @ts-ignore
        headers: {
          "X-Shopify-Access-Token": stores.origin.accessToken,
        },
      }
    );

    const STORE_TO_SYNC_TO = new GraphQLClient(
      `https://${stores.destination.storeUrl}/admin/api/${API_VERSION}/graphql.json`,
      {
        // @ts-ignore
        headers: {
          "X-Shopify-Access-Token": stores.destination.accessToken,
        },
      }
    );

    let lastCharacters = req.body?.receipt?.gift_card_last_characters;
    let giftCardId =
      "gid://shopify/GiftCard/" + req.body?.receipt?.gift_card_id;

    // ================== MOCK DATA ==================
    // lastCharacters = "1bk";
    // giftCardId = "gid://shopify/GiftCard/679916470609";
    // storeUrl = "potzillas-dev.myshopify.com";
    // ================== END MOCK DATA ==================

    let giftCardToGet = await STORE_TO_SYNC_FROM.request(giftCardQuery, {
      id: giftCardId,
    });

    let balance = giftCardToGet?.giftCard?.balance?.amount;
    let currencyCode = giftCardToGet?.giftCard?.balance?.currencyCode;

    let giftCardToSyncDB = await GiftCard.findOne({
      where: { last_characters: lastCharacters },
    });

    if (!giftCardToSyncDB) {
      console.log("GIFT CARD UPDATE: Gift card not found in DB");
      return res
        .status(200)
        .json({ message: "GIFT CARD UPDATE: Gift card not found in DB" });
    }

    let giftCardToSyncId =
      // @ts-ignore
      giftCardToSyncDB[stores.destination.giftCardColumnName];

    let giftCardToSync = await STORE_TO_SYNC_TO.request(giftCardQuery, {
      id: giftCardToSyncId,
    });

    let balanceToSync = giftCardToSync?.giftCard?.balance?.amount - balance;

    let giftCardToSyncBalance = await STORE_TO_SYNC_TO.request(giftCardDebit, {
      id: giftCardToSyncId,
      debitInput: {
        debitAmount: {
          amount: balanceToSync,
          currencyCode: currencyCode,
        },
        note: "Synced from store " + storeUrl,
      },
    });

    let giftCardToSyncDBUpdate = await GiftCard.update(
      {
        balance: balance,
      },
      {
        where: { last_characters: lastCharacters },
      }
    );

    return res
      .status(200)
      .json(`GIFT CARD UPDATE: Synced gift card ${lastCharacters}`);
  } catch (error) {
    console.error("GIFT CARD UPDATE: Error updating gift card balance:", error);
    res.status(200).json({ message: "Internal server error" });
  }
};
