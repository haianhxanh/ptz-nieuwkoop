import { gql } from "graphql-request";

export const bulkQueryGetProducts = (productQuery: string) => `#graphql
  mutation getProducts {
    bulkOperationRunQuery(
      query: """
      {
        products(query: "${productQuery}") {
          edges {
            node {
              id
              tags
              status
              variants(first: 250) {
                edges {
                  node {
                    id
                    sku
                    price
                    compareAtPrice
                    title
                    inventoryItem {
                      id
                      unitCost {
                        amount
                      }
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
              metafield(namespace: "custom", key: "nieuwkoop_last_inventory_sync") {
                value
              }
            }
          }
        }
      }
      """
    ) {
      bulkOperation {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;
