import { gql } from "graphql-request";

export const giftCardQuery = gql`
  query giftCard($id: ID!) {
    giftCard(id: $id) {
      id
      lastCharacters
      balance {
        amount
        currencyCode
      }
    }
  }
`;

export const giftCardCreate = gql`
  mutation giftCardCreate($input: GiftCardCreateInput!) {
    giftCardCreate(input: $input) {
      giftCard {
        id
        initialValue {
          amount
        }
        lastCharacters
      }
      userErrors {
        message
        field
        code
      }
    }
  }
`;

export const giftCardUpdate = gql`
  mutation giftCardUpdate($id: ID!, $input: GiftCardUpdateInput!) {
    giftCardUpdate(id: $id, input: $input) {
      userErrors {
        message
        field
      }
      giftCard {
        id
        customer {
          id
        }
      }
    }
  }
`;

export const giftCardDebit = gql`
  mutation giftCardDebit($id: ID!, $debitInput: GiftCardDebitInput!) {
    giftCardDebit(id: $id, debitInput: $debitInput) {
      giftCardDebitTransaction {
        id
        amount {
          amount
          currencyCode
        }
        processedAt
        note
        giftCard {
          id
          balance {
            amount
            currencyCode
          }
        }
      }
      userErrors {
        message
        field
        code
      }
    }
  }
`;

export const orderQuery = gql`
  query order($id: ID!) {
    order(id: $id) {
      transactions(first: 250) {
        gateway
      }
      fulfillmentOrders(first: 100) {
        edges {
          node {
            id
            lineItems(first: 250) {
              edges {
                node {
                  id
                  totalQuantity
                  lineItem {
                    variant {
                      sku
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
`;

export const fulfillGiftCardItems = gql`
  mutation fulfillmentCreate(
    $fulfillment: FulfillmentInput!
    $message: String
  ) {
    fulfillmentCreate(fulfillment: $fulfillment, message: $message) {
      fulfillment {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;
