import React from "react";

interface ParameterControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function ParameterControl({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  disabled = false,
}: ParameterControlProps) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all ${
        disabled ? "opacity-60" : "hover:border-slate-300 hover:shadow-md"
      }`}
    >
      {/* Label + Value */}
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-slate-700">
          {label}
        </label>

        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) =>
              onChange(parseFloat(e.target.value) || 0)
            }
            disabled={disabled}
            className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-right text-sm font-semibold text-slate-800 outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed"
          />

          <span className="w-12 text-sm text-slate-400">
            {unit}
          </span>
        </div>
      </div>

      {/* Slider */}
      <div className="pt-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) =>
            onChange(parseFloat(e.target.value))
          }
          disabled={disabled}
          className="parameter-slider h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-cyan-500 disabled:cursor-not-allowed"
        />
      </div>

      {/* Min / Max */}
      <div className="flex justify-between text-xs font-medium text-slate-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}