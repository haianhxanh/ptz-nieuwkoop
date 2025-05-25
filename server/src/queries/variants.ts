import { gql } from "graphql-request";

export const bulkQueryGetProductVariants = `#graphql
  mutation getProductVariants {
    bulkOperationRunQuery(
      query: """
      {
        productVariants(query: "tag:'Nieuwkoop'") {
          edges {
            node {
              id
              sku
              price
              compareAtPrice
              title
              product {
                id
                tags
                status
              }
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
