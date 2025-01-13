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
  DEV_PTZ_STORE_URL,
  DEV_PTZ_ACCESS_TOKEN,
  DEV_PTZ_STORE_LOCATION_ID,
  DEV_DMP_STORE_URL,
  DEV_DMP_ACCESS_TOKEN,
  DEV_DMP_STORE_LOCATION_ID,
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
        giftCardColumnName: "potzillas_id",
        storeName: "Potzillas",
      },
      destination: {
        storeUrl: DMP_STORE_URL,
        accessToken: DMP_ACCESS_TOKEN,
        locationId: "gid://shopify/Location/" + DMP_STORE_LOCATION_ID,
        giftCardColumnName: "dmp_id",
        storeName: "DMP",
      },
    };
  } else if (orderStatusUrl.includes(DMP_STORE_URL)) {
    return {
      origin: {
        storeUrl: DMP_STORE_URL,
        accessToken: DMP_ACCESS_TOKEN,
        locationId: "gid://shopify/Location/" + DMP_STORE_LOCATION_ID,
        giftCardColumnName: "dmp_id",
        storeName: "DMP",
      },
      destination: {
        storeUrl: PTZ_STORE_URL,
        accessToken: PTZ_ACCESS_TOKEN,
        locationId: "gid://shopify/Location/" + PTZ_STORE_LOCATION_ID,
        giftCardColumnName: "potzillas_id",
        storeName: "Potzillas",
      },
    };
  }
  return null;
};

export const get_dev_stores = (orderStatusUrl: any) => {
  if (orderStatusUrl.includes(DEV_PTZ_STORE_URL)) {
    return {
      origin: {
        storeUrl: DEV_PTZ_STORE_URL,
        accessToken: DEV_PTZ_ACCESS_TOKEN,
        locationId: "gid://shopify/Location/" + DEV_PTZ_STORE_LOCATION_ID,
        giftCardColumnName: "potzillas_id",
        storeName: "Potzillas",
      },
      destination: {
        storeUrl: DEV_DMP_STORE_URL,
        accessToken: DEV_DMP_ACCESS_TOKEN,
        locationId: "gid://shopify/Location/" + DEV_DMP_STORE_LOCATION_ID,
        giftCardColumnName: "dmp_id",
        storeName: "DMP",
      },
    };
  } else if (orderStatusUrl.includes(DEV_DMP_STORE_URL)) {
    return {
      origin: {
        storeUrl: DEV_DMP_STORE_URL,
        accessToken: DEV_DMP_ACCESS_TOKEN,
        locationId: "gid://shopify/Location/" + DEV_DMP_STORE_LOCATION_ID,
        giftCardColumnName: "dmp_id",
        storeName: "DMP",
      },
      destination: {
        storeUrl: DEV_PTZ_STORE_URL,
        accessToken: DEV_PTZ_ACCESS_TOKEN,
        locationId: "gid://shopify/Location/" + DEV_PTZ_STORE_LOCATION_ID,
        giftCardColumnName: "potzillas_id",
        storeName: "Potzillas",
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
