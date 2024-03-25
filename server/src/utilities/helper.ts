import axios from "axios";
import { promisify } from "util";
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
    return variant.data[0].StockAvailable;
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

export const createImages = async (productId: any, variant: any) => {
  const auth = Buffer.from(
    `${NIEUWKOOP_USERNAME}:${NIEUWKOOP_PASSWORD}`
  ).toString("base64");

  let url = NIEUWKOOP_API_IMAGE_ENDPOINT?.replace("[sku]", variant.sku);

  if (url) {
    let api_image = await axios.get(url, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
      timeout: 15000,
    });
    let image = {
      product_id: productId,
      attachment: api_image.data.Image,
      variant_ids: [variant.id],
    };
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

export async function createAiDescription(product: any) {
  let content = `Projdi tento produkt ${JSON.stringify(
    product
  )}, a zkus napsat stručný popis produktu. Zaměř spíše na vlastnosti produktu vycházející z informací, které máš k dispozici, ale není třeba uvést SKU nebo rozměry nebo cenu v popisu, jelikož parametry produktu budeme zobrazovat zvlášť. Pokud budeš potřebovat, můžeš se inspirovat na webu výrobce. Můžeš použít HTML pro zvýraznění některých částí textu. Nic jiného kromě popisu prosím nepiš. 
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

export async function getTag(Tags: any, tagCode: any) {
  let tag =
    Tags.find((tag: any) => tag.Code == tagCode)?.Values[0].Description_EN ||
    "";
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

  if (!optionSize && !matchingVariant.Diameter && !matchingVariant.Height) {
    optionTitle = matchingVariant.ItemVariety_EN;
  }

  return optionTitle;
};

export const createVariantSpecs = (matchingVariant: any) => {
  let variantSpecs = "";
  if (matchingVariant.Diameter) {
    variantSpecs += `<p>Průměr: ${matchingVariant.Diameter} cm</p>`;
  }
  if (matchingVariant.Height) {
    variantSpecs += `<p>Výška: ${matchingVariant.Height} cm</p>`;
  }
  if (matchingVariant.Depth) {
    variantSpecs += `<p>Hloubka: ${matchingVariant.Depth} cm</p>`;
  }
  if (matchingVariant.Weight) {
    variantSpecs += `<p>Hmotnost: ${matchingVariant.Weight} kg</p>`;
  }

  // let variant = {
  //   metafields: [
  //     {
  //       key: "specifikace",
  //       value: variantSpecs,
  //       value_type: "multi_line_text_field",
  //       namespace: "custom",
  //     },
  //   ],
  // };

  // let updateVariant = await axios.put(
  //   `https://${STORE}/admin/api/${API_VERSION}/variants/${variantId}.json`,
  //   variant,
  //   {
  //     headers: {
  //       "X-Shopify-Access-Token": ACCESS_TOKEN!,
  //       "Content-Type": "application/json",
  //     },
  //   }
  // );

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
