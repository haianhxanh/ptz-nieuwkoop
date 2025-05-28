import { Request, Response } from "express";
export const order_webhook = async (req: Request, res: Response) => {
  console.log(req.body);
  return res.status(200).json({
    status: "ok",
  });
};
