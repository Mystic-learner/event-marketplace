"use client";

import { useDevConsole } from "@/store/devConsoleStore";

export default function DevConsole() {
  const { open, toggle, logs, clear } = useDevConsole();

  return (
    <>
      <button
        onClick={toggle}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-lg"
      >
        Dev Console {logs.length > 0 && `(${logs.length})`}
      </button>

      {open && (
        <aside className="fixed bottom-0 right-0 z-40 flex h-[60vh] w-full flex-col border-t border-stone-700 bg-stone-950 text-stone-100 shadow-2xl sm:w-[480px] sm:rounded-tl-2xl">
          <header className="flex items-center justify-between border-b border-stone-800 px-4 py-3 text-xs">
            <span className="font-semibold uppercase tracking-widest">API requests</span>
            <div className="flex gap-4">
              <button onClick={clear} className="text-stone-400 hover:text-white">Clear</button>
              <button onClick={toggle} className="text-stone-400 hover:text-white">Close</button>
            </div>
          </header>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 font-mono text-[11px]">
            {logs.length === 0 && <p className="text-stone-500">No requests yet.</p>}
            {logs.map((l) => (
              <details key={l.id} className="rounded-lg border border-stone-800 bg-stone-900 p-2">
                <summary className="cursor-pointer">
                  <span className={l.ok ? "text-emerald-400" : "text-red-400"}>{l.status || "ERR"}</span>{" "}
                  <span className="text-amber-300">{l.method}</span> {l.url}{" "}
                  <span className="text-stone-500">{l.durationMs}ms · {l.time}</span>
                </summary>
                <p className="mt-2 text-stone-400">Request</p>
                <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(l.request, null, 2)}</pre>
                <p className="mt-2 text-stone-400">Response</p>
                <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(l.response, null, 2)}</pre>
              </details>
            ))}
          </div>
        </aside>
      )}
    </>
  );
}