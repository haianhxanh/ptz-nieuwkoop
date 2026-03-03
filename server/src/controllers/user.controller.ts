import { Request, Response } from "express";
import User from "../model/user.model";

export const getMe = async (req: Request, res: Response) => {
  try {
    const email = req.userEmail;
    if (!email) return res.status(401).json({ error: "Unauthorized" });

    const [user] = await User.findOrCreate({
      where: { email },
      defaults: { email },
    });

    return res.json({ success: true, data: user });
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
