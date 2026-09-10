"use client";

import React from "react";
import { Check, Columns3 } from "lucide-react";

interface FeatureSelectorProps {
  headers: string[];
  selectedFeatures: string[];
  onChange: (features: string[]) => void;
  disabled?: boolean;
}

export function FeatureSelector({
  headers,
  selectedFeatures,
  onChange,
  disabled = false,
}: FeatureSelectorProps) {
  const toggleFeature = (header: string) => {
    if (disabled) return;

    if (selectedFeatures.includes(header)) {
      onChange(
        selectedFeatures.filter((feature) => feature !== header),
      );
    } else {
      onChange([...selectedFeatures, header]);
    }
  };

  const selectAll = () => {
    if (disabled) return;
    onChange([...headers]);
  };

  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        background: "var(--sidebar-bg)",
        borderColor: "var(--border)",
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Columns3 className="h-4 w-4 text-indigo-400" />

          <div>
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Select Features
            </h3>

            <p
              className="text-[11px]"
              style={{ color: "var(--muted)" }}
            >
              Select columns that will be used for model training
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            disabled={disabled}
            className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 disabled:opacity-40"
          >
            Select All
          </button>

          <button
            type="button"
            onClick={clearAll}
            disabled={disabled}
            className="text-[11px] font-medium text-slate-400 hover:text-slate-300 disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {headers.map((header) => {
          const selected = selectedFeatures.includes(header);

          return (
            <button
              key={header}
              type="button"
              disabled={disabled}
              onClick={() => toggleFeature(header)}
              className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                selected
                  ? "border-indigo-500/40 bg-indigo-500/10"
                  : "hover:bg-white/[0.02]"
              } disabled:cursor-not-allowed disabled:opacity-50`}
              style={{
                borderColor: selected
                  ? undefined
                  : "var(--border)",
              }}
            >
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                  selected
                    ? "border-indigo-500 bg-indigo-500 text-white"
                    : ""
                }`}
                style={
                  !selected
                    ? {
                        borderColor: "var(--border)",
                      }
                    : undefined
                }
              >
                {selected && <Check className="h-3.5 w-3.5" />}
              </div>

              <span
                className="truncate text-xs font-medium"
                style={{ color: "var(--foreground)" }}
              >
                {header}
              </span>
            </button>
          );
        })}
      </div>

      <p
        className="mt-4 text-xs"
        style={{ color: "var(--muted)" }}
      >
        {selectedFeatures.length} of {headers.length} columns selected
      </p>
    </div>
  );
}