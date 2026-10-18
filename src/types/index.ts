// VisionGuard AI — Type Definitions

export type SourceType = 'webcam' | 'file';

export type SessionStatus = 'idle' | 'starting' | 'running' | 'paused' | 'stopped' | 'error';

export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IncidentType = 'zone_intrusion' | 'safety_violation' | 'unauthorized_access' | 'equipment_hazard' | 'environmental' | 'other';

export type IncidentOrigin = 'manual' | 'ai_detected';

export type IncidentCategory = 
  | 'Zone Intrusion'
  | 'Safety Violation'
  | 'Unauthorized Access'
  | 'Equipment Hazard'
  | 'Environmental'
  | 'PPE Violation'
  | 'Other';

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

export interface IncidentActivity {
  id: string;
  timestamp: string;
  actorId: string | null;
  actorName: string;
  action: string;
  details: string;
}

export interface Incident {
  id: string;
  title: string;
  sessionId: string;
  sourceId: string;
  sourceName: string;
  incidentType: IncidentType;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  origin: IncidentOrigin;
  timestamp: string;
  location: string;
  description: string;
  confidence: number;
  evidenceRef: string | null;
  evidenceItems: string[];
  explanation: string;
  operatorNotes: string;
  assignedTo: string | null;
  assignedToName: string | null;
  tags: string[];
  resolutionNotes: string | null;
  resolvedAt: string | null;
  activity: IncidentActivity[];
  createdBy: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentFormData {
  title: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  timestamp: string;
  location: string;
  description: string;
  sourceId?: string;
  assignedTo?: string | null;
  tags: string[];
  evidenceDataUrl?: string | null;
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
    high: number;
    critical: number;
  };
}

export interface IncidentFilter {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  category?: IncidentCategory;
  origin?: IncidentOrigin;
  sourceId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: 'newest' | 'oldest' | 'severity' | 'updated';
}
