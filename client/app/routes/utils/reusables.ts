import axios from "axios";
import { API_ROUTES, ITEM_STATUS } from "../utils/constants";

export const getProducts = async (appUrl: string) => {
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
