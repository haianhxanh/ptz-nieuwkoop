import { gql } from "graphql-request";

export const fulfillmentOrderQuery = gql`
  query fulfillmentOrder($fulfillmentOrderId: ID!) {
    fulfillmentOrder(id: $fulfillmentOrderId) {
      order {
        id
        name
        phone
        billingAddress {
          phone
        }
      }
    }
  }
`;
