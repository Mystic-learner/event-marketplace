import { LIMITS, maxEventDate, LANGUAGES_REGEX } from "../utils/limits";
import { looksMeaningful, EVENT_NAME_MESSAGE } from "../utils/looksMeaningful";
import { z, ZodError } from "zod";

export const CATEGORIES = ["planner", "performer", "crew"] as const;
const EVENT_TYPES = ["Wedding", "Corporate", "Concert", "Birthday", "Festival", "Other"] as const;
const SERVICES = ["Full planning", "Decor", "Catering", "Logistics", "Vendor coordination"] as const;
const LEVELS = ["Beginner", "Intermediate", "Expert"] as const;
const PERF_TYPES = ["DJ", "Live band", "Singer", "Dancer", "Comedian", "Emcee"] as const;
const CREW_ROLES = ["Sound", "Lighting", "Stage", "Security", "Photography", "General helpers"] as const;

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
  .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date")
  .refine((s) => s <= maxEventDate(), "Date can be at most 3 years ahead");

const notes = z.string().trim().max(1000, "Keep this under 1000 characters").optional();
const money = z.number({ invalid_type_error: "Must be a number" }).min(LIMITS.MIN_MONEY, "Must be at least 1").max(LIMITS.MAX_MONEY, "Amount is too large");

const base = {
  eventName: z.string().trim().min(3, "Event name must be at least 3 characters").max(100, "Event name must be 100 characters or fewer").refine(looksMeaningful, EVENT_NAME_MESSAGE),
  eventType: z.enum(EVENT_TYPES, { errorMap: () => ({ message: "Select a valid event type" }) }),
  dateMode: z.enum(["single", "range"]),
  startDate: dateStr,
  endDate: dateStr.optional(),
  location: z.string().trim().min(2, "Location is required").max(150),
  venue: z.string().trim().max(100, "Venue must be 100 characters or fewer").optional(),
  latitude: z.number({ invalid_type_error: "Latitude must be a number" }).optional(),
  longitude: z.number({ invalid_type_error: "Longitude must be a number" }).optional(),
};

const planner = z.object({
  ...base,
  category: z.literal("planner"),
  services: z.array(z.enum(SERVICES)).min(1, "Pick at least one service"),
  guestCount: z.number().int("Must be a whole number").min(1, "At least 1 guest").max(LIMITS.MAX_GUESTS, "Guest count is too large"),
  budgetMin: money,
  budgetMax: money,
  experienceLevel: z.enum(LEVELS),
  languages: z.array(z.string().trim().min(1).max(50, "Language name is too long").regex(LANGUAGES_REGEX, "Use letters only, e.g. English")).min(1, "Add at least one language").max(10, "Too many languages"),
  notes,
});

const performer = z.object({
  ...base,
  category: z.literal("performer"),
  performanceType: z.enum(PERF_TYPES),
  genre: z.string().trim().min(2, "Genre is required").max(100),
  duration: z.number().min(1, "Duration must be at least 1 minute").max(1440, "Duration is too long"),
  feeMin: money,
  feeMax: money,
  equipmentProvided: z.boolean(),
  specialRequirements: notes,
});

const crew = z.object({
  ...base,
  category: z.literal("crew"),
  role: z.enum(CREW_ROLES),
  headcount: z.number().int("Must be a whole number").min(1, "At least 1 person").max(LIMITS.MAX_HEADCOUNT, "Headcount is too large"),
  shiftHours: z.number().min(1, "At least 1 hour").max(24, "Shift hours can't exceed 24"),
  payRate: z.number().min(1, "Pay rate must be at least 1").max(LIMITS.MAX_PAY_RATE, "Pay rate is too large"),
  payUnit: z.enum(["hour", "day"]),
  experienceLevel: z.enum(LEVELS),
  notes,
});

// 1 day of tolerance so timezone differences between client and server don't reject "today".
const earliestAllowed = () => new Date(Date.now() - 864e5).toISOString().slice(0, 10);

export const createRequirementSchema = z
  .discriminatedUnion("category", [planner, performer, crew])
  .superRefine((v, ctx) => {
    if (v.latitude === undefined || v.longitude === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["location"], message: "Select a location from the suggestions" });
    } else if (v.latitude < -90 || v.latitude > 90 || v.longitude < -180 || v.longitude > 180) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["location"], message: "Location coordinates are out of range" });
    }
    if (v.startDate < earliestAllowed()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["startDate"], message: "Date can't be in the past" });
    }
    if (v.dateMode === "range") {
      if (!v.endDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date is required" });
      } else if (v.endDate < v.startDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date can't be before start date" });
      }
    }
    if (v.category === "planner" && v.budgetMin > v.budgetMax) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["budgetMax"], message: "Maximum budget must be ≥ minimum" });
    }
    if (v.category === "performer" && v.feeMin > v.feeMax) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["feeMax"], message: "Maximum fee must be ≥ minimum" });
    }
  });

export type CreateRequirementInput = z.infer<typeof createRequirementSchema>;

export const listQuerySchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(9),
});

export function formatZodError(error: ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fields[key]) fields[key] = issue.message;
  }
  return { success: false, error: { message: "Validation failed", fields } };
}