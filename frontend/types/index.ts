// ============================================
// User
// ============================================
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'master' | 'user';
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// Conversation
// ============================================
export interface Conversation {
  id: string;
  user_id?: string;
  title: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// Message
// ============================================
export interface MessageSource {
  id: string;
  knowledge_file_id: string;
  original_name: string;
  relevance_score?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  sources?: MessageSource[];
}

// ============================================
// Knowledge
// ============================================
export type KnowledgeType = 'sop' | 'ml_dataset';
export type KnowledgeStatus = 'draft' | 'active' | 'archived' | 'rejected';

export interface KnowledgeFile {
  id: string;
  uploaded_by: string;
  uploaded_by_name?: string;
  file_name: string;
  original_name: string;
  file_type: string;
  mime_type?: string;
  file_size?: number;
  storage_url: string;
  checksum?: string;
  knowledge_type: KnowledgeType;
  status: KnowledgeStatus;
  created_at: string;
  updated_at: string;
  activated_at?: string;
  // SOP fields (joined)
  sop_title?: string;
  sop_description?: string;
  sop_category?: string;
  sop_machine_type?: string;
  sop_version?: string;
}

export interface MLDataset {
  id: string;
  name: string;
  description?: string;
  machine_type?: string;
  dataset_version: string;
  created_by: string;
  created_by_name?: string;
  status: KnowledgeStatus;
  created_at: string;
  updated_at: string;
  files?: Array<{
    id: string;
    knowledge_file_id: string;
    original_name: string;
    file_size?: number;
    status: KnowledgeStatus;
  }>;
}

// ============================================
// Audit Log
// ============================================
export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  created_at: string;
}

// ============================================
// Compressor Telemetry
// ============================================
export interface CompressorTelemetry {
  id: number;
  dataset_id: string;
  machine_id: string;
  timestamp: string;
  arus_a: number | null;
  outlet_pressure_bar: number | null;
  outlet_flow_rate_m3h: number | null;
  kwh_per_m3: number | null;
}

export interface TelemetryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CompressorTelemetryResponse {
  data: CompressorTelemetry[];
  pagination: TelemetryPagination;
}

// ============================================
// API Response
// ============================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
