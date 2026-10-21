"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, Loader2, LocateFixed } from "lucide-react";

export interface Coords {
  lat: number;
  lng: number;
}

interface Place extends Coords {
  label: string;
}

interface Notice {
  kind: "info" | "error";
  text: string;
}

interface Props {
  id: string;
  value: string;
  coords: Coords | null;
  error?: string;
  onChange: (text: string) => void;
  onSelect: (label: string, coords: Coords) => void;
}

interface GeocodeResult {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
}

interface GeocodeResponse {
  results?: GeocodeResult[];
}

interface ReverseResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
}

function labelOf(...parts: Array<string | undefined>): string {
  const out: string[] = [];
  for (const part of parts) {
    const t = part?.trim();
    if (t && out[out.length - 1] !== t) out.push(t);
  }
  return out.join(", ");
}

function isAbort(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { name?: string }).name === "AbortError";
}

async function fetchPlaces(name: string, signal: AbortSignal): Promise<Place[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=6&language=en&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Search failed");
  const data = (await res.json()) as GeocodeResponse;
  return (data.results ?? []).map((r) => ({
    label: labelOf(r.name, r.admin1, r.country),
    lat: r.latitude,
    lng: r.longitude,
  }));
}

// "City, State" input: if the direct search finds nothing, search the city and keep matching regions.
async function searchPlaces(query: string, signal: AbortSignal): Promise<Place[]> {
  const direct = await fetchPlaces(query, signal);
  if (direct.length > 0 || !query.includes(",")) return direct;
  const [city, ...rest] = query.split(",").map((s) => s.trim());
  const hint = rest.join(" ").toLowerCase();
  if (city.length < 2 || !hint) return direct;
  const byCity = await fetchPlaces(city, signal);
  return byCity.filter((p) => p.label.toLowerCase().includes(hint));
}

function geoMessage(code: number): string {
  if (code === 1) return "Location permission was denied. Search for a place instead.";
  if (code === 2) return "Your position isn't available right now. Search for a place instead.";
  if (code === 3) return "Finding your location timed out. Search for a place instead.";
  return "Couldn't detect your location. Search for a place instead.";
}

export default function LocationInput({ id, value, coords, error, onChange, onSelect }: Props) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Debounced search. Runs only while no place is confirmed.
  useEffect(() => {
    if (coords) {
      setPlaces([]);
      setNotice(null);
      setLoading(false);
      return;
    }
    const q = value.trim();
    if (q.length < 3) {
      setPlaces([]);
      setNotice(null);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setNotice(null);
      try {
        const found = await searchPlaces(q, ctrl.signal);
        setPlaces(found);
        setActive(found.length > 0 ? 0 : -1);
        setOpen(true);
        if (found.length === 0) {
          setNotice({ kind: "info", text: 'No matching places found. Check the spelling, or try "City, State".' });
        }
      } catch (e) {
        if (isAbort(e)) return;
        setPlaces([]);
        setNotice({ kind: "error", text: "Couldn't reach the location search. Check your connection and try again." });
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [value, coords]);

  // Close the list on outside click.
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function choose(p: Place) {
    onSelect(p.label, { lat: p.lat, lng: p.lng });
    setOpen(false);
    setPlaces([]);
    setNotice(null);
  }

  function detectLocation() {
    setNotice(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setNotice({ kind: "error", text: "Your browser doesn't support location detection. Search for a place instead." });
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          if (!res.ok) throw new Error("Reverse geocoding failed");
          const data = (await res.json()) as ReverseResponse;
          const city = data.city?.trim() || data.locality?.trim();
          if (!city) {
            setNotice({ kind: "error", text: "We found your position but couldn't tell which city it is. Search for a place instead." });
          } else {
            onSelect(labelOf(city, data.principalSubdivision, data.countryName), { lat: latitude, lng: longitude });
          }
        } catch {
          setNotice({ kind: "error", text: "Couldn't look up your city. Search for a place instead." });
        } finally {
          setGeoBusy(false);
        }
      },
      (err) => {
        setGeoBusy(false);
        setNotice({ kind: "error", text: geoMessage(err.code) });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (places.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(places.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && open && active >= 0) {
      e.preventDefault();
      choose(places[active]);
    }
  }

  const border = error
    ? "border-red-400 bg-red-50/40"
    : coords
      ? "border-emerald-400 bg-white"
      : "border-[#e7e0d5] bg-[#faf7f2]";

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && places.length > 0}
          aria-controls={`${id}-list`}
          aria-activedescendant={open && active >= 0 ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          value={value}
          placeholder="Search a city or place, e.g. Udaipur"
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (places.length > 0) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className={`w-full rounded-xl border px-4 py-3 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-[#a68a5b]/40 ${border}`}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-[#a68a5b]" /> : coords ? <Check className="h-4 w-4 text-emerald-600" /> : null}
        </span>
      </div>

      {open && places.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="absolute left-0 right-0 z-30 mt-2 max-h-64 overflow-auto rounded-2xl border border-[#e7e0d5] bg-white p-1.5 shadow-xl">
          {places.map((p, i) => (
            <li
              key={`${p.label}-${p.lat}-${p.lng}`}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onClick={() => choose(p)}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer rounded-xl px-3.5 py-2.5 text-sm text-stone-700 ${i === active ? "bg-[#faf7f2]" : ""}`}
            >
              {p.label}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={detectLocation}
          disabled={geoBusy}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#a68a5b] transition hover:underline disabled:opacity-60"
        >
          {geoBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
          {geoBusy ? "Finding you…" : "Use my current location"}
        </button>
        {coords && <span className="text-xs font-semibold text-emerald-700">Location confirmed</span>}
      </div>

      {notice && (
        <p role={notice.kind === "error" ? "alert" : "status"} className={`mt-2 text-xs ${notice.kind === "error" ? "text-red-600" : "text-stone-500"}`}>
          {notice.text}
        </p>
      )}
    </div>
  );
}