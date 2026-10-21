import type { Category } from "@/lib/wizardConfig";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://event-marketplace-3.onrender.com";

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message: string; fields?: Record<string, string> };
}

export interface Requirement {
  _id: string;
  eventName: string;
  eventType: string;
  category: Category;
  dateMode?: "single" | "range";
  startDate: string;
  endDate?: string;
  location: string;
  venue?: string;
  status?: string;
  createdAt?: string;
  budgetMin?: number;
  budgetMax?: number;
  feeMin?: number;
  feeMax?: number;
  payRate?: number;
  payUnit?: string;
  services?: string[];
  performanceType?: string;
  genre?: string;
  role?: string;
  headcount?: number;
  notes?: string;
  specialRequirements?: string;
}

async function apiRequest<T>(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>) {
  const url = `${BASE}${path}`;
  const started = performance.now();
  let status = 0;
  let payload: ApiEnvelope<T>;

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", ...extraHeaders },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    status = res.status;
    payload = await res.json().catch(() => ({
      success: false,
      error: { message: `Unexpected server response (${res.status})` },
    }));
  } catch {
    payload = { success: false, error: { message: "Network error: could not reach the server" } };
  }

  return { status, payload };
}

export async function createRequirement(body: Record<string, unknown>) {
  const { status, payload } = await apiRequest<{ _id?: string; id?: string; deleteToken?: string }>("POST", "/api/requirements", body);
  const newId = payload.data?._id ?? payload.data?.id;
  if (payload.success && newId && payload.data?.deleteToken) saveOwnedToken(newId, payload.data.deleteToken);
  return {
    ok: payload.success,
    status,
    id: payload.data?._id ?? payload.data?.id,
    fields: payload.error?.fields,
    message: payload.error?.message,
  };
}

export async function listRequirements(params: { category?: string; q?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params.category && params.category !== "all") qs.set("category", params.category);
  if (params.q) qs.set("q", params.q);
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 9));

  const { payload } = await apiRequest<unknown>("GET", `/api/requirements?${qs.toString()}`);

  // Accepts either a plain array or { items | requirements, totalPages | pages }.
  const data = payload.data;
  let items: Requirement[] = [];
  let totalPages = 1;
  if (Array.isArray(data)) {
    items = data as Requirement[];
  } else if (data && typeof data === "object") {
    const d = data as { items?: Requirement[]; requirements?: Requirement[]; totalPages?: number; pages?: number };
    items = d.items ?? d.requirements ?? [];
    totalPages = d.totalPages ?? d.pages ?? 1;
  }
  return { ok: payload.success, items, totalPages, message: payload.error?.message };
}
export async function deleteRequirement(id: string) {
  const token = getOwnedTokens()[id] ?? "";
  const { payload } = await apiRequest<unknown>("DELETE", `/api/requirements/${id}`, undefined, { "x-delete-token": token });
  if (payload.success) forgetOwnedToken(id);
  return { ok: payload.success, message: payload.error?.message };
}

const OWNED_KEY = "ownedPosts";

export function getOwnedTokens(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(OWNED_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeOwnedTokens(map: Record<string, string>) {
  try {
    window.localStorage.setItem(OWNED_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable: the post just won't show a delete button */
  }
}

export function saveOwnedToken(id: string, token: string) {
  writeOwnedTokens({ ...getOwnedTokens(), [id]: token });
}

export function forgetOwnedToken(id: string) {
  const map = getOwnedTokens();
  delete map[id];
  writeOwnedTokens(map);
}
