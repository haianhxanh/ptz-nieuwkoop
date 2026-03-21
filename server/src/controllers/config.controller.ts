import { Request, Response } from "express";
import { z } from "zod";
import { configService } from "../services/config.service";

const configKeySchema = z.object({
  key: z.string().min(1, "Config key is required"),
});

const createConfigSchema = z.object({
  key: z.string().min(1, "Config key is required"),
  value: z.string(),
  description: z.string().optional(),
});

const updateConfigSchema = z.object({
  value: z.string(),
  description: z.string().optional(),
});

const serializeConfig = (config: any) => {
  const plain = typeof config.get === "function" ? config.get({ plain: true }) : config;
  return {
    id: plain.id,
    key: plain.key,
    value: plain.value,
    description: plain.description ?? "",
    createdAt: plain.createdAt ?? null,
    updatedAt: plain.updatedAt ?? null,
  };
};

export const listConfigs = async (req: Request, res: Response) => {
  try {
    const configs = await configService.listAll();
    return res.status(200).json({
      success: true,
      data: configs.map(serializeConfig),
    });
  } catch (error) {
    console.error("Error listing configs:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const createConfig = async (req: Request, res: Response) => {
  try {
    const data = createConfigSchema.parse(req.body);
    const config = await configService.saveConfig(data.key, data.value, data.description);
    return res.status(201).json({
      success: true,
      data: serializeConfig(config),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: error.issues.map((issue) => issue.message),
      });
    }

    console.error("Error creating config:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const updateConfig = async (req: Request, res: Response) => {
  try {
    const { key } = configKeySchema.parse(req.params);
    const data = updateConfigSchema.parse(req.body);
    const config = await configService.saveConfig(key, data.value, data.description);
    return res.status(200).json({
      success: true,
      data: serializeConfig(config),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: error.issues.map((issue) => issue.message),
      });
    }

    console.error("Error updating config:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
