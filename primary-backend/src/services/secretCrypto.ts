/**
 * Shared AES-256-GCM helpers for Secret library (encrypt at rest, decrypt for API + workflow resolution).
 */
import crypto from "crypto";

const ENCRYPTION_PASSPHRASE =
  process.env.SECRET_ENCRYPTION_KEY ||
  process.env.ENCRYPTION_KEY ||
  "default-secret-key-change-in-production";

const ALGORITHM = "aes-256-gcm";

export function encryptionKey32(): Buffer {
  return crypto.createHash("sha256").update(String(ENCRYPTION_PASSPHRASE), "utf8").digest();
}

export function encrypt(text: string): { encrypted: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(16);
  const key = encryptionKey32();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = (cipher as crypto.CipherGCM).getAuthTag();
  return { encrypted, iv: iv.toString("hex"), authTag: authTag.toString("hex") };
}

export function decrypt(encrypted: string, iv: string, authTag: string): string {
  const key = encryptionKey32();
  const ivBuf = Buffer.from(iv, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuf);
  (decipher as crypto.DecipherGCM).setAuthTag(Buffer.from(authTag, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/** Decrypt a DB `Secret.value` column (JSON envelope or legacy plain string). */
export function decryptStoredSecretValue(stored: string | null | undefined): string | null {
  if (stored == null || stored === "") return null;
  try {
    const encryptedData = JSON.parse(stored) as {
      encrypted: string;
      iv: string;
      authTag: string;
    };
    return decrypt(encryptedData.encrypted, encryptedData.iv, encryptedData.authTag);
  } catch {
    return stored;
  }
}
