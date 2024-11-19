import { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
const { SMSZASILAM_HASH } = process.env;

export const order_pickup_notification_sms = async (
  req: Request,
  res: Response
) => {
  try {
    let { phone, message } = req.body;
    console.log(req.body);
    if (!phone || !message) {
      return res.status(400).json({
        error: `Missing required fields:${!phone && "Phone"} ${
          !message && "Message"
        }`,
      });
    }

    let parsedPhone = phone.replace(/\D/g, "").replace(/^420/, "");
    let requestUrl = `https://app.smszasilam.cz/rest/?HASH=${SMSZASILAM_HASH}&number=${parsedPhone}&text=${message}`;

    console.log(
      "Sending message to",
      parsedPhone,
      "with message",
      decodeURIComponent(message)
    );

    let messageSent = await axios.post(requestUrl);

    console.log({
      message: messageSent?.data?.message,
      id: messageSent?.data?.id,
    });

    return res.status(200).json({
      message: messageSent?.data?.message,
      id: messageSent?.data?.id,
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};
