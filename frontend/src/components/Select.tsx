"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  id: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

export default function Select({ id, value, options, onChange, error, placeholder = "Select\u2026" }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(Math.max(0, options.findIndex((o) => o.value === value)));
        return;
      }
      setActive((i) => (e.key === "ArrowDown" ? Math.min(options.length - 1, i + 1) : Math.max(0, i - 1)));
      return;
    }
    if (e.key === "Enter" && open && active >= 0) {
      e.preventDefault();
      pick(options[active].value);
    }
  }

  return (
    <div ref={ref} className="relative" onKeyDown={onKeyDown}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          setActive(Math.max(0, options.findIndex((o) => o.value === value)));
        }}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm outline-none transition focus:ring-2 focus:ring-[#a68a5b]/40 ${
          error ? "border-red-400 bg-red-50/40" : open ? "border-[#a68a5b] bg-white" : "border-[#e7e0d5] bg-[#faf7f2] hover:border-[#a68a5b]"
        }`}
      >
        <span className={selected ? "text-stone-900" : "text-stone-400"}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`h-4 w-4 text-[#a68a5b] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul role="listbox" className="absolute left-0 right-0 z-30 mt-2 max-h-64 overflow-auto rounded-2xl border border-[#e7e0d5] bg-white p-1.5 shadow-xl">
          {options.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => pick(o.value)}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 text-sm transition ${
                  i === active ? "bg-[#faf7f2]" : ""
                } ${isSelected ? "font-semibold text-[#a68a5b]" : "text-stone-700"}`}
              >
                {o.label}
                {isSelected && <Check className="h-4 w-4" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}