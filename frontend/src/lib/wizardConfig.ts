import { looksMeaningful, EVENT_NAME_MESSAGE } from "./looksMeaningful";
import { z } from "zod";

export type Category = "planner" | "performer" | "crew";
export type DetailValue = string | string[];
export type Details = Record<string, DetailValue>;
export type Option = { value: string; label: string };

export interface Basics {
  eventName: string;
  eventType: string;
  dateMode: "single" | "range";
  startDate: string;
  endDate: string;
  location: string;
  venue: string;
  category: Category | "";
  locationCoords: { lat: number; lng: number } | null;
}

export const EMPTY_BASICS: Basics = {
  eventName: "",
  eventType: "",
  dateMode: "single",
  startDate: "",
  endDate: "",
  location: "",
  venue: "",
  category: "",
  locationCoords: null,
};

const opts = (...v: string[]): Option[] => v.map((x) => ({ value: x, label: x }));

export const EVENT_TYPES = opts("Wedding", "Corporate", "Concert", "Birthday", "Festival", "Other");

export const CATEGORIES: { id: Category; label: string; blurb: string }[] = [
  { id: "planner", label: "Planner", blurb: "Someone to plan and coordinate the event" },
  { id: "performer", label: "Performer", blurb: "Artists, DJs and live acts" },
  { id: "crew", label: "Crew", blurb: "Technical and on-ground staff" },
];

/* ---------- field definitions (drive the UI) ---------- */
type Base = { name: string; label: string; placeholder?: string };
export type FieldDef =
  | (Base & { kind: "text" | "number" | "textarea" })
  | (Base & { kind: "select"; options: Option[] })
  | (Base & { kind: "multi"; options: Option[] });

const SERVICES = opts("Full planning", "Decor", "Catering", "Logistics", "Vendor coordination");
const LEVELS = opts("Beginner", "Intermediate", "Expert");
const PERF_TYPES = opts("DJ", "Live band", "Singer", "Dancer", "Comedian", "Emcee");
const CREW_ROLES = opts("Sound", "Lighting", "Stage", "Security", "Photography", "General helpers");
const YES_NO: Option[] = [
  { value: "yes", label: "Yes, equipment provided" },
  { value: "no", label: "No, performer brings their own" },
];
const PAY_UNITS: Option[] = [
  { value: "hour", label: "Per hour" },
  { value: "day", label: "Per day" },
];

export const CATEGORY_STEPS: Record<Category, [FieldDef[], FieldDef[]]> = {
  planner: [
    [
      { kind: "multi", name: "services", label: "Services needed", options: SERVICES },
      { kind: "number", name: "guestCount", label: "Guest count", placeholder: "e.g. 250" },
      { kind: "number", name: "budgetMin", label: "Minimum budget (₹)", placeholder: "50000" },
      { kind: "number", name: "budgetMax", label: "Maximum budget (₹)", placeholder: "200000" },
    ],
    [
      { kind: "select", name: "experienceLevel", label: "Experience level", options: LEVELS },
      { kind: "text", name: "languages", label: "Preferred languages", placeholder: "e.g. English, Hindi" },
      { kind: "textarea", name: "notes", label: "Additional notes" },
    ],
  ],
  performer: [
    [
      { kind: "select", name: "performanceType", label: "Performance type", options: PERF_TYPES },
      { kind: "text", name: "genre", label: "Genre / style", placeholder: "e.g. Bollywood, EDM" },
      { kind: "number", name: "duration", label: "Duration (minutes)", placeholder: "90" },
    ],
    [
      { kind: "number", name: "feeMin", label: "Minimum fee (₹)", placeholder: "8000" },
      { kind: "number", name: "feeMax", label: "Maximum fee (₹)", placeholder: "15000" },
      { kind: "select", name: "equipmentProvided", label: "Equipment", options: YES_NO },
      { kind: "textarea", name: "specialRequirements", label: "Special requirements" },
    ],
  ],
  crew: [
    [
      { kind: "select", name: "role", label: "Role", options: CREW_ROLES },
      { kind: "number", name: "headcount", label: "Headcount", placeholder: "4" },
    ],
    [
      { kind: "number", name: "shiftHours", label: "Shift hours", placeholder: "8" },
      { kind: "number", name: "payRate", label: "Pay rate (₹)", placeholder: "250" },
      { kind: "select", name: "payUnit", label: "Pay unit", options: PAY_UNITS },
      { kind: "select", name: "experienceLevel", label: "Experience level", options: LEVELS },
      { kind: "textarea", name: "notes", label: "Notes" },
    ],
  ],
};

export const STEP_TITLES: Record<Category, [string, string]> = {
  planner: ["Scope & budget", "Experience & notes"],
  performer: ["Performance", "Fee & logistics"],
  crew: ["Role & team", "Shifts & pay"],
};

/* ---------- validation ---------- */
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const num = (label: string, min = 0, int = false) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((v) => v === "" || !Number.isNaN(Number(v)), `${label} must be a number`)
    .refine((v) => v === "" || Number(v) >= min, `${label} must be at least ${min}`)
    .refine((v) => !int || v === "" || Number.isInteger(Number(v)), `${label} must be a whole number`);

const pick = (label: string, options: Option[]) =>
  z.string().refine((v) => options.some((o) => o.value === v), `Select ${label}`);

export const basicsSchema = z
  .object({
    eventName: z
      .string()
      .trim()
      .min(3, "Event name must be at least 3 characters")
      .max(100, "Event name must be 100 characters or fewer")
      .refine(looksMeaningful, EVENT_NAME_MESSAGE),
    eventType: pick("an event type", EVENT_TYPES),
    dateMode: z.enum(["single", "range"]),
    startDate: z.string().min(1, "Date is required"),
    endDate: z.string(),
    location: z.string().trim().min(2, "Select a location from the suggestions"),
    locationCoords: z
      .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
      .nullable()
      .optional(),
    venue: z.string().trim().max(100, "Venue must be 100 characters or fewer").optional(),
    category: z.string().refine((v) => CATEGORIES.some((c) => c.id === v), "Select a category"),
  })
  .superRefine((v, ctx) => {
    if (!v.locationCoords) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["location"], message: "Select a location from the suggestions" });
    }
    if (v.startDate && v.startDate < todayStr()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["startDate"], message: "Date can't be in the past" });
    }
    if (v.dateMode === "range") {
      if (!v.endDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date is required" });
      } else if (v.startDate && v.endDate < v.startDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date can't be before start date" });
      }
    }
  });

const notes = z.string().trim().max(1000, "Keep this under 1000 characters").optional();

export const STEP_SCHEMAS: Record<Category, [z.ZodTypeAny, z.ZodTypeAny]> = {
  planner: [
    z
      .object({
        services: z.array(z.string()).min(1, "Pick at least one service"),
        guestCount: num("Guest count", 1, true),
        budgetMin: num("Minimum budget"),
        budgetMax: num("Maximum budget"),
      })
      .superRefine((v, ctx) => {
        if (v.budgetMin !== "" && v.budgetMax !== "" && Number(v.budgetMin) > Number(v.budgetMax)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["budgetMax"], message: "Maximum budget must be ≥ minimum" });
        }
      }),
    z.object({
      experienceLevel: pick("an experience level", LEVELS),
      languages: z.string().trim().min(1, "Add at least one language"),
      notes,
    }),
  ],
  performer: [
    z.object({
      performanceType: pick("a performance type", PERF_TYPES),
      genre: z.string().trim().min(2, "Genre is required"),
      duration: num("Duration", 1),
    }),
    z
      .object({
        feeMin: num("Minimum fee"),
        feeMax: num("Maximum fee"),
        equipmentProvided: pick("an option", YES_NO),
        specialRequirements: notes,
      })
      .superRefine((v, ctx) => {
        if (v.feeMin !== "" && v.feeMax !== "" && Number(v.feeMin) > Number(v.feeMax)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["feeMax"], message: "Maximum fee must be ≥ minimum" });
        }
      }),
  ],
  crew: [
    z.object({
      role: pick("a role", CREW_ROLES),
      headcount: num("Headcount", 1, true),
    }),
    z.object({
      shiftHours: num("Shift hours", 1).refine((v) => v === "" || Number(v) <= 24, "Shift hours can't exceed 24"),
      payRate: num("Pay rate", 1),
      payUnit: pick("a pay unit", PAY_UNITS),
      experienceLevel: pick("an experience level", LEVELS),
      notes,
    }),
  ],
};

/** Returns { fieldName: firstErrorMessage }. Empty object = valid. */
export function validate(schema: z.ZodTypeAny, data: unknown): Record<string, string> {
  const result = schema.safeParse(data);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/** Makes sure every field of a step exists so zod never says just "Required". */
export function withDefaults(fields: FieldDef[], details: Details): Details {
  const out: Details = {};
  for (const f of fields) out[f.name] = details[f.name] ?? (f.kind === "multi" ? [] : "");
  return out;
}

const BASIC_KEYS = ["eventName", "eventType", "dateMode", "startDate", "endDate", "location", "venue", "category"];

/** Which wizard step (0-3) a field lives on; used to jump to server-side errors. */
export function fieldStep(category: Category, name: string): number {
  if (BASIC_KEYS.includes(name)) return 0;
  if (CATEGORY_STEPS[category][0].some((f) => f.name === name)) return 1;
  if (CATEGORY_STEPS[category][1].some((f) => f.name === name)) return 2;
  return 3;
}

const NUMERIC = new Set(["guestCount", "budgetMin", "budgetMax", "duration", "feeMin", "feeMax", "headcount", "shiftHours", "payRate"]);

/** Converts wizard strings into the typed JSON the API expects. */
export function buildPayload(basics: Basics, details: Details) {
  const out: Record<string, unknown> = {
    eventName: basics.eventName.trim(),
    eventType: basics.eventType,
    dateMode: basics.dateMode,
    startDate: basics.startDate,
    endDate: basics.dateMode === "range" ? basics.endDate : basics.startDate,
    location: basics.location.trim(),
    latitude: basics.locationCoords?.lat,
    longitude: basics.locationCoords?.lng,
    category: basics.category,
  };
  if (basics.venue.trim()) out.venue = basics.venue.trim();
  for (const [key, v] of Object.entries(details)) {
    if (Array.isArray(v)) out[key] = v;
    else if (NUMERIC.has(key)) out[key] = Number(v);
    else if (key === "equipmentProvided") out[key] = v === "yes";
    else if (key === "languages") out[key] = v.split(",").map((s) => s.trim()).filter(Boolean);
    else if (v.trim() !== "") out[key] = v.trim();
  }
  return out;
}