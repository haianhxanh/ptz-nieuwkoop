import { Request, Response } from "express";
import GiftCard from "../model/giftCard.model";

export const codes_prepopulate = async (req: Request, res: Response) => {
  try {
    const newGiftCard = await GiftCard.create({
      last_characters: "3456",
    });
    console.log("New gift card created:", newGiftCard);
    return res.status(200).json({ message: "New gift card created" });
  } catch (error) {
    console.error("Error adding new codes:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
