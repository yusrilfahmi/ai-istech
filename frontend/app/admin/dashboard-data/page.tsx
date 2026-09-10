"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Database,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Inbox,
} from "lucide-react";
import { compressorApi } from "@/lib/api";
import type {
  CompressorTelemetry,
  TelemetryPagination,
} from "@/types";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  // Gunakan Intl.DateTimeFormat dengan timeZone UTC secara eksplisit
  // agar browser tidak mengkonversi ke timezone lokal (WIB/+07)
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  // en-CA menghasilkan "YYYY-MM-DD, HH:mm:ss" — rapikan sedikit
  const parts = fmt.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

function formatNumber(val: number | null, decimals = 2): string {
  if (val === null || val === undefined) return "—";
  return val.toLocaleString("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatCount(n: number): string {
  return n.toLocaleString("id-ID");
}

// ── Page Component ─────────────────────────────────────────────────────────

const LIMIT_OPTIONS = [25, 50, 100] as const;

export default function DashboardDataPage() {
  const [rows, setRows] = useState<CompressorTelemetry[]>([]);
  const [pagination, setPagination] = useState<TelemetryPagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [limit, setLimit] = useState<number>(50);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (targetPage: number, targetLimit: number) => {
      setLoading(true);
      setError(null);
      try {
        // compressorApi.listTelemetry returns ApiResponse — but our endpoint
        // returns { data, pagination } directly (not wrapped in { success, data })
        // so we call fetch directly following the same pattern as lib/api.ts
        const API_BASE =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(
          `${API_BASE}/api/compressor-telemetry?page=${targetPage}&limit=${targetLimit}`,
          { credentials: "include" }
        );
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        const body = await res.json();
        setRows(body.data ?? []);
        setPagination(body.pagination);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat data telemetry"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    fetchData(page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    fetchData(1, newLimit);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchData(newPage, limit);
  };

  const handleRefresh = () => {
    fetchData(page, limit);
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const startRow = pagination.total === 0 ? 0 : (page - 1) * limit + 1;
  const endRow = Math.min(page * limit, pagination.total);

  // Build page numbers to show (current ±2)
  const pageNumbers: number[] = [];
  const delta = 2;
  const rangeStart = Math.max(1, page - delta);
  const rangeEnd = Math.min(pagination.totalPages, page + delta);
  for (let i = rangeStart; i <= rangeEnd; i++) {
    pageNumbers.push(i);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-500">
              <Database className="h-4 w-4" />
              PostgreSQL · compressor_telemetry
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Dashboard Data Telemetry
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Data historis compressor CMP-01 dengan server-side pagination
            </p>
          </div>

          {/* Stats badge + refresh */}
          <div className="flex items-center gap-3">
            {!loading && !error && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300">
                {formatCount(pagination.total)} baris total
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={loading}
              title="Refresh data"
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {loading
            ? "Memuat data…"
            : error
              ? ""
              : pagination.total === 0
                ? "Tidak ada data"
                : `Menampilkan ${formatCount(startRow)}–${formatCount(endRow)} dari ${formatCount(pagination.total)}`}
        </p>

        {/* Rows per page */}
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span>Baris per halaman:</span>
          {LIMIT_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => handleLimitChange(opt)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                limit === opt
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {/* Loading overlay */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="spinner" style={{ width: 36, height: 36 }} />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Memuat data telemetry…
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-950/40">
              <AlertCircle className="h-7 w-7" />
            </div>
            <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Gagal memuat data
            </p>
            <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">
              {error}
            </p>
            <button
              onClick={handleRefresh}
              className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 dark:bg-slate-800">
              <Inbox className="h-7 w-7" />
            </div>
            <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Belum ada data
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Tabel compressor_telemetry masih kosong.
            </p>
          </div>
        )}

        {/* Data table */}
        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  <th className="whitespace-nowrap px-5 py-4">Machine ID</th>
                  <th className="whitespace-nowrap px-5 py-4">Timestamp</th>
                  <th className="whitespace-nowrap px-5 py-4 text-right">
                    Arus (A)
                  </th>
                  <th className="whitespace-nowrap px-5 py-4 text-right">
                    Pressure (bar)
                  </th>
                  <th className="whitespace-nowrap px-5 py-4 text-right">
                    Flow Rate (m³/h)
                  </th>
                  <th className="whitespace-nowrap px-5 py-4 text-right">
                    kWh/m³
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`transition-colors hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 ${
                      idx % 2 === 0
                        ? "bg-white dark:bg-slate-900"
                        : "bg-slate-50/60 dark:bg-slate-800/30"
                    }`}
                  >
                    {/* Machine ID */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-50 px-2.5 py-1 font-mono text-xs font-semibold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
                        {row.machine_id}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {formatTimestamp(row.timestamp)}
                    </td>

                    {/* Arus */}
                    <td className="px-5 py-3.5 text-right font-mono text-slate-700 dark:text-slate-200">
                      {formatNumber(row.arus_a, 2)}
                    </td>

                    {/* Pressure */}
                    <td className="px-5 py-3.5 text-right font-mono text-slate-700 dark:text-slate-200">
                      {formatNumber(row.outlet_pressure_bar, 2)}
                    </td>

                    {/* Flow Rate */}
                    <td className="px-5 py-3.5 text-right font-mono text-slate-700 dark:text-slate-200">
                      {formatNumber(row.outlet_flow_rate_m3h, 1)}
                    </td>

                    {/* kWh/m³ */}
                    <td className="px-5 py-3.5 text-right font-mono text-slate-700 dark:text-slate-200">
                      {formatNumber(row.kwh_per_m3, 4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && !error && pagination.totalPages > 1 && (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          {/* Info */}
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Halaman {formatCount(page)} dari {formatCount(pagination.totalPages)}
          </p>

          {/* Buttons */}
          <div className="flex items-center gap-1">
            {/* Previous */}
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-all hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* First page if not in range */}
            {rangeStart > 1 && (
              <>
                <button
                  onClick={() => handlePageChange(1)}
                  className="flex h-9 min-w-[36px] items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-600 transition-all hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  1
                </button>
                {rangeStart > 2 && (
                  <span className="px-1 text-slate-400">…</span>
                )}
              </>
            )}

            {/* Page numbers */}
            {pageNumbers.map((p) => (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className={`flex h-9 min-w-[36px] items-center justify-center rounded-lg border px-2 text-sm font-medium transition-all ${
                  p === page
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {p}
              </button>
            ))}

            {/* Last page if not in range */}
            {rangeEnd < pagination.totalPages && (
              <>
                {rangeEnd < pagination.totalPages - 1 && (
                  <span className="px-1 text-slate-400">…</span>
                )}
                <button
                  onClick={() => handlePageChange(pagination.totalPages)}
                  className="flex h-9 min-w-[36px] items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-600 transition-all hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  {pagination.totalPages}
                </button>
              </>
            )}

            {/* Next */}
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= pagination.totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-all hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
