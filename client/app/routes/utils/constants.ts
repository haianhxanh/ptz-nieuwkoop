export const API_ROUTES = {
  GET_PRODUCTS: "/get-products",
  GET_APP_METAOBJECT: "/get-app-metaobject",
  UPDATE_APP_METAOBJECT: "/update-app-metaobject",
  IMPORT_PRODUCTS: "/import-products",
  GET_ALL_VARIANTS: "/all-variants",
  SHOPIFY_ADMIN_URL_DEV: "https://admin.shopify.com/store/floragreensprouts/",
  SHOPIFY_ADMIN_URL_PROD: "https://admin.shopify.com/store/potzillas/",
};

export const IMPORT_STATUS = {
  NO_JOB: "No running job at the moment",
  IN_PROGRESS: "Import in progress",
  COMPLETED: "Import completed",
  FAILED: "Something went wrong, please contact support",
};

export const ITEM_STATUS = [
  {
    code: "A",
    status: "Active",
  },
  {
    code: "E",
    status: "Inactive",
  },
  {
    code: "D",
    status: "Discontinued",
  },
  {
    code: "B",
    status: "Blocked",
  },
];

export const PRODUCT_TYPES = [
  {
    label: "Hydroculture",
    value: "Hydroculture",
  },
  {
    label: "Soilculture",
    value: "Soilculture",
  },
  {
    label: "Planters",
    value: "Planters",
  },
  {
    label: "Nutrients and pesticide",
    value: "Nutrients and pesticide",
  },
  {
    label: "Decoration",
    value: "Decoration",
  },
  {
    label: "Equipments and accessories",
    value: "Equipments and accessories",
  },
  {
    label: "Substrates and systems",
    value: "Substrates and systems",
  },
  {
    label: "Green walls",
    value: "Green walls",
  },
  {
    label: "Moss and Mummy plants",
    value: "Moss and Mummy plants",
  },
  {
    label: "Artificial",
    value: "Artificial",
  },
  {
    label: "Documentation",
    value: "Documentation",
  },
  {
    label: "Overige",
    value: "Overige",
  },
  {
    label: "Transport",
    value: "Transport ",
  },
];
