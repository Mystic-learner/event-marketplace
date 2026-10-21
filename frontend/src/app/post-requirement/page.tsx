"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createRequirement } from "@/lib/api";
import LocationInput from "@/components/LocationInput";
import Select from "@/components/Select";
import {
  CATEGORIES,
  CATEGORY_STEPS,
  EVENT_TYPES,
  STEP_SCHEMAS,
  STEP_TITLES,
  basicsSchema,
  buildPayload,
  fieldStep,
  validate,
  withDefaults,
  type DetailValue,
  type FieldDef,
} from "@/lib/wizardConfig";
import { useWizardStore } from "@/store/wizardStore";

const inputCls = (err?: string) =>
  `w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-[#a68a5b]/40 ${
    err ? "border-red-400 bg-red-50/40" : "border-[#e7e0d5] bg-[#faf7f2]"
  }`;

function Field({ label, htmlFor, error, children }: { label: string; htmlFor?: string; error?: string; children: ReactNode }) {
  const cls = "mb-1.5 block text-xs font-semibold text-stone-700";
  return (
    <div>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={cls}>
          {label}
        </label>
      ) : (
        <span className={cls}>{label}</span>
      )}
      {children}
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function DetailField({
  def,
  value,
  error,
  onChange,
}: {
  def: FieldDef;
  value: DetailValue;
  error?: string;
  onChange: (v: DetailValue) => void;
}) {
  if (def.kind === "multi") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <Field label={def.label} error={error}>
        <div className="flex flex-wrap gap-2">
          {def.options.map((o) => {
            const on = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(on ? selected.filter((s) => s !== o.value) : [...selected, o.value])}
                className={`rounded-full border px-4 py-1.5 text-xs transition ${
                  on ? "border-[#a68a5b] bg-[#a68a5b] text-white" : "border-[#e7e0d5] bg-white text-stone-600 hover:border-[#a68a5b]"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </Field>
    );
  }

  const v = typeof value === "string" ? value : "";
  return (
    <Field label={def.label} htmlFor={def.name} error={error}>
      {def.kind === "textarea" ? (
        <textarea id={def.name} rows={4} value={v} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls(error)} />
      ) : def.kind === "select" ? (
        <Select id={def.name} value={v} options={def.options} onChange={onChange} error={error} />
      ) : (
        <input
          id={def.name}
          type={def.kind === "number" ? "number" : "text"}
          min={def.kind === "number" ? 0 : undefined}
          value={v}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls(error)}
        />
      )}
    </Field>
  );
}

function displayValue(def: FieldDef, value: DetailValue | undefined): string {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (!value) return "—";
  if (def.kind === "select") return def.options.find((o) => o.value === value)?.label ?? value;
  return value;
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
}

export default function PostRequirementPage() {
  const w = useWizardStore();
  const [mounted, setMounted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [refId, setRefId] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => setMounted(true), []);

  const b = w.basics;
  const cat = b.category;
  const labels = ["Event basics", ...(cat ? STEP_TITLES[cat] : ["Details", "More details"]), "Review"];

  function validateStep(): Record<string, string> {
    if (w.step === 0) return validate(basicsSchema, b);
    if (w.step === 1 || w.step === 2) {
      if (!cat) return { category: "Select a category" };
      const fields = CATEGORY_STEPS[cat][w.step - 1];
      return validate(STEP_SCHEMAS[cat][w.step - 1], withDefaults(fields, w.details));
    }
    return {};
  }

  function firstInvalid(): { step: number; errors: Record<string, string> } | null {
    const be = validate(basicsSchema, b);
    if (Object.keys(be).length) return { step: 0, errors: be };
    if (!cat) return { step: 0, errors: { category: "Select a category" } };
    for (const i of [0, 1] as const) {
      const e = validate(STEP_SCHEMAS[cat][i], withDefaults(CATEGORY_STEPS[cat][i], w.details));
      if (Object.keys(e).length) return { step: i + 1, errors: e };
    }
    return null;
  }

  function onNext() {
    const e = validateStep();
    setErrors(e);
    if (Object.keys(e).length === 0) w.next();
  }

  function onBack() {
    setErrors({});
    w.back();
  }

  async function onSubmit() {
    if (inFlight.current) return; // double-submit guard
    const bad = firstInvalid();
    if (bad) {
      setErrors(bad.errors);
      w.goTo(bad.step);
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setSubmitError(null);

    const res = await createRequirement(buildPayload(b, w.details));

    inFlight.current = false;
    setSubmitting(false);

    if (res.ok) {
      setRefId(res.id ?? "pending");
      setErrors({});
      w.reset();
      return;
    }
    if (res.fields && Object.keys(res.fields).length > 0 && cat) {
      setErrors(res.fields);
      w.goTo(fieldStep(cat, Object.keys(res.fields)[0]));
    }
    setSubmitError(res.message ?? "Something went wrong. Please try again.");
  }

  if (!mounted) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="h-96 animate-pulse rounded-3xl bg-stone-200/60" />
      </main>
    );
  }

  if (refId) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-3xl border border-[#e7e0d5] bg-white p-10 text-center shadow-sm">
          <p className="font-serif text-sm italic text-[#a68a5b]">Requirement published</p>
          <h1 className="mt-2 font-serif text-3xl text-stone-900">Thank you!</h1>
          <p className="mt-4 text-sm text-stone-600">Your reference ID</p>
          <p className="mt-1 font-mono text-lg tracking-widest text-stone-900">REQ-{refId.slice(-8).toUpperCase()}</p>
          <div className="mt-8 flex justify-center gap-3">
            <button onClick={() => setRefId(null)} className="rounded-full bg-stone-900 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white">
              Post another
            </button>
            <Link href="/" className="rounded-full border border-[#e7e0d5] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-stone-700">
              Browse feed
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const stepFields = cat && (w.step === 1 || w.step === 2) ? CATEGORY_STEPS[cat][w.step - 1] : [];

  const reviewSections = [
    {
      title: "Event basics",
      step: 0,
      rows: [
        ["Event name", b.eventName || "—"],
        ["Event type", b.eventType || "—"],
        ["Date", b.dateMode === "range" ? `${fmtDate(b.startDate)} → ${fmtDate(b.endDate)}` : fmtDate(b.startDate)],
        ["Location", b.location || "—"],
        ["Venue", b.venue || "—"],
        ["Category", CATEGORIES.find((c) => c.id === cat)?.label ?? "—"],
      ],
    },
    ...(cat
      ? ([0, 1] as const).map((i) => ({
          title: STEP_TITLES[cat][i],
          step: i + 1,
          rows: CATEGORY_STEPS[cat][i].map((f) => [f.label, displayValue(f, w.details[f.name])]),
        }))
      : []),
  ];

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/" className="text-[11px] font-semibold uppercase tracking-widest text-[#a68a5b]">
        ← Return to marketplace
      </Link>

      <div className="mt-6 rounded-3xl border border-[#e7e0d5] bg-white p-6 shadow-sm sm:p-10">
        <header className="text-center">
          <p className="font-serif text-sm italic text-[#a68a5b]">Submit your event vision</p>
          <h1 className="mt-1 font-serif text-3xl text-stone-900">Post a new requirement</h1>
        </header>

        <ol className="my-8 flex items-start justify-between gap-2" aria-label="Progress">
          {labels.map((l, i) => (
            <li key={i} aria-current={i === w.step ? "step" : undefined} className="flex flex-1 flex-col items-center gap-1 text-center">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                  i <= w.step ? "bg-[#a68a5b] text-white" : "bg-stone-200 text-stone-500"
                }`}
              >
                {i + 1}
              </span>
              <span className="hidden text-[10px] uppercase tracking-wider text-stone-500 sm:block">{l}</span>
            </li>
          ))}
        </ol>

        {w.notice && (
          <div role="status" className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <span>{w.notice}</span>
            <button type="button" onClick={w.dismissNotice} className="font-semibold underline">
              Dismiss
            </button>
          </div>
        )}

        <div className="space-y-5">
          {w.step === 0 && (
            <>
              <Field label="Who are you looking for?" error={errors.category}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={cat === c.id}
                      onClick={() => w.setCategory(c.id)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        cat === c.id ? "border-[#a68a5b] bg-[#a68a5b] text-white" : "border-[#e7e0d5] bg-[#faf7f2] hover:border-[#a68a5b]"
                      }`}
                    >
                      <span className="block text-sm font-semibold">{c.label}</span>
                      <span className={`mt-1 block text-[11px] ${cat === c.id ? "text-white/80" : "text-stone-500"}`}>{c.blurb}</span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Event name" htmlFor="eventName" error={errors.eventName}>
                <input id="eventName" value={b.eventName} placeholder="e.g. Royal Palace Reception & Gala" onChange={(e) => w.setBasics({ eventName: e.target.value })} className={inputCls(errors.eventName)} />
              </Field>

              <Field label="Event type" htmlFor="eventType" error={errors.eventType}>
                <Select id="eventType" value={b.eventType} options={EVENT_TYPES} onChange={(v) => w.setBasics({ eventType: v })} error={errors.eventType} />
              </Field>

              <div className="flex gap-2" role="group" aria-label="Date mode">
                {(["single", "range"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={b.dateMode === m}
                    onClick={() => w.setBasics({ dateMode: m })}
                    className={`rounded-full border px-4 py-1.5 text-xs ${
                      b.dateMode === m ? "border-[#a68a5b] bg-[#a68a5b] text-white" : "border-[#e7e0d5] bg-white text-stone-600"
                    }`}
                  >
                    {m === "single" ? "Single date" : "Date range"}
                  </button>
                ))}
              </div>

              <div className={b.dateMode === "range" ? "grid gap-4 sm:grid-cols-2" : ""}>
                <Field label={b.dateMode === "range" ? "Start date" : "Event date"} htmlFor="startDate" error={errors.startDate}>
                  <input id="startDate" type="date" value={b.startDate} onChange={(e) => w.setBasics({ startDate: e.target.value })} className={inputCls(errors.startDate)} />
                </Field>
                {b.dateMode === "range" && (
                  <Field label="End date" htmlFor="endDate" error={errors.endDate}>
                    <input id="endDate" type="date" value={b.endDate} onChange={(e) => w.setBasics({ endDate: e.target.value })} className={inputCls(errors.endDate)} />
                  </Field>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Location" htmlFor="location" error={errors.location}>
                  <LocationInput id="location" value={b.location} coords={b.locationCoords ?? null} error={errors.location} onChange={(text) => w.setBasics({ location: text, locationCoords: null })} onSelect={(label, c) => w.setBasics({ location: label, locationCoords: c })} />
                </Field>
                <Field label="Venue (optional)" htmlFor="venue" error={errors.venue}>
                  <input id="venue" value={b.venue} placeholder="e.g. Taj Lake Palace" onChange={(e) => w.setBasics({ venue: e.target.value })} className={inputCls(errors.venue)} />
                </Field>
              </div>
            </>
          )}

          {(w.step === 1 || w.step === 2) &&
            stepFields.map((def) => (
              <DetailField
                key={def.name}
                def={def}
                value={w.details[def.name] ?? (def.kind === "multi" ? [] : "")}
                error={errors[def.name]}
                onChange={(v) => w.setDetail(def.name, v)}
              />
            ))}

          {w.step === 3 && (
            <div className="space-y-6">
              {reviewSections.map((s) => (
                <section key={s.title} className="rounded-2xl border border-[#e7e0d5] p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-serif text-lg text-stone-900">{s.title}</h2>
                    <button type="button" onClick={() => w.goTo(s.step)} className="text-xs font-semibold uppercase tracking-widest text-[#a68a5b]">
                      Edit
                    </button>
                  </div>
                  <dl className="space-y-2 text-sm">
                    {s.rows.map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4">
                        <dt className="text-stone-500">{k}</dt>
                        <dd className="text-right text-stone-900">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
              {submitError && (
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={w.step === 0 || submitting}
            className="rounded-full border border-[#e7e0d5] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-stone-700 disabled:opacity-40"
          >
            Back
          </button>
          {w.step < 3 ? (
            <button type="button" onClick={onNext} className="rounded-full bg-stone-900 px-8 py-3 text-xs font-semibold uppercase tracking-widest text-white">
              Next
            </button>
          ) : (
            <button type="button" onClick={onSubmit} disabled={submitting} className="rounded-full bg-stone-900 px-8 py-3 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-60">
              {submitting ? "Submitting…" : submitError ? "Retry" : "Submit requirement"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}