"use client";

import React from "react";
import { Lock, Pencil, CheckCircle2, Cpu, Database } from "lucide-react";

export interface TrainingRecord {
  id: string;
  machineName: string;
  fileName: string;
  features: string[];
  contamination: number;
  nEstimators: number;
  maxSamples: string;
  modelName?: string;
  trainedAt?: string;
  locked: boolean;
}

interface TrainingListProps {
  records: TrainingRecord[];
  onEdit: (id: string) => void;
}

export function TrainingList({ records, onEdit }: TrainingListProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Training Data ({records.length})
        </h2>

        <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
          Each machine has its own training configuration and model.
        </p>
      </div>

      {records.length === 0 ? (
        <div
          className="rounded-2xl border p-10 text-center"
          style={{
            background: "var(--sidebar-bg)",
            borderColor: "var(--border)",
          }}
        >
          <Database className="mx-auto mb-3 h-8 w-8 text-slate-500" />

          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No training data yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {records.map((record) => (
            <div
              key={record.id}
              className="rounded-2xl border p-5"
              style={{
                background: "var(--sidebar-bg)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Cpu className="h-5 w-5" />
                  </div>

                  <div>
                    <h3
                      className="font-semibold"
                      style={{ color: "var(--foreground)" }}
                    >
                      {record.machineName}
                    </h3>

                    <p
                      className="text-[11px]"
                      style={{ color: "var(--muted)" }}
                    >
                      {record.fileName}
                    </p>
                    <p className="mt-0.5 text-xs text-indigo-500">
                      {record.modelName}
                    </p>
                  </div>
                </div>

                {record.locked && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-400">
                    <Lock className="h-3 w-3" />
                    Locked
                  </div>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Stat
                  label="Contamination"
                  value={String(record.contamination)}
                />

                <Stat label="N Estimators" value={String(record.nEstimators)} />

                <Stat label="Max Samples" value={record.maxSamples} />

                <Stat label="Features" value={String(record.features.length)} />
              </div>

              <div className="mt-4">
                <p
                  className="mb-2 text-[11px] font-medium uppercase tracking-wide"
                  style={{ color: "var(--muted)" }}
                >
                  Selected Features
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {record.features.map((feature) => (
                    <span
                      key={feature}
                      className="rounded-md bg-indigo-500/10 px-2 py-1 font-mono text-[10px] text-indigo-400"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              <div
                className="mt-5 flex items-center justify-between border-t pt-4"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />

                  <span className="text-emerald-400">Ready for testing</span>
                </div>

                <button
                  type="button"
                  onClick={() => onEdit(record.id)}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-white/5"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{
        background: "var(--background)",
        borderColor: "var(--border)",
      }}
    >
      <p
        className="text-[10px] uppercase tracking-wide"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </p>

      <p
        className="mt-1 text-sm font-semibold"
        style={{ color: "var(--foreground)" }}
      >
        {value}
      </p>
    </div>
  );
}
