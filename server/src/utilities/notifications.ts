import axios from "axios";
const { SLACK_WEBHOOK_URL, SLACK_DEVELOPER_WEBHOOK_URL } = process.env;
export const send_slack_notification = async (items: any) => {
  const textMessage =
    "Inventory sync completed, there are discontinued items as follows:";
  let bulletPoints: any = [];
  items.forEach((item: any) => {
    bulletPoints.push(`<${item.product}|${item.sku}>`);
  });

  let formattedBulletPoints;
  if (bulletPoints.length > 0) {
    formattedBulletPoints = bulletPoints
      .map((point: any) => `• ${point}`)
      .join("\n");
  }

  try {
    const message = {
      text: `${textMessage}\n\n${formattedBulletPoints}`,
    };
    const slackMessage = await axios.post(SLACK_WEBHOOK_URL || "", message);
    const dev_slackMessage = await axios.post(
      SLACK_DEVELOPER_WEBHOOK_URL || "",
      message
    );
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};
