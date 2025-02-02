import { gql } from "graphql-request";

export const productVariantQuery = gql`
  query ($id: ID!, $locationId: ID!) {
    productVariant(id: $id) {
      product {
        tags
        id
      }
      price
      sku
      inventoryItem {
        id
        inventoryLevel(locationId: $locationId) {
          quantities(names: ["available"]) {
            id
            name
            quantity
          }
        }
      }
    }
  }
`;

export const productVariantsQuery = gql`
  query ($query: String, $locationId: ID!) {
    productVariants(query: $query, first: 1) {
      edges {
        node {
          id
          product {
            id
            tags
          }
          sku
          price
          compareAtPrice
          inventoryItem {
            id
            unitCost {
              amount
            }
            inventoryLevel(locationId: $locationId) {
              quantities(names: ["available"]) {
                id
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

export const inventorySetQuantitiesMutation = gql`
  mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      inventoryAdjustmentGroup {
        reason
        referenceDocumentUri
        changes {
          name
          delta
          quantityAfterChange
        }
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`;

export const inventoryItemQuery = gql`
  query inventoryItem($id: ID!) {
    inventoryItem(id: $id) {
      id
      variant {
        product {
          tags
        }
        sku
      }
    }
  }
`;

export const inventoryItemUpdate = gql`
  mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
    inventoryItemUpdate(id: $id, input: $input) {
      inventoryItem {
        id
        unitCost {
          amount
        }
      }
      userErrors {
        message
      }
    }
  }
`;
