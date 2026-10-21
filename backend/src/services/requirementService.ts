import type { Model } from "mongoose";
import { CrewRequirement, PerformerRequirement, PlannerRequirement, Requirement } from "../models/Requirement";
import type { CreateRequirementInput } from "../validators/requirementValidator";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MODELS: Record<string, Model<any>> = {
  planner: PlannerRequirement,
  performer: PerformerRequirement,
  crew: CrewRequirement,
};

const toDate = (s: string) => new Date(`${s}T00:00:00.000Z`);
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class DuplicateRequirementError extends Error {
  constructor() {
    super("A requirement with the same name, date and location already exists");
  }
}

export async function createRequirement(input: CreateRequirementInput) {
  const { category, startDate, endDate, ...rest } = input;
  const end = input.dateMode === "range" ? endDate ?? startDate : startDate;
  const exact = (s: string) => new RegExp(`^${escapeRegExp(s.trim())}$`, "i");
  const dup = await Requirement.findOne({
    category,
    eventName: exact(rest.eventName),
    location: exact(rest.location),
    startDate: toDate(startDate),
  }).lean();
  if (dup) throw new DuplicateRequirementError();
  return MODELS[category].create({
    ...rest,
    startDate: toDate(startDate),
    endDate: toDate(end),
  });
}

export async function listRequirements(opts: { category?: string; q?: string; page: number; limit: number }) {
  const filter: Record<string, unknown> = {};
  if (opts.category) filter.category = opts.category;
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
  filter.endDate = { $gte: today }; // hide events that have already ended
  if (opts.q) {
    const rx = new RegExp(escapeRegExp(opts.q), "i");
    filter.$or = [{ eventName: rx }, { location: rx }, { venue: rx }];
  }

  const [items, total] = await Promise.all([
    Requirement.find(filter)
      .sort({ createdAt: -1 })
      .skip((opts.page - 1) * opts.limit)
      .limit(opts.limit)
      .lean(),
    Requirement.countDocuments(filter),
  ]);

  return {
    items,
    page: opts.page,
    limit: opts.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / opts.limit)),
  };
}

export async function getRequirementById(id: string) {
  return Requirement.findById(id).lean();
}
export async function deleteRequirementById(id: string) {
  return Requirement.findByIdAndDelete(id).lean();
}
