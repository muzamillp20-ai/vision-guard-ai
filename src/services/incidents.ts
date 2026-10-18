import { db } from '../db';
import type { Incident, IncidentSeverity, AppSettings } from '../types';

// Track consecutive frames for confirmation
const consecutiveCounters = new Map<string, { count: number; firstSeen: number }>();
// Track cooldown per zone+source
const lastIncidentTime = new Map<string, number>();

export function getZoneSourceKey(zoneId: string, sourceId: string): string {
  return `${zoneId}:${sourceId}`;
}

export function updateConsecutiveCounter(
  key: string,
  inZone: boolean,
): { confirmed: boolean; count: number } {
  const entry = consecutiveCounters.get(key) || { count: 0, firstSeen: 0 };

  if (inZone) {
    entry.count += 1;
    if (entry.count === 1) {
      entry.firstSeen = Date.now();
    }
  } else {
    entry.count = 0;
    entry.firstSeen = 0;
  }

  consecutiveCounters.set(key, entry);
  return { confirmed: entry.count > 0, count: entry.count };
}

export function isCooldownActive(zoneId: string, sourceId: string, cooldownMs: number): boolean {
  const key = getZoneSourceKey(zoneId, sourceId);
  const lastTime = lastIncidentTime.get(key);
  if (!lastTime) return false;
  return Date.now() - lastTime < cooldownMs;
}

export function recordIncidentTime(zoneId: string, sourceId: string): void {
  const key = getZoneSourceKey(zoneId, sourceId);
  lastIncidentTime.set(key, Date.now());
}

export function resetCounters(): void {
  consecutiveCounters.clear();
  lastIncidentTime.clear();
}

export function determineSeverity(
  secondsInZone: number,
  settings: AppSettings,
): IncidentSeverity {
  if (secondsInZone >= settings.severityRules.critical) return 'critical';
  if (secondsInZone >= settings.severityRules.high) return 'high';
  if (secondsInZone >= 2) return 'medium';
  return 'low';
}

export async function createIncident(
  sessionId: string,
  sourceId: string,
  sourceName: string,
  confidence: number,
  secondsInZone: number,
  settings: AppSettings,
): Promise<Incident> {
  const severity = determineSeverity(secondsInZone, settings);
  const now = new Date().toISOString();

  const incident: Incident = {
    id: crypto.randomUUID(),
    sessionId,
    sourceId,
    sourceName,
    incidentType: 'zone_intrusion',
    severity,
    status: 'new',
    timestamp: now,
    confidence,
    evidenceRef: null,
    explanation: `Person detected in restricted zone for ${secondsInZone.toFixed(1)}s (confidence: ${(confidence * 100).toFixed(1)}%)`,
    operatorNotes: '',
    createdAt: now,
    updatedAt: now,
  };

  await db.incidents.add(incident);
  return incident;
}

export async function updateIncidentStatus(
  incidentId: string,
  status: Incident['status'],
  notes?: string,
): Promise<void> {
  await db.incidents.update(incidentId, {
    status,
    operatorNotes: notes ?? '',
    updatedAt: new Date().toISOString(),
  });
}

export async function getIncidents(filters?: {
  status?: string;
  severity?: string;
  sourceId?: string;
}): Promise<Incident[]> {
  let collection = db.incidents.orderBy('timestamp').reverse();

  const results = await collection.toArray();

  return results.filter(inc => {
    if (filters?.status && inc.status !== filters.status) return false;
    if (filters?.severity && inc.severity !== filters.severity) return false;
    if (filters?.sourceId && inc.sourceId !== filters.sourceId) return false;
    return true;
  });
}
