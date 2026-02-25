import { Request, Response } from "express";
import { offersService } from "../services/offer.service";
import { createOfferSchema, updateOfferSchema, offerIdSchema, addItemsToOfferSchema, listOffersQuerySchema } from "../schemas/offer.schema";
import { z } from "zod";

export const createOffer = async (req: Request, res: Response) => {
  try {
    const validatedData = createOfferSchema.parse(req.body);

    const offer = await offersService.createOffer(validatedData);

    return res.status(201).json({
      success: true,
      data: offer,
      message: "Offer created successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: error.issues.map((issue: any) => issue.message),
      });
    }

    console.error("Error creating offer:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const listOffers = async (req: Request, res: Response) => {
  try {
    const validatedQuery = listOffersQuerySchema.parse(req.query);

    const result = await offersService.listOffers(validatedQuery);

    return res.status(200).json({
      success: true,
      data: result.data,
      total: result.total,
      limit: validatedQuery.limit || 50,
      offset: validatedQuery.offset || 0,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: error.issues.map((issue: any) => issue.message),
      });
    }

    console.error("Error listing offers:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const getOffer = async (req: Request, res: Response) => {
  try {
    const { id } = offerIdSchema.parse(req.params);

    const offer = await offersService.getOfferById(id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: "Offer not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: error.issues.map((issue: any) => issue.message),
      });
    }

    console.error("Error getting offer:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const updateOffer = async (req: Request, res: Response) => {
  try {
    const { id } = offerIdSchema.parse(req.params);

    console.log("Update offer request body:", JSON.stringify(req.body, null, 2));

    const validatedData = updateOfferSchema.parse(req.body);

    const offer = await offersService.updateOffer(id, validatedData);

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: "Offer not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: offer,
      message: "Offer updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: error.issues.map((issue: any) => issue.message),
      });
    }

    console.error("Error updating offer:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const addItemsToOffer = async (req: Request, res: Response) => {
  try {
    const { id } = offerIdSchema.parse(req.params);

    const validatedData = addItemsToOfferSchema.parse(req.body);

    const offer = await offersService.addItemsToOffer(id, validatedData);

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: "Offer not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: offer,
      message: "Items added successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: error.issues.map((issue: any) => issue.message),
      });
    }

    console.error("Error adding items to offer:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const deleteOffer = async (req: Request, res: Response) => {
  try {
    const { id } = offerIdSchema.parse(req.params);

    const success = await offersService.deleteOffer(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: "Offer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: error.issues.map((issue: any) => issue.message),
      });
    }

    console.error("Error deleting offer:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const listCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await offersService.listCustomers();

    return res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error("Error listing customers:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const customer = await offersService.updateCustomer(id, data);

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Error updating customer:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
