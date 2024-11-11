import dotenv from "dotenv";

dotenv.config();
const {
  PTZ_STORE_URL,
  PTZ_ACCESS_TOKEN,
  PTZ_STORE_LOCATION_ID,
  PTZ_STORE_LOCATION_ID_2,
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

export const ALL_STORES = [
  {
    storeUrl: PTZ_STORE_URL,
    accessToken: PTZ_ACCESS_TOKEN,
    locationId: PTZ_STORE_LOCATION_ID,
    index: 1,
  },
  {
    storeUrl: PTZ_STORE_URL,
    accessToken: PTZ_ACCESS_TOKEN,
    locationId: PTZ_STORE_LOCATION_ID_2,
    index: 2,
  },
  {
    storeUrl: DMP_STORE_URL,
    accessToken: DMP_ACCESS_TOKEN,
    locationId: DMP_STORE_LOCATION_ID,
    index: 1,
  },
  {
    storeUrl: DMP_STORE_URL,
    accessToken: DMP_ACCESS_TOKEN,
    locationId: DMP_STORE_LOCATION_ID_2,
    index: 2,
  },
];

export const get_stores_by_location_id = (locationId: any) => {
  let STORE_ORIGIN = ALL_STORES.find(
    (store) => store.locationId === locationId
  );
  let STORE_DESTINATIONS = ALL_STORES.filter(
    (store) =>
      store.locationId !== STORE_ORIGIN?.locationId &&
      store.index === STORE_ORIGIN?.index
  );

  STORE_DESTINATIONS = STORE_DESTINATIONS.map((store) => ({
    ...store,
    locationId: "gid://shopify/Location/" + store.locationId,
  }));

  return {
    origin: STORE_ORIGIN,
    destinations: STORE_DESTINATIONS,
  };
};

export const remove_duplicated_objects = (array: any) => {
  return array.filter(
    (v: any, i: any, a: any) => a.findIndex((t: any) => t.sku === v.sku) === i
  );
};
