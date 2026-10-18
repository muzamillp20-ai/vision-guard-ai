import Dexie, { type Table } from 'dexie';
import type { VideoSource, MonitoringSession, Detection, RestrictedZone, Incident, AppSettings } from '../types';

export class VisionGuardDB extends Dexie {
  sources!: Table<VideoSource, string>;
  sessions!: Table<MonitoringSession, string>;
  detections!: Table<Detection, string>;
  zones!: Table<RestrictedZone, string>;
  incidents!: Table<Incident, string>;
  settings!: Table<AppSettings & { id: string }, string>;

  constructor() {
    super('VisionGuardAI');
    this.version(1).stores({
      sources: 'id, name, sourceType, enabled, createdAt',
      sessions: 'id, sourceId, status, startedAt',
      detections: 'id, sessionId, className, createdAt',
      zones: 'id, sourceId, name, enabled',
      incidents: 'id, sessionId, sourceId, incidentType, severity, status, timestamp, createdAt',
      settings: 'id',
    });
  }
}

export const db = new VisionGuardDB();

// Settings helpers
const SETTINGS_ID = 'app-settings';

export async function getSettings(): Promise<AppSettings> {
  const stored = await db.settings.get(SETTINGS_ID);
  if (stored) {
    const { id: _id, ...rest } = stored;
    return rest as AppSettings;
  }
  return getDefaultSettings();
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await db.settings.put({ id: SETTINGS_ID, ...settings });
}

function getDefaultSettings(): AppSettings {
  return {
    confidenceThreshold: 0.5,
    consecutiveFrameConfirmation: 3,
    cooldownMs: 10000,
    targetClass: 'person',
    evidenceRetentionDays: 30,
    severityRules: { high: 5, critical: 15 },
  };
}
