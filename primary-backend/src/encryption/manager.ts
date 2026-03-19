import crypto from "crypto";
import { Encryption, Credentials } from "../types/connections";

/**
 * Encryption Manager for secure credential storage
 * Handles AES256 encryption, key management, and cryptographic operations
 */
export class EncryptionManager {
  private algorithm = "aes-256-gcm";
  private keyLength = 32; // 256 bits
  private ivLength = 16; // 128 bits
  private saltLength = 32;
  private authTagLength = 16;
  private masterKey: Buffer;
  private environment: string;

  constructor(masterKey: string, environment: string = "dev") {
    if (!masterKey || masterKey.length < 16) {
      throw new Error("Master key must be at least 16 characters long");
    }

    // Derive a consistent key from the master key using PBKDF2
    this.masterKey = this.deriveKey(masterKey, "MASTER_KEY_DERIVATION");
    this.environment = environment;
  }

  /**
   * Derive a cryptographic key from a password/secret
   */
  private deriveKey(secret: string, salt?: string): Buffer {
    const saltBuffer = salt
      ? Buffer.from(salt, "utf-8")
      : crypto.randomBytes(this.saltLength);

    const derivedKey = crypto.pbkdf2Sync(
      secret,
      saltBuffer,
      100000, // iterations
      this.keyLength,
      "sha512",
    );

    return derivedKey;
  }

  /**
   * Generate a secure random key
   */
  generateKey(): string {
    return crypto.randomBytes(32).toString("base64");
  }

  /**
   * Generate a secure random string
   */
  generateRandomString(length: number = 32): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(
    plaintext: string,
    encryption: Encryption = "AES256",
  ): {
    encrypted: string;
    iv: string;
    authTag: string;
    algorithm: string;
  } {
    if (encryption !== "AES256") {
      throw new Error(`Unsupported encryption type: ${encryption}`);
    }

    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

    let encrypted = cipher.update(plaintext, "utf8", "base64");
    encrypted += cipher.final("base64");

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
      algorithm: this.algorithm,
    };
  }

  /**
   * Decrypt encrypted data
   */
  decrypt(encryptedData: {
    encrypted: string;
    iv: string;
    authTag: string;
    algorithm?: string;
  }): string {
    const iv = Buffer.from(encryptedData.iv, "base64");
    const authTag = Buffer.from(encryptedData.authTag, "base64");

    const decipher = crypto.createDecipheriv(
      encryptedData.algorithm || this.algorithm,
      this.masterKey,
      iv,
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  /**
   * Encrypt an entire credential object
   */
  encryptCredentials(credentials: Record<string, any>): {
    encrypted: string;
    iv: string;
    authTag: string;
    fields: string[]; // Track which fields were encrypted
  } {
    const fieldsToEncrypt: string[] = [];
    const encryptedCredentials: Record<string, any> = { ...credentials };

    // Identify and encrypt sensitive fields
    const sensitiveFields = [
      "api_key",
      "access_token",
      "refresh_token",
      "client_secret",
      "password",
      "secret",
      "private_key",
      "webhook_secret",
    ];

    sensitiveFields.forEach((field) => {
      if (credentials[field]) {
        encryptedCredentials[field] = this.encrypt(
          String(credentials[field]),
        ).encrypted;
        fieldsToEncrypt.push(field);
      }
    });

    const encryptionResult = this.encrypt(JSON.stringify(encryptedCredentials));

    return {
      ...encryptionResult,
      fields: fieldsToEncrypt,
    };
  }

  /**
   * Decrypt an entire credential object
   */
  decryptCredentials(encryptedData: {
    encrypted: string;
    iv: string;
    authTag: string;
  }): Record<string, any> {
    const decryptedString = this.decrypt(encryptedData);
    return JSON.parse(decryptedString);
  }

  /**
   * Hash a value for verification (one-way)
   */
  hash(
    value: string,
    salt?: string,
  ): {
    hash: string;
    salt: string;
  } {
    const saltValue = salt || crypto.randomBytes(16).toString("hex");
    const hash = crypto
      .createHmac("sha256", this.masterKey)
      .update(value + saltValue)
      .digest("hex");

    return { hash, salt: saltValue };
  }

  /**
   * Verify a hash
   */
  verifyHash(value: string, hash: string, salt: string): boolean {
    const computed = this.hash(value, salt);
    return computed.hash === hash;
  }

  /**
   * Generate HMAC signature for webhook verification
   */
  generateHMAC(payload: string, secret: string): string {
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  }

  /**
   * Verify HMAC signature
   */
  verifyHMAC(payload: string, signature: string, secret: string): boolean {
    const computed = this.generateHMAC(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computed),
    );
  }

  /**
   * Generate a secure token
   */
  generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Generate a UUID v4
   */
  generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Rotate the master key and re-encrypt data
   */
  rotateMasterKey(
    newMasterKey: string,
    encryptedData: Array<{
      encrypted: string;
      iv: string;
      authTag: string;
    }>,
  ): Array<{
    encrypted: string;
    iv: string;
    authTag: string;
  }> {
    // Store old key temporarily
    const oldKey = this.masterKey;

    // Derive new key
    this.masterKey = this.deriveKey(newMasterKey, "MASTER_KEY_DERIVATION");

    // Re-encrypt all data with new key
    const reencryptedData = encryptedData.map((data) => {
      const decrypted = this.decrypt(data);
      return this.encrypt(decrypted);
    });

    return reencryptedData;
  }

  /**
   * Create a digital signature
   */
  sign(data: string, privateKey: string): string {
    const sign = crypto.createSign("SHA256");
    sign.update(data);
    sign.end();
    return sign.sign(privateKey, "hex");
  }

  /**
   * Verify a digital signature
   */
  verify(data: string, signature: string, publicKey: string): boolean {
    const verify = crypto.createVerify("SHA256");
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature, "hex");
  }

  /**
   * Generate a key pair for RSA operations
   */
  generateKeyPair(): {
    publicKey: string;
    privateKey: string;
  } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    });

    return { publicKey, privateKey };
  }

  /**
   * Securely compare two strings (constant-time)
   */
  secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      throw new Error(`Connection not found: ${connection_id}`);
    }

    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  /**
   * Get environment-specific encryption key
   */
  getEnvironmentKey(): string {
    const envKey = crypto
      .createHash("sha256")
      .update(this.masterKey)
      .update(this.environment)
      .digest("hex");

    return envKey;
  }

  /**
   * Sanitize data for logging (remove sensitive fields)
   */
  sanitizeForLogging(data: any): any {
    const sensitiveFields = [
      "api_key",
      "access_token",
      "refresh_token",
      "client_secret",
      "password",
      "secret",
      "private_key",
      "webhook_secret",
      "authorization",
      "credit_card",
      "ssn",
      "social_security",
    ];

    if (typeof data !== "object" || data === null) {
      return data;
    }

    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    for (const key in sanitized) {
      if (sensitiveFields.includes(key.toLowerCase())) {
        sanitized[key] = "***REDACTED***";
      } else if (typeof sanitized[key] === "object") {
        sanitized[key] = this.sanitizeForLogging(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Validate encryption configuration
   */
  static validateEncryptionConfig(encryption: Encryption): boolean {
    return encryption === "AES256" || encryption === "RSA2048";
  }

  /**
   * Get encryption strength information
   */
  getEncryptionInfo(): {
    algorithm: string;
    keyLength: number;
    environment: string;
    supportedAlgorithms: string[];
  } {
    return {
      algorithm: this.algorithm,
      keyLength: this.keyLength * 8, // in bits
      environment: this.environment,
      supportedAlgorithms: ["aes-256-gcm", "aes-256-cbc"],
    };
  }
}

// Singleton instance
let encryptionManagerInstance: EncryptionManager | null = null;

/**
 * Get or create the singleton EncryptionManager instance
 */
export function getEncryptionManager(): EncryptionManager {
  if (!encryptionManagerInstance) {
    const masterKey =
      process.env.ENCRYPTION_MASTER_KEY ||
      process.env.SECRET_KEY ||
      "default-dev-key-change-in-production";
    const environment = process.env.NODE_ENV || "dev";
    encryptionManagerInstance = new EncryptionManager(masterKey, environment);
  }
  return encryptionManagerInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetEncryptionManager(): void {
  encryptionManagerInstance = null;
}
