import { Request, Response } from "express";
export const order_webhook = async (req: Request, res: Response) => {
  const { order } = req.body;
  console.log(order);
  return res.status(200).json({
    order,
  });
};
