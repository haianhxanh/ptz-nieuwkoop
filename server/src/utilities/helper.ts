import axios from "axios";
import { promisify } from "util";
import { ITEM_DIAMETERS, ITEM_HEIGHTS, TAG_CODES } from "./constants";
const sleep = promisify(setTimeout);
const {
  ACCESS_TOKEN,
  STORE,
  STORE_LOCATION_ID,
  API_VERSION,
  NIEUWKOOP_API_ENDPOINT,
  NIEUWKOOP_USERNAME,
  NIEUWKOOP_PASSWORD,
  NIEUWKOOP_API_STOCK_ENDPOINT,
  NIEUWKOOP_API_IMAGE_ENDPOINT,
  NIEUWKOOP_API_SALESORDER,
  OPEN_AI_KEY,
  OPEN_AI_MODEL,
  OPEN_AI_ORG_ID,
} = process.env;

export async function variantExists(sku: any) {
  /*===================================== Check variant existence =====================================*/
  const variantSku = sku;
  const query = `
        query {
          productVariants(first: 1, query: "sku:${variantSku}") {
            edges {
              node {
                id
                sku
              }
            }
          }
        }
      `;

  const response = await axios({
    url: `https://${STORE}/admin/api/${API_VERSION}/graphql.json`,
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": ACCESS_TOKEN,
    },
    data: {
      query: query,
    },
  });

  if (response.data.data.productVariants.edges.length > 0) {
    return true;
  } else {
    return false;
  }
}

export async function getApiVariant(sku: any) {
  const auth = Buffer.from(
    `${NIEUWKOOP_USERNAME}:${NIEUWKOOP_PASSWORD}`
  ).toString("base64");

  let url: string = NIEUWKOOP_API_ENDPOINT + `&itemCode=${sku}`;

  const variant = await axios.get(url, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
    timeout: 15000,
  });

  if (variant.data) {
    return variant.data;
  } else {
    return null;
  }
}

export async function getVariantStock(sku: any) {
  const auth = Buffer.from(
    `${NIEUWKOOP_USERNAME}:${NIEUWKOOP_PASSWORD}`
  ).toString("base64");

  let url = NIEUWKOOP_API_STOCK_ENDPOINT + `&itemCode=${sku}`;

  const variant = await axios.get(url, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
    timeout: 15000,
  });

  if (variant.data) {
    return variant.data[0];
  } else {
    return 0;
  }
}

export async function createProduct(product: any) {
  let newProductRes = await axios.post(
    `https://${STORE}/admin/api/${API_VERSION}/products.json`,
    product,
    {
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN!,
        "Content-Type": "application/json",
      },
    }
  );
  return newProductRes.data.product;
}

export const createImages = async (
  productId: any,
  sku: any,
  variant: any,
  productHandle: any
) => {
  const auth = Buffer.from(
    `${NIEUWKOOP_USERNAME}:${NIEUWKOOP_PASSWORD}`
  ).toString("base64");

  let url = NIEUWKOOP_API_IMAGE_ENDPOINT?.replace("[sku]", sku);

  if (url) {
    let api_image = await axios.get(url, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
      timeout: 15000,
    });
    let image;

    if (variant && variant.id) {
      image = {
        product_id: productId,
        attachment: api_image.data.Image,
        finename: productHandle + ".png",
        variant_ids: [variant.id],
      };
    } else {
      image = {
        product_id: productId,
        attachment: api_image.data.Image,
        filename: productHandle + ".png",
      };
    }
    const res_image = await axios.post(
      `https://${STORE}/admin/api/${API_VERSION}/products/${productId}/images.json`,
      { image },
      {
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
        },
      }
    );
    return res_image.data;
  } else {
    return null;
  }
};

export async function createAiDescription(product: any, matchingProduct: any) {
  let content = `Projdi tento produkt ${JSON.stringify(
    product
  )} a tento zdroj ${JSON.stringify(
    matchingProduct
  )}, a zkus napsat stručný popis produktu. Zaměř na vlastnosti produktu vycházející z informací, které máš k dispozici, ale není třeba uvést SKU nebo rozměry nebo cenu v popisu, jelikož parametry produktu budeme zobrazovat zvlášť. Nezmiňuj Potzillas jelikož je to název obchodu. Pokud budeš potřebovat, můžeš se inspirovat na webu výrobce. Můžeš použít HTML pro zvýraznění některých částí textu. Rozděl text do odstavců s mezerou mezi odstavci pro čitelnost. Nic jiného kromě popisu prosím nepiš. Také určité výrazy neopakuj příliš víckrát, jako název produktu, nebo značku. 
  Inspirovat se můžeš tímhle textem: "Černý květináč Jesslyn z kolekce Granite﻿ od holandské značky Pottery Pots, je vrcholem elegance a robustnosti, jehož textura a půlnočně černá barva se nápadně blíží vzhledu opravdového granitového kamene. Jeho unikátní povrchová úprava přidává každému prostoru prvek surového luxusu a je zárukou, že každá rostlina v něm zazáří v plné kráse. Designový a praktický květináč je vyroben z odolného Fiberstone, aby odolal vlivům počasí a byl vhodný jak pro interiér, tak pro exteriér. Ideální pro ty, kteří hledají květináč, který je lehký, odolný a vizuálně impozantní. Pro venkovní použití je nutné v květináči vyvrtat otvor po odtékání přebytečné vody. Při vnitřním použití bez plastového květníku se doporučuje použít plastový 'liner' nebo jinou ochranu pro dlouhodobý kontakt mokrého materiálu s květináčem."
  Děkuji!`;

  const open_ai = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: OPEN_AI_MODEL,
      messages: [
        {
          role: "user",
          content: content,
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPEN_AI_KEY}`,
        "OpenAI-Organization": OPEN_AI_ORG_ID,
      },
    }
  );

  let ai_response = open_ai.data;
  return ai_response.choices[0].message.content;
}

export async function allVariants() {
  let cursor = "";
  let hasNextPage = true;
  let variants: any[] = [];
  while (hasNextPage) {
    const response = await axios.post(
      `https://${STORE}/admin/api/${API_VERSION}/graphql.json`,
      {
        query: `query {
          productVariants(query:"tag:'Nieuwkoop'", first: 250${
            cursor ? `, after: "${cursor}"` : ""
          }) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                sku
                title
                product {
                  id
                  tags
                }
                inventoryItem {
                  id
                }
                metafields(first: 100) {
                  edges {
                    node {
                      id
                      namespace
                      key
                      value
                      type
                    }
                  }
                }
              }
            }
          }
        }`,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": ACCESS_TOKEN,
        },
      }
    );

    const data = response.data.data.productVariants;
    hasNextPage = data.pageInfo.hasNextPage;
    cursor = data.pageInfo.endCursor;
    variants = variants.concat(data.edges);
    await sleep(500);
  }

  return variants;
}

export async function syncVariantStock(
  variant: any,
  matchingStockVariant: any,
  matchingApiVariant: any
) {
  let continueSelling = false;

  if (
    !matchingStockVariant ||
    !matchingApiVariant ||
    (matchingStockVariant.StockAvailable == 0 &&
      matchingApiVariant.DeliveryTimeInDays == 999) ||
    matchingApiVariant.ShowOnWebsite == false ||
    matchingApiVariant.ItemStatus != "A"
  ) {
    continueSelling = false;
  }

  if (
    matchingStockVariant &&
    matchingApiVariant &&
    (matchingApiVariant.ItemStatus == "A" ||
      (matchingApiVariant.ItemStatus == "D" &&
        matchingStockVariant.StockAvailable > 0))
  ) {
    continueSelling = true;
  }

  await setContinueSelling(variant.node.id, continueSelling);
  await sleep(500);

  // Update variant metafields for available date and delivery time
  const metafields_query = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
  `;
  let metafields = [];
  let deliveryTimeInDays;
  if (matchingApiVariant && matchingStockVariant) {
    if (matchingStockVariant.StockAvailable > 0) {
      deliveryTimeInDays = 7;
    } else {
      if (
        matchingStockVariant.FirstAvailable &&
        isFutureDate(matchingStockVariant.FirstAvailable)
      ) {
        let today = new Date();
        let futureDate = new Date(matchingStockVariant.FirstAvailable);
        // @ts-ignore
        const diffTime = Math.abs(futureDate - today);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        deliveryTimeInDays =
          diffDays + 7 + matchingApiVariant.DeliveryTimeInDays;
      } else {
        deliveryTimeInDays = 7;
      }
    }
  } else {
    deliveryTimeInDays = 999;
  }

  metafields.push({
    namespace: "custom",
    type: "date_time",
    key: "available_date",
    value: matchingStockVariant ? matchingStockVariant.FirstAvailable : 0,
    ownerId: variant.node.id,
  });

  metafields.push({
    namespace: "custom",
    type: "number_integer",
    key: "delivery_time",
    value: deliveryTimeInDays.toString(),
    ownerId: variant.node.id,
  });

  metafields.push({
    namespace: "custom",
    type: "number_integer",
    key: "inventory_qty",
    value: matchingStockVariant
      ? matchingStockVariant.StockAvailable.toString()
      : "0",
    ownerId: variant.node.id,
  });

  let metafields_variables = {
    metafields,
  };

  const variant_metafields = await axios
    .post(
      `https://${STORE}/admin/api/${API_VERSION}/graphql.json`,
      {
        query: metafields_query,
        variables: metafields_variables,
      },
      {
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN!,
          "Content-Type": "application/json",
        },
      }
    )
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.error(error);
    });

  return variant_metafields;
}

export async function setContinueSelling(
  variantId: any,
  continueSelling: boolean
) {
  let cleanedVariantId = variantId.replace("gid://shopify/ProductVariant/", "");
  let variant = {
    id: cleanedVariantId,
    inventory_policy: continueSelling ? "continue" : "deny",
  };

  let updateVariants = await axios.put(
    `https://${STORE}/admin/api/${API_VERSION}/variants/${cleanedVariantId}.json`,
    { variant },
    {
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN!,
        "Content-Type": "application/json",
      },
    }
  );

  return updateVariants.data;
}

export async function getTag(Tags: any, tagCode: string) {
  let tag;

  if (
    tagCode == "MaterialProperties" ||
    tagCode == "Material" ||
    tagCode == "Location" ||
    tagCode == "Finish" ||
    tagCode == "Shape" ||
    tagCode == "ColourPlanter"
  ) {
    let tagProperties = Tags.filter((tag: any) => tag.Code == tagCode);
    if (tagProperties.length == 0) {
      return undefined;
    }
    let properties =
      tagProperties.map((tag: any) =>
        tag.Values.map((value: any) => value.Description_EN)
      ) || undefined;

    if (properties) {
      tag =
        properties[0].map((t: string) => TAG_CODES[tagCode][t] || undefined) ||
        undefined;
    } else {
      tag = undefined;
    }

    if (tag) {
      tag = tag.filter((t: any) => t != undefined).join(", ");
    }
  } else {
    tag =
      Tags.find((tag: any) => tag.Code == tagCode)?.Values[0].Description_EN ||
      undefined;
  }

  return capitalizeFirstLetter(tag);
}

export const removeSizeInTitles = (title: string) => {
  if (!title) {
    return "";
  }
  const sizes = [
    " XXXS ",
    " XXS ",
    " XS ",
    " S ",
    " M ",
    " L ",
    " XL ",
    " XXL ",
    " XXXL ",
    " XXXS, ",
    " XXS, ",
    " XS, ",
    " S, ",
    " M, ",
    " L, ",
    " XL, ",
    " XXL, ",
    " XXXL, ",
  ];
  sizes.forEach((size) => {
    title = title.replace(size, " ");
  });
  return title;
};

export const extractSizeInTitles = (title: string) => {
  const sizes = [
    " XXXS ",
    " XXS ",
    " XS ",
    " S ",
    " M ",
    " L ",
    " XL ",
    " XXL ",
    " XXXL ",
    " XXXS, ",
    " XXS, ",
    " XS, ",
    " S, ",
    " M, ",
    " L, ",
    " XL, ",
    " XXL, ",
    " XXXL, ",
  ];
  let size = "";
  sizes.forEach((s) => {
    if (title.includes(s)) {
      size = s.replace(",", "").replace(" ", "");
    }
  });
  return size;
};

export const createOptionTitle = (optionSize: any, matchingVariant: any) => {
  let optionTitle = "";
  if (optionSize != "" && optionSize != undefined) {
    optionTitle = optionSize;
  }
  if (matchingVariant.Diameter) {
    optionTitle += ` Ø ${matchingVariant.Diameter} cm`;
  }
  if (matchingVariant.Height) {
    optionTitle += ` V ${matchingVariant.Height} cm`;
  }

  if (matchingVariant.Length) {
    optionTitle += ` D ${matchingVariant.Length} cm`;
  }

  if (
    !optionSize &&
    !matchingVariant.Diameter &&
    !matchingVariant.Height &&
    !matchingVariant.Length
  ) {
    optionTitle = matchingVariant.ItemVariety_EN;
  }
  optionTitle = optionTitle
    .trim()
    .replace(" Ø", " / Ø")
    .replace(" V", " / V")
    .replace(" D", " / D");

  return optionTitle;
};

export const createVariantSpecs = async (matchingVariant: any) => {
  let variantSpecs = "";
  if (matchingVariant.Diameter) {
    variantSpecs += `<p>Průměr vnější: ${matchingVariant.Diameter} cm</p>`;
  }
  if (matchingVariant.Opening) {
    variantSpecs += `<p>Průměr vnitřní: ${matchingVariant.Opening} cm</p>`;
  }
  if (matchingVariant.Height) {
    variantSpecs += `<p>Výška: ${matchingVariant.Height} cm</p>`;
  }
  if (matchingVariant.Weight) {
    variantSpecs += `<p>Hmotnost: ${matchingVariant.Weight.toFixed(2)} kg</p>`;
  }
  if (matchingVariant.Depth) {
    variantSpecs += `<p>Hloubka: ${matchingVariant.Depth} cm</p>`;
  }
  if (matchingVariant.Volume) {
    variantSpecs += `<p>Objem: ${matchingVariant.Volume} l</p>`;
  }

  let brand = await getTag(matchingVariant.Tags, "Brand");
  let material = await getTag(matchingVariant.Tags, "Material");
  let location = await getTag(matchingVariant.Tags, "Location");
  let finish = await getTag(matchingVariant.Tags, "Finish");

  let properties = await getTag(matchingVariant.Tags, "MaterialProperties");
  let shape = await getTag(matchingVariant.Tags, "Shape");
  if (material) {
    variantSpecs += `<p>Materiál: ${material}</p>`;
  }
  if (finish) {
    variantSpecs += `<p>Povrch: ${finish}</p>`;
  }
  if (shape) {
    variantSpecs += `<p>Tvar: ${shape}</p>`;
  }
  if (location) {
    variantSpecs += `<p>Použití: ${location}</p>`;
  }
  if (properties) {
    variantSpecs += `<p>Extra Vlastnosti: ${properties}</p>`;
  }
  variantSpecs += `<p>Značka: ${brand}</p>`;

  return variantSpecs;
};

export const updateProductDescription = async (
  productId: any,
  description: any
) => {
  let product = {
    product: {
      id: productId,
      body_html: description,
    },
  };

  let updateProduct = await axios.put(
    `https://${STORE}/admin/api/${API_VERSION}/products/${productId}.json`,
    product,
    {
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN!,
        "Content-Type": "application/json",
      },
    }
  );

  return updateProduct.data;
};

export const updateVariantCost = async (inventoryItemId: any, cost: any) => {
  let inventory_item = {
    inventory_item: {
      id: inventoryItemId,
      cost: cost,
    },
  };

  let updateCost = await axios.put(
    `https://${STORE}/admin/api/${API_VERSION}/inventory_items/${inventoryItemId}.json`,
    inventory_item,
    {
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN!,
        "Content-Type": "application/json",
      },
    }
  );

  return updateCost.data;
};

export const isFutureDate = (date: string) => {
  let currentDate = new Date();
  let futureDate = new Date(date);
  return futureDate > currentDate;
};

export const capitalizeFirstLetter = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export const createRangeTags = async (matchingVariant: any) => {
  if (!matchingVariant) {
    return "";
  }
  let tag = "";
  if (matchingVariant.Height) {
    let matchingHeight = ITEM_HEIGHTS.find(
      (height) =>
        matchingVariant.Height >= height.min &&
        matchingVariant.Height <= height.max
    );
    if (matchingHeight) {
      tag += matchingHeight.tag + ",";
    }
  }

  if (matchingVariant.Diameter) {
    let matchingDiameter = ITEM_DIAMETERS.find(
      (diameter) =>
        matchingVariant.Diameter >= diameter.min &&
        matchingVariant.Diameter <= diameter.max
    );
    if (matchingDiameter) {
      tag += matchingDiameter.tag + ",";
    }
  }
  return tag;
};

export const get_orders = async () => {
  const query = `
    query GetOrders {
      orders(
        query: "tag_not:'NP_EXPORTED' AND fulfillment_status:'unfulfilled' AND NOT financial_status:'voided' AND created_at:>'2024-03-23T22:00:00Z' AND (financial_status:'paid' OR tag:'dobirka')", 
        first: 10
      ) {
        edges {
          node {
            id
            tags
            lineItems(first: 100) {
              edges {
                node {
                  id
                  title
                  quantity
                  sku
                  product {
                    tags
                  }
                  variant {
                    metafields(first: 100) {
                      edges {
                        node {
                          key
                          value
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await axios.post(
    `https://${STORE}/admin/api/${API_VERSION}/graphql.json`,
    {
      query,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": ACCESS_TOKEN!,
      },
    }
  );

  if (!data.data.orders.edges.length) return [];

  return data.data.orders.edges;
};

export const getNextMonday = (date: Date): Date => {
  const day = date.getDay();
  let diff = 7 - ((day - 1) % 7);
  let nextMonday = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + diff
  );
  let gmtNextMonday = new Date(nextMonday.getTime() + 1000 * 60 * 60 * 2);
  return new Date(gmtNextMonday);
};

type SalesOrder = {
  DeliveryDate: string;
  SalesOrderLines: SalesOrderLine[];
};

type SalesOrderLine = {
  Itemcode: string;
  Quantity: number;
};

export const createApiSalesOrder = async (order: SalesOrder) => {
  const auth = Buffer.from(
    `${NIEUWKOOP_USERNAME}:${NIEUWKOOP_PASSWORD}`
  ).toString("base64");
  const api_order = await axios.post(`${NIEUWKOOP_API_SALESORDER}`, order, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });
  console.log("api order", api_order);
  return api_order.data;
};

export const tagOrder = async (
  shopifyOrderId: any,
  tags: string,
  tag: string
) => {
  let newTags = tags + ", " + tag;
  let order = {
    order: {
      id: shopifyOrderId,
      tags: newTags,
    },
  };

  let tagOrder = await axios.put(
    `https://${STORE}/admin/api/${API_VERSION}/orders/${shopifyOrderId}.json`,
    order,
    {
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN!,
        "Content-Type": "application/json",
      },
    }
  );

  return tagOrder.data;
};
