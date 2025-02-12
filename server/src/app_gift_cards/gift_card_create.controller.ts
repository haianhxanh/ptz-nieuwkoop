import { Request, Response } from "express";
import { GraphQLClient } from "graphql-request";
import { promisify } from "util";
import dotenv from "dotenv";
import GiftCard from "../model/giftCard.model";
import { GiftCardItemsData } from "../data_storage/sample_gift_card_items";
import { get_dev_stores, get_stores } from "../app_stores_sync/utils";
import {
  fulfillGiftCardItems,
  giftCardCreate,
  orderQuery,
} from "./gift_card_queries.controller";
import {
  calculateOneYearFromNow,
  generateGiftCardCode,
} from "./gift_card_utils.controller";
const sleep = promisify(setTimeout);
dotenv.config();
const { API_VERSION } = process.env;

export const gift_card_create = async (req: Request, res: Response) => {
  try {
    // console.log("Request body:", req.body);
    // return res.status(200).json(req.body);
    if (!req.body.line_items) {
      console.log(`GIFT CARD CREATE: Order ${req.body.id} has no line_items`);
      return res.status(200).json({
        message: `GIFT CARD CREATE: Order ${req.body.id} has no line_items`,
      });
    }
    let lineItems = req.body.line_items;

    // ======= MOCK DATA =======
    // let lineItems = GiftCardItemsData;
    // ======= END MOCK DATA =======

    const giftCardItems = lineItems.filter((item: any) => {
      return item?.sku?.includes("GIFTCARD");
    });

    if (!giftCardItems.length) {
      console.log(`GIFT CARD CREATE: Order ${req.body.id} has no gift cards`);
      return res.status(200).json({
        message: `GIFT CARD CREATE: Order ${req.body.id} has no gift cards`,
      });
    }

    let orderStatusUrl = req.query.store;
    console.log("Order status URL:", orderStatusUrl);
    // ======= MOCK DATA =======
    // orderStatusUrl = "https://potzillas-dev.myshopify.com";
    // ======= END MOCK DATA =======

    let stores;
    if (req.query.test == "1") {
      stores = get_dev_stores(orderStatusUrl);
    } else {
      stores = get_stores(orderStatusUrl);
    }

    if (!stores) {
      console.log("GIFT CARD CREATE: Store not found");
      return res
        .status(200)
        .json({ message: "GIFT CARD CREATE: Store not found" });
    }

    if (!req.body?.customer?.id) {
      console.log(`GIFT CARD CREATE: Order ${req.body.id} has no customer`);
      return res.status(200).json({
        message: `GIFT CARD CREATE: Order ${req.body.id} has no customer`,
      });
    }

    let customerId = "gid://shopify/Customer/" + req.body?.customer?.id;
    // customerId = "gid://shopify/Customer/" + "8359795032401";
    let orderId = req.body.admin_graphql_api_id;
    let orderName = req.body.name;

    // let stores = get_dev_stores("https://potzillas-dev.myshopify.com");
    // let orderId = "gid://shopify/Order/6381468352849";

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

    let totalGiftCardsToCreate = giftCardItems.reduce((acc: any, item: any) => {
      return acc + item.quantity;
    }, 0);

    let giftCardsOfTheSameOrderInDB = await GiftCard.findAll({
      where: {
        order_name: orderName,
      },
    });
    console.log(
      "Gift cards of the same order in DB:",
      giftCardsOfTheSameOrderInDB
    );

    if (giftCardsOfTheSameOrderInDB.length >= totalGiftCardsToCreate) {
      console.log(
        `GIFT CARD CREATE: Gift cards for order ${orderName} already exist`
      );
      return res
        .status(200)
        .json(
          `GIFT CARD CREATE: Gift cards for order ${orderName} already exist`
        );
    }

    for (const [index, cardItem] of giftCardItems.entries()) {
      for (let qtyIndex = 0; qtyIndex < cardItem.quantity; qtyIndex++) {
        let generatedCode = generateGiftCardCode();
        let generatedLastCharacters = generatedCode.slice(-4);
        let takenGiftCard;
        let lastCharactersTaken = true;
        while (lastCharactersTaken) {
          takenGiftCard = await GiftCard.findOne({
            where: {
              last_characters: generatedLastCharacters,
            },
          });
          if (!takenGiftCard) {
            lastCharactersTaken = false;
          } else {
            generatedCode = generateGiftCardCode();
          }
        }
        let initialValue = cardItem.price_set.shop_money.amount;

        let newGiftCard = await STORE_TO_SYNC_FROM.request(giftCardCreate, {
          input: {
            code: generatedCode,
            initialValue: initialValue,
            customerId: customerId,
            expiresOn: calculateOneYearFromNow(),
          },
        });

        if (newGiftCard.giftCardCreate?.userErrors.length > 0) {
          console.log(
            "New gift card errors:",
            newGiftCard.giftCardCreate?.userErrors
          );
        }

        if (newGiftCard.giftCardCreate?.giftCard) {
          let newGiftCardCopy = await STORE_TO_SYNC_TO.request(giftCardCreate, {
            input: {
              code: generatedCode,
              initialValue: initialValue,
              expiresOn: calculateOneYearFromNow(),
            },
          });

          if (newGiftCardCopy.giftCardCreate?.userErrors.length > 0) {
            console.log(
              "New gift card copy errors:",
              newGiftCardCopy.giftCardCreate?.userErrors
            );
          }

          if (newGiftCardCopy.giftCardCreate?.giftCard) {
            let saveGiftCardIntoDB = await GiftCard.create({
              last_characters:
                newGiftCard?.giftCardCreate?.giftCard?.lastCharacters,
              masked_code: generatedCode,
              initial_value: parseFloat(initialValue),
              balance: parseFloat(initialValue),
              enabled: true,
              order_name: orderName,
              purchased_from: stores.origin.storeUrl,
              [stores.origin.giftCardColumnName]:
                newGiftCard?.giftCardCreate?.giftCard?.id,
              [stores.destination.giftCardColumnName]:
                newGiftCardCopy?.giftCardCreate?.giftCard?.id,
            });

            // if both gift cards are created and saved into DB, create fulfillment in Shopify
            let order = await STORE_TO_SYNC_FROM.request(orderQuery, {
              id: orderId,
            });
            let giftCardItems = [];

            for (const [
              index,
              fulfillmentOrder,
            ] of order?.order?.fulfillmentOrders?.edges.entries()) {
              let fulfillmentsOrderObj = {
                id: fulfillmentOrder?.node?.id,
                giftItems: [] as any[],
              };
              let items = fulfillmentOrder?.node?.lineItems?.edges?.filter(
                (item: any) =>
                  item?.node?.lineItem?.variant?.sku?.includes("GIFTCARD")
              );

              if (!items || items?.length == 0) continue;
              for (const [index, item] of items.entries()) {
                fulfillmentsOrderObj.giftItems.push(item);
              }
              giftCardItems.push(fulfillmentsOrderObj);
            }

            giftCardItems = giftCardItems.filter(
              (item: any) => item.giftItems.length > 0
            );

            if (!giftCardItems || giftCardItems?.length == 0) return;

            let lineItemsByFulfillmentOrderObj = giftCardItems.map(
              (item: any) => {
                return {
                  fulfillmentOrderId: item.id,
                  fulfillmentOrderLineItems: item.giftItems.map((item: any) => {
                    return {
                      id: item.node.id,
                      quantity: item.node.totalQuantity,
                    };
                  }),
                };
              }
            );
            let fulfillGiftCards = STORE_TO_SYNC_FROM.request(
              fulfillGiftCardItems,
              {
                fulfillment: {
                  notifyCustomer: false,
                  lineItemsByFulfillmentOrder: lineItemsByFulfillmentOrderObj,
                },
              }
            );
          }
        }

        // return res.status(200).json(code);
        await sleep(1000);
      }
    }

    console.log(`GIFT CARD CREATE: Created gift cards for order ${orderName}`);
    return res
      .status(200)
      .json(`GIFT CARD CREATE: Created gift cards for order ${orderName}`);
  } catch (error) {
    console.error("GIFT CARD CREATE: Error adding new codes:", error);
    res.status(200).json({ message: "Internal server error" });
  }
};
