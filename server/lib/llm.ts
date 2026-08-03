export type Provider = "gemini" | "groq";

// Abort an LLM request that truly hangs, so a single stuck call can't stall
// the whole pipeline indefinitely. This is a safety net, not a tight bound:
// legitimate calls here run 25-60s+ (large multi-agent prompts + a thorough
// model), so the cap is generous.
const REQUEST_TIMEOUT_MS = 150_000;

// A run makes 6+ sequential calls; on free tiers a transient 429/503 on any
// one of them is common and would otherwise kill the whole pipeline. Retry
// those (and timeouts) a few times with exponential backoff.
const MAX_ATTEMPTS = 4;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

class LLMError extends Error {
  retryable: boolean;
  retryAfterMs?: number; // provider-requested wait (e.g. Gemini "retry in 32s")
  constructor(message: string, retryable = false, retryAfterMs?: number) {
    super(message);
    this.name = "LLMError";
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }
}

// Providers often tell us exactly how long to wait on a 429. Honor that (the
// message carries "retry in 32.5s"; structured details carry "retryDelay": "32s").
function parseRetryAfterMs(message: string, details: any): number | undefined {
  const fromMsg = message.match(/retry in ([\d.]+)s/i);
  if (fromMsg) return Math.ceil(parseFloat(fromMsg[1]) * 1000);
  if (Array.isArray(details)) {
    for (const d of details) {
      const rd = d?.retryDelay;
      if (typeof rd === "string") {
        const m = rd.match(/([\d.]+)s/);
        if (m) return Math.ceil(parseFloat(m[1]) * 1000);
      }
    }
  }
  return undefined;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      // A hung request is worth one more shot.
      throw new LLMError(`LLM request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`, true);
    }
    // Network-level failures (DNS, reset) are usually transient.
    throw new LLMError(err?.message || "Network error contacting the LLM provider", true);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse model output into JSON, tolerating the ways models wrap it:
 * ```json fences, leading/trailing prose, or a stray token before the object.
 * Falls back to extracting the outermost {...} / [...] span.
 */
function looseJsonParse(raw: string): any {
  let t = raw.trim();
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) t = fence[1].trim();
  try {
    return JSON.parse(t);
  } catch {
    // Extract the outermost JSON object/array span.
    const firstObj = t.indexOf("{");
    const firstArr = t.indexOf("[");
    const candidates = [firstObj, firstArr].filter((i) => i !== -1);
    const start = candidates.length ? Math.min(...candidates) : -1;
    const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
    if (start !== -1 && end > start) {
      return JSON.parse(t.slice(start, end + 1));
    }
    throw new Error("No JSON found in model output");
  }
}

/** One attempt against the provider. Throws LLMError (with a retryable flag). */
async function queryLLMOnce(
  provider: Provider,
  apiKey: string,
  model: string,
  prompt: string
): Promise<any> {
  if (provider === "groq") {
    const url = "https://api.groq.com/openai/v1/chat/completions";
    const payload = {
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    };
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const err: any = await response.json().catch(() => ({}));
      throw new LLMError(
        err?.error?.message || `Groq API returned status ${response.status}`,
        RETRYABLE_STATUS.has(response.status)
      );
    }
    const result: any = await response.json();
    const text = result?.choices?.[0]?.message?.content;
    if (!text) throw new LLMError("Empty response from Groq API", true);

    try {
      return looseJsonParse(text);
    } catch {
      console.error("Failed to parse Groq response as JSON. Output was:", text.slice(0, 500));
      throw new LLMError("Groq response was not valid JSON", true);
    }
  }

  // Gemini
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  };
  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorData: any = await response.json().catch(() => ({}));
    const msg = errorData?.error?.message || `Gemini API returned status ${response.status}`;
    throw new LLMError(
      msg,
      RETRYABLE_STATUS.has(response.status),
      parseRetryAfterMs(msg, errorData?.error?.details)
    );
  }
  const result: any = await response.json();
  // Gemini 3.x "thinking" models can split output across multiple parts
  // (e.g. a thought part + the answer part), so concatenate every text part.
  const parts = result?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts.map((p: any) => p?.text).filter((s: any) => typeof s === "string").join("")
    : result?.candidates?.[0]?.content?.parts?.[0]?.text;
  const finishReason = result?.candidates?.[0]?.finishReason;
  if (!text) {
    if (finishReason && finishReason !== "STOP") {
      throw new LLMError(`Gemini returned no text (finishReason: ${finishReason})`, true);
    }
    throw new LLMError("Empty response from Gemini API", true);
  }

  try {
    return looseJsonParse(text);
  } catch {
    const hint = finishReason === "MAX_TOKENS" ? " (response was truncated at the token limit)" : "";
    console.error("Failed to parse Gemini response as JSON. Output was:", text.slice(0, 500));
    // A malformed/truncated body is worth retrying — a re-roll often parses.
    throw new LLMError(`Gemini response was not valid JSON${hint}`, true);
  }
}

/**
 * Unified JSON-mode query helper for Gemini and Groq. Returns the parsed JSON
 * object/array produced by the model, retrying transient failures with
 * exponential backoff.
 */
export async function queryLLM(
  provider: Provider,
  apiKey: string,
  model: string,
  prompt: string
): Promise<any> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await queryLLMOnce(provider, apiKey, model, prompt);
    } catch (err) {
      lastErr = err;
      const retryable = err instanceof LLMError && err.retryable;
      if (!retryable || attempt === MAX_ATTEMPTS) throw err;
      // Wait at least the provider-requested delay (capped so we never stall a
      // run too long), otherwise fall back to exponential backoff: 2s, 4s, 8s.
      const expBackoff = Math.min(2000 * 2 ** (attempt - 1), 12000) + Math.floor(Math.random() * 500);
      const requested = err instanceof LLMError ? err.retryAfterMs ?? 0 : 0;
      const backoff = Math.min(Math.max(expBackoff, requested), 40000);
      console.warn(
        `[llm] ${provider} attempt ${attempt}/${MAX_ATTEMPTS} failed (${(err as Error).message}); retrying in ${backoff}ms`
      );
      await sleep(backoff);
    }
  }
  throw lastErr;
}
