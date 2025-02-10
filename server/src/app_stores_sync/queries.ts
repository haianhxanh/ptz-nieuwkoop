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

export const variantsQuery = gql`
  query ($query: String) {
    productVariants(query: $query, first: 1) {
      edges {
        node {
          id
          product {
            id
            tags
            options(first: 1) {
              id
              name
            }
          }
          sku
          price
          compareAtPrice
        }
      }
    }
  }
`;

export const productVariantsBulkCreate = gql`
  mutation ProductVariantsCreate(
    $productId: ID!
    $variants: [ProductVariantsBulkInput!]!
  ) {
    productVariantsBulkCreate(productId: $productId, variants: $variants) {
      productVariants {
        id
        title
        selectedOptions {
          name
          value
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const tagsAdd = gql`
  mutation addTags($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      node {
        id
      }
      userErrors {
        message
      }
    }
  }
`;
