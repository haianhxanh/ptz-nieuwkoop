import { gql } from "graphql-request";

export const inventoryQuery = gql`
  query ($locationId: ID!, $id: ID!) {
    productVariant(id: $id) {
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
`;
