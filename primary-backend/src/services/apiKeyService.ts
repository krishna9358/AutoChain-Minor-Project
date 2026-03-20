/**
 * API key verification for external clients (X-Api-Key or Bearer ak_...).
 * Hashing must match `generateApiKey` in router/apiKeys.ts.
 */
import crypto from "crypto";
import type { ApiScope } from "@prisma/client";
import prisma from "../db";

export function hashRawApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey, "utf8").digest("hex");
}

export type AuthenticatedApiKey = {
  apiKeyId: string;
  userId: string;
  workspaceId: string | null;
  scopes: ApiScope[];
};

/** Validate raw `ak_...` key and touch lastUsedAt. */
export async function authenticateApiKeyRaw(
  rawKey: string,
): Promise<AuthenticatedApiKey | null> {
  const trimmed = rawKey.trim();
  if (!trimmed || !trimmed.startsWith("ak_")) {
    return null;
  }

  const keyHash = hashRawApiKey(trimmed);
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      userId: true,
      workspaceId: true,
      scopes: true,
      isRevoked: true,
      expiresAt: true,
    },
  });

  if (!apiKey || apiKey.isRevoked) {
    return null;
  }
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }

  await prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return {
    apiKeyId: apiKey.id,
    userId: apiKey.userId,
    workspaceId: apiKey.workspaceId,
    scopes: apiKey.scopes,
  };
}
