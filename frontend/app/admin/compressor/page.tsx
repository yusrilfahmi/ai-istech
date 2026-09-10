"use client";

import { mlTrainingApi } from "@/lib/api";
import { ResponsePanel } from "@/components/compressor/ResponsePanel";
import React, { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Send,
  Play,
  Square,
  Settings,
  Server,
  RefreshCw,
  Code,
  X,
  Zap,
  Clock3,
  Wifi,
} from "lucide-react";

import { ParameterControl } from "@/components/compressor/ParameterControl";
import {
  ModeSelector,
  CompressorMode,
} from "@/components/compressor/ModeSelector";
import { LogPanel } from "@/components/compressor/LogPanel";
import { ForecastPeriodSelector } from "@/components/compressor/ForecastPeriodSelector";
import { TelemetryPayload, LogEntry } from "@/types/compressor/compressor";

// ============================================================
// API Endpoints
// ============================================================

const ML_ENDPOINTS = {
  isolationForest: "http://10.10.10.54:8020/predict",

  // Backend LSTM menerima CSV + konfigurasi training melalui /forecast.
  lstm: "http://10.100.1.26:8010/forecast",
} as const;

// ============================================================
// Types
// ============================================================

type TrainingModel = {
  id: string;
  machine_name: string;
  file_name: string;
  features: string[];
  contamination: number | string;
  n_estimators: number | string;
  max_samples: string;
  model_name: string | null;
  locked: boolean;
  status: string;
  trained_at: string;
};

type ForecastPeriod = "day" | "week" | "month";

type LSTMConfig = {
  file: File | null;
  targetCol: string;
  featureCols: string[];
  dateCol: string;
  forecastHorizon: number;
  seqLength: number;
  hiddenSize: number;
  numLayers: number;
  dropout: number;
  epochs: number;
  batchSize: number;
  learningRate: number;
  trainSplit: number;
};

const DEFAULT_LSTM_CONFIG: LSTMConfig = {
  file: null,
  targetCol: "",
  featureCols: [],
  dateCol: "",
  forecastHorizon: 1,
  seqLength: 20,
  hiddenSize: 64,
  numLayers: 2,
  dropout: 0.2,
  epochs: 100,
  batchSize: 32,
  learningRate: 0.001,
  trainSplit: 0.8,
};

type ParsedMultipartFile = {
  filename: string;
  contentType: string;
  blob: Blob;
};

function parseMultipartResponse(
  buffer: ArrayBuffer,
  contentType: string,
): ParsedMultipartFile[] {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);
  const boundary = boundaryMatch?.[1] || boundaryMatch?.[2];

  if (!boundary) {
    throw new Error("Multipart response tidak memiliki boundary.");
  }

  // IMPORTANT:
  // Jangan decode seluruh response menjadi string.
  // Response berisi PNG binary. Decode seluruh buffer dapat merusak
  // byte image sebelum Blob dibuat.
  const bytes = new Uint8Array(buffer);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8");

  const delimiter = encoder.encode(`--${boundary}`);
  const headerSeparator = encoder.encode("\r\n\r\n");
  const crlf = encoder.encode("\r\n");

  const indexOfBytes = (
    source: Uint8Array,
    target: Uint8Array,
    fromIndex = 0,
  ): number => {
    if (target.length === 0) return fromIndex;

    outer: for (let i = fromIndex; i <= source.length - target.length; i += 1) {
      for (let j = 0; j < target.length; j += 1) {
        if (source[i + j] !== target[j]) {
          continue outer;
        }
      }
      return i;
    }

    return -1;
  };

  const files: ParsedMultipartFile[] = [];
  let boundaryStart = indexOfBytes(bytes, delimiter, 0);

  while (boundaryStart !== -1) {
    const afterBoundary = boundaryStart + delimiter.length;

    // Final boundary: --boundary--
    if (bytes[afterBoundary] === 45 && bytes[afterBoundary + 1] === 45) {
      break;
    }

    // Normal part starts with CRLF after the boundary.
    let partStart = afterBoundary;
    if (bytes[partStart] === crlf[0] && bytes[partStart + 1] === crlf[1]) {
      partStart += 2;
    }

    const headerEnd = indexOfBytes(bytes, headerSeparator, partStart);

    if (headerEnd === -1) break;

    const headerText = decoder.decode(bytes.slice(partStart, headerEnd));

    const filenameMatch = headerText.match(/filename="([^"]+)"/i);

    const contentTypeMatch = headerText.match(/Content-Type:\s*([^\r\n]+)/i);

    const bodyStart = headerEnd + headerSeparator.length;

    // Find the NEXT boundary in the raw bytes. This preserves every
    // PNG byte exactly as it arrived from FastAPI.
    const nextBoundary = indexOfBytes(bytes, delimiter, bodyStart);

    if (nextBoundary === -1) break;

    // Backend adds CRLF immediately before every next boundary.
    let bodyEnd = nextBoundary;
    if (
      bodyEnd >= 2 &&
      bytes[bodyEnd - 2] === crlf[0] &&
      bytes[bodyEnd - 1] === crlf[1]
    ) {
      bodyEnd -= 2;
    }

    if (filenameMatch) {
      const fileContentType =
        contentTypeMatch?.[1]?.trim() || "application/octet-stream";

      const fileBytes = bytes.slice(bodyStart, bodyEnd);

      files.push({
        filename: filenameMatch[1],
        contentType: fileContentType,
        blob: new Blob([fileBytes], {
          type: fileContentType,
        }),
      });
    }

    boundaryStart = nextBoundary;
  }

  return files;
}

// ============================================================
// Compressor Page
// ============================================================

export default function CompressorPage() {
  // ============================================================
  // Connection State
  // ============================================================

  const [webhookUrl, setWebhookUrl] = useState(ML_ENDPOINTS.isolationForest);

  const [machineName, setMachineName] = useState("CPM-11");

  // ============================================================
  // Training Models
  // ============================================================

  const [trainingModels, setTrainingModels] = useState<TrainingModel[]>([]);

  const [loadingTrainingModels, setLoadingTrainingModels] = useState(true);

  // ============================================================
  // Processing Mode
  // ============================================================

  const [mode, setMode] = useState<CompressorMode>("Isolation Forest");

  // ============================================================
  // LSTM Forecast State
  // ============================================================

  const [forecastPeriod, setForecastPeriod] = useState<ForecastPeriod>("day");

  const [isLstmForecasting, setIsLstmForecasting] = useState(false);

  const [lstmConfig, setLstmConfig] = useState<LSTMConfig>(DEFAULT_LSTM_CONFIG);

  const [lstmHeaders, setLstmHeaders] = useState<string[]>([]);
  const [showAdvancedLstm, setShowAdvancedLstm] = useState(false);

  // ============================================================
  // Simulation State
  // ============================================================

  const [isStreaming, setIsStreaming] = useState(false);
  const [intervalSeconds, setIntervalSeconds] = useState(5);

  // ============================================================
  // Telemetry State
  // ============================================================

  const [arus, setArus] = useState(100.0);
  const [pressure, setPressure] = useState(7.5);
  const [flow, setFlow] = useState(500.0);
  const [power, setPower] = useState(0.12);

  // ============================================================
  // UI State
  // ============================================================

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [responseData, setResponseData] = useState<unknown>(null);

  const [lstmResponseFiles, setLstmResponseFiles] = useState<
    Array<ParsedMultipartFile & { url: string }>
  >([]);

  // ============================================================
  // Load ML Training Models
  // ============================================================

  useEffect(() => {
    const loadTrainingModels = async () => {
      try {
        setLoadingTrainingModels(true);

        const response = await mlTrainingApi.list();

        const models = Array.isArray(response.data) ? response.data : [];

        const normalizedModels: TrainingModel[] = models.map((model: any) => ({
          id: model.id,
          machine_name: model.machine_name,
          file_name: model.file_name,
          features: Array.isArray(model.features) ? model.features : [],
          contamination: model.contamination,
          n_estimators: model.n_estimators,
          max_samples: model.max_samples,
          model_name: model.model_name
            ? model.model_name.replace(/\\/g, "/").split("/").pop() || null
            : null,
          locked: Boolean(model.locked),
          status: model.status,
          trained_at: model.trained_at,
        }));

        setTrainingModels(normalizedModels);

        // Keep CPM-11 if available.
        // Otherwise select the first available machine.
        const currentMachine = normalizedModels.find(
          (model) =>
            model.machine_name.toLowerCase() === machineName.toLowerCase(),
        );

        if (!currentMachine && normalizedModels.length > 0) {
          setMachineName(normalizedModels[0].machine_name);
        }
      } catch (error) {
        console.error("Failed to load ML training models:", error);

        setTrainingModels([]);
      } finally {
        setLoadingTrainingModels(false);
      }
    };

    loadTrainingModels();
  }, [machineName]);

  // ============================================================
  // Selected Training Model
  // ============================================================

  const selectedTrainingModel = trainingModels.find(
    (model) => model.machine_name.toLowerCase() === machineName.toLowerCase(),
  );

  // ============================================================
  // Model Name
  // ============================================================

  const modelTrain = selectedTrainingModel?.model_name
    ? selectedTrainingModel.model_name.replace(/\\/g, "/").split("/").pop() ||
      ""
    : "";

  // ============================================================
  // Helper: Add Log
  // ============================================================

  const addLog = (log: Omit<LogEntry, "id" | "time">) => {
    const newLog: LogEntry = {
      ...log,
      id: crypto.randomUUID(),
      time: new Date().toISOString(),
    };

    setLogs([newLog]);
  };

  // ============================================================
  // Isolation Forest
  // ============================================================

  const sendData = useCallback(
    async (payloadOverrides?: Partial<TelemetryPayload>) => {
      // ========================================================
      // Find model based on selected machine
      // ========================================================

      const selectedModel = trainingModels.find(
        (model) =>
          model.machine_name.toLowerCase() === machineName.toLowerCase(),
      );

      const currentModelTrain = selectedModel?.model_name
        ? selectedModel.model_name.replace(/\\/g, "/").split("/").pop() || ""
        : "";

      // ========================================================
      // Prevent sending if no model exists
      // ========================================================

      if (!currentModelTrain) {
        const payloadWithoutModel = {
          machine_name: machineName,
          model_train: "",
          sample: {
            arus_a: payloadOverrides?.arus_a ?? arus,

            outlet_pressure_bar:
              payloadOverrides?.outlet_pressure_bar ?? pressure,

            outlet_flow_rate_m3h:
              payloadOverrides?.outlet_flow_rate_m3h ?? flow,

            kwh_per_m3: payloadOverrides?.kwh_per_m3 ?? power,
          },
        };

        addLog({
          payload: payloadWithoutModel as unknown as TelemetryPayload,
          success: false,
          message: `Model training untuk machine ${machineName} tidak ditemukan.`,
        });

        return;
      }

      // ========================================================
      // Isolation Forest Payload
      // ========================================================

      const payload = {
        machine_name: machineName,
        model_train: currentModelTrain,
        sample: {
          arus_a: payloadOverrides?.arus_a ?? arus,

          outlet_pressure_bar:
            payloadOverrides?.outlet_pressure_bar ?? pressure,

          outlet_flow_rate_m3h: payloadOverrides?.outlet_flow_rate_m3h ?? flow,

          kwh_per_m3: payloadOverrides?.kwh_per_m3 ?? power,
        },
      };

      console.log("=== ISOLATION FOREST PAYLOAD ===");

      console.log(payload);

      console.log("================================");

      try {
        const response = await fetch(webhookUrl, {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        });

        let data: unknown = null;

        try {
          data = await response.json();
        } catch {
          data = null;
        }

        console.log("Isolation Forest Response:", data);

        setResponseData(data);

        if (response.ok) {
          addLog({
            payload: payload as unknown as TelemetryPayload,

            status: response.status,

            success: true,
          });
        } else {
          addLog({
            payload: payload as unknown as TelemetryPayload,

            status: response.status,

            success: false,

            message: `HTTP Error: ${response.statusText}`,
          });
        }
      } catch (error) {
        addLog({
          payload: payload as unknown as TelemetryPayload,

          success: false,

          message:
            error instanceof Error ? error.message : "Unknown network error",
        });
      }
    },
    [webhookUrl, machineName, trainingModels, arus, pressure, flow, power],
  );

  // ============================================================
  // LSTM Forecast
  // ============================================================

  const handleLstmFileChange = (file: File | null) => {
    setLstmConfig((previous) => ({
      ...DEFAULT_LSTM_CONFIG,
      file,
    }));
    setLstmHeaders([]);

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result;

      if (typeof text !== "string") return;

      const firstLine = text.split(/\r?\n/).find((line) => line.trim());
      if (!firstLine) return;

      const headers = firstLine
        .split(",")
        .map((value) => value.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);

      setLstmHeaders(headers);

      const defaultFeatures = [
        "arus_a",
        "outlet_pressure_bar",
        "outlet_flow_rate_m3h",
      ].filter((column) => headers.includes(column));

      setLstmConfig((previous) => ({
        ...previous,
        targetCol: headers.includes("kwh_per_m3") ? "kwh_per_m3" : "",
        dateCol: headers.includes("timestamp") ? "timestamp" : "",
        featureCols: defaultFeatures,
      }));
    };

    reader.readAsText(file);
  };

  const toggleLstmFeature = (column: string) => {
    setLstmConfig((previous) => ({
      ...previous,
      featureCols: previous.featureCols.includes(column)
        ? previous.featureCols.filter((item) => item !== column)
        : [...previous.featureCols, column],
    }));
  };

  const validLstmRequired =
    Boolean(lstmConfig.file) &&
    lstmConfig.targetCol.trim() !== "" &&
    lstmConfig.featureCols.length > 0 &&
    lstmConfig.dateCol.trim() !== "" &&
    Number.isInteger(lstmConfig.forecastHorizon) &&
    lstmConfig.forecastHorizon > 0 &&
    !lstmConfig.featureCols.includes(lstmConfig.targetCol) &&
    (!lstmConfig.dateCol ||
      !lstmConfig.featureCols.includes(lstmConfig.dateCol));

  const sendLstmForecast = useCallback(async () => {
    if (!validLstmRequired) {
      addLog({
        payload: {
          machine_name: machineName,
          mode: "LSTM",
        } as unknown as TelemetryPayload,
        success: false,
        message:
          "Lengkapi CSV dan seluruh konfigurasi LSTM wajib terlebih dahulu.",
      });
      return;
    }

    setIsLstmForecasting(true);
    setResponseData(null);

    try {
      // ============================================================
      // BUILD FORMDATA
      // Sama seperti flow pengiriman data pada ML Dataset.
      // ============================================================
      const formData = new FormData();

      formData.append(
        "file",
        lstmConfig.file as File,
        (lstmConfig.file as File).name,
      );

      formData.append("target_col", lstmConfig.targetCol.trim());

      formData.append("feature_cols", lstmConfig.featureCols.join(","));

      formData.append("date_col", lstmConfig.dateCol.trim());

      formData.append("forecast_horizon", String(lstmConfig.forecastHorizon));

      formData.append("seq_length", String(lstmConfig.seqLength));

      formData.append("hidden_size", String(lstmConfig.hiddenSize));

      formData.append("num_layers", String(lstmConfig.numLayers));

      formData.append("dropout", String(lstmConfig.dropout));

      formData.append("epochs", String(lstmConfig.epochs));

      formData.append("batch_size", String(lstmConfig.batchSize));

      formData.append("learning_rate", String(lstmConfig.learningRate));

      formData.append("train_split", String(lstmConfig.trainSplit));

      // ============================================================
      // DEBUG REQUEST
      // ============================================================
      console.log("========================================");
      console.log("LSTM FORECAST REQUEST");
      console.log("========================================");
      console.log("URL:", ML_ENDPOINTS.lstm);
      console.log("METHOD: POST");
      console.log("FORM DATA:");

      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}:`, {
            name: value.name,
            type: value.type,
            size: value.size,
          });
        } else {
          console.log(`${key}:`, value);
        }
      }

      console.log("========================================");

      // ============================================================
      // SEND TO FASTAPI
      // Jangan set Content-Type manual.
      // Browser akan membuat multipart boundary otomatis.
      // ============================================================
      const response = await fetch(ML_ENDPOINTS.lstm, {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("content-type") || "";

      // ============================================================
      // RECEIVE RESPONSE
      // Untuk tahap ini kita hanya menerima response dari backend.
      // Belum memproses forecast_result.csv / future_forecast.csv /
      // forecast_chart.png.
      // ============================================================
      const responseBuffer = await response.arrayBuffer();

      console.log("========================================");
      console.log("LSTM FORECAST RESPONSE");
      console.log("========================================");
      console.log("Status:", response.status);
      console.log("Status Text:", response.statusText);
      console.log("OK:", response.ok);
      console.log("Content-Type:", contentType);
      console.log("Response Size:", responseBuffer.byteLength, "bytes");
      console.log("========================================");

      if (!response.ok) {
        let errorMessage = `LSTM backend error: HTTP ${response.status} ${response.statusText}`;

        // Error response dari FastAPI biasanya JSON.
        if (contentType.includes("application/json")) {
          try {
            const errorText = new TextDecoder().decode(responseBuffer);
            const errorData = JSON.parse(errorText);

            if (typeof errorData?.detail === "string") {
              errorMessage = errorData.detail;
            } else if (Array.isArray(errorData?.detail)) {
              errorMessage = errorData.detail
                .map((item: any) => {
                  const location = Array.isArray(item?.loc)
                    ? item.loc.join(" → ")
                    : "request";

                  return `${location}: ${item?.msg || "Invalid value"}`;
                })
                .join("; ");
            } else if (typeof errorData?.message === "string") {
              errorMessage = errorData.message;
            }
          } catch {
            // Gunakan pesan HTTP default jika body error tidak dapat dibaca.
          }
        }

        throw new Error(errorMessage);
      }

      // ============================================================
      // PARSE MULTIPART RESPONSE
      // Backend mengembalikan:
      // - forecast_result.csv
      // - future_forecast.csv
      // - forecast_chart.png
      // ============================================================
      const parsedFiles = contentType.includes("multipart/form-data")
        ? parseMultipartResponse(responseBuffer, contentType)
        : [];

      // Hapus object URL response sebelumnya agar tidak terjadi memory leak.
      setLstmResponseFiles((previous) => {
        previous.forEach((item) => URL.revokeObjectURL(item.url));
        return parsedFiles.map((item) => ({
          ...item,
          url: URL.createObjectURL(item.blob),
        }));
      });

      console.log("=== LSTM FILES RECEIVED ===");
      parsedFiles.forEach((item) => {
        console.log(item.filename, {
          contentType: item.contentType,
          size: item.blob.size,
        });
      });
      console.log("===========================");

      setResponseData({
        success: true,
        status: response.status,
        statusText: response.statusText,
        contentType,
        responseSize: responseBuffer.byteLength,
        files: parsedFiles.map((item) => ({
          filename: item.filename,
          contentType: item.contentType,
          size: item.blob.size,
        })),
        message:
          parsedFiles.length > 0
            ? "LSTM berhasil diproses dan hasil berhasil diterima dari backend."
            : "Response backend berhasil diterima.",
      });

      addLog({
        payload: {
          machine_name: machineName,
          mode: "LSTM",
          target_col: lstmConfig.targetCol,
          feature_cols: lstmConfig.featureCols,
          date_col: lstmConfig.dateCol,
          forecast_horizon: lstmConfig.forecastHorizon,
        } as unknown as TelemetryPayload,
        status: response.status,
        success: true,
        message:
          "LSTM FormData berhasil dikirim dan response backend berhasil diterima.",
      });
    } catch (error) {
      console.error("========================================");
      console.error("LSTM FORECAST ERROR");
      console.error("========================================");
      console.error(error);
      console.error("========================================");

      setResponseData({
        success: false,
        message:
          error instanceof Error ? error.message : "LSTM forecast failed.",
      });

      addLog({
        payload: {
          machine_name: machineName,
          mode: "LSTM",
        } as unknown as TelemetryPayload,
        success: false,
        message:
          error instanceof Error ? error.message : "LSTM forecast failed.",
      });
    } finally {
      setIsLstmForecasting(false);
    }
  }, [validLstmRequired, machineName, lstmConfig]);

  // ============================================================
  // Cleanup LSTM Object URLs
  // ============================================================

  useEffect(() => {
    return () => {
      lstmResponseFiles.forEach((item) => {
        URL.revokeObjectURL(item.url);
      });
    };
  }, [lstmResponseFiles]);

  // ============================================================
  // Auto Stream
  // ============================================================

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    // Auto-stream is ONLY for Isolation Forest.
    if (isStreaming && mode === "Isolation Forest") {
      intervalId = setInterval(() => {
        // ------------------------------------------------------
        // Generate realistic random variations
        // ------------------------------------------------------

        const newArus = arus * (1 + (Math.random() * 0.04 - 0.02));

        const newPressure = pressure * (1 + (Math.random() * 0.02 - 0.01));

        const newFlow = flow * (1 + (Math.random() * 0.06 - 0.03));

        const newPower = power * (1 + (Math.random() * 0.04 - 0.02));

        // ------------------------------------------------------
        // Update UI state
        // ------------------------------------------------------

        setArus(Number(newArus.toFixed(2)));

        setPressure(Number(newPressure.toFixed(2)));

        setFlow(Number(newFlow.toFixed(1)));

        setPower(Number(newPower.toFixed(4)));

        // ------------------------------------------------------
        // Send generated telemetry
        // ------------------------------------------------------

        sendData({
          arus_a: Number(newArus.toFixed(2)),

          outlet_pressure_bar: Number(newPressure.toFixed(2)),

          outlet_flow_rate_m3h: Number(newFlow.toFixed(1)),

          kwh_per_m3: Number(newPower.toFixed(4)),
        });
      }, intervalSeconds * 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [
    isStreaming,
    mode,
    intervalSeconds,
    sendData,
    arus,
    pressure,
    flow,
    power,
  ]);

  // ============================================================
  // Manual Isolation Forest Push
  // ============================================================

  const handleManualPush = async () => {
    setIsSending(true);

    await sendData();

    setIsSending(false);
  };

  // ============================================================
  // Handle Mode Change
  // ============================================================

  const handleModeChange = (nextMode: CompressorMode) => {
    // Stop auto-stream when switching away
    // from Isolation Forest.

    if (nextMode === "LSTM") {
      setIsStreaming(false);
    }

    setMode(nextMode);
  };

  // ============================================================
  // Clear Logs
  // ============================================================

  const handleClearLogs = () => {
    setLogs([]);
  };

  // ============================================================
  // Preview Payload
  // ============================================================

  const isolationForestPreviewPayload = {
    machine_name: machineName,
    model_train: modelTrain,

    sample: {
      arus_a: arus,
      outlet_pressure_bar: pressure,
      outlet_flow_rate_m3h: flow,
      kwh_per_m3: power,
    },
  };

  const lstmPreviewPayload = {
    endpoint: ML_ENDPOINTS.lstm,
    method: "POST",
    content_type: "multipart/form-data",
    form_data: {
      file: lstmConfig.file?.name || null,
      target_col: lstmConfig.targetCol,
      feature_cols: lstmConfig.featureCols.join(","),
      date_col: lstmConfig.dateCol,
      forecast_horizon: lstmConfig.forecastHorizon,
      seq_length: lstmConfig.seqLength,
      hidden_size: lstmConfig.hiddenSize,
      num_layers: lstmConfig.numLayers,
      dropout: lstmConfig.dropout,
      epochs: lstmConfig.epochs,
      batch_size: lstmConfig.batchSize,
      learning_rate: lstmConfig.learningRate,
      train_split: lstmConfig.trainSplit,
    },
    forecast_period_ui: forecastPeriod,
  };

  const previewPayload =
    mode === "Isolation Forest"
      ? isolationForestPreviewPayload
      : lstmPreviewPayload;

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-full bg-slate-50 font-sans text-slate-900 selection:bg-cyan-500/20">
      <div className="mx-auto w-full max-w-[1400px] space-y-6">
        {/* ======================================================
            Page Header
        ====================================================== */}

        <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm md:px-8">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600" />

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-600">
                <Activity className="h-4 w-4" />
                Industrial Monitoring
              </div>

              <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                Compressor Telemetry
              </h1>

              <p className="mt-1.5 text-sm text-slate-500">
                Condition monitoring data simulator and n8n webhook pusher
              </p>
            </div>

            {/* Streaming Status */}

            <div
              className={`flex w-fit items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                isStreaming
                  ? "border-cyan-200 bg-cyan-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="relative flex h-3 w-3">
                {isStreaming && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                )}

                <span
                  className={`relative inline-flex h-3 w-3 rounded-full ${
                    isStreaming ? "bg-cyan-500" : "bg-slate-400"
                  }`}
                />
              </div>

              <div>
                <p
                  className={`text-sm font-semibold ${
                    isStreaming ? "text-cyan-700" : "text-slate-600"
                  }`}
                >
                  {isStreaming ? "Auto-Stream Active" : "System Idle"}
                </p>

                <p className="text-xs text-slate-400">
                  {isStreaming
                    ? `Sending every ${intervalSeconds}s`
                    : "Ready to send telemetry"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* ======================================================
            Main Content
        ====================================================== */}

        <div
          className={`grid grid-cols-1 gap-6 ${
            mode === "LSTM" ? "xl:grid-cols-1" : "xl:grid-cols-3"
          }`}
        >
          {/* ====================================================
              Main Controls
          ==================================================== */}

          <div
            className={`space-y-6 ${
              mode === "LSTM" ? "xl:col-span-1" : "xl:col-span-2"
            }`}
          >
            {/* ==================================================
                Processing Mode
            ================================================== */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                    <Activity className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Processing Mode
                    </h2>

                    <p className="text-xs text-slate-500">
                      Select how the compressor telemetry data will be processed
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <ModeSelector
                  value={mode}
                  onChange={handleModeChange}
                  disabled={isStreaming || isLstmForecasting}
                />
              </div>
            </section>

            {mode === "Isolation Forest" && (
              <>
                {/* ==================================================
                    Connection Settings
                ================================================== */}

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                        <Settings className="h-5 w-5" />
                      </div>

                      <div>
                        <h2 className="text-base font-semibold text-slate-900">
                          Connection Settings
                        </h2>

                        <p className="text-xs text-slate-500">
                          Configure the telemetry destination and simulator
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
                    {/* Webhook URL */}

                    <div className="space-y-2 md:col-span-2">
                      <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <span>n8n Webhook URL</span>

                        <span className="normal-case font-normal text-slate-400">
                          HTTP POST endpoint
                        </span>
                      </label>

                      <div className="relative">
                        <Wifi className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          type="url"
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          disabled={isStreaming}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="https://your-n8n-instance.com/webhook/..."
                        />
                      </div>
                    </div>

                    {/* Machine Name */}

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Machine Name
                      </label>

                      <div className="relative">
                        <Server className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <select
                          value={machineName}
                          onChange={(e) => setMachineName(e.target.value)}
                          disabled={
                            isStreaming ||
                            loadingTrainingModels ||
                            trainingModels.length === 0
                          }
                          className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm font-medium text-slate-700 outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {loadingTrainingModels ? (
                            <option value="">Loading machines...</option>
                          ) : trainingModels.length === 0 ? (
                            <option value="">No trained machine</option>
                          ) : (
                            trainingModels.map((model) => (
                              <option key={model.id} value={model.machine_name}>
                                {model.machine_name}
                              </option>
                            ))
                          )}
                        </select>

                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          ▼
                        </span>
                      </div>

                      <div className="min-h-[16px] px-1">
                        {loadingTrainingModels ? (
                          <p className="text-[11px] text-slate-400">
                            Loading training model...
                          </p>
                        ) : modelTrain ? (
                          <p className="truncate text-[11px] text-slate-400">
                            Model:{" "}
                            <span className="font-medium text-slate-500">
                              {modelTrain}
                            </span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-rose-400">
                            No trained model available for this machine
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Auto Stream Interval */}

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Auto-Stream Interval
                      </label>

                      <div className="relative">
                        <Clock3 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={intervalSeconds}
                          onChange={(e) =>
                            setIntervalSeconds(
                              Math.max(1, parseInt(e.target.value) || 1),
                            )
                          }
                          disabled={isStreaming || mode === "LSTM"}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>

                      {mode === "LSTM" && (
                        <p className="text-[11px] text-slate-400">
                          Auto-stream is only available for Isolation Forest.
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* ==================================================
                Telemetry Parameters
            ================================================== */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {mode === "Isolation Forest" && (
                <>
                  <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                        <Activity className="h-5 w-5" />
                      </div>

                      <div>
                        <h2 className="text-base font-semibold text-slate-900">
                          Telemetry Parameters
                        </h2>

                        <p className="text-xs text-slate-500">
                          Adjust simulated compressor operating values
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isStreaming && (
                        <span className="flex items-center gap-1.5 rounded-lg bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-700">
                          <Zap className="h-3.5 w-3.5" />
                          Auto-modulating
                        </span>
                      )}

                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                          showPreview
                            ? "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Code className="h-4 w-4" />

                        {showPreview ? "Hide Preview" : "Live Preview"}
                      </button>
                    </div>
                  </div>

                  {/* =================================================
                  Telemetry Fields
              ================================================= */}

                  <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
                    {/* Arus */}

                    <ParameterControl
                      label="Arus Listrik"
                      value={arus}
                      min={0}
                      max={200}
                      step={0.1}
                      unit="A"
                      onChange={setArus}
                      disabled={isStreaming}
                    />

                    {/* Pressure */}

                    <ParameterControl
                      label="Outlet Pressure"
                      value={pressure}
                      min={0}
                      max={12}
                      step={0.1}
                      unit="Bar"
                      onChange={setPressure}
                      disabled={isStreaming}
                    />

                    {/* Flow */}

                    <ParameterControl
                      label="Outlet Flow Rate"
                      value={flow}
                      min={0}
                      max={1000}
                      step={1}
                      unit="m³/h"
                      onChange={setFlow}
                      disabled={isStreaming}
                    />

                    {/* Specific Power */}

                    <ParameterControl
                      label="Specific Power"
                      value={power}
                      min={0}
                      max={0.3}
                      step={0.01}
                      unit="kWh/m³"
                      onChange={setPower}
                      disabled={isStreaming}
                    />
                  </div>
                </>
              )}

              {mode === "LSTM" && (
                <>
                  {/* =================================================
                      LSTM Configuration
                  ================================================= */}

                  <section className="border-t border-slate-100 px-6 py-6">
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">
                          LSTM Configuration
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Upload CSV telemetry and configure the LSTM forecast.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {/* CSV */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          CSV Dataset <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          disabled={isLstmForecasting}
                          onChange={(event) =>
                            handleLstmFileChange(
                              event.target.files?.[0] ?? null,
                            )
                          }
                          className="block w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-cyan-700 hover:file:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        {lstmConfig.file && (
                          <p className="text-[11px] text-slate-400">
                            Selected:{" "}
                            <span className="font-medium text-slate-500">
                              {lstmConfig.file.name}
                            </span>
                          </p>
                        )}
                      </div>

                      {/* Required */}
                      <div>
                        <div className="mb-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Required Configuration
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            Parameter yang wajib diisi sebelum forecast
                            dijalankan.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500">
                              Target Column *
                            </label>
                            <select
                              value={lstmConfig.targetCol}
                              disabled={
                                isLstmForecasting || lstmHeaders.length === 0
                              }
                              onChange={(event) =>
                                setLstmConfig((previous) => ({
                                  ...previous,
                                  targetCol: event.target.value,
                                  featureCols: previous.featureCols.filter(
                                    (column) => column !== event.target.value,
                                  ),
                                }))
                              }
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="">Select target column</option>
                              {lstmHeaders.map((column) => (
                                <option key={column} value={column}>
                                  {column}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500">
                              Date / Time Column *
                            </label>
                            <select
                              value={lstmConfig.dateCol}
                              disabled={
                                isLstmForecasting || lstmHeaders.length === 0
                              }
                              onChange={(event) =>
                                setLstmConfig((previous) => ({
                                  ...previous,
                                  dateCol: event.target.value,
                                  featureCols: previous.featureCols.filter(
                                    (column) => column !== event.target.value,
                                  ),
                                }))
                              }
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="">Select date/time column</option>
                              {lstmHeaders.map((column) => (
                                <option key={column} value={column}>
                                  {column}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500">
                              Forecast Horizon *
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={lstmConfig.forecastHorizon}
                              disabled={isLstmForecasting}
                              onChange={(event) =>
                                setLstmConfig((previous) => ({
                                  ...previous,
                                  forecastHorizon: Math.max(
                                    1,
                                    Number(event.target.value) || 1,
                                  ),
                                }))
                              }
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Feature Columns */}
                      <div>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Feature Columns *
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              Pilih kolom yang digunakan sebagai fitur model.
                            </p>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {lstmConfig.featureCols.length} selected
                          </span>
                        </div>

                        {lstmHeaders.length > 0 ? (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {lstmHeaders.map((column) => {
                              const disabledColumn =
                                column === lstmConfig.targetCol ||
                                column === lstmConfig.dateCol;
                              const checked =
                                lstmConfig.featureCols.includes(column);

                              return (
                                <label
                                  key={column}
                                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-sm transition-colors ${
                                    disabledColumn
                                      ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                                      : checked
                                        ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={
                                      disabledColumn || isLstmForecasting
                                    }
                                    onChange={() => toggleLstmFeature(column)}
                                    className="h-4 w-4 rounded border-slate-300 accent-cyan-500"
                                  />
                                  <span className="truncate">{column}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-xs text-slate-400">
                            Upload CSV terlebih dahulu untuk memilih feature
                            columns.
                          </div>
                        )}
                      </div>

                      {/* Advanced */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60">
                        <button
                          type="button"
                          onClick={() =>
                            setShowAdvancedLstm((previous) => !previous)
                          }
                          disabled={isLstmForecasting}
                          className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-700">
                              Advanced Parameters
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              Gunakan default atau buka untuk konfigurasi
                              lanjutan.
                            </p>
                          </div>
                          <span className="text-slate-400">
                            {showAdvancedLstm ? "▲" : "▼"}
                          </span>
                        </button>

                        {showAdvancedLstm && (
                          <div className="grid grid-cols-1 gap-4 border-t border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
                            {[
                              ["Sequence Length", "seqLength", 1, undefined, 1],
                              ["Hidden Size", "hiddenSize", 1, undefined, 1],
                              [
                                "Number of Layers",
                                "numLayers",
                                1,
                                undefined,
                                1,
                              ],
                              ["Dropout", "dropout", 0, 1, 0.05],
                              ["Epochs", "epochs", 1, undefined, 1],
                              ["Batch Size", "batchSize", 1, undefined, 1],
                              [
                                "Learning Rate",
                                "learningRate",
                                0.000001,
                                undefined,
                                0.0001,
                              ],
                              ["Train Split", "trainSplit", 0.1, 0.99, 0.05],
                            ].map(([label, key, min, max, step]) => (
                              <div key={String(key)} className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500">
                                  {String(label)}
                                </label>
                                <input
                                  type="number"
                                  min={Number(min)}
                                  max={
                                    max === undefined ? undefined : Number(max)
                                  }
                                  step={Number(step)}
                                  value={
                                    Number(
                                      lstmConfig[key as keyof LSTMConfig],
                                    ) as number
                                  }
                                  disabled={isLstmForecasting}
                                  onChange={(event) => {
                                    const value = Number(event.target.value);
                                    if (Number.isNaN(value)) return;
                                    setLstmConfig((previous) => ({
                                      ...previous,
                                      [key]: value,
                                    }));
                                  }}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* =================================================
                      Forecast Period
                  ================================================= */}

                  <section className="border-t border-slate-100 px-6 py-6">
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-slate-800">
                        Forecast Period
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Select the period used for the LSTM forecast
                      </p>
                    </div>
                    <ForecastPeriodSelector
                      value={forecastPeriod}
                      onChange={setForecastPeriod}
                      disabled={isLstmForecasting}
                    />
                  </section>
                </>
              )}

              {/* =================================================
                  Action Buttons
              ================================================= */}

              <div className="border-t border-slate-100 bg-slate-50/70 p-6">
                {mode === "Isolation Forest" ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Manual Push */}

                    <button
                      onClick={handleManualPush}
                      disabled={isStreaming || isSending || !modelTrain}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}

                      {isSending ? "Mengirim..." : "Kirim Sekali"}
                    </button>

                    {/* Auto Stream */}

                    <button
                      onClick={() => setIsStreaming(!isStreaming)}
                      disabled={!modelTrain && !isStreaming}
                      className={`flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                        isStreaming
                          ? "border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                          : "bg-cyan-600 text-white shadow-cyan-600/20 hover:bg-cyan-700 hover:shadow-md"
                      }`}
                    >
                      {isStreaming ? (
                        <>
                          <Square className="h-4 w-4 fill-current" />
                          Stop Auto-Stream
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 fill-current" />
                          Mulai Auto-Stream
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  /* =================================================
                     LSTM Action
                  ================================================= */

                  <button
                    type="button"
                    onClick={sendLstmForecast}
                    disabled={isLstmForecasting || !validLstmRequired}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm shadow-cyan-600/20 transition-all hover:bg-cyan-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLstmForecasting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Running LSTM Forecast...
                      </>
                    ) : (
                      <>
                        <Activity className="h-4 w-4" />
                        Run LSTM Forecast
                      </>
                    )}
                  </button>
                )}
              </div>

              {mode === "LSTM" && lstmResponseFiles.length > 0 && (
                <section className="border-t border-slate-100 bg-white px-6 py-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        LSTM Forecast Result
                      </h2>
                      <p className="text-xs text-slate-500">
                        Hasil dari backend setelah training dan prediction
                        selesai.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {lstmResponseFiles.map((item) => {
                      const isImage =
                        item.contentType.startsWith("image/") ||
                        item.filename.toLowerCase().endsWith(".png") ||
                        item.filename.toLowerCase().endsWith(".jpg") ||
                        item.filename.toLowerCase().endsWith(".jpeg");

                      return (
                        <div
                          key={item.filename}
                          className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                        >
                          {isImage && (
                            <div className="p-3">
                              <img
                                src={item.url}
                                alt={item.filename}
                                className="w-full rounded-lg border border-slate-200 bg-white object-contain"
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-slate-700">
                                {item.filename}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {item.contentType} ·{" "}
                                {(item.blob.size / 1024).toFixed(1)} KB
                              </p>
                            </div>

                            <a
                              href={item.url}
                              download={item.filename}
                              className="shrink-0 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-cyan-700"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </section>
          </div>

          {/* ====================================================
              Right Side
          ==================================================== */}

          {mode === "Isolation Forest" && (
            <div className="min-h-[500px] xl:h-auto">
              <LogPanel logs={logs} onClear={handleClearLogs} />

              <ResponsePanel
                data={responseData}
                onClear={() => {
                  setResponseData(null);
                  setLstmResponseFiles((previous) => {
                    previous.forEach((item) => URL.revokeObjectURL(item.url));
                    return [];
                  });
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          Floating Live JSON Preview
      ======================================================== */}

      {showPreview && (
        <div className="fixed bottom-6 left-6 z-50 w-[calc(100vw-3rem)] max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Preview Header */}

          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                <Code className="h-4 w-4" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Live Payload Preview
                </p>

                <p className="text-[11px] text-slate-400">
                  {mode === "Isolation Forest"
                    ? "Isolation Forest payload"
                    : "LSTM forecast payload"}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowPreview(false)}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* JSON */}

          <div className="max-h-[420px] overflow-auto bg-slate-950 p-4">
            <pre className="font-mono text-xs leading-6 text-emerald-400">
              {JSON.stringify(previewPayload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
