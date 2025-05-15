import { gql } from "graphql-request";

export const inventoryQuery = gql`
  query ($query: String!, $locationId: ID!) {
    productVariants(first: 1, query: $query) {
      edges {
        node {
          id
          inventoryItem {
            variant {
              id
            }
            inventoryHistoryUrl
            inventoryLevel(locationId: $locationId) {
              id
              quantities(names: ["committed", "available", "on_hand"]) {
                name
                quantity
              }
            }
          }
        }
      }
    }
  }
`;
