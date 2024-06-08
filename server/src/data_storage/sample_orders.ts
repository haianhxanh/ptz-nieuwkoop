const items = [
  {
    Itemcode: "6ELHAL25A",
    StockAvailable: 0.0,
    FirstAvailable: "2024-05-31T00:00:00",
    Sysmodified: "2024-05-25T03:37:19.217",
  },
  {
    Itemcode: "6FSTRIGC8",
    StockAvailable: 0.0,
    FirstAvailable: "2024-05-30T00:00:00",
    Sysmodified: "2024-05-23T13:47:19.577",
  },
  {
    Itemcode: "6FSTRICB3",
    StockAvailable: 0.0,
    FirstAvailable: "2024-07-18T00:00:00",
    Sysmodified: "2024-05-16T03:37:19.417",
  },
  {
    Itemcode: "6PPNB21GR",
    StockAvailable: 100.0,
    FirstAvailable: null,
    Sysmodified: "2024-05-03T07:27:19.167",
  },
  {
    Itemcode: "6AMOG2121",
    StockAvailable: 0.0,
    FirstAvailable: "1900-01-01T00:00:00",
    Sysmodified: "2024-05-22T07:37:26.47",
  },
];
export const sample_orders = [
  {
    node: {
      id: "gid://shopify/Order/6041670025525",
      tags: [],
      lineItems: {
        edges: [
          {
            node: {
              quantity: 2,
              sku: "6ELHAL25A",
            },
          },
        ],
      },
    },
  },
  {
    node: {
      id: "gid://shopify/Order/6041670025526",
      tags: [],
      lineItems: {
        edges: [
          {
            node: {
              id: "gid://shopify/LineItem/15155136397622",
              quantity: 1,
              sku: "6FSTRIGC8",
            },
          },
        ],
      },
    },
  },
  {
    node: {
      id: "gid://shopify/Order/6041670025527",
      tags: [],
      lineItems: {
        edges: [
          {
            node: {
              id: "gid://shopify/LineItem/15155136397623",
              quantity: 3,
              sku: "6FSTRICB3",
            },
          },
          {
            node: {
              id: "gid://shopify/LineItem/15155136397624",
              quantity: 1,
              sku: "6AMOG2121",
            },
          },
        ],
      },
    },
  },
];
