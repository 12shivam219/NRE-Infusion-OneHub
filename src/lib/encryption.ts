/**
 * Encryption Utility Module
 * Handles secure encryption/decryption of sensitive data (email passwords, app credentials)
 * Uses AES-256 encryption with crypto-js
 */
import crypto from 'node:crypto';

const EMAIL_SERVER_URL = import.meta.env.VITE_EMAIL_SERVER_URL || 'http://localhost:3001';

async function callEmailServer(path: string, body: Record<string, unknown>) {
  const apiKey = import.meta.env.VITE_EMAIL_SERVER_API_KEY;
  if (!apiKey) {
    throw new Error('Email server API key is not configured in this environment');
  }

  const url = `${EMAIL_SERVER_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error || `Email server request failed: ${res.status}`);
  }
  return payload;
}

/**
 * Encrypt sensitive data using email server (server-side key)
 * This prevents exposing any secret to the browser bundle.
 */
export async function encryptData(plainText: string): Promise<string> {
  if (!plainText || typeof plainText !== 'string') {
    throw new Error('plainText is required');
  }
  const resp = await callEmailServer('/api/encrypt-password', { plainText });
  if (!resp.success || !resp.encrypted) {
    throw new Error(resp.error || 'Encryption failed');
  }
  return resp.encrypted;
}

/**
 * Check if a string appears to be encrypted
 */
export function isEncrypted(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  try {
    const looksBase64 = /^[A-Za-z0-9+/=]+$/.test(text) && text.length > 20;
    const parts = text.split(':');
    const looksBackend = parts.length === 3 && parts.every(p => /^[0-9a-fA-F]+$/.test(p));
    return looksBase64 || looksBackend;
  } catch {
    return false;
  }
}

/**
 * Hash a password for comparison (SHA-256)
 * NOTE: This is now ASYNC because Web Crypto is async.
 */
export async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computedHash = await hashPassword(password);
  const actual = crypto.createHash('sha256').update(computedHash).digest();
  const expected = crypto.createHash('sha256').update(hash).digest();
  return crypto.timingSafeEqual(actual, expected);
}

/**
 * Generate a random encryption key
 * Uses native crypto.getRandomValues
 */

export function generateEncryptionKey(): string {
  const array = new Uint8Array(16); // 16 bytes = 32 hex chars
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}