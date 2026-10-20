import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { createRequirementSchema, formatZodError, listQuerySchema } from "../validators/requirementValidator";
import { createRequirement, deleteRequirementById, getRequirementById, listRequirements } from "../services/requirementService";

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createRequirementSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(formatZodError(parsed.error));
      return;
    }
    const doc = await createRequirement(parsed.data);
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json(formatZodError(parsed.error));
      return;
    }
    const data = await listRequirements(parsed.data);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, error: { message: "Invalid requirement id" } });
      return;
    }
    const doc = await getRequirementById(id);
    if (!doc) {
      res.status(404).json({ success: false, error: { message: "Requirement not found" } });
      return;
    }
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
}
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, error: { message: "Invalid requirement id" } });
      return;
    }
    const doc = await deleteRequirementById(id);
    if (!doc) {
      res.status(404).json({ success: false, error: { message: "Requirement not found" } });
      return;
    }
    res.json({ success: true, data: { _id: id } });
  } catch (err) {
    next(err);
  }
}
