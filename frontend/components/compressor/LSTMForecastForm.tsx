import React from "react";
import {
  FileText,
  Target,
  Calendar,
  SlidersHorizontal,
  BrainCircuit,
} from "lucide-react";

export interface LSTMForecastConfig {
  file: File | null;
  targetCol: string;
  featureCols: string;
  dateCol: string;
  seqLength: number;
  forecastHorizon: number;
  hiddenSize: number;
  numLayers: number;
  dropout: number;
  epochs: number;
  batchSize: number;
  learningRate: number;
  trainSplit: number;
}

interface LSTMForecastFormProps {
  config: LSTMForecastConfig;
  onChange: (config: LSTMForecastConfig) => void;
  disabled?: boolean;
}

export function LSTMForecastForm({
  config,
  onChange,
  disabled = false,
}: LSTMForecastFormProps) {
  const update = <K extends keyof LSTMForecastConfig>(
    key: K,
    value: LSTMForecastConfig[K],
  ) => {
    onChange({
      ...config,
      [key]: value,
    });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
            <BrainCircuit className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-base font-semibold text-slate-900">
              LSTM Forecast Configuration
            </h2>

            <p className="text-xs text-slate-500">
              Configure the time-series forecasting model
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {/* Dataset */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <FileText className="h-4 w-4" />
            CSV Dataset
          </label>

          <input
            type="file"
            accept=".csv,text/csv"
            disabled={disabled}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              update("file", file);
            }}
            className="block w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-cyan-700 hover:file:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
          />

          {config.file && (
            <p className="text-xs text-slate-400">
              Selected:{" "}
              <span className="font-medium text-slate-500">
                {config.file.name}
              </span>
            </p>
          )}
        </div>

        {/* Columns */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field
            label="Target Column"
            icon={<Target className="h-4 w-4" />}
            value={config.targetCol}
            placeholder="e.g. kwh"
            disabled={disabled}
            onChange={(value) => update("targetCol", value)}
          />

          <Field
            label="Feature Columns"
            value={config.featureCols}
            placeholder="col1,col2,col3"
            disabled={disabled}
            onChange={(value) => update("featureCols", value)}
          />

          <Field
            label="Date Column"
            icon={<Calendar className="h-4 w-4" />}
            value={config.dateCol}
            placeholder="e.g. timestamp"
            disabled={disabled}
            onChange={(value) => update("dateCol", value)}
          />
        </div>

        {/* Sequence configuration */}
        <div>
          <SectionTitle
            icon={<SlidersHorizontal className="h-4 w-4" />}
            title="Sequence Configuration"
          />

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField
              label="Sequence Length"
              value={config.seqLength}
              min={1}
              onChange={(value) => update("seqLength", value)}
              disabled={disabled}
            />

            <NumberField
              label="Forecast Horizon"
              value={config.forecastHorizon}
              min={1}
              onChange={(value) => update("forecastHorizon", value)}
              disabled={disabled}
            />

            <NumberField
              label="Hidden Size"
              value={config.hiddenSize}
              min={1}
              onChange={(value) => update("hiddenSize", value)}
              disabled={disabled}
            />

            <NumberField
              label="LSTM Layers"
              value={config.numLayers}
              min={1}
              onChange={(value) => update("numLayers", value)}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Training configuration */}
        <div>
          <SectionTitle
            icon={<BrainCircuit className="h-4 w-4" />}
            title="Training Configuration"
          />

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <NumberField
              label="Dropout"
              value={config.dropout}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => update("dropout", value)}
              disabled={disabled}
            />

            <NumberField
              label="Epochs"
              value={config.epochs}
              min={1}
              onChange={(value) => update("epochs", value)}
              disabled={disabled}
            />

            <NumberField
              label="Batch Size"
              value={config.batchSize}
              min={1}
              onChange={(value) => update("batchSize", value)}
              disabled={disabled}
            />

            <NumberField
              label="Learning Rate"
              value={config.learningRate}
              min={0.000001}
              step={0.0001}
              onChange={(value) => update("learningRate", value)}
              disabled={disabled}
            />

            <NumberField
              label="Train Split"
              value={config.trainSplit}
              min={0.1}
              max={0.99}
              step={0.05}
              onChange={(value) => update("trainSplit", value)}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {icon}
      {title}
    </div>
  );
}

function Field({
  label,
  icon,
  value,
  placeholder,
  disabled,
  onChange,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </label>

      <input
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-500">
        {label}
      </label>

      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => {
          const value = Number(event.target.value);

          if (!Number.isNaN(value)) {
            onChange(value);
          }
        }}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}