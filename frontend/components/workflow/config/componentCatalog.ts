import { BACKEND_URL } from "@/app/config";

export type ComponentCategory =
  | "input"
  | "core"
  | "logic"
  | "ai"
  | "output"
  | "integration"
  | "control";

export type ConfigFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "json"
  | "password"
  | "api-key"
  | "url"
  | "email"
  | "multi-select"
  | "code";

export interface ComponentOption {
  label: string;
  value: string;
}

export interface ComponentConfigField {
  key: string;
  label: string;
  type: ConfigFieldType;
  description?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  min?: number;
  max?: number;
  rows?: number;
  options?: ComponentOption[];
  /** Show this field only when another field has a specific value */
  showWhen?: { field: string; value: string | string[] };
}

export interface ComponentDefinition {
  id: string;
  version: string;
  name: string;
  description: string;
  icon: string;
  category: ComponentCategory;
  tags?: string[];
  configFields: ComponentConfigField[];
}

export interface ConfigValidationError {
  path: string;
  message: string;
}

export interface ValidateNodeConfigOk {
  ok: true;
  normalizedConfig: Record<string, unknown>;
}

export interface ValidateNodeConfigFailed {
  ok: false;
  errors: ConfigValidationError[];
}

export type ValidateNodeConfigResponse =
  | ValidateNodeConfigOk
  | ValidateNodeConfigFailed;

export interface CatalogQuery {
  category?: ComponentCategory;
  search?: string;
}

const CATALOG_ENDPOINT = `${BACKEND_URL}/api/v1/components`;

function getAuthHeaders(token?: string): Record<string, string> {
  if (!token) {
    return {};
  }

  return {
    Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
  };
}

function normalizeArrayPayload<T>(payload: unknown): T[] {
  if (!Array.isArray(payload)) return [];
  return payload as T[];
}

export async function fetchComponentCatalog(
  query: CatalogQuery = {},
  token?: string,
): Promise<ComponentDefinition[]> {
  const response = await fetch(CATALOG_ENDPOINT, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(token),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to load component catalog (${response.status}): ${text || "Unknown error"}`,
    );
  }

  const payload = (await response.json()) as unknown;
  let list = normalizeArrayPayload<ComponentDefinition>(payload);

  if (query.category) {
    list = list.filter((c) => c.category === query.category);
  }

  if (query.search && query.search.trim()) {
    const term = query.search.trim().toLowerCase();
    list = list.filter((c) => {
      const haystack = [
        c.id,
        c.name,
        c.description,
        ...(c.tags || []),
        c.category,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }

  return list;
}

export async function fetchComponentById(
  componentId: string,
  token?: string,
): Promise<ComponentDefinition> {
  const response = await fetch(`${CATALOG_ENDPOINT}/${componentId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(token),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to load component "${componentId}" (${response.status}): ${text || "Unknown error"}`,
    );
  }

  return (await response.json()) as ComponentDefinition;
}

export async function validateNodeConfig(
  componentId: string,
  config: Record<string, unknown>,
  token?: string,
): Promise<ValidateNodeConfigResponse> {
  const response = await fetch(`${CATALOG_ENDPOINT}/validate-node-config`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(token),
    },
    body: JSON.stringify({
      componentId,
      config,
    }),
  });

  const payload = await response.json();

  if (response.ok) {
    return {
      ok: true,
      normalizedConfig:
        (payload?.normalizedConfig as Record<string, unknown>) ?? {},
    };
  }

  if (response.status === 422) {
    return {
      ok: false,
      errors: Array.isArray(payload?.errors)
        ? (payload.errors as ConfigValidationError[])
        : [{ path: "config", message: "Invalid configuration" }],
    };
  }

  throw new Error(
    payload?.error
      ? `Config validation failed: ${payload.error}`
      : `Config validation request failed (${response.status})`,
  );
}

export function categoryLabel(category: ComponentCategory): string {
  switch (category) {
    case "input":
      return "Input";
    case "core":
      return "Core";
    case "logic":
      return "Logic";
    case "ai":
      return "AI";
    case "output":
      return "Output";
    case "integration":
      return "Integrations";
    case "control":
      return "Control";
    default:
      return "Other";
  }
}

export function groupComponentsByCategory(
  components: ComponentDefinition[],
): Record<ComponentCategory, ComponentDefinition[]> {
  const groups: Record<ComponentCategory, ComponentDefinition[]> = {
    input: [],
    core: [],
    logic: [],
    ai: [],
    output: [],
    integration: [],
    control: [],
  };

  for (const component of components) {
    groups[component.category].push(component);
  }

  return groups;
}

export function getConfigDefaults(
  fields: ComponentConfigField[],
): Record<string, unknown> {
  return fields.reduce<Record<string, unknown>>((acc, field) => {
    if (field.defaultValue !== undefined) {
      acc[field.key] = field.defaultValue;
      return acc;
    }

    switch (field.type) {
      case "boolean":
        acc[field.key] = false;
        break;
      case "number":
        acc[field.key] = 0;
        break;
      case "json":
        acc[field.key] = {};
        break;
      case "multi-select":
        acc[field.key] = [];
        break;
      default:
        acc[field.key] = "";
        break;
    }

    return acc;
  }, {});
}
