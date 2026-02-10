/**
 * Client-side encryption utilities using Web Crypto API
 * AES-GCM 256-bit encryption
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

/**
 * Generate a new encryption key
 * @returns {Promise<CryptoKey>}
 */
export async function generateEncryptionKey() {
  return await crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Export key to storable format (JWK)
 * @param {CryptoKey} key
 * @returns {Promise<string>} Base64-encoded key
 */
export async function exportKey(key) {
  const exported = await crypto.subtle.exportKey('jwk', key);
  return btoa(JSON.stringify(exported));
}

/**
 * Import key from stored format
 * @param {string} keyString Base64-encoded key
 * @returns {Promise<CryptoKey>}
 */
export async function importKey(keyString) {
  try {
    const keyData = JSON.parse(atob(keyString));
    return await crypto.subtle.importKey(
      'jwk',
      keyData,
      {
        name: ALGORITHM,
        length: KEY_LENGTH
      },
      true,
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    console.error('Failed to import key:', error);
    throw new Error('Invalid encryption key');
  }
}

/**
 * Encrypt text
 * @param {string} plaintext
 * @param {CryptoKey} key
 * @returns {Promise<string>} Base64-encoded encrypted data (IV + ciphertext)
 */
export async function encryptText(plaintext, key) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv
      },
      key,
      data
    );
    
    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt text
 * @param {string} encryptedBase64 Base64-encoded encrypted data
 * @param {CryptoKey} key
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decryptText(encryptedBase64, key) {
  try {
    // Decode base64
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    
    // Split IV and encrypted data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv
      },
      key,
      data
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    return '[Encrypted - unable to decrypt]';
  }
}

/**
 * Generate shareable token containing room code and encryption key
 * @param {string} roomCode
 * @param {string} keyString Exported key (base64)
 * @returns {string} Base64-encoded token
 */
export function generateShareToken(roomCode, keyString) {
  const data = {
    room: roomCode,
    key: keyString,
    ts: Date.now()
  };
  
  return btoa(JSON.stringify(data));
}

/**
 * Parse share token
 * @param {string} token Base64-encoded token
 * @returns {{room: string, key: string, ts: number}}
 */
export function parseShareToken(token) {
  try {
    const decoded = atob(token);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Invalid token:', error);
    throw new Error('Invalid share link');
  }
}

/**
 * Get or create encryption key for a room
 * Stores in localStorage
 * @param {string} roomCode
 * @returns {Promise<CryptoKey>}
 */
export async function getRoomKey(roomCode) {
  const storageKey = `room_key_${roomCode}`;
  const storedKey = localStorage.getItem(storageKey);
  
  if (storedKey) {
    return await importKey(storedKey);
  }
  
  // Generate new key
  const key = await generateEncryptionKey();
  const exportedKey = await exportKey(key);
  localStorage.setItem(storageKey, exportedKey);
  
  return key;
}

/**
 * Store encryption key for a room
 * @param {string} roomCode
 * @param {string} keyString Exported key
 */
export function storeRoomKey(roomCode, keyString) {
  const storageKey = `room_key_${roomCode}`;
  localStorage.setItem(storageKey, keyString);
}

/**
 * Check if we have encryption key for a room
 * @param {string} roomCode
 * @returns {boolean}
 */
export function hasRoomKey(roomCode) {
  const storageKey = `room_key_${roomCode}`;
  return localStorage.getItem(storageKey) !== null;
}
