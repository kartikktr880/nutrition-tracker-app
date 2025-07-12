import { logError, logWarn, logInfo, logDebug } from './logger';
import { ExerciseSession } from '@/types/exercise';

// Generate a secure encryption key
const generateKey = async (): Promise<CryptoKey> => {
  const key = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );
  return key;
};

// Convert string to ArrayBuffer
const stringToArrayBuffer = (str: string): ArrayBuffer => {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer as ArrayBuffer;
};

// Convert ArrayBuffer to string
const arrayBufferToString = (buffer: ArrayBuffer): string => {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
};

// Convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

// Convert Base64 to ArrayBuffer
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

let encryptionKey: CryptoKey | null = null;

// Initialize encryption key
const initializeEncryption = async (): Promise<void> => {
  if (!encryptionKey) {
    encryptionKey = await generateKey();
  }
};

export const encryptData = async (data: any): Promise<string> => {
  try {
    await initializeEncryption();
    if (!encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    // Convert data to string
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    const dataBuffer = stringToArrayBuffer(dataString);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      encryptionKey,
      dataBuffer
    );

    // Combine IV and encrypted data
    const combinedBuffer = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combinedBuffer.set(iv);
    combinedBuffer.set(new Uint8Array(encryptedBuffer), iv.length);

    // Convert to Base64
    return arrayBufferToBase64(combinedBuffer.buffer);
  } catch (error) {
    logError('Encryption error:', error as Error | undefined);
    throw new Error('Failed to encrypt data');
  }
};

export const decryptData = async (encryptedData: string): Promise<any> => {
  try {
    await initializeEncryption();
    if (!encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    // Convert from Base64
    const combinedBuffer = base64ToArrayBuffer(encryptedData);
    const combinedArray = new Uint8Array(combinedBuffer);

    // Extract IV and encrypted data
    const iv = combinedArray.slice(0, 12);
    const encryptedBuffer = combinedArray.slice(12);

    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      encryptionKey,
      encryptedBuffer
    );

    // Convert to string
    const decryptedString = arrayBufferToString(decryptedBuffer);

    // Try to parse as JSON, return as is if it fails
    try {
      return JSON.parse(decryptedString);
    } catch {
      return decryptedString;
    }
  } catch (error) {
    logError('Decryption error:', error as Error | undefined);
    throw new Error('Failed to decrypt data');
  }
}; 