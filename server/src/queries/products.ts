import { gql } from "graphql-request";

export const bulkQueryGetProducts = `#graphql
  mutation getProducts {
    bulkOperationRunQuery(
      query: """
      {
        products(query: "tag:'Nieuwkoop'") {
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
