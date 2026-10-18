import { db } from '../db';
import type { Incident, IncidentSeverity, IncidentStatus, IncidentOrigin, IncidentCategory, IncidentFormData, IncidentActivity, AppSettings } from '../types';

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

// Map old statuses to new ones for backward compatibility
function migrateStatus(status: string): IncidentStatus {
  const map: Record<string, IncidentStatus> = {
    'new': 'open',
    'acknowledged': 'investigating',
    'resolved': 'resolved',
    'closed': 'closed',
  };
  return map[status] || (status as IncidentStatus);
}

// Create a manual incident from user form
export async function createManualIncident(
  formData: IncidentFormData,
  createdByName: string,
  createdBy: string | null,
): Promise<Incident> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const incident: Incident = {
    id,
    title: formData.title,
    sessionId: '',
    sourceId: formData.sourceId || '',
    sourceName: formData.sourceId || 'Manual Report',
    incidentType: mapCategoryToType(formData.category),
    category: formData.category,
    severity: formData.severity,
    status: 'open',
    origin: 'manual',
    timestamp: formData.timestamp || now,
    location: formData.location,
    description: formData.description,
    confidence: 1.0,
    evidenceRef: formData.evidenceDataUrl || null,
    evidenceItems: formData.evidenceDataUrl ? [formData.evidenceDataUrl] : [],
    explanation: formData.description,
    operatorNotes: '',
    assignedTo: formData.assignedTo || null,
    assignedToName: null,
    tags: formData.tags,
    resolutionNotes: null,
    resolvedAt: null,
    activity: [{
      id: crypto.randomUUID(),
      timestamp: now,
      actorId: createdBy,
      actorName: createdByName,
      action: 'created',
      details: `Incident created by ${createdByName}`,
    }],
    createdBy,
    createdByName,
    createdAt: now,
    updatedAt: now,
  };

  await db.incidents.add(incident);
  return incident;
}

// Create an AI-detected incident (from zone intrusion)
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
    title: `Zone Intrusion Detected — ${sourceName}`,
    sessionId,
    sourceId,
    sourceName,
    incidentType: 'zone_intrusion',
    category: 'Zone Intrusion',
    severity,
    status: 'open',
    origin: 'ai_detected',
    timestamp: now,
    location: sourceName,
    description: `Person detected in restricted zone for ${secondsInZone.toFixed(1)}s (confidence: ${(confidence * 100).toFixed(1)}%)`,
    confidence,
    evidenceRef: null,
    evidenceItems: [],
    explanation: `Person detected in restricted zone for ${secondsInZone.toFixed(1)}s (confidence: ${(confidence * 100).toFixed(1)}%)`,
    operatorNotes: '',
    assignedTo: null,
    assignedToName: null,
    tags: ['ai-detected', 'zone-intrusion'],
    resolutionNotes: null,
    resolvedAt: null,
    activity: [{
      id: crypto.randomUUID(),
      timestamp: now,
      actorId: null,
      actorName: 'System',
      action: 'created',
      details: `AI-detected zone intrusion at ${sourceName}`,
    }],
    createdBy: null,
    createdByName: 'System',
    createdAt: now,
    updatedAt: now,
  };

  await db.incidents.add(incident);
  return incident;
}

function mapCategoryToType(category: IncidentCategory): Incident['incidentType'] {
  const map: Record<IncidentCategory, Incident['incidentType']> = {
    'Zone Intrusion': 'zone_intrusion',
    'Safety Violation': 'safety_violation',
    'Unauthorized Access': 'unauthorized_access',
    'Equipment Hazard': 'equipment_hazard',
    'Environmental': 'environmental',
    'PPE Violation': 'safety_violation',
    'Other': 'other',
  };
  return map[category] || 'other';
}

export async function updateIncidentStatus(
  incidentId: string,
  status: IncidentStatus,
  actorName: string = 'Operator',
  actorId: string | null = null,
  notes?: string,
): Promise<void> {
  const incident = await db.incidents.get(incidentId);
  if (!incident) throw new Error('Incident not found');

  const now = new Date().toISOString();
  const activity: IncidentActivity = {
    id: crypto.randomUUID(),
    timestamp: now,
    actorId,
    actorName,
    action: `status_${status}`,
    details: `Status changed to ${status}${notes ? `: ${notes}` : ''}`,
  };

  const updates: Partial<Incident> = {
    status,
    updatedAt: now,
    activity: [...(incident.activity || []), activity],
  };

  if (status === 'resolved' || status === 'closed') {
    updates.resolvedAt = now;
    if (notes) updates.resolutionNotes = notes;
  }

  if (notes && status !== 'resolved' && status !== 'closed') {
    updates.operatorNotes = notes;
  }

  await db.incidents.update(incidentId, updates);
}

export async function addIncidentNote(
  incidentId: string,
  note: string,
  actorName: string,
  actorId: string | null = null,
): Promise<void> {
  const incident = await db.incidents.get(incidentId);
  if (!incident) throw new Error('Incident not found');

  const now = new Date().toISOString();
  const activity: IncidentActivity = {
    id: crypto.randomUUID(),
    timestamp: now,
    actorId,
    actorName,
    action: 'note_added',
    details: note,
  };

  await db.incidents.update(incidentId, {
    operatorNotes: note,
    updatedAt: now,
    activity: [...(incident.activity || []), activity],
  });
}

export async function assignIncident(
  incidentId: string,
  assignedTo: string | null,
  assignedToName: string | null,
  actorName: string,
): Promise<void> {
  const incident = await db.incidents.get(incidentId);
  if (!incident) throw new Error('Incident not found');

  const now = new Date().toISOString();
  const activity: IncidentActivity = {
    id: crypto.randomUUID(),
    timestamp: now,
    actorName,
    actorId: null,
    action: 'assigned',
    details: assignedToName ? `Assigned to ${assignedToName}` : 'Unassigned',
  };

  await db.incidents.update(incidentId, {
    assignedTo,
    assignedToName,
    updatedAt: now,
    activity: [...(incident.activity || []), activity],
  });
}

// Get incidents with migration for old data
export async function getIncidents(filters?: {
  status?: string;
  severity?: string;
  category?: string;
  origin?: string;
  sourceId?: string;
}): Promise<Incident[]> {
  const results = await db.incidents.orderBy('timestamp').reverse().toArray();

  // Migrate old statuses
  const migrated = results.map(inc => ({
    ...inc,
    status: migrateStatus(inc.status),
    // Ensure required fields exist for backward compatibility
    title: inc.title || inc.explanation || 'Untitled Incident',
    category: inc.category || 'Zone Intrusion',
    origin: inc.origin || (inc.sessionId ? 'ai_detected' : 'manual'),
    location: inc.location || inc.sourceName || '',
    description: inc.description || inc.explanation || '',
    evidenceItems: inc.evidenceItems || (inc.evidenceRef ? [inc.evidenceRef] : []),
    tags: inc.tags || [],
    activity: inc.activity || [],
    createdByName: inc.createdByName || (inc.origin === 'ai_detected' ? 'System' : 'Unknown'),
  }));

  return migrated.filter(inc => {
    if (filters?.status && inc.status !== filters.status) return false;
    if (filters?.severity && inc.severity !== filters.severity) return false;
    if (filters?.category && inc.category !== filters.category) return false;
    if (filters?.origin && inc.origin !== filters.origin) return false;
    if (filters?.sourceId && inc.sourceId !== filters.sourceId) return false;
    return true;
  });
}
