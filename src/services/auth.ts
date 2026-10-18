import type { User, LoginCredentials, Session } from '../types/auth';
import { db } from '../db';

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const TOKEN_LENGTH = 32;
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Generate cryptographically secure random bytes
function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

// Convert bytes to hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert hex string to bytes
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Hash password using PBKDF2
async function hashPassword(password: string, salt: string, iterations: number): Promise<string> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = hexToBytes(salt);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer as BufferSource,
      iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return bytesToHex(new Uint8Array(derivedBits));
}

// Create a new user with hashed password
export async function createUser(
  email: string,
  password: string,
  displayName: string,
  role: 'admin' | 'operator' | 'viewer'
): Promise<User> {
  // Check if user already exists
  const existing = await db.users.where('email').equals(email).first();
  if (existing) {
    throw new Error('User with this email already exists');
  }

  // Generate salt and hash password
  const salt = bytesToHex(generateRandomBytes(SALT_LENGTH));
  const passwordHash = await hashPassword(password, salt, PBKDF2_ITERATIONS);

  const now = new Date().toISOString();
  const user: User = {
    id: crypto.randomUUID(),
    email,
    displayName,
    role,
    passwordHash,
    salt,
    iterations: PBKDF2_ITERATIONS,
    active: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null
  };

  await db.users.add(user);
  return user;
}

// Authenticate user
export async function authenticate(credentials: LoginCredentials): Promise<{ user: User; session: Session }> {
  const { email, password, rememberMe } = credentials;

  // Find user
  const user = await db.users.where('email').equals(email).first();
  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (!user.active) {
    throw new Error('Account is deactivated');
  }

  // Verify password
  const passwordHash = await hashPassword(password, user.salt, user.iterations);
  if (passwordHash !== user.passwordHash) {
    throw new Error('Invalid email or password');
  }

  // Create session
  const token = bytesToHex(generateRandomBytes(TOKEN_LENGTH));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

  const session: Session = {
    id: crypto.randomUUID(),
    userId: user.id,
    token,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString()
  };

  await db.sessions.add(session);

  // Update last login
  await db.users.update(user.id, {
    lastLoginAt: now.toISOString(),
    updatedAt: now.toISOString()
  });

  // Store session in localStorage if remember me
  if (rememberMe) {
    localStorage.setItem('vg_session_token', token);
    localStorage.setItem('vg_session_id', session.id);
  } else {
    sessionStorage.setItem('vg_session_token', token);
    sessionStorage.setItem('vg_session_id', session.id);
  }

  return { user, session };
}

// Validate session
export async function validateSession(): Promise<{ user: User; session: Session } | null> {
  const token = localStorage.getItem('vg_session_token') || sessionStorage.getItem('vg_session_token');
  const sessionId = localStorage.getItem('vg_session_id') || sessionStorage.getItem('vg_session_id');

  if (!token || !sessionId) {
    return null;
  }

  const session = await db.sessions.get(sessionId);
  if (!session || session.token !== token) {
    return null;
  }

  // Check expiration
  if (new Date(session.expiresAt) < new Date()) {
    await db.sessions.delete(sessionId);
    localStorage.removeItem('vg_session_token');
    localStorage.removeItem('vg_session_id');
    sessionStorage.removeItem('vg_session_token');
    sessionStorage.removeItem('vg_session_id');
    return null;
  }

  const user = await db.users.get(session.userId);
  if (!user || !user.active) {
    return null;
  }

  return { user, session };
}

// Logout
export async function logout(): Promise<void> {
  const sessionId = localStorage.getItem('vg_session_id') || sessionStorage.getItem('vg_session_id');
  
  if (sessionId) {
    await db.sessions.delete(sessionId);
  }

  localStorage.removeItem('vg_session_token');
  localStorage.removeItem('vg_session_id');
  sessionStorage.removeItem('vg_session_token');
  sessionStorage.removeItem('vg_session_id');
}

// Check if any admin exists
export async function hasAdmin(): Promise<boolean> {
  const admin = await db.users.where('role').equals('admin').first();
  return !!admin;
}

// Get all users (admin only)
export async function getAllUsers(): Promise<User[]> {
  return await db.users.toArray();
}

// Update user role (admin only)
export async function updateUserRole(userId: string, role: 'admin' | 'operator' | 'viewer'): Promise<void> {
  await db.users.update(userId, {
    role,
    updatedAt: new Date().toISOString()
  });
}

// Deactivate user (admin only)
export async function deactivateUser(userId: string): Promise<void> {
  await db.users.update(userId, {
    active: false,
    updatedAt: new Date().toISOString()
  });
}

// Activate user (admin only)
export async function activateUser(userId: string): Promise<void> {
  await db.users.update(userId, {
    active: true,
    updatedAt: new Date().toISOString()
  });
}

// Change password
export async function changePassword(userId: string, newPassword: string): Promise<void> {
  const salt = bytesToHex(generateRandomBytes(SALT_LENGTH));
  const passwordHash = await hashPassword(newPassword, salt, PBKDF2_ITERATIONS);

  await db.users.update(userId, {
    passwordHash,
    salt,
    iterations: PBKDF2_ITERATIONS,
    updatedAt: new Date().toISOString()
  });
}
