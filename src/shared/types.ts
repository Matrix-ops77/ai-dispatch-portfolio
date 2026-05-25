/**
 * Shared TypeScript types for AI Dispatcher
 */

// Intent classification labels
export type IntentLabel = 'emergency' | 'inquiry' | 'spam';

// Urgency severity levels
export type Severity = 'urgent' | 'high' | 'normal';

// Main intent structure from AI dispatcher
export interface DispatchIntent {
  label?: IntentLabel;
  severity?: Severity;
  reason?: string;
  contactName?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  issueType?: string | null;
  issueDetails?: string | null;
  qualityScore?: number;
  qualityReason?: string;
  diagnostics?: Diagnostics;
}

// Diagnostic flags for service assessment
export interface Diagnostics {
  isWaterShutOff?: boolean | null;
  hasElectricalHazard?: boolean | null;
}

// Lead record for database storage
export interface LeadRecord {
  sessionId: string;
  requestId: string;
  timestamp?: any;
  urgency: 'Emergency' | 'High' | 'Normal';
  damage_description: string;
  name: string;
  phone: string;
  address: string;
  issueType: string;
  zip_code: string;
  status: string;
  source: string;
  qualityScore?: number;
  qualityReason?: string;
  diagnostics?: Diagnostics;
}

// Conversation history turn
export interface HistoryTurn {
  role: 'user' | 'model';
  text: string;
}

// API request for dispatcher
export interface DispatchRequest {
  history: HistoryTurn[];
  sessionId?: string;
}

// API response from dispatcher
export interface DispatchResponse {
  sessionId: string;
  message: string;
  intent: DispatchIntent;
  requestId: string;
  model: string;
  promptVersion: string;
}

// Environment configuration
export interface DispatcherEnv {
  GEMINI_API_KEY?: string;
  HUBSPOT_ACCESS_TOKEN?: string;
  LEAD_WEBHOOK_URL?: string;
  LEAD_WEBHOOK_SECRET?: string;
  FIRESTORE_PROJECT_ID?: string;
  SERVICE_AREA?: string;
}

// Voice server configuration
export interface VoiceEnv {
  GEMINI_API_KEY?: string;
  LIVE_PROVIDER?: string;
  LIVE_MODEL_PRIMARY?: string;
  LIVE_MODEL_FALLBACK?: string;
  LIVE_ENABLE_TRANSCRIPTS?: boolean;
  LIVE_ENABLE_SILENCE_NUDGE?: boolean;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  ADMIN_NUMBER?: string;
  ALLOW_TRANSFER?: boolean;
  VOICE_PUBLIC_BASE_URL?: string;
  PORT?: number;
}