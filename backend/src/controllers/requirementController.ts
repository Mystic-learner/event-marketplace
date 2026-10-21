import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { Requirement } from "../models/Requirement";
import { createRequirementSchema, formatZodError, listQuerySchema } from "../validators/requirementValidator";
import { DuplicateRequirementError, createRequirement, deleteRequirementById, getRequirementById, listRequirements } from "../services/requirementService";

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

function tokenMatches(token: string | undefined, stored: string | undefined) {
  if (!token || !stored) return false;
  const a = Buffer.from(hashToken(token));
  const b = Buffer.from(stored);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createRequirementSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(formatZodError(parsed.error));
      return;
    }
    const doc = await createRequirement(parsed.data).catch((e) => (e instanceof DuplicateRequirementError ? null : Promise.reject(e)));
    if (!doc) {
      res.status(409).json({ success: false, error: { message: "You have already posted this requirement (same name, date and location)." } });
      return;
    }
    const deleteToken = randomBytes(24).toString("hex");
    await Requirement.updateOne({ _id: doc._id }, { $set: { deleteTokenHash: hashToken(deleteToken) } });
    res.status(201).json({ success: true, data: { ...doc.toObject(), deleteToken } });
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
    const existing = await Requirement.findById(id).select("+deleteTokenHash").lean();
    if (!existing) {
      res.status(404).json({ success: false, error: { message: "Requirement not found" } });
      return;
    }
    if (!tokenMatches(req.header("x-delete-token"), (existing as { deleteTokenHash?: string }).deleteTokenHash)) {
      res.status(403).json({ success: false, error: { message: "You can only delete requirements you posted" } });
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
