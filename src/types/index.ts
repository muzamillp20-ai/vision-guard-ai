// VisionGuard AI — Type Definitions

export type SourceType = 'webcam' | 'file';

export type SessionStatus = 'idle' | 'starting' | 'running' | 'paused' | 'stopped' | 'error';

export type IncidentStatus = 'new' | 'acknowledged' | 'resolved';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IncidentType = 'zone_intrusion';

export interface VideoSource {
  id: string;
  name: string;
  sourceType: SourceType;
  configuration: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MonitoringSession {
  id: string;
  sourceId: string;
  status: SessionStatus;
  startedAt: string | null;
  endedAt: string | null;
  errorSummary: string | null;
}

export interface Detection {
  id: string;
  sessionId: string;
  className: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  frameTimestamp: number;
  createdAt: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface RestrictedZone {
  id: string;
  sourceId: string;
  name: string;
  polygon: Point[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Incident {
  id: string;
  sessionId: string;
  sourceId: string;
  sourceName: string;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  timestamp: string;
  confidence: number;
  evidenceRef: string | null;
  explanation: string;
  operatorNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface DetectionConfig {
  confidenceThreshold: number;
  consecutiveFrameConfirmation: number;
  cooldownMs: number;
  targetClass: string;
}

export interface SystemMetrics {
  modelLoaded: boolean;
  modelName: string;
  modelLoadTime: number | null;
  inferenceFps: number;
  avgInferenceMs: number;
  totalFramesProcessed: number;
  lastInferenceAt: string | null;
  sourceStatus: string;
  apiStatus: string;
  dbStatus: string;
  evidenceStorageStatus: string;
}

export interface AppSettings {
  confidenceThreshold: number;
  consecutiveFrameConfirmation: number;
  cooldownMs: number;
  targetClass: string;
  evidenceRetentionDays: number;
  severityRules: {
    high: number; // seconds in zone for high severity
    critical: number; // seconds in zone for critical
  };
}

export interface IncidentFilter {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  sourceId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}
