import dotenv from "dotenv";

dotenv.config();
const {
  PTZ_STORE_URL,
  PTZ_ACCESS_TOKEN,
  PTZ_STORE_LOCATION_ID,
  DMP_STORE_URL,
  DMP_ACCESS_TOKEN,
  DMP_STORE_LOCATION_ID,
  DMP_STORE_LOCATION_ID_2,
  API_VERSION,
} = process.env;

export const is_variant_to_sync = async (variantId: any) => {};

export const get_stores = (orderStatusUrl: any) => {
  if (orderStatusUrl.includes(PTZ_STORE_URL)) {
    return {
      origin: {
        storeUrl: PTZ_STORE_URL,
        accessToken: PTZ_ACCESS_TOKEN,
        locationId: "gid://shopify/Location/" + PTZ_STORE_LOCATION_ID,
      },
      destination: {
        storeUrl: DMP_STORE_URL,
        accessToken: DMP_ACCESS_TOKEN,
        locationId: "gid://shopify/Location/" + DMP_STORE_LOCATION_ID,
      },
    };
  } else if (orderStatusUrl.includes(DMP_STORE_URL)) {
    return {
      origin: {
        storeUrl: DMP_STORE_URL,
        accessToken: DMP_ACCESS_TOKEN,
        locationId: "gid://shopify/Location/" + DMP_STORE_LOCATION_ID,
      },
      destination: {
        storeUrl: PTZ_STORE_URL,
        accessToken: PTZ_ACCESS_TOKEN,
        locationId: "gid://shopify/Location/" + PTZ_STORE_LOCATION_ID,
      },
    };
  }
  return null;
};

export const get_stores_by_location_id = (locationId: any) => {
  if (locationId == PTZ_STORE_LOCATION_ID) {
    return {
      origin: {
        storeUrl: PTZ_STORE_URL,
        accessToken: PTZ_ACCESS_TOKEN,
        locationId: "gid://shopify/Location/" + PTZ_STORE_LOCATION_ID,
      },
      destinations: [
        {
          storeUrl: DMP_STORE_URL,
          accessToken: DMP_ACCESS_TOKEN,
          locationId: "gid://shopify/Location/" + DMP_STORE_LOCATION_ID,
        },
        {
          storeUrl: DMP_STORE_URL,
          accessToken: DMP_ACCESS_TOKEN,
          locationId: "gid://shopify/Location/" + DMP_STORE_LOCATION_ID_2,
        },
      ],
    };
  } else if (locationId == DMP_STORE_LOCATION_ID) {
    return {
      origin: {
        storeUrl: DMP_STORE_URL,
        accessToken: DMP_ACCESS_TOKEN,
        locationId: "gid://shopify/Location/" + DMP_STORE_LOCATION_ID,
      },
      destinations: [
        {
          storeUrl: PTZ_STORE_URL,
          accessToken: PTZ_ACCESS_TOKEN,
          locationId: "gid://shopify/Location/" + PTZ_STORE_LOCATION_ID,
        },
        {
          storeUrl: DMP_STORE_URL,
          accessToken: DMP_ACCESS_TOKEN,
          locationId: "gid://shopify/Location/" + DMP_STORE_LOCATION_ID_2,
        },
      ],
    };
  } else if (locationId == DMP_STORE_LOCATION_ID_2) {
    return {
      origin: {
        storeUrl: DMP_STORE_URL,
        accessToken: DMP_ACCESS_TOKEN,
        locationId: "gid://shopify/Location/" + DMP_STORE_LOCATION_ID_2,
      },
      destinations: [
        {
          storeUrl: PTZ_STORE_URL,
          accessToken: PTZ_ACCESS_TOKEN,
          locationId: "gid://shopify/Location/" + PTZ_STORE_LOCATION_ID,
        },
        {
          storeUrl: DMP_STORE_URL,
          accessToken: DMP_ACCESS_TOKEN,
          locationId: "gid://shopify/Location/" + DMP_STORE_LOCATION_ID,
        },
      ],
    };
  } else {
    return null;
  }
};

export const remove_duplicated_objects = (array: any) => {
  return array.filter(
    (v: any, i: any, a: any) => a.findIndex((t: any) => t.sku === v.sku) === i
  );
};
