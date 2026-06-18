import type { GlobalState } from "./types";

export type ProgressHandler = (
  step: string,
  message: string,
  state?: Partial<GlobalState>
) => void;

interface RunPipelineOptions {
  provider: "gemini" | "groq";
  question: string;
  model: string;
  /** Optional bring-your-own key. Normally the server uses its own env key. */
  apiKey?: string;
  signal?: AbortSignal;
}

/**
 * Runs the research pipeline on the backend and streams Server-Sent Events.
 * The API key stays on the server by default; nothing sensitive is required
 * from the browser.
 */
export async function runPipelineViaBackend(
  { provider, question, model, apiKey, signal }: RunPipelineOptions,
  onProgress: ProgressHandler
): Promise<GlobalState> {
  const response = await fetch("/api/pipeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, question, model, apiKey: apiKey || undefined }),
    signal
  });

  if (!response.ok || !response.body) {
    let message = `Server returned ${response.status}`;
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalState: GlobalState | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by a blank line.
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const line = event.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;

      const payload = JSON.parse(line.slice(5).trim());

      if (payload.type === "progress") {
        onProgress(payload.step, payload.message, payload.state);
      } else if (payload.type === "done") {
        finalState = payload.state as GlobalState;
        onProgress("completed", "Pipeline completed successfully!", finalState);
      } else if (payload.type === "error") {
        throw new Error(payload.message || "Pipeline failed.");
      }
    }
  }

  if (!finalState) {
    throw new Error("Stream ended before a final proposal was produced.");
  }
  return finalState;
}
