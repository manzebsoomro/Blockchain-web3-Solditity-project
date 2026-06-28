import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const ENCODING = "hex";

export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypt data using AES-256-GCM
 * @param data - Data to encrypt
 * @param key - Encryption key (should be 32 bytes for AES-256)
 * @returns Encrypted data with IV and auth tag
 */
export function encrypt(data: string, key: string): EncryptedData {
  // Ensure key is 32 bytes (256 bits)
  const keyBuffer = Buffer.from(key.padEnd(32, "0").slice(0, 32));
  
  // Generate random IV (16 bytes)
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  
  let encrypted = cipher.update(data, "utf-8", ENCODING);
  encrypted += cipher.final(ENCODING);
  
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString(ENCODING),
    authTag: authTag.toString(ENCODING),
  };
}

/**
 * Decrypt data using AES-256-GCM
 * @param encryptedData - Encrypted data object with IV and auth tag
 * @param key - Encryption key (should be 32 bytes for AES-256)
 * @returns Decrypted data
 */
export function decrypt(encryptedData: EncryptedData, key: string): string {
  // Ensure key is 32 bytes (256 bits)
  const keyBuffer = Buffer.from(key.padEnd(32, "0").slice(0, 32));
  
  const iv = Buffer.from(encryptedData.iv, ENCODING);
  const authTag = Buffer.from(encryptedData.authTag, ENCODING);

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData.encrypted, ENCODING, "utf-8");
  decrypted += decipher.final("utf-8");

  return decrypted;
}
