/**
 * Live calls to **separate** Google Cloud product APIs (not one “Workspace API”):
 * - Calendar → Calendar API v3 (`calendar.googleapis.com`)
 * - Meet → same Calendar API (`conferenceData` / `hangoutsMeet`); there is no standalone Meet REST API for this flow
 * - Docs → Google Docs API v1 (`docs.googleapis.com`)
 * - Sheets → Google Sheets API v4 (`sheets.googleapis.com`)
 *
 * These APIs work with **free personal @gmail.com Google accounts** once the API is enabled and OAuth consent is set up;
 * a paid Google Workspace subscription is **not** required.
 *
 * Auth (pick one):
 * - **oauth_connection** + `googleConnectionId`: refresh token from Dashboard → Google integrations (OAuth2).
 * - **manual** + `credentialsSecret`: service account JSON, access token, or `{{secrets.*}}` (resolved before this runs).
 */

import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import prisma from "../db";
import { decryptStoredSecretValue } from "../services/secretCrypto";
import { refreshGoogleUserAccessToken } from "../services/googleUserOAuth";

export type GoogleExecutionContext = {
  workspaceId?: string;
};

/** Explicit authMode wins; legacy nodes with only `credentialsSecret` are treated as manual. */
function effectiveGoogleAuthMode(config: Record<string, unknown>): "oauth_connection" | "manual" {
  const a = String(config.authMode || "").toLowerCase();
  if (a === "manual") return "manual";
  if (a === "oauth_connection") return "oauth_connection";
  const sec = config.credentialsSecret;
  if (typeof sec === "string" && sec.trim()) return "manual";
  return "oauth_connection";
}

function isSecretPlaceholder(raw: unknown): boolean {
  if (raw == null || typeof raw !== "string") return false;
  const t = raw.trim();
  return t.includes("{{") && t.includes("}}");
}

function parseServiceAccountJson(raw: string): {
  client_email: string;
  private_key: string;
} | null {
  const t = raw.trim();
  if (!t.startsWith("{")) return null;
  try {
    const o = JSON.parse(t) as Record<string, unknown>;
    const client_email = o.client_email;
    const private_key = o.private_key;
    if (typeof client_email !== "string" || typeof private_key !== "string") return null;
    return {
      client_email,
      private_key: private_key.replace(/\\n/g, "\n"),
    };
  } catch {
    return null;
  }
}

async function exchangeServiceAccountJwt(
  sa: { client_email: string; private_key: string },
  scopes: string[],
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    {
      iss: sa.client_email,
      sub: sa.client_email,
      scope: scopes.join(" "),
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    sa.private_key,
    { algorithm: "RS256" },
  );

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok || typeof data.access_token !== "string") {
    const err = data.error_description || data.error || res.statusText;
    throw new Error(`Google token exchange failed: ${String(err)}`);
  }
  return data.access_token;
}

type AccessTokenResult =
  | { ok: true; token: string }
  | { ok: false; error: string; hint?: string };

/**
 * Resolves a Google OAuth access token for Calendar / Docs / Sheets scopes.
 * On failure returns a clear message instead of silently falling back to “simulated” success.
 */
async function getAccessTokenResult(
  config: Record<string, unknown>,
  scopes: string[],
  ctx?: GoogleExecutionContext,
): Promise<AccessTokenResult> {
  const authMode = effectiveGoogleAuthMode(config);

  if (authMode === "oauth_connection") {
    if (!ctx?.workspaceId) {
      return {
        ok: false,
        error: "Workspace context is missing for this run.",
        hint: "Google nodes need the workflow’s workspace to resolve OAuth. Re-run from the workflow builder or API with a valid run.",
      };
    }

    let connId = String(config.googleConnectionId || "").trim();
    if (!connId) {
      const conns = await prisma.googleOAuthConnection.findMany({
        where: { workspaceId: ctx.workspaceId },
        select: { id: true },
        take: 2,
      });
      if (conns.length === 1) {
        connId = conns[0].id;
      } else if (conns.length === 0) {
        return {
          ok: false,
          error: "No Google account connected for this workspace.",
          hint: "Open Dashboard → Integrations → Google, connect an account, then select it on this node (or connect exactly one account to auto-select).",
        };
      } else {
        return {
          ok: false,
          error: "Choose which Google account to use on this node.",
          hint: "In the node configuration, set “Google account” to one of your connections, or remove extra connections so only one remains.",
        };
      }
    }

    try {
      let conn = await prisma.googleOAuthConnection.findFirst({
        where: { id: connId, workspaceId: ctx.workspaceId },
      });

      if (!conn) {
        const elsewhere = await prisma.googleOAuthConnection.findUnique({
          where: { id: connId },
          select: { id: true, workspaceId: true },
        });
        if (elsewhere && elsewhere.workspaceId !== ctx.workspaceId) {
          return {
            ok: false,
            error: "The saved Google connection belongs to a different workspace than this workflow.",
            hint: "Use the workflow in the workspace where you connected Google, or open this node and pick a Google account that is connected for the current workspace.",
          };
        }

        // Stale ID (copy/paste, DB reset, connection removed) — recover if this workspace has only one account
        const inWs = await prisma.googleOAuthConnection.findMany({
          where: { workspaceId: ctx.workspaceId },
          orderBy: { updatedAt: "desc" },
          take: 2,
        });
        if (inWs.length === 1) {
          conn = inWs[0];
        } else if (inWs.length === 0) {
          return {
            ok: false,
            error: "No Google account is connected for this workspace.",
            hint: "Go to Dashboard → Integrations → Google, connect an account, then open this node and choose it under **Google account**.",
          };
        } else {
          return {
            ok: false,
            error: "The Google account saved on this node is no longer valid.",
            hint: "Open the workflow editor, select this node, and choose **Google account** again from the list (IDs can change after reconnecting or resetting data).",
          };
        }
      }

      const refresh = decryptStoredSecretValue(conn.refreshTokenEnc);
      if (!refresh) {
        return {
          ok: false,
          error: "Could not read the stored Google refresh token.",
          hint: "Remove the connection in Integrations → Google and connect again.",
        };
      }
      const token = await refreshGoogleUserAccessToken(refresh, ctx.workspaceId);
      return { ok: true, token };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        error: `Google access token refresh failed: ${msg}`,
        hint: "Check Client ID, Client secret, and Redirect URI (Dashboard → Integrations → Google or server GOOGLE_OAUTH_*). Enable the Google Calendar API for your Cloud project.",
      };
    }
  }

  const secret = config.credentialsSecret;
  if (secret == null || typeof secret !== "string") {
    return {
      ok: false,
      error: "No credentials configured for Manual auth.",
      hint: "Enter an access token, service account JSON, or {{secrets.NAME}}, or switch to Connected Google account.",
    };
  }
  const t = secret.trim();
  if (!t || isSecretPlaceholder(t)) {
    return {
      ok: false,
      error: "Secret placeholder was not resolved before execution.",
      hint: "Use a real value or a {{secrets.KEY}} that exists in this workspace’s Secret library.",
    };
  }

  try {
    const sa = parseServiceAccountJson(t);
    if (sa) {
      const token = await exchangeServiceAccountJwt(sa, scopes);
      return { ok: true, token };
    }
    if (t.length >= 20) return { ok: true, token: t };
    return {
      ok: false,
      error: "Manual credential string is too short to be a valid OAuth access token.",
      hint: "Paste a full Bearer access token or service account JSON, or use Connected Google account.",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: msg,
      hint: "Check service account JSON and that the Calendar API is enabled for that project.",
    };
  }
}

function authFailurePayload(
  config: Record<string, unknown>,
  tr: Extract<AccessTokenResult, { ok: false }>,
  productNote?: string,
): Record<string, unknown> {
  return {
    ok: false,
    simulated: false,
    live: false,
    error: tr.error,
    hint: tr.hint,
    ...(productNote ? { note: productNote } : {}),
    operation: config.operation,
  };
}

const SCOPE_CALENDAR = ["https://www.googleapis.com/auth/calendar"];
const SCOPE_DOCS = ["https://www.googleapis.com/auth/documents"];
const SCOPE_SHEETS = ["https://www.googleapis.com/auth/spreadsheets"];

async function gapi<T>(
  accessToken: string,
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: T }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    ...((init?.headers as Record<string, string>) || {}),
  };
  if (init?.body) headers["Content-Type"] = "application/json";
  const res = await fetch(url, {
    ...init,
    headers,
  });
  const text = await res.text();
  let data: T;
  try {
    data = text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    data = text as unknown as T;
  }
  return { ok: res.ok, status: res.status, data };
}

function mockCalendar(config: Record<string, unknown>): Record<string, unknown> {
  return {
    ok: true,
    simulated: true,
    operation: config.operation || "list_events",
    calendarId: config.calendarId || "primary",
    events: [
      {
        id: "evt-sim-1",
        summary: "Sample event",
        start: { dateTime: "2025-03-20T10:00:00Z" },
        end: { dateTime: "2025-03-20T11:00:00Z" },
      },
    ],
  };
}

function mockMeet(config: Record<string, unknown>): Record<string, unknown> {
  return {
    ok: true,
    simulated: true,
    operation: config.operation || "create_scheduled_meeting",
    meetLink: "https://meet.google.com/xxx-xxxx-xxx",
    htmlLink: "https://www.google.com/calendar/event?eid=simulated",
    eventId: "sim-meet-1",
  };
}

function mockDocs(config: Record<string, unknown>): Record<string, unknown> {
  return {
    ok: true,
    simulated: true,
    operation: config.operation || "get_document",
    documentId: config.documentId || "sim-doc",
    title: config.newDocumentTitle || "Sample Doc",
    textPreview:
      "Simulated — connect a Google account (OAuth) in Integrations or set Manual credentials / {{secrets.*}} for live API.",
  };
}

function mockSheets(config: Record<string, unknown>): Record<string, unknown> {
  return {
    ok: true,
    simulated: true,
    operation: config.operation || "read_range",
    spreadsheetId: config.spreadsheetId,
    range: config.rangeA1,
    values: [
      ["Name", "Score"],
      ["Alice", "92"],
    ],
  };
}

function attendeesFromConfig(config: Record<string, unknown>): { email: string }[] {
  const raw = config.attendeesJson;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => (x && typeof x === "object" && "email" in x ? String((x as { email: string }).email) : ""))
    .filter(Boolean)
    .map((email) => ({ email }));
}

export async function executeGoogleCloudNode(
  canonicalId: string,
  config: Record<string, unknown>,
  ctx?: GoogleExecutionContext,
): Promise<Record<string, unknown>> {
  try {
    switch (canonicalId) {
      case "google-calendar":
        return await runGoogleCalendar(config, ctx);
      case "google-meet":
        return await runGoogleMeet(config, ctx);
      case "google-docs":
        return await runGoogleDocs(config, ctx);
      case "google-sheets":
        return await runGoogleSheets(config, ctx);
      default:
        return { ok: false, error: `Unknown Google node: ${canonicalId}` };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const base =
      canonicalId === "google-calendar"
        ? mockCalendar(config)
        : canonicalId === "google-meet"
          ? mockMeet(config)
          : canonicalId === "google-docs"
            ? mockDocs(config)
            : mockSheets(config);
    return { ...base, ok: false, liveError: msg, simulated: true };
  }
}

async function runGoogleCalendar(
  config: Record<string, unknown>,
  ctx?: GoogleExecutionContext,
): Promise<Record<string, unknown>> {
  const tr = await getAccessTokenResult(config, SCOPE_CALENDAR, ctx);
  if (!tr.ok) {
    return authFailurePayload(config, tr);
  }
  const token = tr.token;

  const calendarId = encodeURIComponent(String(config.calendarId || "primary"));
  const op = String(config.operation || "list_events");

  if (op === "list_events") {
    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "50",
    });
    const tMin = String(config.timeMin || "").trim();
    const tMax = String(config.timeMax || "").trim();
    if (tMin) params.set("timeMin", tMin);
    if (tMax) params.set("timeMax", tMax);
    const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`;
    const r = await gapi<{ items?: unknown[] }>(token, url);
    if (!r.ok) {
      return { ...mockCalendar(config), ok: false, liveFailed: true, status: r.status, error: r.data };
    }
    const items = Array.isArray(r.data.items) ? r.data.items : [];
    return {
      ok: true,
      live: true,
      operation: op,
      calendarId: config.calendarId,
      count: items.length,
      events: items,
    };
  }

  if (op === "get_event") {
    const eventId = encodeURIComponent(String(config.eventId || ""));
    const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`;
    const r = await gapi<Record<string, unknown>>(token, url);
    if (!r.ok) return { ok: false, status: r.status, error: r.data };
    return { ok: true, live: true, operation: op, event: r.data };
  }

  if (op === "delete_event") {
    const eventId = encodeURIComponent(String(config.eventId || ""));
    const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`;
    const r = await gapi<unknown>(token, url, { method: "DELETE" });
    if (!r.ok && r.status !== 204) return { ok: false, status: r.status, error: r.data };
    return { ok: true, live: true, operation: op, deleted: true, eventId: config.eventId };
  }

  if (op === "create_event") {
    const timeZone = String(config.timeZone || "UTC");
    const body: Record<string, unknown> = {
      summary: String(config.eventSummary || ""),
      description: String(config.eventDescription || "") || undefined,
      location: String(config.location || "") || undefined,
      start: { dateTime: String(config.eventStart || ""), timeZone },
      end: { dateTime: String(config.eventEnd || ""), timeZone },
    };
    const att = attendeesFromConfig(config);
    if (att.length) body.attendees = att;
    const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;
    const r = await gapi<Record<string, unknown>>(token, url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!r.ok) return { ok: false, status: r.status, error: r.data };
    return { ok: true, live: true, operation: op, event: r.data, htmlLink: r.data.htmlLink, eventId: r.data.id };
  }

  if (op === "update_event") {
    const eventId = encodeURIComponent(String(config.eventId || ""));
    const timeZone = String(config.timeZone || "UTC");
    const body: Record<string, unknown> = {};
    if (config.eventSummary) body.summary = String(config.eventSummary);
    if (config.eventDescription !== undefined) body.description = String(config.eventDescription);
    if (config.location) body.location = String(config.location);
    if (config.eventStart) body.start = { dateTime: String(config.eventStart), timeZone };
    if (config.eventEnd) body.end = { dateTime: String(config.eventEnd), timeZone };
    const att = attendeesFromConfig(config);
    if (att.length) body.attendees = att;
    const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`;
    const r = await gapi<Record<string, unknown>>(token, url, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (!r.ok) return { ok: false, status: r.status, error: r.data };
    return { ok: true, live: true, operation: op, event: r.data };
  }

  return { ok: false, error: `Unknown calendar operation: ${op}`, ...mockCalendar(config) };
}

async function runGoogleMeet(
  config: Record<string, unknown>,
  ctx?: GoogleExecutionContext,
): Promise<Record<string, unknown>> {
  const tr = await getAccessTokenResult(config, SCOPE_CALENDAR, ctx);
  if (!tr.ok) {
    return authFailurePayload(
      config,
      tr,
      "Meet uses the Calendar API (conferenceData / hangoutsMeet) — same auth as Google Calendar.",
    );
  }
  const token = tr.token;

  const calendarId = encodeURIComponent(String(config.calendarId || "primary"));
  const op = String(config.operation || "create_scheduled_meeting");

  if (op === "create_scheduled_meeting") {
    const timeZone = "UTC";
    const body: Record<string, unknown> = {
      summary: String(config.meetingTitle || "Video call"),
      start: { dateTime: String(config.startTime || ""), timeZone },
      end: { dateTime: String(config.endTime || ""), timeZone },
      conferenceData: {
        createRequest: {
          requestId: randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };
    const att = attendeesFromConfig(config);
    if (att.length) body.attendees = att;
    const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?conferenceDataVersion=1`;
    const r = await gapi<Record<string, unknown>>(token, url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!r.ok) return { ok: false, status: r.status, error: r.data };
    const hang = (r.data.conferenceData as { entryPoints?: { uri?: string }[] } | undefined)?.entryPoints?.find(
      (e) => e.uri?.includes("meet.google.com"),
    );
    return {
      ok: true,
      live: true,
      operation: op,
      eventId: r.data.id,
      htmlLink: r.data.htmlLink,
      meetLink: hang?.uri || (r.data.hangoutLink as string | undefined),
      event: r.data,
    };
  }

  if (op === "attach_meet_to_event") {
    const eventId = encodeURIComponent(String(config.existingEventId || ""));
    const body = {
      conferenceData: {
        createRequest: {
          requestId: randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };
    const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}?conferenceDataVersion=1`;
    const r = await gapi<Record<string, unknown>>(token, url, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (!r.ok) return { ok: false, status: r.status, error: r.data };
    const hang = (r.data.conferenceData as { entryPoints?: { uri?: string }[] } | undefined)?.entryPoints?.find(
      (e) => e.uri?.includes("meet.google.com"),
    );
    return {
      ok: true,
      live: true,
      operation: op,
      eventId: r.data.id,
      htmlLink: r.data.htmlLink,
      meetLink: hang?.uri || (r.data.hangoutLink as string | undefined),
      event: r.data,
    };
  }

  return { ok: false, error: `Unknown meet operation: ${op}`, ...mockMeet(config) };
}

function docEndInsertIndex(doc: { body?: { content?: { endIndex?: number }[] } }): number {
  let max = 1;
  for (const el of doc.body?.content || []) {
    if (typeof el.endIndex === "number") max = Math.max(max, el.endIndex);
  }
  return Math.max(1, max - 1);
}

async function runGoogleDocs(
  config: Record<string, unknown>,
  ctx?: GoogleExecutionContext,
): Promise<Record<string, unknown>> {
  const tr = await getAccessTokenResult(config, SCOPE_DOCS, ctx);
  if (!tr.ok) {
    return authFailurePayload(
      config,
      tr,
      "Enable the Google Docs API in Cloud Console; share the document with a service account if using SA JSON.",
    );
  }
  const token = tr.token;

  const op = String(config.operation || "get_document");

  if (op === "create_document") {
    const title = String(config.newDocumentTitle || "Untitled");
    const r = await gapi<{ documentId?: string; title?: string }>(token, "https://docs.googleapis.com/v1/documents", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
    if (!r.ok) return { ok: false, status: r.status, error: r.data };
    return { ok: true, live: true, operation: op, documentId: r.data.documentId, title: r.data.title };
  }

  const documentId = String(config.documentId || "");
  if (!documentId) return { ok: false, error: "documentId required", ...mockDocs(config) };

  if (op === "get_document") {
    const url = `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}`;
    const r = await gapi<{
      title?: string;
      body?: { content?: unknown[] };
    }>(token, url);
    if (!r.ok) return { ok: false, status: r.status, error: r.data };
    let textPreview = "";
    try {
      textPreview = JSON.stringify(r.data.body?.content || []).slice(0, 2000);
    } catch {
      textPreview = "";
    }
    return {
      ok: true,
      live: true,
      operation: op,
      documentId,
      title: r.data.title,
      textPreview,
      document: r.data,
    };
  }

  if (op === "append_paragraph") {
    const text = String(config.appendText || "");
    const getUrl = `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}`;
    const got = await gapi<{ body?: { content?: { endIndex?: number }[] } }>(token, getUrl);
    if (!got.ok) return { ok: false, status: got.status, error: got.data };
    const idx = docEndInsertIndex(got.data as { body?: { content?: { endIndex?: number }[] } });
    const batchUrl = `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`;
    const r = await gapi<unknown>(token, batchUrl, {
      method: "POST",
      body: JSON.stringify({
        requests: [{ insertText: { location: { index: idx }, text: `\n${text}\n` } }],
      }),
    });
    if (!r.ok) return { ok: false, status: r.status, error: r.data };
    return { ok: true, live: true, operation: op, documentId, appended: true };
  }

  if (op === "replace_all_text") {
    const find = String(config.findText || "");
    const replace = String(config.replaceText || "");
    const batchUrl = `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`;
    const r = await gapi<unknown>(token, batchUrl, {
      method: "POST",
      body: JSON.stringify({
        requests: [{ replaceAllText: { containsText: { text: find, matchCase: true }, replaceText: replace } }],
      }),
    });
    if (!r.ok) return { ok: false, status: r.status, error: r.data };
    return { ok: true, live: true, operation: op, documentId, replaced: true };
  }

  return { ok: false, error: `Unknown docs operation: ${op}`, ...mockDocs(config) };
}

async function runGoogleSheets(
  config: Record<string, unknown>,
  ctx?: GoogleExecutionContext,
): Promise<Record<string, unknown>> {
  const tr = await getAccessTokenResult(config, SCOPE_SHEETS, ctx);
  if (!tr.ok) {
    return authFailurePayload(
      config,
      tr,
      "Enable the Google Sheets API in Cloud Console; share the spreadsheet with the service account if using SA JSON.",
    );
  }
  const token = tr.token;

  const spreadsheetId = String(config.spreadsheetId || "");
  if (!spreadsheetId) return { ok: false, error: "spreadsheetId required", ...mockSheets(config) };

  const rangeRaw = String(config.rangeA1 || "Sheet1!A1");
  const rangeEnc = encodeURIComponent(rangeRaw);
  const vio = String(config.valueInputOption || "USER_ENTERED");
  const op = String(config.operation || "read_range");

  if (op === "read_range") {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${rangeEnc}`;
    const r = await gapi<{ values?: unknown[][]; range?: string }>(token, url);
    if (!r.ok) return { ok: false, status: r.status, error: r.data };
    return {
      ok: true,
      live: true,
      operation: op,
      spreadsheetId,
      range: r.data.range || rangeRaw,
      values: r.data.values || [],
    };
  }

  if (op === "append_rows") {
    const values = config.valuesJson;
    if (!Array.isArray(values)) return { ok: false, error: "valuesJson must be a 2D array" };
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${rangeEnc}:append?valueInputOption=${encodeURIComponent(vio)}&insertDataOption=INSERT_ROWS`;
    const r = await gapi<{ updates?: unknown }>(token, url, {
      method: "POST",
      body: JSON.stringify({ values }),
    });
    if (!r.ok) return { ok: false, status: r.status, error: r.data };
    return { ok: true, live: true, operation: op, spreadsheetId, updates: r.data.updates };
  }

  if (op === "update_values") {
    const values = config.valuesJson;
    if (!Array.isArray(values)) return { ok: false, error: "valuesJson must be a 2D array" };
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${rangeEnc}?valueInputOption=${encodeURIComponent(vio)}`;
    const r = await gapi<{ updatedRange?: string; updatedRows?: number }>(token, url, {
      method: "PUT",
      body: JSON.stringify({ values }),
    });
    if (!r.ok) return { ok: false, status: r.status, error: r.data };
    return {
      ok: true,
      live: true,
      operation: op,
      spreadsheetId,
      updatedRange: r.data.updatedRange,
      updatedRows: r.data.updatedRows,
    };
  }

  if (op === "clear_range") {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${rangeEnc}:clear`;
    const r = await gapi<{ clearedRange?: string }>(token, url, { method: "POST", body: "{}" });
    if (!r.ok) return { ok: false, status: r.status, error: r.data };
    return { ok: true, live: true, operation: op, spreadsheetId, clearedRange: r.data.clearedRange };
  }

  return { ok: false, error: `Unknown sheets operation: ${op}`, ...mockSheets(config) };
}
