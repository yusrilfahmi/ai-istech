import React from "react";
import { Terminal, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { LogEntry } from "../../types/compressor/compressor";

interface LogPanelProps {
  logs: LogEntry[];
  onClear: () => void;
}

export function LogPanel({ logs, onClear }: LogPanelProps) {
  const latestLog = logs[0] ?? null;

  return (
    <section className="flex min-h-[500px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600">
            <Terminal className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Terminal & Logs
            </h2>
            <p className="text-[11px] text-slate-400">Latest activity only</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          disabled={!latestLog}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {!latestLog ? (
          <div className="flex h-full min-h-[420px] items-center justify-center">
            <div className="text-center">
              <Terminal className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">No logs yet...</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                {latestLog.time}
              </span>
              {latestLog.success ? (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {latestLog.status || "OK"}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-rose-600">
                  <XCircle className="h-3.5 w-3.5" />
                  {latestLog.status || "ERR"}
                </span>
              )}
            </div>

            <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-slate-700">
              {JSON.stringify(latestLog.payload, null, 2)}
            </pre>

            {latestLog.message && (
              <div
                className={`mt-3 border-t pt-3 text-xs ${
                  latestLog.success
                    ? "border-slate-200 text-slate-500"
                    : "border-rose-200 text-rose-600"
                }`}
              >
                {latestLog.message}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
