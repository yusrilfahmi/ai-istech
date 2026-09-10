"use client";

import React from "react";
import { AlertTriangle, X } from "lucide-react";
import type { TrainingConfig } from "./TrainingConfigForm";

interface TrainingConfirmModalProps {
  open: boolean;
  config: TrainingConfig;
  features: string[];
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function TrainingConfirmModal({
  open,
  config,
  features,
  onConfirm,
  onCancel,
  loading = false,
}: TrainingConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl"
        style={{
          background: "var(--sidebar-bg)",
          borderColor: "var(--border)",
        }}
      >
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>

            <div>
              <h2
                className="text-base font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Confirm Training
              </h2>

              <p
                className="text-xs"
                style={{ color: "var(--muted)" }}
              >
                Please verify the training configuration.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="space-y-3 rounded-xl border p-4"
          style={{
            background: "var(--background)",
            borderColor: "var(--border)",
          }}
        >
          <InfoRow
            label="Machine Name"
            value={config.machineName}
          />

          <InfoRow
            label="Contamination"
            value={config.contamination}
          />

          <InfoRow
            label="N Estimators"
            value={config.nEstimators}
          />

          <InfoRow
            label="Max Samples"
            value={config.maxSamples}
          />

          <InfoRow
            label="Features"
            value={`${features.length} selected`}
          />
        </div>

        <p
          className="mt-4 text-xs leading-5"
          style={{ color: "var(--muted)" }}
        >
          The dataset will be trained using the selected
          configuration. Continue?
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/5 disabled:opacity-50"
            style={{
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {loading && (
              <div
                className="spinner"
                style={{
                  width: 14,
                  height: 14,
                  borderTopColor: "#fff",
                }}
              />
            )}

            {loading ? "Training..." : "Start Training"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span style={{ color: "var(--muted)" }}>{label}</span>

      <span
        className="text-right font-medium"
        style={{ color: "var(--foreground)" }}
      >
        {value}
      </span>
    </div>
  );
}