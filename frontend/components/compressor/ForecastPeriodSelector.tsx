"use client";

import React from "react";
import { CalendarDays, CalendarRange, Calendar } from "lucide-react";

export type ForecastPeriod = "day" | "week" | "month";

interface ForecastPeriodSelectorProps {
  value: ForecastPeriod;
  onChange: (period: ForecastPeriod) => void;
  disabled?: boolean;
}

const periods = [
  {
    value: "day" as const,
    label: "Per Hari",
    description: "Forecast berdasarkan data harian",
    icon: CalendarDays,
  },
  {
    value: "week" as const,
    label: "Per Minggu",
    description: "Forecast berdasarkan data mingguan",
    icon: CalendarRange,
  },
  {
    value: "month" as const,
    label: "Per Bulan",
    description: "Forecast berdasarkan data bulanan",
    icon: Calendar,
  },
];

export function ForecastPeriodSelector({
  value,
  onChange,
  disabled = false,
}: ForecastPeriodSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {periods.map((period) => {
        const Icon = period.icon;
        const isActive = value === period.value;

        return (
          <button
            key={period.value}
            type="button"
            onClick={() => onChange(period.value)}
            disabled={disabled}
            className={`group flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
              isActive
                ? "border-cyan-300 bg-cyan-50 ring-2 ring-cyan-500/10"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
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
                {period.label}
              </p>

              <p className="mt-0.5 text-xs text-slate-400">
                {period.description}
              </p>
            </div>

            <div
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                isActive ? "border-cyan-500" : "border-slate-300"
              }`}
            >
              {isActive && <div className="h-2 w-2 rounded-full bg-cyan-500" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
