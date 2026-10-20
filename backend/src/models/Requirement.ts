import { Schema, model } from "mongoose";

const baseSchema = new Schema(
  {
    eventName: { type: String, required: true, trim: true },
    eventType: { type: String, required: true },
    dateMode: { type: String, enum: ["single", "range"], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    venue: { type: String, trim: true },
    status: { type: String, enum: ["open", "closed"], default: "open" },
  },
  { discriminatorKey: "category", timestamps: true }
);

baseSchema.index({ category: 1, createdAt: -1 });

export const Requirement = model("Requirement", baseSchema);

export const PlannerRequirement = Requirement.discriminator(
  "planner",
  new Schema({
    services: { type: [String], required: true },
    guestCount: { type: Number, required: true, min: 1 },
    budgetMin: { type: Number, required: true, min: 0 },
    budgetMax: { type: Number, required: true, min: 0 },
    experienceLevel: { type: String, required: true },
    languages: { type: [String], default: [] },
    notes: { type: String, trim: true },
  })
);

export const PerformerRequirement = Requirement.discriminator(
  "performer",
  new Schema({
    performanceType: { type: String, required: true },
    genre: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, min: 1 },
    feeMin: { type: Number, required: true, min: 0 },
    feeMax: { type: Number, required: true, min: 0 },
    equipmentProvided: { type: Boolean, required: true },
    specialRequirements: { type: String, trim: true },
  })
);

export const CrewRequirement = Requirement.discriminator(
  "crew",
  new Schema({
    role: { type: String, required: true },
    headcount: { type: Number, required: true, min: 1 },
    shiftHours: { type: Number, required: true, min: 1, max: 24 },
    payRate: { type: Number, required: true, min: 1 },
    payUnit: { type: String, enum: ["hour", "day"], required: true },
    experienceLevel: { type: String, required: true },
    notes: { type: String, trim: true },
  })
);