"use client";

import React from "react";
import { Cpu, SlidersHorizontal } from "lucide-react";

export interface TrainingConfig {
  machineName: string;
  contamination: string;
  nEstimators: string;
  maxSamples: string;
}

interface TrainingConfigFormProps {
  config: TrainingConfig;
  onChange: (config: TrainingConfig) => void;
  disabled?: boolean;
}

export function TrainingConfigForm({
  config,
  onChange,
  disabled = false,
}: TrainingConfigFormProps) {
  const update = (
    field: keyof TrainingConfig,
    value: string,
  ) => {
    onChange({
      ...config,
      [field]: value,
    });
  };

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        background: "var(--sidebar-bg)",
        borderColor: "var(--border)",
      }}
    >
      <div className="mb-5 flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-indigo-400" />

        <div>
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Training Configuration
          </h3>

          <p
            className="text-[11px]"
            style={{ color: "var(--muted)" }}
          >
            Configure the model parameters before training
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* Machine Name */}

        <div>
          <label
            className="mb-1.5 block text-xs font-medium"
            style={{ color: "var(--muted)" }}
          >
            Machine Name *
          </label>

          <div className="relative">
            <Cpu className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

            <input
              type="text"
              value={config.machineName}
              onChange={(e) =>
                update("machineName", e.target.value)
              }
              disabled={disabled}
              placeholder="e.g. CPM-11"
              className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm outline-none transition-all focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: "var(--background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>
        </div>

        {/* Contamination */}

        <div>
          <label
            className="mb-1.5 block text-xs font-medium"
            style={{ color: "var(--muted)" }}
          >
            Contamination *
          </label>

          <input
            type="number"
            min="0"
            max="0.5"
            step="0.01"
            value={config.contamination}
            onChange={(e) =>
              update("contamination", e.target.value)
            }
            disabled={disabled}
            placeholder="0.1"
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: "var(--background)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          />
        </div>

        {/* N Estimators */}

        <div>
          <label
            className="mb-1.5 block text-xs font-medium"
            style={{ color: "var(--muted)" }}
          >
            N Estimators *
          </label>

          <input
            type="number"
            min="1"
            value={config.nEstimators}
            onChange={(e) =>
              update("nEstimators", e.target.value)
            }
            disabled={disabled}
            placeholder="100"
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: "var(--background)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          />
        </div>

        {/* Max Samples */}

        <div>
          <label
            className="mb-1.5 block text-xs font-medium"
            style={{ color: "var(--muted)" }}
          >
            Max Samples *
          </label>

          <input
            type="text"
            value={config.maxSamples}
            onChange={(e) =>
              update("maxSamples", e.target.value)
            }
            disabled={disabled}
            placeholder="auto"
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: "var(--background)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          />
        </div>
      </div>
    </div>
  );
}