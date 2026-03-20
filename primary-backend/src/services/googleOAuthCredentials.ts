/**
 * Resolves Google OAuth **application** credentials for a workspace:
 * workspace-stored values (UI form) first, then environment-variable fallback.
 */
import prisma from "../db";
import { decryptStoredSecretValue } from "./secretCrypto";

export type ResolvedGoogleOAuthApp = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  source: "workspace" | "env";
};

export async function resolveGoogleOAuthAppForWorkspace(
  workspaceId: string,
): Promise<ResolvedGoogleOAuthApp | null> {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      googleOAuthClientId: true,
      googleOAuthClientSecretEnc: true,
      googleOAuthRedirectUri: true,
    },
  });

  const cidWs = ws?.googleOAuthClientId?.trim();
  const enc = ws?.googleOAuthClientSecretEnc?.trim();
  const redWs = ws?.googleOAuthRedirectUri?.trim();

  if (cidWs && enc && redWs) {
    const clientSecret = decryptStoredSecretValue(enc);
    if (clientSecret) {
      return {
        clientId: cidWs,
        clientSecret,
        redirectUri: redWs,
        source: "workspace",
      };
    }
  }

  const cid = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const sec = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  const red = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (cid && sec && red) {
    return { clientId: cid, clientSecret: sec, redirectUri: red, source: "env" };
  }

  return null;
}
