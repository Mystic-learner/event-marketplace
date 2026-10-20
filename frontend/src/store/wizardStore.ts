import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { EMPTY_BASICS, type Basics, type Category, type DetailValue, type Details } from "@/lib/wizardConfig";

interface WizardState {
  step: number; // 0 = basics, 1-2 = category steps, 3 = review
  basics: Basics;
  details: Details;
  notice: string | null;
  setBasics: (patch: Partial<Basics>) => void;
  setCategory: (category: Category) => void;
  setDetail: (name: string, value: DetailValue) => void;
  goTo: (step: number) => void;
  next: () => void;
  back: () => void;
  dismissNotice: () => void;
  reset: () => void;
}

const hasData = (details: Details) =>
  Object.values(details).some((v) => (Array.isArray(v) ? v.length > 0 : v.trim() !== ""));

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      step: 0,
      basics: EMPTY_BASICS,
      details: {},
      notice: null,

      setBasics: (patch) => set((s) => ({ basics: { ...s.basics, ...patch } })),

      setCategory: (category) =>
        set((s) => {
          if (s.basics.category === category) return s;
          return {
            basics: { ...s.basics, category },
            details: {},
            notice: hasData(s.details)
              ? "Category changed. The details you entered for the previous category were cleared."
              : null,
          };
        }),

      setDetail: (name, value) => set((s) => ({ details: { ...s.details, [name]: value } })),

      goTo: (step) => set({ step: Math.min(Math.max(step, 0), 3) }),
      next: () => set((s) => ({ step: Math.min(s.step + 1, 3), notice: null })),
      back: () => set((s) => ({ step: Math.max(s.step - 1, 0) })),
      dismissNotice: () => set({ notice: null }),
      reset: () => set({ step: 0, basics: EMPTY_BASICS, details: {}, notice: null }),
    }),
    {
      name: "gopratle-wizard",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ step: s.step, basics: s.basics, details: s.details }),
    }
  )
);