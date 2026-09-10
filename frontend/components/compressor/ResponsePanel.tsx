"use client";

import React from "react";
import { CheckCircle2, Terminal, Trash2 } from "lucide-react";

interface ResponsePanelProps {
  data: unknown;
  onClear: () => void;
}

export function ResponsePanel({ data, onClear }: ResponsePanelProps) {
  const hasResponse = data !== null && data !== undefined;

  return (
    <section className="flex min-h-[500px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600">
            <Terminal className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Prediction Response
            </h2>
            <p className="text-[11px] text-slate-400">
              Latest API response only
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          disabled={!hasResponse}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {!hasResponse ? (
          <div className="flex h-full min-h-[420px] items-center justify-center">
            <div className="text-center">
              <Terminal className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">No response yet...</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700">
                Response received
              </span>
            </div>

            <pre className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-5 text-slate-700">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}
