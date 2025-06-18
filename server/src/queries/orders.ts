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
              currentShippingPriceSet {
                shopMoney {
                  amount
                }
              }
              lineItems(first: 250) {
                edges {
                  node {
                    title
                    quantity
                    sku
                    originalUnitPriceSet {
                      shopMoney {
                        amount
                      }
                    }
                    originalTotalSet {
                      shopMoney {
                        amount
                      }
                    }
                    product {
                      title
                    }
                    discountAllocations {
                      allocatedAmountSet {
                        shopMoney {
                          amount
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
