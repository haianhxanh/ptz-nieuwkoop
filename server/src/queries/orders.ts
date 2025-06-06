export const bulkQueryGetOrders = (query: string) => `#graphql
  mutation getOrders {
    bulkOperationRunQuery(
      query: """
      {
        orders(query: "${query}") {
          edges {
            node {
              id
              createdAt
              sourceName
              name
              subtotalPrice
              lineItems(first: 250) {
                edges {
                  node {
                    title
                    originalTotalSet {
                      shopMoney {
                        amount
                      }
                    }
                    product {
                      title
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
