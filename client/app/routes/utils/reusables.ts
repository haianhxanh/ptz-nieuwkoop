import axios from "axios";
import { API_ROUTES, ITEM_STATUS } from "../utils/constants";

export const getProducts = async (appUrl: string) => {
  // const encodedProductType = encodeURIComponent(productType);
  try {
    const api_response = await axios.get(appUrl + API_ROUTES.GET_PRODUCTS, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return api_response;
  } catch (error) {
    console.log(error);
  }
};

export const getAppMetaobject = async (appUrl: string) => {
  try {
    const api_response = await axios.get(
      appUrl + API_ROUTES.GET_APP_METAOBJECT,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    return api_response;
  } catch (error) {
    console.log(error);
  }
};

export const updateAppMetaobject = async (data: any, appUrl: string) => {
  try {
    const api_response = await axios.post(
      appUrl + API_ROUTES.UPDATE_APP_METAOBJECT,
      data,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    return api_response;
  } catch (error) {
    console.log(error);
  }
};

export const importProducts = async (data: any, appUrl: string) => {
  try {
    const api_response = await axios.post(
      appUrl + API_ROUTES.IMPORT_PRODUCTS,
      data,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    return api_response;
  } catch (error) {
    console.log(error);
  }
};

export const removeSizeInTitles = (title: string) => {
  if (!title) return;
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

export const getExchangeRate = async (currency: string) => {
  let url = `https://api.cnb.cz/cnbapi/exrates/monthly-averages-currency?currency=${currency}`;

  let rate = await axios.get(url);
  return rate.data;
};

export const getItemStatus = (code: string) => {
  let status = "";
  ITEM_STATUS.forEach((item) => {
    if (item.code === code) {
      status = item.status;
    }
  });
  return status;
};

export const getAllVariants = async (appUrl: string) => {
  try {
    const api_response = await axios.get(appUrl + API_ROUTES.GET_ALL_VARIANTS, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return api_response;
  } catch (error) {
    console.log(error);
  }
};

export const apiFetchData = async (appUrl: string) => {
  const data = await getProducts(appUrl);
  const fetchedData = data?.data.products
    .map((product: any) => {
      return {
        id: product.Itemcode,
        title: product.Description,
        sku: product.Itemcode,
        brand:
          product.Tags.find((tag: any) => tag.Code == "Brand")?.Values[0]
            .Description_EN || "",
        price: (product.Salesprice * 26).toFixed(2),
        collection:
          product.Tags.find((tag: any) => tag.Code == "Collection")?.Values[0]
            .Description_EN || "",
        color:
          product.Tags.find((tag: any) => tag.Code == "ColourPlanter")
            ?.Values[0].Description_EN || undefined,
        material:
          product.Tags.find((tag: any) => tag.Code == "Material")?.Values[0]
            .Description_EN || "",
        weight: product.Weight.toFixed(2) || null,
        length: product.Length || null,
        width: product.Width || null,
        height: product.Height || null,
        depth: product.Depth || null,
        diameter: product.Diameter || null,
        opening: product.Opening || null,
        image:
          "https://images.nieuwkoop-europe.com/images/" +
          product.ItemPictureName,
        matchingElement: removeSizeInTitles(product?.ItemVariety_EN) || null,
        itemStatus: product.ItemStatus,
        isStockItem: product.IsStockItem,
        mainGroupCode: product.MainGroupCode,
        deliveryTime: product.DeliveryTimeInDays,
        searchUrl: `https://www.nieuwkoop-europe.com/en/search-results?q=${product.Itemcode}`,
        adminUrl:
          process.env.NODE_ENV == "development"
            ? API_ROUTES.SHOPIFY_ADMIN_URL_DEV
            : API_ROUTES.SHOPIFY_ADMIN_URL_PROD,
        type: product.ProductGroupDescription_EN,
      };
    })
    .sort((a: any, b: any) => {
      if (!a.matchingElement || !b.matchingElement) return false;
      return a.matchingElement.localeCompare(b.matchingElement);
    });

  return fetchedData;
};
