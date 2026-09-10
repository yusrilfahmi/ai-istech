"use client";

import React from "react";
import { Database } from "lucide-react";

interface CsvPreviewProps {
  headers: string[];
  rows: string[][];
}

export function CsvPreview({
  headers,
  rows,
}: CsvPreviewProps) {
  if (!headers.length) return null;

  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{
        background: "var(--sidebar-bg)",
        borderColor: "var(--border)",
      }}
    >
      <div
        className="flex items-center gap-2 border-b px-4 py-3"
        style={{ borderColor: "var(--border)" }}
      >
        <Database className="h-4 w-4 text-indigo-400" />

        <div>
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Dataset Preview
          </h3>

          <p
            className="text-[11px]"
            style={{ color: "var(--muted)" }}
          >
            Showing header and first 3 rows
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-left text-xs">
          <thead>
            <tr style={{ background: "var(--background)" }}>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="border-b px-4 py-3 font-semibold"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.slice(0, 3).map((row, rowIndex) => (
              <tr key={rowIndex}>
                {headers.map((_, columnIndex) => (
                  <td
                    key={columnIndex}
                    className="border-b px-4 py-3"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--muted)",
                    }}
                  >
                    {row[columnIndex] ?? "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}