/**
 * Encryption Utility Module
 * Handles secure encryption/decryption of sensitive data (email passwords, app credentials)
 * Uses AES-256 encryption with crypto-js
 */

import CryptoJS from 'crypto-js';

const EMAIL_SERVER_URL = import.meta.env.VITE_EMAIL_SERVER_URL || 'http://localhost:3001';
const EMAIL_SERVER_API_KEY = import.meta.env.VITE_EMAIL_SERVER_API_KEY || '';

async function callEmailServer(path: string, body: any) {
  const url = `${EMAIL_SERVER_URL}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (EMAIL_SERVER_API_KEY) {
    headers['Authorization'] = `Bearer ${EMAIL_SERVER_API_KEY}`;
  }

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
 * Decrypt sensitive data via email server (server-side key)
 */
export async function decryptData(encryptedText: string): Promise<string> {
  if (!encryptedText || typeof encryptedText !== 'string') {
    throw new Error('encryptedText is required');
  }
  const resp = await callEmailServer('/api/decrypt-password', { encrypted: encryptedText });
  if (!resp.success || typeof resp.plainText !== 'string') {
    throw new Error(resp.error || 'Decryption failed');
  }
  return resp.plainText;
}

/**
 * Check if a string appears to be encrypted (Base64 format)
 * @param text - The text to check
 * @returns true if text looks encrypted
 */
export function isEncrypted(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  // Accept both legacy Base64 (frontend) and backend hex:hex:hex formats
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
 * Hash a password for comparison (non-reversible)
 * @param password - The password to hash
 * @returns SHA-256 hash
 */
export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password).toString();
}

/**
 * Verify a password against a hash
 * @param password - The plain text password
 * @param hash - The stored hash
 * @returns true if password matches hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * Generate a random encryption key for new setups
 * @returns A random 32-character key suitable for AES-256
 */
export function generateEncryptionKey(): string {
  return CryptoJS.lib.WordArray.random(32).toString();
}
