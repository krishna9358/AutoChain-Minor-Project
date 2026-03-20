/**
 * Resolve `{{secrets.KEY}}` in workflow node configs using the workspace Secret library.
 * KEY must match the secret's `key` field (same as dashboard copy helper).
 */
import prisma from "../db";
import { decryptStoredSecretValue } from "./secretCrypto";

export async function getWorkspaceSecretsMap(
  workspaceId: string,
): Promise<Record<string, string>> {
  const rows = await prisma.secret.findMany({
    where: { workspaceId },
    select: { key: true, value: true },
  });
  const map: Record<string, string> = {};
  for (const row of rows) {
    const plain = decryptStoredSecretValue(row.value);
    if (plain != null) map[row.key] = plain;
  }
  return map;
}

export function resolveSecretPlaceholdersInString(
  input: string,
  secretMap: Record<string, string>,
): string {
  return input.replace(
    /\{\{\s*secrets\.([a-zA-Z0-9_.-]+)\s*\}\}/g,
    (full, keyName: string) => {
      if (Object.prototype.hasOwnProperty.call(secretMap, keyName)) {
        return secretMap[keyName];
      }
      return full;
    },
  );
}

export function resolveSecretPlaceholdersDeep(
  value: unknown,
  secretMap: Record<string, string>,
): unknown {
  if (typeof value === "string") {
    return resolveSecretPlaceholdersInString(value, secretMap);
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveSecretPlaceholdersDeep(v, secretMap));
  }
  if (value !== null && typeof value === "object") {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      out[k] = resolveSecretPlaceholdersDeep(v, secretMap);
    }
    return out;
  }
  return value;
}

/** Clone nodes and resolve secrets in each `config` (does not mutate originals). */
export function applySecretsToWorkflowNodes<T extends { config?: unknown }>(
  nodes: T[],
  secretMap: Record<string, string>,
): T[] {
  return nodes.map((n) => ({
    ...n,
    config: resolveSecretPlaceholdersDeep(
      n.config === undefined ? {} : n.config,
      secretMap,
    ),
  })) as T[];
}
