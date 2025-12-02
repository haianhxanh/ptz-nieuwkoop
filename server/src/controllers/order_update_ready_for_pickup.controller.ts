import { Request, Response } from "express";
import axios from "axios";
import { GraphQLClient } from "graphql-request";
import { fulfillmentOrderQuery } from "../queries/fulfillmentOrder";
import { get_dev_stores, get_stores } from "../app_stores_sync/utils";
import dotenv from "dotenv";
dotenv.config();

const { API_VERSION } = process.env;
const { SMSZASILAM_HASH } = process.env;

export const order_update_ready_for_pickup = async (req: Request, res: Response) => {
  try {
    let fulfillmentOrderId = req?.body?.fulfillment_order?.id;

    let store = req.query.store;
    let stores;
    if (req.query.test == "1") {
      stores = get_dev_stores(store);
    } else {
      stores = get_stores(store);
    }

    const shopifyClient = new GraphQLClient(`https://${stores?.origin.storeUrl}/admin/api/${API_VERSION}/graphql.json`, {
      // @ts-ignore
      headers: {
        "X-Shopify-Access-Token": stores?.origin.accessToken,
      },
    });

    let fulfillmentOrder = await shopifyClient.request(fulfillmentOrderQuery, {
      fulfillmentOrderId: fulfillmentOrderId,
    });

    let order = fulfillmentOrder?.fulfillmentOrder?.order;

    if (!order?.billingAddress?.phone) return res.status(200).json({ error: `Order ${order.name} has no phone number` });

    let phone = order.billingAddress.phone;
    let storeName = stores?.origin?.storeName || "Potzillas";
    let message = `Dobrý den, vaše objednávka ${order.name.replace(
      "#",
      ""
    )} z e-shopu ${storeName} je připravena k osobnímu odběru na adrese Křižíkova 55/65, Praha 8. Prosime o co nejrychlejsi vyzvednuti. Těšíme se na vás. Tým ${storeName}.`;

    let parsedPhone = phone.replace(/\D/g, "").replace(/^420/, "");
    let requestUrl = `https://app.smszasilam.cz/rest/?HASH=${SMSZASILAM_HASH}&number=${parsedPhone}&text=${message}`;

    console.log("Sending message to", parsedPhone, "with message", decodeURIComponent(message));

    let messageSent = await axios.post(requestUrl);

    console.log({
      message: messageSent?.data?.message,
      id: messageSent?.data?.id,
    });

    return res.status(200).json(order);
  } catch (error) {
    console.log(error);
    return res.status(200).json({ error });
  }
};
