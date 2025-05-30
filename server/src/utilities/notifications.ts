import axios from "axios";
const { SLACK_WEBHOOK_URL, SLACK_DEVELOPER_WEBHOOK_URL } = process.env;
export const send_slack_notification = async (discontinuedItems: any, costUpdatedItems: any) => {
  let discontinuedItemsMessage = "";
  // join discontinuedItems with comma
  const discontinuedItemsString = discontinuedItems.map((item: any) => `<${item.product}|${item.sku}>`).join(", ");
  if (discontinuedItems.length > 0) {
    discontinuedItemsMessage = "There are discontinued items as follows:";
    try {
      const message = {
        text: `${discontinuedItemsMessage}\n\n${discontinuedItemsString}`,
      };
      const slackMessage = await axios.post(SLACK_WEBHOOK_URL || "", message);
      const dev_slackMessage = await axios.post(SLACK_DEVELOPER_WEBHOOK_URL || "", message);
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  }

  if (costUpdatedItems.length > 0) {
    let costUpdatedItemsMessage = "Price of following items has been updated:";
    let costUpdatedItemsBulletPoints: any = [];
    let formattedCostUpdatedBulletPoints;
    costUpdatedItems.forEach((item: any) => {
      costUpdatedItemsBulletPoints.push(`<${item.product}|${item.sku}>: € ${item.oldCost} -> € ${item.newCost}`);
    });
    if (costUpdatedItemsBulletPoints.length > 0) {
      formattedCostUpdatedBulletPoints = costUpdatedItemsBulletPoints.map((point: any) => `• ${point}`).join("\n");
    }

    try {
      const message = {
        text: `${costUpdatedItemsMessage}\n\n${formattedCostUpdatedBulletPoints}`,
      };
      const slackMessage = await axios.post(SLACK_WEBHOOK_URL || "", message);
      const dev_slackMessage = await axios.post(SLACK_DEVELOPER_WEBHOOK_URL || "", message);
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  }
};

export const notify_dev = async (errorType: string, errors: any) => {
  try {
    const message = {
      text: `${errorType}: ${JSON.stringify(errors)}`,
    };
    const slackMessage = await axios.post(SLACK_DEVELOPER_WEBHOOK_URL || "", message);
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};
