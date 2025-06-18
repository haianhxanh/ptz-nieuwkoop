export const bulkQueryGetProductsForBackup = `#graphql
  mutation getProducts {
    bulkOperationRunQuery(
      query: """
      {
        products(first: 250) {
          edges {
            node {
              id
              handle
              title
              descriptionHtml
              vendor
              productType
              tags
              status
              variants(first: 250) {
                edges {
                  node {
                    id
                    selectedOptions {
                      name
                      value
                    }
                    sku
                    inventoryItem {
                      measurement {
                        weight {
                          value
                        }
                      }
                      unitCost {
                        amount
                      }
                    }
                    price
                    compareAtPrice
                    barcode
                    image {
                      url
                    }
                    metafields(first: 250) {
                      edges {
                        node {
                          id
                          namespace
                          type
                          value
                        }
                      }
                    }
                  }
                }
              }
              metafields(first: 250) {
                edges {
                  node {
                    id
                    namespace
                    type
                    value
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
