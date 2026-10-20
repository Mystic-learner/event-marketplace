import { create } from "zustand";

export interface ApiLogEntry {
  id: string;
  time: string;
  method: string;
  url: string;
  status: number; // 0 = network failure
  ok: boolean;
  durationMs: number;
  request: unknown;
  response: unknown;
}

interface DevConsoleState {
  open: boolean;
  logs: ApiLogEntry[];
  toggle: () => void;
  setOpen: (open: boolean) => void;
  addLog: (entry: Omit<ApiLogEntry, "id" | "time">) => void;
  clear: () => void;
}

export const useDevConsole = create<DevConsoleState>((set) => ({
  open: false,
  logs: [],
  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (open) => set({ open }),
  addLog: (entry) =>
    set((s) => ({
      logs: [
        { ...entry, id: Math.random().toString(36).slice(2), time: new Date().toLocaleTimeString() },
        ...s.logs,
      ].slice(0, 50),
    })),
  clear: () => set({ logs: [] }),
}));