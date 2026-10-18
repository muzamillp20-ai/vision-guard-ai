// VisionGuard AI — Authentication Types

export type UserRole = 'admin' | 'operator' | 'viewer';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  passwordHash: string;
  salt: string;
  iterations: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: string;
  ipAddress: string | null;
}

export interface Notification {
  id: string;
  type: 'incident' | 'system' | 'error' | 'info';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedId?: string;
}
