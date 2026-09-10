export interface TelemetryPayload {
  machine_id: string;
  timestamp: string;
  arus_a: number;
  outlet_pressure_bar: number;
  outlet_flow_rate_m3h: number;
  kwh_per_m3: number;
}

export interface LogEntry {
  id: string;
  time: string;
  payload: TelemetryPayload;
  status?: number;
  success: boolean;
  message?: string;
}
