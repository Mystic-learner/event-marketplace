"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Music, Search, Sparkles, Trash2, Wrench } from "lucide-react";
import { deleteRequirement, listRequirements, type Requirement } from "@/lib/api";

const TABS = [
  { id: "all", label: "All" },
  { id: "planner", label: "Planners" },
  { id: "performer", label: "Performers" },
  { id: "crew", label: "Crew" },
] as const;

const THEME = {
  planner: { grad: "from-[#2b2418] to-[#54442a]", Icon: Sparkles, label: "Planner" },
  performer: { grad: "from-[#2a1f26] to-[#4d3647]", Icon: Music, label: "Performer" },
  crew: { grad: "from-[#1e2a27] to-[#35504a]", Icon: Wrench, label: "Crew" },
} as const;

const inr = (n?: number) => (n === undefined ? "" : `\u20B9${n.toLocaleString("en-IN")}`);

function priceOf(r: Requirement): string {
  if (r.category === "planner" && r.budgetMin !== undefined) return `${inr(r.budgetMin)} \u2013 ${inr(r.budgetMax)}`;
  if (r.category === "performer" && r.feeMin !== undefined) return `${inr(r.feeMin)} \u2013 ${inr(r.feeMax)}`;
  if (r.category === "crew" && r.payRate !== undefined) return `${inr(r.payRate)}/${r.payUnit === "day" ? "day" : "hr"}`;
  return "";
}

function priceLabel(r: Requirement): string {
  if (r.category === "planner") return "Budget";
  if (r.category === "performer") return "Fee";
  return "Pay";
}

function fmtDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function tagsOf(r: Requirement): string[] {
  if (r.category === "planner") return r.services ?? [];
  if (r.category === "performer") return [r.performanceType, r.genre].filter((x): x is string => Boolean(x));
  return [r.role, r.headcount ? `${r.headcount} people` : undefined].filter((x): x is string => Boolean(x));
}

export default function FeedPage() {
  const [tab, setTab] = useState<string>("all");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Requirement[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function onDelete(id: string) {
    const res = await deleteRequirement(id);
    setConfirmId(null);
    if (res.ok) setItems((prev) => prev.filter((r) => r._id !== id));
    else setError(res.message ?? "Could not delete this requirement");
  }

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listRequirements({ category: tab, q: debouncedQ, page }).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setItems([]);
        setError(res.message ?? "Could not load requirements");
      } else {
        setItems(res.items);
        setTotalPages(res.totalPages);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [tab, debouncedQ, page]);

  return (
    <main>
      <section className="relative overflow-hidden bg-gradient-to-b from-[#f1e8d8] to-[#faf7f2] px-4 pb-14 pt-14 text-center sm:pt-20">
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#e9dcc3]/50 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-stone-200/60 blur-3xl" />
        <div className="relative mx-auto max-w-3xl">
          <p className="font-serif text-base italic text-[#a68a5b]">For moments that deserve nothing less than extraordinary</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-stone-900 sm:text-6xl">Live Event Requirements &amp; Opportunities</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-stone-600 sm:text-base">
            Planners, performers and crew, matched with the events that need them.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/post-requirement" className="rounded-full bg-stone-900 px-7 py-3 text-xs font-semibold uppercase tracking-widest text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">
              Post a requirement
            </Link>
            <a href="#feed" className="rounded-full border border-stone-300 bg-white/70 px-7 py-3 text-xs font-semibold uppercase tracking-widest text-stone-700 backdrop-blur transition hover:bg-white">
              Browse opportunities
            </a>
          </div>
        </div>
      </section>

      <section id="feed" className="mx-auto max-w-6xl px-4 pb-20">
        <div className="mx-auto -mt-2 max-w-md">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by event, venue, or location..."
              aria-label="Search requirements"
              className="w-full rounded-full border border-[#e7e0d5] bg-white py-3 pl-11 pr-5 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-[#a68a5b]/40"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2" role="tablist" aria-label="Category filter">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                setTab(t.id);
                setPage(1);
              }}
              className={`rounded-full border px-5 py-2 text-[11px] font-semibold uppercase tracking-widest transition ${
                tab === t.id ? "border-[#a68a5b] bg-[#a68a5b] text-white shadow" : "border-[#e7e0d5] bg-white text-stone-600 hover:border-[#a68a5b]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy={loading}>
          {loading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-72 animate-pulse rounded-2xl bg-stone-200/60" />)}

          {!loading &&
            items.map((r) => {
              const theme = THEME[r.category];
              const Icon = theme.Icon;
              return (
                <article key={r._id} className="group flex flex-col overflow-hidden rounded-2xl border border-[#e7e0d5] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className={`relative overflow-hidden bg-gradient-to-br ${theme.grad} px-5 pb-5 pt-5 text-white`}>
                    <Icon className="absolute -right-4 -top-4 h-28 w-28 opacity-15 transition duration-500 group-hover:rotate-12 group-hover:scale-110" />
                    <div className="relative flex items-center justify-between">
                      <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest backdrop-blur">
                        <Icon className="h-3 w-3" /> {theme.label}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-white/80">{timeAgo(r.createdAt)}</span>
                    </div>
                    <p className="relative mt-6 text-[10px] uppercase tracking-widest text-white/70">{priceLabel(r)}</p>
                    <p className="relative font-serif text-3xl leading-tight text-[#ead9b0]">{priceOf(r)}</p>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <h2 className="font-serif text-xl leading-snug text-stone-900">{r.eventName}</h2>
                    <p className="flex items-center gap-2 text-xs text-stone-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-[#a68a5b]" />
                      {r.location}
                      {r.venue ? ` \u00B7 ${r.venue}` : ""}
                    </p>
                    <p className="flex items-center gap-2 text-xs text-stone-500">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#a68a5b]" />
                      {r.eventType} {"\u00B7"} {fmtDate(r.startDate)}
                      {r.endDate && r.endDate !== r.startDate ? ` \u2192 ${fmtDate(r.endDate)}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {tagsOf(r).map((t) => (
                        <span key={t} className="rounded-full bg-[#faf7f2] px-2.5 py-0.5 text-[11px] text-stone-600">
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="mt-auto flex items-center gap-2 border-t border-[#efe9de] pt-3 text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                      {r.status ?? "open"}
                      {confirmId === r._id ? (
                        <span className="ml-auto flex items-center gap-2">
                          <button type="button" onClick={() => onDelete(r._id)} className="rounded-full bg-red-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white">
                            Confirm
                          </button>
                          <button type="button" onClick={() => setConfirmId(null)} className="text-[10px] uppercase tracking-widest text-stone-500">
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmId(r._id)}
                          aria-label={`Delete ${r.eventName}`}
                          className="ml-auto rounded-full p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
        </div>

        {!loading && error && <p role="alert" className="mt-10 text-center text-sm text-red-600">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="mt-10 text-center text-sm text-stone-500">No requirements found. Try another category or search.</p>
        )}

        {totalPages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-4 text-sm" aria-label="Pagination">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-full border border-[#e7e0d5] bg-white px-4 py-1.5 disabled:opacity-40">Previous</button>
            <span className="text-stone-500">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-full border border-[#e7e0d5] bg-white px-4 py-1.5 disabled:opacity-40">Next</button>
          </nav>
        )}
      </section>
    </main>
  );
}