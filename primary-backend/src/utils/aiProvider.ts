import { createOpenAI } from "@ai-sdk/openai";

/**
 * Shared AI provider factory.
 * Uses environment variables with fallback chain:
 *   AI_API_KEY  >  GROQ_API_KEY  >  OPENROUTER_API_KEY
 *   AI_BASE_URL >  Groq endpoint  >  OpenRouter endpoint
 */
export function getAIProvider() {
  const apiKey =
    process.env.AI_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    "";
  const baseURL =
    process.env.AI_BASE_URL ||
    (process.env.GROQ_API_KEY
      ? "https://api.groq.com/openai/v1"
      : "https://openrouter.ai/api/v1");

  return createOpenAI({ apiKey, baseURL, compatibility: "compatible" });
}

/**
 * Return the default model identifier respecting env overrides.
 */
export function getDefaultModel(): string {
  return process.env.AI_MODEL || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
}
