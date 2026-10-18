import type { AuditEntry } from '../types/auth';
import { db } from '../db';

export type { AuditEntry };

// Create audit log entry
export async function logAction(
  action: string,
  resourceType: string | null,
  resourceId: string | null,
  details: string,
  actorId: string | null = null,
  actorEmail: string | null = null
): Promise<void> {
  const entry: AuditEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    actorId,
    actorEmail,
    action,
    resourceType,
    resourceId,
    details,
    ipAddress: null // Would be populated by backend in production
  };

  await db.auditLog.add(entry);
}

// Get audit log entries with optional filters
export async function getAuditLog(filters?: {
  actorId?: string;
  action?: string;
  resourceType?: string;
  limit?: number;
}): Promise<AuditEntry[]> {
  let query = db.auditLog.orderBy('timestamp').reverse();
  
  let entries = await query.toArray();

  if (filters?.actorId) {
    entries = entries.filter(e => e.actorId === filters.actorId);
  }

  if (filters?.action) {
    entries = entries.filter(e => e.action === filters.action);
  }

  if (filters?.resourceType) {
    entries = entries.filter(e => e.resourceType === filters.resourceType);
  }

  if (filters?.limit) {
    entries = entries.slice(0, filters.limit);
  }

  return entries;
}

// Common audit actions
export const AuditActions = {
  // Authentication
  LOGIN: 'user.login',
  LOGOUT: 'user.logout',
  LOGIN_FAILED: 'user.login_failed',
  PASSWORD_CHANGED: 'user.password_changed',
  
  // User management
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DEACTIVATED: 'user.deactivated',
  USER_ACTIVATED: 'user.activated',
  ROLE_CHANGED: 'user.role_changed',
  
  // Monitoring
  SESSION_STARTED: 'monitoring.session_started',
  SESSION_STOPPED: 'monitoring.session_stopped',
  SESSION_PAUSED: 'monitoring.session_paused',
  SESSION_RESUMED: 'monitoring.session_resumed',
  
  // Sources
  SOURCE_CREATED: 'source.created',
  SOURCE_UPDATED: 'source.updated',
  SOURCE_DELETED: 'source.deleted',
  
  // Zones
  ZONE_CREATED: 'zone.created',
  ZONE_UPDATED: 'zone.updated',
  ZONE_DELETED: 'zone.deleted',
  ZONE_ENABLED: 'zone.enabled',
  ZONE_DISABLED: 'zone.disabled',
  
  // Incidents
  INCIDENT_CREATED: 'incident.created',
  INCIDENT_ACKNOWLEDGED: 'incident.acknowledged',
  INCIDENT_RESOLVED: 'incident.resolved',
  INCIDENT_NOTES_UPDATED: 'incident.notes_updated',
  
  // Settings
  SETTINGS_UPDATED: 'settings.updated',
  
  // Evidence
  EVIDENCE_ACCESSED: 'evidence.accessed',
  EVIDENCE_DELETED: 'evidence.deleted',
  
  // System
  SYSTEM_CONFIG_CHANGED: 'system.config_changed',
  DATA_CLEARED: 'system.data_cleared',
} as const;
