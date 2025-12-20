/**
 * Encryption Utilities
 * AES-256-GCM encryption for sensitive data (tokens, API keys, secrets)
 */

import { randomBytes, createCipheriv, createDecipheriv, createHash } from "crypto";

// Algorithm configuration
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Get the encryption key from environment
 * Key must be 32 bytes (256 bits) for AES-256
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required. " +
      "Generate one with: openssl rand -base64 32"
    );
  }
  
  // If key is base64 encoded (recommended), decode it
  if (key.length === 44 && key.endsWith("=")) {
    return Buffer.from(key, "base64");
  }
  
  // If key is hex encoded
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, "hex");
  }
  
  // If key is raw string, hash it to get consistent 32 bytes
  // (Not recommended for production, but allows flexibility)
  return createHash("sha256").update(key).digest();
}

/**
 * Encrypt a string value
 * Returns base64 encoded string: IV + AuthTag + Ciphertext
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    return "";
  }
  
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  
  const authTag = cipher.getAuthTag();
  
  // Combine: IV (16 bytes) + AuthTag (16 bytes) + Ciphertext
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, "base64"),
  ]);
  
  return combined.toString("base64");
}

/**
 * Decrypt a string value
 * Expects base64 encoded string: IV + AuthTag + Ciphertext
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    return "";
  }
  
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedData, "base64");
  
  // Extract components
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString("utf8");
}

/**
 * Encrypt an object (JSON serializable)
 */
export function encryptObject<T extends Record<string, unknown>>(obj: T): string {
  return encrypt(JSON.stringify(obj));
}

/**
 * Decrypt an object
 */
export function decryptObject<T extends Record<string, unknown>>(encryptedData: string): T {
  const decrypted = decrypt(encryptedData);
  return JSON.parse(decrypted) as T;
}

/**
 * Hash a value (one-way, for API key storage)
 * Uses SHA-256
 */
export function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Generate a secure random API key
 * Format: ycrm_[32 random chars]
 */
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomPart = randomBytes(24).toString("base64url"); // 32 chars
  const key = `ycrm_${randomPart}`;
  const prefix = key.substring(0, 12); // "ycrm_" + first 7 chars
  const hash = hashValue(key);
  
  return { key, prefix, hash };
}

/**
 * Verify an API key against its hash
 */
export function verifyApiKey(key: string, hash: string): boolean {
  return hashValue(key) === hash;
}

/**
 * Check if a value appears to be encrypted
 * (Basic heuristic check)
 */
export function isEncrypted(value: string): boolean {
  if (!value || value.length < 48) return false; // Minimum: IV + AuthTag + some data
  
  try {
    const decoded = Buffer.from(value, "base64");
    // Should be at least IV + AuthTag + 1 byte
    return decoded.length >= IV_LENGTH + AUTH_TAG_LENGTH + 1;
  } catch {
    return false;
  }
}

/**
 * Safely encrypt - only if not already encrypted
 */
export function safeEncrypt(value: string): string {
  if (!value) return "";
  if (isEncrypted(value)) return value;
  return encrypt(value);
}

/**
 * Safely decrypt - handles both encrypted and plain values
 */
export function safeDecrypt(value: string): string {
  if (!value) return "";
  
  try {
    if (isEncrypted(value)) {
      return decrypt(value);
    }
    return value;
  } catch {
    // If decryption fails, return original value
    // (might be legacy unencrypted data)
    return value;
  }
}

/**
 * Rotate encryption key
 * Re-encrypts a value with the current key
 * Use this when rotating ENCRYPTION_KEY
 */
export function rotateEncryption(oldEncrypted: string, oldKey: string): string {
  // Temporarily use old key to decrypt
  const originalEnvKey = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = oldKey;
  
  const decrypted = decrypt(oldEncrypted);
  
  // Restore new key and re-encrypt
  process.env.ENCRYPTION_KEY = originalEnvKey;
  
  return encrypt(decrypted);
}
