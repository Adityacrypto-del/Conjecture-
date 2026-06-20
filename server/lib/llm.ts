export type Provider = "gemini" | "groq";

/**
 * Unified JSON-mode query helper for Gemini and Groq. Returns the parsed JSON
 * object/array produced by the model.
 */
export async function queryLLM(
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
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const err: any = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Groq API returned status ${response.status}`);
    }
    const result: any = await response.json();
    const text = result?.choices?.[0]?.message?.content;
    if (!text) throw new Error("Empty response from Groq API");

    try {
      return JSON.parse(text);
    } catch {
      console.error("Failed to parse Groq response as JSON. Output was:", text);
      throw new Error("Groq response was not valid JSON");
    }
  }

  // Gemini
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorData: any = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Gemini API returned status ${response.status}`);
  }
  const result: any = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini API");

  try {
    return JSON.parse(text);
  } catch {
    console.error("Failed to parse Gemini response as JSON. Output was:", text);
    throw new Error("Gemini response was not valid JSON");
  }
}
