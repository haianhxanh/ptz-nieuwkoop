import axios from "axios";
import { promisify } from "util";
import { TAG_CODES } from "./constants";
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

export const createImages = async (productId: any, sku: any, variant: any) => {
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
        variant_ids: [variant.id],
      };
    } else {
      image = {
        product_id: productId,
        attachment: api_image.data.Image,
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
          productVariants(first: 100${cursor ? `, after: "${cursor}"` : ""}) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                sku
                title
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
    await sleep(250);
  }
  return variants;
}

export async function syncVariantStock(variantId: any, stock: any) {
  let variant = await axios.get(
    `https://${STORE}/admin/api/${API_VERSION}/variants/${variantId}.json`,
    {
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN!,
        "Content-Type": "application/json",
      },
    }
  );
  let inventory_item_id = variant.data.variant.inventory_item_id;

  let inventory_level = {
    inventory_item_id: inventory_item_id,
    available: stock,
    location_id: STORE_LOCATION_ID,
  };

  let inventory_item = await axios.post(
    `https://${STORE}/admin/api/${API_VERSION}/inventory_levels/set.json`,
    inventory_level,
    {
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN!,
        "Content-Type": "application/json",
      },
    }
  );

  return inventory_item.data;
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
    let properties =
      Tags.filter((tag: any) => tag.Code == tagCode).map((tag: any) =>
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

  return tag;
}

export const removeSizeInTitles = (title: string) => {
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

  return optionTitle;
};

export const createVariantSpecs = async (matchingVariant: any) => {
  let variantSpecs = "";
  if (matchingVariant.Diameter) {
    variantSpecs += `<p>Průměr vnější: ${matchingVariant.Diameter} cm</p>`;
  }
  if (matchingVariant.Opening) {
    variantSpecs += `<p>Průměr vnitřní: ${matchingVariant.Diameter} cm</p>`;
  }
  if (matchingVariant.Height) {
    variantSpecs += `<p>Výška: ${matchingVariant.Height} cm</p>`;
  }
  if (matchingVariant.Weight) {
    variantSpecs += `<p>Hmotnost: ${matchingVariant.Weight} kg</p>`;
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
    variantSpecs += `<p>Povrchová: ${finish}</p>`;
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
