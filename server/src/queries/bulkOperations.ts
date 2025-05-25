export const queryCurrentBulkOperation = `#graphql
  query getCurrentBulkOperation{
    currentBulkOperation {
      id
      status
      errorCode
      createdAt
      completedAt
      objectCount
      fileSize
      url
      partialDataUrl
    }
}`;
