import { gql } from "graphql-request";

export const ordersQuery = gql`
  query getOrders($first: Int!, $after: String) {
    orders(first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          name
          createdAt
          lineItems(first: 250) {
            edges {
              node {
                id
                title
                sku
                originalUnitPriceSet {
                  shopMoney {
                    amount
                  }
                }
                variant {
                  availableForSale
                  sku
                }
                product {
                  tags
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;
