// src/modules/auth/utils/encryption.ts

import CryptoJS from 'crypto-js';
import { env } from '../../../config/env';

const ENCRYPTION_KEY = env.auth.encryptionKey;

/**
 * Encrypt a string using AES-256
 */
export function encrypt(text: string): string {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

/**
 * Decrypt an AES-256 encrypted string
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return '';
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Hash a string using SHA-256
 */
export function hash(text: string): string {
  return CryptoJS.SHA256(text).toString();
}

/**
 * Generate a random nonce
 */
export function generateNonce(): string {
  return CryptoJS.lib.WordArray.random(32).toString();
}

/**
 * Generate a random UUID-like string
 */
export function generateId(): string {
  return CryptoJS.lib.WordArray.random(16).toString();
}
