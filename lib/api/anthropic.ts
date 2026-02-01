/**
 * OpenRouter API Client for Claude
 *
 * Uses OpenRouter as the API gateway for Claude models.
 * Used for processing raw search data into structured insights.
 */

/**
 * Configuration for Claude API calls
 */
export interface ClaudeRequestConfig {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

/**
 * Default configuration for intelligence synthesis
 */
const DEFAULT_CONFIG: Required<ClaudeRequestConfig> = {
  model: "anthropic/claude-sonnet-4", // OpenRouter model format
  maxTokens: 12288,
  temperature: 0.3, // Lower temperature for more consistent structured output
  systemPrompt: "You are an expert market intelligence analyst. Provide accurate, data-driven insights.",
};

/**
 * OpenRouter API response interface
 */
interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Send a message to Claude via OpenRouter and get a response
 */
export async function sendMessage(
  userMessage: string,
  config: ClaudeRequestConfig = {}
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Use OpenRouter's native chat completions API
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000); // 2 minute timeout per call

  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "AdForge Intelligence",
      },
      body: JSON.stringify({
        model: mergedConfig.model,
        max_tokens: mergedConfig.maxTokens,
        temperature: mergedConfig.temperature,
        messages: [
          {
            role: "system",
            content: mergedConfig.systemPrompt,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`OpenRouter API error (${response.status}):`, errorText.slice(0, 500));
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as OpenRouterResponse;

  // Extract text from the response
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No content in OpenRouter response");
  }

  return content;
}

/**
 * Send a message and parse the response as JSON
 */
export async function sendMessageForJSON<T>(
  userMessage: string,
  config: ClaudeRequestConfig = {}
): Promise<T> {
  const response = await sendMessage(userMessage, {
    ...config,
    systemPrompt: (config.systemPrompt || DEFAULT_CONFIG.systemPrompt) +
      "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown code blocks, no explanations, just the JSON object or array.",
  });

  // Clean up response - remove any markdown code blocks if present
  let jsonStr = response.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }

  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }

  jsonStr = jsonStr.trim();

  try {
    const parsed = JSON.parse(jsonStr);

    // If already an array, return as-is
    if (Array.isArray(parsed)) {
      return parsed as T;
    }

    // If an object, check if it contains an array we should extract
    // This handles cases where Claude wraps the array in an object like {"competitors": [...]} or {"data": [...]}
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const keys = Object.keys(parsed);

      // If there's only one key and it contains an array, extract it
      if (keys.length === 1) {
        const value = parsed[keys[0]];
        if (Array.isArray(value)) {
          console.log(`Extracting array from wrapper object key: ${keys[0]}`);
          return value as T;
        }
      }

      // Check for common wrapper keys
      const commonKeys = ["data", "results", "items", "competitors", "trends", "segments", "personas", "insights", "recommendations"];
      for (const key of commonKeys) {
        if (parsed[key] && Array.isArray(parsed[key])) {
          console.log(`Extracting array from known wrapper key: ${key}`);
          return parsed[key] as T;
        }
      }
    }

    return parsed as T;
  } catch (error) {
    // Attempt to repair truncated JSON (common when maxTokens is hit)
    const repaired = tryRepairTruncatedJSON(jsonStr);
    if (repaired !== null) {
      console.warn("Repaired truncated JSON response");
      return repaired as T;
    }

    console.error("Failed to parse Claude response as JSON:", response.slice(0, 500));
    throw new Error(
      `Failed to parse Claude response as JSON: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Attempt to repair truncated JSON by closing open structures.
 * Handles responses cut off mid-array or mid-object due to token limits.
 */
function tryRepairTruncatedJSON(str: string): unknown | null {
  // Find the last complete item boundary (end of an object/array element)
  // by looking for the last '}' or ']' that could end a complete entry
  let trimmed = str.trim();

  // Try progressively trimming from the end to find a valid truncation point
  // Look for the last complete array element or object
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  let lastValidCut = -1;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\") {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{" || ch === "[") {
      stack.push(ch);
    } else if (ch === "}") {
      if (stack.length > 0 && stack[stack.length - 1] === "{") {
        stack.pop();
        // After closing a top-level or near-top-level brace, this is a good cut point
        if (stack.length <= 1) {
          lastValidCut = i;
        }
      }
    } else if (ch === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === "[") {
        stack.pop();
        if (stack.length <= 1) {
          lastValidCut = i;
        }
      }
    }
  }

  if (lastValidCut === -1) return null;

  // Cut at the last valid position and close any remaining open structures
  trimmed = trimmed.slice(0, lastValidCut + 1);

  // Close any remaining open brackets/braces
  const remaining: string[] = [];
  inString = false;
  escape = false;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "[") remaining.push("[");
    else if (ch === "{") remaining.push("{");
    else if (ch === "]" && remaining.length > 0 && remaining[remaining.length - 1] === "[") remaining.pop();
    else if (ch === "}" && remaining.length > 0 && remaining[remaining.length - 1] === "{") remaining.pop();
  }

  // Close in reverse order
  for (let i = remaining.length - 1; i >= 0; i--) {
    trimmed += remaining[i] === "[" ? "]" : "}";
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/**
 * Batch process multiple messages with rate limiting
 */
export async function batchProcess<T>(
  messages: string[],
  config: ClaudeRequestConfig = {},
  delayMs: number = 500
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < messages.length; i++) {
    const result = await sendMessageForJSON<T>(messages[i], config);
    results.push(result);

    // Add delay between requests (except for the last one)
    if (i < messages.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Get token count estimate for a message (rough approximation)
 * Uses ~4 characters per token as a rough estimate
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if OpenRouter is configured and available
 */
export function isConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}
