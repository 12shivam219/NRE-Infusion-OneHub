/**
 * Encryption Utility Module
 * Handles secure encryption/decryption of sensitive data (email passwords, app credentials)
 * Uses AES-256 encryption with crypto-js
 */

import CryptoJS from 'crypto-js';

/**
 * Get encryption key from environment or use a default for development
 * In production, this should be a strong, unique key stored securely
 */
function getEncryptionKey(): string {
  const key = import.meta.env.VITE_ENCRYPTION_KEY;
  if (!key) {
    console.warn(
      '⚠️  VITE_ENCRYPTION_KEY not set. Using development key. Set this in .env for production.'
    );
    // Default key for development only
    return 'loster-crm-dev-key-change-in-production';
  }
  return key;
}

/**
 * Encrypt sensitive data (passwords, app credentials)
 * @param plainText - The data to encrypt
 * @returns Encrypted string in Base64 format
 */
export function encryptData(plainText: string): string {
  try {
    const key = getEncryptionKey();
    const encrypted = CryptoJS.AES.encrypt(plainText, key).toString();
    // Convert to Base64 for safe transmission and storage
    return btoa(encrypted);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data (passwords, app credentials)
 * @param encryptedText - The encrypted data (Base64 format)
 * @returns Decrypted plain text
 */
export function decryptData(encryptedText: string): string {
  try {
    const key = getEncryptionKey();
    // Decode from Base64
    const decrypted = atob(encryptedText);
    // Decrypt using AES
    const bytes = CryptoJS.AES.decrypt(decrypted, key);
    const plainText = bytes.toString(CryptoJS.enc.Utf8);

    if (!plainText) {
      throw new Error('Decryption resulted in empty string');
    }

    return plainText;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data. Key may be invalid.');
  }
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
  // Check if it's a valid Base64 string (encrypted format)
  try {
    return /^[A-Za-z0-9+/=]+$/.test(text) && text.length > 20;
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
