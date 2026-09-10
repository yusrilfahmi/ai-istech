"use client";

import React, { useEffect, useState } from "react";
import {
  Upload,
  BrainCircuit,
  CheckCircle2,
  AlertCircle,
  Pencil,
  X,
  Cpu,
  Activity,
  Layers3,
  CalendarDays,
  Target,
  Settings2,
  Play,
  RefreshCw,
} from "lucide-react";

import { CsvUploader } from "@/components/ml-training/CsvUploader";
import { CsvPreview } from "@/components/ml-training/CsvPreview";
import { FeatureSelector } from "@/components/ml-training/FeatureSelector";

import {
  TrainingConfigForm,
  TrainingConfig,
} from "@/components/ml-training/TrainingConfigForm";

import { TrainingConfirmModal } from "@/components/ml-training/TrainingConfirmModal";

import {
  TrainingList,
  TrainingRecord,
} from "@/components/ml-training/TrainingList";

import { mlTrainingApi } from "@/lib/api";

// ============================================================
// Types
// ============================================================

type ModelType = "isolation_forest" | "lstm";

type LSTMConfig = {
  targetCol: string;
  featureCols: string[];
  dateCol: string;

  seqLength: string;
  forecastHorizon: string;

  hiddenSize: string;
  numLayers: string;
  dropout: string;

  epochs: string;
  batchSize: string;
  learningRate: string;
  trainSplit: string;
};

// ============================================================
// Default LSTM Configuration
// ============================================================

const DEFAULT_LSTM_CONFIG: LSTMConfig = {
  targetCol: "",
  featureCols: [],
  dateCol: "",

  seqLength: "20",
  forecastHorizon: "1",

  hiddenSize: "64",
  numLayers: "2",
  dropout: "0.2",

  epochs: "100",
  batchSize: "32",
  learningRate: "0.001",
  trainSplit: "0.8",
};

// ============================================================
// Page
// ============================================================

export default function MLTrainingPage() {
  // ============================================================
  // Model Selection
  // ============================================================

  const [modelType, setModelType] = useState<ModelType>("isolation_forest");

  // ============================================================
  // CSV State
  // ============================================================

  const [file, setFile] = useState<File | null>(null);

  const [headers, setHeaders] = useState<string[]>([]);

  const [rows, setRows] = useState<string[][]>([]);

  // ============================================================
  // Isolation Forest Feature State
  // ============================================================

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  // ============================================================
  // Isolation Forest Training Configuration
  // ============================================================

  const [config, setConfig] = useState<TrainingConfig>({
    machineName: "",
    contamination: "0.1",
    nEstimators: "100",
    maxSamples: "auto",
  });

  // ============================================================
  // LSTM Configuration
  // ============================================================

  const [lstmConfig, setLstmConfig] = useState<LSTMConfig>(DEFAULT_LSTM_CONFIG);

  // ============================================================
  // Training State
  // ============================================================

  const [confirmOpen, setConfirmOpen] = useState(false);

  const [training, setTraining] = useState(false);

  const [lstmResult, setLstmResult] = useState<any>(null);

  // ============================================================
  // Existing Training Records
  // ============================================================

  const [records, setRecords] = useState<TrainingRecord[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [loadingRecords, setLoadingRecords] = useState(true);

  // ============================================================
  // Notification
  // ============================================================

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // ============================================================
  // Load Existing Isolation Forest Records
  // ============================================================

  useEffect(() => {
    const loadTrainingRecords = async () => {
      try {
        setLoadingRecords(true);

        const response = await mlTrainingApi.list();

        const data = response.data || [];

        const mappedRecords: TrainingRecord[] = data.map((item: any) => ({
          id: item.id,
          machineName: item.machine_name,
          fileName: item.file_name,
          features: item.features || [],
          contamination: Number(item.contamination),
          nEstimators: Number(item.n_estimators),
          maxSamples: item.max_samples,
          modelName: item.model_name
            ? item.model_name.replace(/\\/g, "/").split("/").pop() || ""
            : "",
          trainedAt: item.trained_at,
          locked: item.locked,
        }));

        setRecords(mappedRecords);
      } catch (error) {
        console.error("Failed to load ML training records:", error);

        setMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Failed to load training records.",
        });
      } finally {
        setLoadingRecords(false);
      }
    };

    loadTrainingRecords();
  }, []);

  // ============================================================
  // CSV Parser
  // ============================================================

  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());

    if (!lines.length) {
      setHeaders([]);
      setRows([]);
      return;
    }

    const parsed = lines.map((line) =>
      line.split(",").map((value) => value.trim().replace(/^"|"$/g, "")),
    );

    const [headerRow, ...dataRows] = parsed;

    setHeaders(headerRow);
    setRows(dataRows);

    // ==========================================================
    // Isolation Forest
    // ==========================================================

    if (modelType === "isolation_forest") {
      if (editingId) {
        setSelectedFeatures((previousFeatures) =>
          previousFeatures.filter((feature) => headerRow.includes(feature)),
        );
      }
    }

    // ==========================================================
    // LSTM
    //
    // Preserve existing selections if
    // the column still exists.
    // ==========================================================

    if (modelType === "lstm") {
      setLstmConfig((previous) => ({
        ...previous,

        targetCol: headerRow.includes(previous.targetCol)
          ? previous.targetCol
          : "",

        dateCol: headerRow.includes(previous.dateCol) ? previous.dateCol : "",

        featureCols: previous.featureCols.filter((feature) =>
          headerRow.includes(feature),
        ),
      }));
    }
  };

  // ============================================================
  // Handle CSV Upload
  // ============================================================

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile);

    setHeaders([]);
    setRows([]);

    setLstmResult(null);

    // ==========================================================
    // Do not remove IF features during edit.
    // ==========================================================

    if (modelType === "isolation_forest") {
      if (!editingId) {
        setSelectedFeatures([]);
      }
    }

    // ==========================================================
    // Reset LSTM selections when uploading
    // a new dataset.
    // ==========================================================

    if (modelType === "lstm") {
      setLstmConfig(DEFAULT_LSTM_CONFIG);
    }

    setMessage(null);

    if (!selectedFile) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result;

      if (typeof text === "string") {
        parseCsv(text);
      }
    };

    reader.onerror = () => {
      setMessage({
        type: "error",
        text: "Failed to read CSV file.",
      });
    };

    reader.readAsText(selectedFile);
  };

  // ============================================================
  // Model Selection
  // ============================================================

  const handleModelChange = (type: ModelType) => {
    if (training) return;

    setModelType(type);

    setMessage(null);

    setLstmResult(null);

    // ==========================================================
    // Switching model means this is a new
    // dataset flow.
    // ==========================================================

    setFile(null);
    setHeaders([]);
    setRows([]);

    setSelectedFeatures([]);

    setLstmConfig(DEFAULT_LSTM_CONFIG);

    // Editing only belongs to existing
    // Isolation Forest training records.
    setEditingId(null);

    if (type === "isolation_forest") {
      setConfig({
        machineName: "",
        contamination: "0.1",
        nEstimators: "100",
        maxSamples: "auto",
      });
    }
  };

  // ============================================================
  // Isolation Forest Validation
  // ============================================================

  const contaminationValue = Number(config.contamination);

  const nEstimatorsValue = Number(config.nEstimators);

  const validContamination =
    config.contamination !== "" &&
    !Number.isNaN(contaminationValue) &&
    contaminationValue > 0 &&
    contaminationValue < 0.5;

  const validNEstimators =
    config.nEstimators !== "" &&
    !Number.isNaN(nEstimatorsValue) &&
    nEstimatorsValue > 0;

  const canTrainIsolationForest =
    file !== null &&
    headers.length > 0 &&
    selectedFeatures.length > 0 &&
    config.machineName.trim() !== "" &&
    config.contamination !== "" &&
    config.nEstimators !== "" &&
    config.maxSamples.trim() !== "" &&
    validContamination &&
    validNEstimators;

  // ============================================================
  // LSTM Validation
  // ============================================================

  const seqLengthValue = Number(lstmConfig.seqLength);

  const forecastHorizonValue = Number(lstmConfig.forecastHorizon);

  const hiddenSizeValue = Number(lstmConfig.hiddenSize);

  const numLayersValue = Number(lstmConfig.numLayers);

  const dropoutValue = Number(lstmConfig.dropout);

  const epochsValue = Number(lstmConfig.epochs);

  const batchSizeValue = Number(lstmConfig.batchSize);

  const learningRateValue = Number(lstmConfig.learningRate);

  const trainSplitValue = Number(lstmConfig.trainSplit);

  const validLSTM =
    file !== null &&
    headers.length > 0 &&
    lstmConfig.targetCol.trim() !== "" &&
    !Number.isNaN(seqLengthValue) &&
    seqLengthValue > 0 &&
    !Number.isNaN(forecastHorizonValue) &&
    forecastHorizonValue > 0 &&
    !Number.isNaN(hiddenSizeValue) &&
    hiddenSizeValue > 0 &&
    !Number.isNaN(numLayersValue) &&
    numLayersValue > 0 &&
    !Number.isNaN(dropoutValue) &&
    dropoutValue >= 0 &&
    dropoutValue < 1 &&
    !Number.isNaN(epochsValue) &&
    epochsValue > 0 &&
    !Number.isNaN(batchSizeValue) &&
    batchSizeValue > 0 &&
    !Number.isNaN(learningRateValue) &&
    learningRateValue > 0 &&
    !Number.isNaN(trainSplitValue) &&
    trainSplitValue > 0 &&
    trainSplitValue < 1;

  // ============================================================
  // Open Isolation Forest Confirmation
  // ============================================================

  const handleTrainingClick = () => {
    setMessage(null);

    if (!file) {
      setMessage({
        type: "error",
        text: "Please upload a CSV file first.",
      });

      return;
    }

    if (selectedFeatures.length === 0) {
      setMessage({
        type: "error",
        text: "Please select at least one feature.",
      });

      return;
    }

    if (!config.machineName.trim()) {
      setMessage({
        type: "error",
        text: "Machine name is required.",
      });

      return;
    }

    if (!validContamination) {
      setMessage({
        type: "error",
        text: "Contamination must be greater than 0 and less than 0.5.",
      });

      return;
    }

    if (!validNEstimators) {
      setMessage({
        type: "error",
        text: "N Estimators must be greater than 0.",
      });

      return;
    }

    if (!config.maxSamples.trim()) {
      setMessage({
        type: "error",
        text: "Max Samples is required.",
      });

      return;
    }

    setConfirmOpen(true);
  };

  // ============================================================
  // Isolation Forest Training
  // ============================================================

  const handleConfirmTraining = async () => {
    if (!file) {
      setMessage({
        type: "error",
        text: "CSV file is missing.",
      });

      return;
    }

    setTraining(true);
    setMessage(null);

    try {
      // ======================================================
      // FormData
      // ======================================================

      const formData = new FormData();

      formData.append("dataset", file);

      formData.append("machine_name", config.machineName.trim());

      const modelSet = {
        features: selectedFeatures,
        contamination: Number(config.contamination),
        n_estimators: Number(config.nEstimators),
        max_samples: config.maxSamples.trim(),
      };

      formData.append("model_set", JSON.stringify(modelSet));

      console.log("=== BUILD MODEL PAYLOAD ===");

      console.log("dataset:", file);

      console.log("machine_name:", config.machineName.trim());

      console.log("model_set:", modelSet);

      console.log("model_set JSON:", JSON.stringify(modelSet, null, 2));

      console.log("============================");

      // ======================================================
      // Build Model
      // ======================================================

      const response = await fetch("http://10.10.10.54:8020/build_model", {
        method: "POST",
        body: formData,
      });

      let result: any = null;

      try {
        result = await response.json();
      } catch {
        result = null;
      }

      console.log("Build Model Response:", result);

      if (!response.ok) {
        const errorMessage =
          result?.detail ||
          result?.message ||
          result?.error ||
          `Training failed with HTTP ${response.status}`;

        throw new Error(errorMessage);
      }

      // ======================================================
      // Model Name
      // ======================================================

      const rawModelName =
        result?.model_train ||
        result?.model_name ||
        result?.model ||
        `${config.machineName}_model.joblib`;

      const modelName =
        String(rawModelName).replace(/\\/g, "/").split("/").pop() || "";

      // ======================================================
      // Save Training Record
      // ======================================================

      const trainingPayload = {
        machine_name: config.machineName.trim(),

        file_name: file.name,

        features: [...selectedFeatures],

        contamination: contaminationValue,

        n_estimators: nEstimatorsValue,

        max_samples: config.maxSamples.trim(),

        model_name: modelName,

        status: "ready",
      };

      let savedRecord: any;

      if (editingId) {
        const updateResponse = await mlTrainingApi.update(
          editingId,
          trainingPayload,
        );

        savedRecord = updateResponse.data;
      } else {
        const createResponse = await mlTrainingApi.create(trainingPayload);

        savedRecord = createResponse.data;
      }

      // ======================================================
      // Normalize model name
      // ======================================================

      const normalizedSavedModelName = savedRecord.model_name
        ? String(savedRecord.model_name).replace(/\\/g, "/").split("/").pop() ||
          ""
        : "";

      // ======================================================
      // Frontend Record
      // ======================================================

      const newRecord: TrainingRecord = {
        id: savedRecord.id,

        machineName: savedRecord.machine_name,

        fileName: savedRecord.file_name,

        features: savedRecord.features || [],

        contamination: Number(savedRecord.contamination),

        nEstimators: Number(savedRecord.n_estimators),

        maxSamples: savedRecord.max_samples,

        modelName: normalizedSavedModelName,

        trainedAt: savedRecord.trained_at,

        locked: savedRecord.locked,
      };

      // ======================================================
      // Update Local State
      // ======================================================

      setRecords((prev) => {
        const exists = prev.some((item) => item.id === newRecord.id);

        if (exists) {
          return prev.map((item) =>
            item.id === newRecord.id ? newRecord : item,
          );
        }

        return [newRecord, ...prev];
      });

      setEditingId(null);

      setConfirmOpen(false);

      setMessage({
        type: "success",
        text: `Data ${config.machineName} berhasil di-training dan siap dilakukan testing.`,
      });
    } catch (error) {
      console.error("Build model failed:", error);

      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Training failed.",
      });
    } finally {
      setTraining(false);
    }
  };

  // ============================================================
  // LSTM Config Update
  // ============================================================

  const updateLSTMConfig = <K extends keyof LSTMConfig>(
    field: K,
    value: LSTMConfig[K],
  ) => {
    setLstmConfig((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // ============================================================
  // LSTM Forecast / Training
  // ============================================================

  const handleLSTMTraining = async () => {
    setMessage(null);
    setLstmResult(null);

    if (!file) {
      setMessage({
        type: "error",
        text: "Please upload a CSV file first.",
      });
      return;
    }

    if (!lstmConfig.targetCol.trim()) {
      setMessage({
        type: "error",
        text: "Target column is required.",
      });
      return;
    }

    if (lstmConfig.featureCols.includes(lstmConfig.targetCol)) {
      setMessage({
        type: "error",
        text: "Target column should not be included in Feature Columns.",
      });
      return;
    }

    if (!validLSTM) {
      setMessage({
        type: "error",
        text: "Please check the LSTM configuration values.",
      });
      return;
    }

    setTraining(true);

    try {
      // FastAPI /forecast expects multipart/form-data because it uses
      // UploadFile + Form(...). Do not set Content-Type manually.
      const formData = new FormData();

      // Required fields
      formData.append("file", file, file.name);
      formData.append("target_col", lstmConfig.targetCol.trim());

      // Optional fields
      if (lstmConfig.featureCols.length > 0) {
        formData.append(
          "feature_cols",
          lstmConfig.featureCols.filter(Boolean).join(","),
        );
      }

      if (lstmConfig.dateCol.trim()) {
        formData.append("date_col", lstmConfig.dateCol.trim());
      }

      // LSTM parameters expected by FastAPI
      formData.append("seq_length", String(seqLengthValue));
      formData.append("forecast_horizon", String(forecastHorizonValue));
      formData.append("hidden_size", String(hiddenSizeValue));
      formData.append("num_layers", String(numLayersValue));
      formData.append("dropout", String(dropoutValue));
      formData.append("epochs", String(epochsValue));
      formData.append("batch_size", String(batchSizeValue));
      formData.append("learning_rate", String(learningRateValue));
      formData.append("train_split", String(trainSplitValue));

      // Debug exactly what will be sent to FastAPI.
      console.log("=== LSTM FORECAST/TRAINING ===");
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
      console.log("==============================");

      const response = await fetch("http://10.100.1.26:8010/forecast", {
        method: "POST",
        body: formData,
      });

      const responseText = await response.text();

      let result: any;

      try {
        result = responseText ? JSON.parse(responseText) : null;
      } catch {
        result = responseText;
      }

      console.log("=== LSTM RESPONSE ===");
      console.log("status:", response.status);
      console.log("ok:", response.ok);
      console.log("body:", result);
      console.log("=====================");

      if (!response.ok) {
        let errorMessage = `LSTM training failed with HTTP ${response.status}`;

        if (typeof result?.detail === "string") {
          errorMessage = result.detail;
        } else if (Array.isArray(result?.detail)) {
          errorMessage = result.detail
            .map((item: any) => {
              const location = Array.isArray(item?.loc)
                ? item.loc.join(" → ")
                : "request";
              return `${location}: ${item?.msg || "Invalid value"}`;
            })
            .join("; ");
        } else if (typeof result?.message === "string") {
          errorMessage = result.message;
        } else if (typeof result?.error === "string") {
          errorMessage = result.error;
        } else if (result) {
          errorMessage = JSON.stringify(result);
        }

        throw new Error(errorMessage);
      }

      setLstmResult(result);

      setMessage({
        type: "success",
        text: "LSTM training dan forecast berhasil dijalankan.",
      });
    } catch (error) {
      console.error("LSTM training failed:", error);

      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "LSTM training failed.",
      });
    } finally {
      setTraining(false);
    }
  };

  // ============================================================
  // Edit Isolation Forest Training
  // ============================================================

  const handleEditTraining = async (id: string) => {
    const record = records.find((item) => item.id === id);

    if (!record) return;

    try {
      setMessage(null);

      await mlTrainingApi.unlock(id);

      setModelType("isolation_forest");

      setEditingId(id);

      setConfig({
        machineName: record.machineName,

        contamination: String(record.contamination),

        nEstimators: String(record.nEstimators),

        maxSamples: record.maxSamples,
      });

      setSelectedFeatures([...record.features]);

      setMessage({
        type: "success",
        text: `${record.machineName} is ready to edit. Upload the new dataset and adjust the training configuration.`,
      });

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error("Unlock training failed:", error);

      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to unlock training record.",
      });
    }
  };

  // ============================================================
  // Clear Dataset
  // ============================================================

  const handleClearDataset = () => {
    if (training) return;

    setFile(null);

    setHeaders([]);

    setRows([]);

    setSelectedFeatures([]);

    setLstmConfig(DEFAULT_LSTM_CONFIG);

    setLstmResult(null);

    setEditingId(null);

    setConfig({
      machineName: "",
      contamination: "0.1",
      nEstimators: "100",
      maxSamples: "auto",
    });

    setMessage(null);
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ========================================================
          Header
      ======================================================== */}

      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
          <BrainCircuit className="h-4 w-4" />
          Machine Learning
        </div>

        <h1
          className="text-2xl font-bold"
          style={{
            color: "var(--foreground)",
          }}
        >
          Model Training
        </h1>

        <p
          className="mt-1 text-sm"
          style={{
            color: "var(--muted)",
          }}
        >
          Select a machine learning model, upload telemetry data, and configure
          the training process.
        </p>
      </div>

      {/* ========================================================
          Notification
      ======================================================== */}

      {message && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
            message.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/20 bg-red-500/10 text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}

          <span>{message.text}</span>
        </div>
      )}

      {/* ========================================================
          Model Selection
      ======================================================== */}

      <section
        className="rounded-2xl border p-6"
        style={{
          background: "var(--sidebar-bg)",
          borderColor: "var(--border)",
        }}
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <Cpu className="h-5 w-5" />
          </div>

          <div>
            <h2
              className="text-base font-semibold"
              style={{
                color: "var(--foreground)",
              }}
            >
              Select Model
            </h2>

            <p
              className="text-xs"
              style={{
                color: "var(--muted)",
              }}
            >
              Choose the machine learning model you want to train.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* ==================================================
              Isolation Forest
          ================================================== */}

          <button
            type="button"
            onClick={() => handleModelChange("isolation_forest")}
            disabled={training}
            className={`group rounded-xl border p-5 text-left transition-all ${
              modelType === "isolation_forest"
                ? "border-indigo-500/50 bg-indigo-500/10 ring-2 ring-indigo-500/10"
                : "hover:bg-white/[0.02]"
            } disabled:cursor-not-allowed disabled:opacity-50`}
            style={{
              borderColor:
                modelType === "isolation_forest" ? undefined : "var(--border)",
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  modelType === "isolation_forest"
                    ? "bg-indigo-500 text-white"
                    : "bg-indigo-500/10 text-indigo-400"
                }`}
              >
                <Activity className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h3
                    className="text-sm font-semibold"
                    style={{
                      color: "var(--foreground)",
                    }}
                  >
                    Isolation Forest
                  </h3>

                  {modelType === "isolation_forest" && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-400" />
                  )}
                </div>

                <p
                  className="mt-1 text-xs leading-5"
                  style={{
                    color: "var(--muted)",
                  }}
                >
                  Anomaly detection model for identifying abnormal compressor
                  operating conditions.
                </p>
              </div>
            </div>
          </button>

          {/* ==================================================
              LSTM
          ================================================== */}

          <button
            type="button"
            onClick={() => handleModelChange("lstm")}
            disabled={training}
            className={`group rounded-xl border p-5 text-left transition-all ${
              modelType === "lstm"
                ? "border-indigo-500/50 bg-indigo-500/10 ring-2 ring-indigo-500/10"
                : "hover:bg-white/[0.02]"
            } disabled:cursor-not-allowed disabled:opacity-50`}
            style={{
              borderColor: modelType === "lstm" ? undefined : "var(--border)",
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  modelType === "lstm"
                    ? "bg-indigo-500 text-white"
                    : "bg-indigo-500/10 text-indigo-400"
                }`}
              >
                <Layers3 className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h3
                    className="text-sm font-semibold"
                    style={{
                      color: "var(--foreground)",
                    }}
                  >
                    LSTM
                  </h3>

                  {modelType === "lstm" && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-400" />
                  )}
                </div>

                <p
                  className="mt-1 text-xs leading-5"
                  style={{
                    color: "var(--muted)",
                  }}
                >
                  Time-series forecasting model for predicting future compressor
                  values.
                </p>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* ========================================================
          EDITING INDICATOR
      ======================================================== */}

      {editingId && modelType === "isolation_forest" && (
        <div
          className="flex items-center justify-between gap-4 rounded-xl border p-4"
          style={{
            borderColor: "rgba(99, 102, 241, 0.25)",
            background: "rgba(99, 102, 241, 0.08)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <Pencil className="h-4 w-4" />
            </div>

            <div>
              <p
                className="text-sm font-semibold"
                style={{
                  color: "var(--foreground)",
                }}
              >
                Editing Training Data
              </p>

              <p
                className="text-xs"
                style={{
                  color: "var(--muted)",
                }}
              >
                Editing model for{" "}
                <span className="font-semibold text-indigo-400">
                  {config.machineName}
                </span>
                . Upload the new CSV dataset to continue.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClearDataset}
            disabled={training}
            className="flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              borderColor: "var(--border)",
              color: "var(--muted)",
            }}
          >
            <X className="h-3.5 w-3.5" />
            Cancel Edit
          </button>
        </div>
      )}

      {/* ========================================================
          Upload Dataset
          
          IMPORTANT:
          Upload is shown after selecting a model.
      ======================================================== */}

      <section
        className="rounded-2xl border p-6"
        style={{
          background: "var(--sidebar-bg)",
          borderColor: "var(--border)",
        }}
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <Upload className="h-5 w-5" />
          </div>

          <div>
            <h2
              className="text-base font-semibold"
              style={{
                color: "var(--foreground)",
              }}
            >
              {editingId
                ? "Upload New Training Dataset"
                : "Upload Training Dataset"}
            </h2>

            <p
              className="text-xs"
              style={{
                color: "var(--muted)",
              }}
            >
              {modelType === "isolation_forest"
                ? "Upload the CSV data that will be used to train the Isolation Forest model."
                : "Upload the CSV time-series data that will be used to train the LSTM model."}
            </p>
          </div>
        </div>

        <CsvUploader
          file={file}
          onFileChange={handleFileChange}
          disabled={training}
        />
      </section>

      {/* ========================================================
          Everything below this point only appears AFTER upload
      ======================================================== */}

      {file && headers.length > 0 && (
        <>
          {/* ==================================================
                CSV Preview
            ================================================== */}

          <CsvPreview headers={headers} rows={rows} />

          {/* ==================================================
                ISOLATION FOREST
            ================================================== */}

          {modelType === "isolation_forest" && (
            <>
              {/* ==============================================
                    Feature Selection
                ============================================== */}

              <FeatureSelector
                headers={headers}
                selectedFeatures={selectedFeatures}
                onChange={setSelectedFeatures}
                disabled={training}
              />

              {/* ==============================================
                    Existing IF Configuration
                ============================================== */}

              <TrainingConfigForm
                config={config}
                onChange={setConfig}
                disabled={training}
              />

              {/* ==============================================
                    Training Action
                ============================================== */}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleClearDataset}
                  disabled={training}
                  className="rounded-xl border px-5 py-3 text-sm font-medium transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--muted)",
                  }}
                >
                  {editingId ? "Cancel Edit" : "Clear Dataset"}
                </button>

                <button
                  type="button"
                  onClick={handleTrainingClick}
                  disabled={!canTrainIsolationForest || training}
                  className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    background: "var(--accent)",
                  }}
                >
                  <BrainCircuit className="h-4 w-4" />

                  {training
                    ? "Training..."
                    : editingId
                      ? "Update Model"
                      : "Training Data"}
                </button>
              </div>
            </>
          )}

          {/* ==================================================
                LSTM
            ================================================== */}

          {modelType === "lstm" && (
            <>
              {/* ==============================================
                    LSTM Dataset Configuration
                ============================================== */}

              <section
                className="rounded-xl border p-5"
                style={{
                  background: "var(--sidebar-bg)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="mb-5 flex items-center gap-2">
                  <Target className="h-4 w-4 text-indigo-400" />

                  <div>
                    <h3
                      className="text-sm font-semibold"
                      style={{
                        color: "var(--foreground)",
                      }}
                    >
                      Dataset Configuration
                    </h3>

                    <p
                      className="text-[11px]"
                      style={{
                        color: "var(--muted)",
                      }}
                    >
                      Select the target, feature, and date columns for the
                      time-series model.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* ==========================================
                        Target Column
                    ========================================== */}

                  <div>
                    <label
                      className="mb-1.5 block text-xs font-medium"
                      style={{
                        color: "var(--muted)",
                      }}
                    >
                      Target Column *
                    </label>

                    <select
                      value={lstmConfig.targetCol}
                      onChange={(e) =>
                        updateLSTMConfig("targetCol", e.target.value)
                      }
                      disabled={training}
                      className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        background: "var(--background)",
                        borderColor: "var(--border)",
                        color: "var(--foreground)",
                      }}
                    >
                      <option value="">Select target column</option>

                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>

                    <p
                      className="mt-1.5 text-[10px]"
                      style={{
                        color: "var(--muted)",
                      }}
                    >
                      Column that the LSTM will predict.
                    </p>
                  </div>

                  {/* ==========================================
                        Date Column
                    ========================================== */}

                  <div>
                    <label
                      className="mb-1.5 block text-xs font-medium"
                      style={{
                        color: "var(--muted)",
                      }}
                    >
                      Date / Time Column
                    </label>

                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                      <select
                        value={lstmConfig.dateCol}
                        onChange={(e) =>
                          updateLSTMConfig("dateCol", e.target.value)
                        }
                        disabled={training}
                        className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm outline-none transition-all focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{
                          background: "var(--background)",
                          borderColor: "var(--border)",
                          color: "var(--foreground)",
                        }}
                      >
                        <option value="">None / Auto</option>

                        {headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>

                    <p
                      className="mt-1.5 text-[10px]"
                      style={{
                        color: "var(--muted)",
                      }}
                    >
                      Optional. This column is excluded from model features.
                    </p>
                  </div>
                </div>
              </section>

              {/* ==============================================
                    LSTM Feature Selector
                ============================================== */}

              <FeatureSelector
                headers={headers.filter(
                  (header) =>
                    header !== lstmConfig.targetCol &&
                    header !== lstmConfig.dateCol,
                )}
                selectedFeatures={lstmConfig.featureCols.filter(
                  (feature) =>
                    feature !== lstmConfig.targetCol &&
                    feature !== lstmConfig.dateCol,
                )}
                onChange={(features) =>
                  updateLSTMConfig("featureCols", features)
                }
                disabled={training}
              />

              {/* ==============================================
                    LSTM Model Configuration
                ============================================== */}

              <section
                className="rounded-xl border p-5"
                style={{
                  background: "var(--sidebar-bg)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="mb-5 flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-indigo-400" />

                  <div>
                    <h3
                      className="text-sm font-semibold"
                      style={{
                        color: "var(--foreground)",
                      }}
                    >
                      LSTM Configuration
                    </h3>

                    <p
                      className="text-[11px]"
                      style={{
                        color: "var(--muted)",
                      }}
                    >
                      Configure the LSTM architecture and training parameters.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* ==========================================
                        Sequence Length
                    ========================================== */}

                  <LSTMNumberInput
                    label="Sequence Length"
                    value={lstmConfig.seqLength}
                    onChange={(value) => updateLSTMConfig("seqLength", value)}
                    min={1}
                    disabled={training}
                    description="Lookback timesteps"
                  />

                  {/* ==========================================
                        Forecast Horizon
                    ========================================== */}

                  <LSTMNumberInput
                    label="Forecast Horizon"
                    value={lstmConfig.forecastHorizon}
                    onChange={(value) =>
                      updateLSTMConfig("forecastHorizon", value)
                    }
                    min={1}
                    disabled={training}
                    description="Steps predicted at once"
                  />

                  {/* ==========================================
                        Hidden Size
                    ========================================== */}

                  <LSTMNumberInput
                    label="Hidden Size"
                    value={lstmConfig.hiddenSize}
                    onChange={(value) => updateLSTMConfig("hiddenSize", value)}
                    min={1}
                    disabled={training}
                    description="LSTM hidden state size"
                  />

                  {/* ==========================================
                        Number Layers
                    ========================================== */}

                  <LSTMNumberInput
                    label="Number of Layers"
                    value={lstmConfig.numLayers}
                    onChange={(value) => updateLSTMConfig("numLayers", value)}
                    min={1}
                    disabled={training}
                    description="Stacked LSTM layers"
                  />

                  {/* ==========================================
                        Dropout
                    ========================================== */}

                  <LSTMNumberInput
                    label="Dropout"
                    value={lstmConfig.dropout}
                    onChange={(value) => updateLSTMConfig("dropout", value)}
                    min={0}
                    max={0.99}
                    step={0.01}
                    disabled={training}
                    description="Applied when layers > 1"
                  />

                  {/* ==========================================
                        Epochs
                    ========================================== */}

                  <LSTMNumberInput
                    label="Epochs"
                    value={lstmConfig.epochs}
                    onChange={(value) => updateLSTMConfig("epochs", value)}
                    min={1}
                    disabled={training}
                    description="Training iterations"
                  />

                  {/* ==========================================
                        Batch Size
                    ========================================== */}

                  <LSTMNumberInput
                    label="Batch Size"
                    value={lstmConfig.batchSize}
                    onChange={(value) => updateLSTMConfig("batchSize", value)}
                    min={1}
                    disabled={training}
                    description="Samples per batch"
                  />

                  {/* ==========================================
                        Learning Rate
                    ========================================== */}

                  <LSTMNumberInput
                    label="Learning Rate"
                    value={lstmConfig.learningRate}
                    onChange={(value) =>
                      updateLSTMConfig("learningRate", value)
                    }
                    min={0.000001}
                    step={0.0001}
                    disabled={training}
                    description="Adam optimizer learning rate"
                  />

                  {/* ==========================================
                        Train Split
                    ========================================== */}

                  <LSTMNumberInput
                    label="Train Split"
                    value={lstmConfig.trainSplit}
                    onChange={(value) => updateLSTMConfig("trainSplit", value)}
                    min={0.01}
                    max={0.99}
                    step={0.01}
                    disabled={training}
                    description="Proportion used for training"
                  />
                </div>
              </section>

              {/* ==============================================
                    LSTM Summary
                ============================================== */}

              <section
                className="rounded-xl border p-5"
                style={{
                  background: "var(--sidebar-bg)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-indigo-400" />

                  <h3
                    className="text-sm font-semibold"
                    style={{
                      color: "var(--foreground)",
                    }}
                  >
                    Training Summary
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <SummaryItem
                    label="Target"
                    value={lstmConfig.targetCol || "-"}
                  />

                  <SummaryItem
                    label="Features"
                    value={String(lstmConfig.featureCols.length)}
                  />

                  <SummaryItem label="Lookback" value={lstmConfig.seqLength} />

                  <SummaryItem
                    label="Forecast"
                    value={lstmConfig.forecastHorizon}
                  />
                </div>
              </section>

              {/* ==============================================
                    LSTM Result
                ============================================== */}

              {lstmResult && (
                <section
                  className="rounded-xl border p-5"
                  style={{
                    background: "var(--sidebar-bg)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />

                      <h3
                        className="text-sm font-semibold"
                        style={{
                          color: "var(--foreground)",
                        }}
                      >
                        LSTM Result
                      </h3>
                    </div>
                  </div>

                  <pre
                    className="max-h-[400px] overflow-auto rounded-lg border p-4 text-xs leading-5"
                    style={{
                      background: "var(--background)",
                      borderColor: "var(--border)",
                      color: "var(--muted)",
                    }}
                  >
                    {JSON.stringify(lstmResult, null, 2)}
                  </pre>
                </section>
              )}

              {/* ==============================================
                    LSTM Action
                ============================================== */}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleClearDataset}
                  disabled={training}
                  className="rounded-xl border px-5 py-3 text-sm font-medium transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--muted)",
                  }}
                >
                  Clear Dataset
                </button>

                <button
                  type="button"
                  onClick={handleLSTMTraining}
                  disabled={!validLSTM || training}
                  className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    background: "var(--accent)",
                  }}
                >
                  {training ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Training LSTM...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Train & Forecast
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* ========================================================
          Existing Isolation Forest Training Records
      ======================================================== */}

      {modelType === "isolation_forest" && !loadingRecords && (
        <TrainingList records={records} onEdit={handleEditTraining} />
      )}

      {/* ========================================================
          Isolation Forest Confirmation Modal
      ======================================================== */}

      {modelType === "isolation_forest" && (
        <TrainingConfirmModal
          open={confirmOpen}
          config={config}
          features={selectedFeatures}
          onConfirm={handleConfirmTraining}
          onCancel={() => {
            if (!training) {
              setConfirmOpen(false);
            }
          }}
          loading={training}
        />
      )}
    </div>
  );
}

// ============================================================
// LSTM Number Input
// ============================================================

function LSTMNumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
  description,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  description?: string;
}) {
  return (
    <div>
      <label
        className="mb-1.5 block text-xs font-medium"
        style={{
          color: "var(--muted)",
        }}
      >
        {label}
      </label>

      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          background: "var(--background)",
          borderColor: "var(--border)",
          color: "var(--foreground)",
        }}
      />

      {description && (
        <p
          className="mt-1.5 text-[10px]"
          style={{
            color: "var(--muted)",
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}

// ============================================================
// Summary Item
// ============================================================

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{
        background: "var(--background)",
        borderColor: "var(--border)",
      }}
    >
      <p
        className="text-[10px] uppercase tracking-wide"
        style={{
          color: "var(--muted)",
        }}
      >
        {label}
      </p>

      <p
        className="mt-1 truncate text-sm font-semibold"
        style={{
          color: "var(--foreground)",
        }}
      >
        {value}
      </p>
    </div>
  );
}
