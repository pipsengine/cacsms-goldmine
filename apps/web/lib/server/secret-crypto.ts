import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

type EncryptedPayload = {
  iv: string;
  tag: string;
  value: string;
};

const ALGORITHM = "aes-256-gcm";

export function encryptSecret(secret: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const payload: EncryptedPayload = {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    value: encrypted.toString("base64"),
  };

  return JSON.stringify(payload);
}

export function decryptSecret(payload: string) {
  const key = getEncryptionKey();
  const parsed = JSON.parse(payload) as EncryptedPayload;
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(parsed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(parsed.value, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
}

function getEncryptionKey() {
  const configured = process.env.MT5_SESSION_ENCRYPTION_KEY?.trim();

  if (configured) {
    try {
      const raw = Buffer.from(configured, "base64");
      if (raw.length === 32) return raw;
    } catch {
      // Fall through to deterministic hash below.
    }

    return createHash("sha256").update(configured).digest();
  }

  const fallbackSeed = [
    process.env.DB_HOST,
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    "cacsms-goldmine-mt5-sessions",
  ]
    .filter(Boolean)
    .join("|");

  if (!fallbackSeed) {
    throw new Error("MT5 session encryption key is not configured.");
  }

  return createHash("sha256").update(fallbackSeed).digest();
}
