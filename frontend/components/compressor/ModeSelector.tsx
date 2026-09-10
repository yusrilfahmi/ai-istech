import React from "react";
import { BrainCircuit, Network } from "lucide-react";

export type CompressorMode = "Isolation Forest" | "LSTM";

interface ModeSelectorProps {
  value: CompressorMode;
  onChange: (mode: CompressorMode) => void;
  disabled?: boolean;
}

const modes = [
  {
    value: "Isolation Forest" as const,
    label: "Isolation Forest",
    description: "Detect anomalies in compressor telemetry",
    icon: BrainCircuit,
  },
  {
    value: "LSTM" as const,
    label: "LSTM",
    description: "Forecast time-series values",
    icon: Network,
  },
];

export function ModeSelector({
  value,
  onChange,
  disabled = false,
}: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = value === mode.value;

        return (
          <button
            key={mode.value}
            type="button"
            onClick={() => onChange(mode.value)}
            disabled={disabled}
            className={`group flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
              isActive
                ? "border-cyan-300 bg-cyan-50 ring-2 ring-cyan-500/10"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            } ${
              disabled
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer"
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                isActive
                  ? "bg-cyan-500 text-white"
                  : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-semibold ${
                  isActive ? "text-cyan-700" : "text-slate-700"
                }`}
              >
                {mode.label}
              </p>

              <p className="mt-0.5 text-xs text-slate-400">
                {mode.description}
              </p>
            </div>

            <div
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                isActive ? "border-cyan-500" : "border-slate-300"
              }`}
            >
              {isActive && (
                <div className="h-2 w-2 rounded-full bg-cyan-500" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}