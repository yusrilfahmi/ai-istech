"use client";

import React, { useRef } from "react";
import { Upload, FileText, X } from "lucide-react";

interface CsvUploaderProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export function CsvUploader({
  file,
  onFileChange,
  disabled = false,
}: CsvUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (selectedFile?: File) => {
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      alert("Please upload a CSV file.");
      return;
    }

    onFileChange(selectedFile);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {!file ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-all hover:border-indigo-400 hover:bg-indigo-500/5 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
            <Upload className="h-6 w-6" />
          </div>

          <p
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Upload CSV Dataset
          </p>

          <p
            className="mt-1 text-xs"
            style={{ color: "var(--muted)" }}
          >
            Click to browse or drag and drop your CSV file
          </p>

          <span
            className="mt-3 rounded-lg px-3 py-1 text-[11px]"
            style={{
              background: "var(--border)",
              color: "var(--muted)",
            }}
          >
            CSV files only
          </span>
        </button>
      ) : (
        <div
          className="flex items-center justify-between rounded-xl border p-4"
          style={{
            background: "var(--background)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <FileText className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p
                className="truncate text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                {file.name}
              </p>

              <p
                className="text-xs"
                style={{ color: "var(--muted)" }}
              >
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onFileChange(null);

              if (inputRef.current) {
                inputRef.current.value = "";
              }
            }}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}