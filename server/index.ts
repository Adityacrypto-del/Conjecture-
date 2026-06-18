import "dotenv/config";
import express from "express";
import cors from "cors";
import { runFullResearchPipeline } from "./agents/pipeline";

const app = express();
const PORT = Number(process.env.PORT) || 8787;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    providers: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      groq: Boolean(process.env.GROQ_API_KEY)
    }
  });
});

/**
 * Runs the full research pipeline and streams progress to the client via
 * Server-Sent Events. The API keys live ONLY on the server (process.env);
 * the client may optionally pass its own key (BYOK) but never has to.
 */
app.post("/api/pipeline", async (req, res) => {
  const { provider = "gemini", question, model, apiKey: clientKey } = req.body ?? {};

  if (!question || typeof question !== "string" || !question.trim()) {
    res.status(400).json({ error: "A non-empty 'question' is required." });
    return;
  }
  if (provider !== "gemini" && provider !== "groq") {
    res.status(400).json({ error: "'provider' must be 'gemini' or 'groq'." });
    return;
  }

  // Resolve the key: server env first, client-supplied key as fallback (BYOK).
  const envKey = provider === "groq" ? process.env.GROQ_API_KEY : process.env.GEMINI_API_KEY;
  const apiKey = envKey || clientKey;
  if (!apiKey) {
    res.status(400).json({
      error: `No API key available for '${provider}'. Set ${
        provider === "groq" ? "GROQ_API_KEY" : "GEMINI_API_KEY"
      } on the server, or supply one from the client.`
    });
    return;
  }

  const resolvedModel = model || (provider === "groq" ? "llama-3.3-70b-versatile" : "gemini-2.5-flash");

  // Open the SSE stream.
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });

  const send = (payload: unknown) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  let aborted = false;
  req.on("close", () => {
    aborted = true;
  });

  try {
    const finalState = await runFullResearchPipeline(
      provider,
      question,
      apiKey,
      resolvedModel,
      (step, message, state) => {
        if (aborted) return;
        send({ type: "progress", step, message, state });
      }
    );
    if (!aborted) {
      send({ type: "done", state: finalState });
    }
  } catch (err: any) {
    if (!aborted) {
      send({ type: "error", message: err?.message || "Pipeline failed." });
    }
  } finally {
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`[server] Research API listening on http://localhost:${PORT}`);
  console.log(
    `[server] Keys loaded — gemini: ${Boolean(process.env.GEMINI_API_KEY)}, groq: ${Boolean(
      process.env.GROQ_API_KEY
    )}`
  );
});
