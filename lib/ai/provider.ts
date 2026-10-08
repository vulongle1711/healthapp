import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getLang } from "@/lib/i18n/server";

export interface AIImage {
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  base64: string;
}

export interface AIRequest {
  system: string;
  prompt: string;
  image?: AIImage;
  maxTokens?: number;
}

/** Minimal provider contract — swap implementations without touching callers. */
export interface AIProvider {
  readonly name: string;
  complete(req: AIRequest): Promise<string>;
}

class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  private client: Anthropic;
  constructor(apiKey: string, private model: string) {
    this.client = new Anthropic({ apiKey, timeout: 45_000, maxRetries: 1 });
  }

  async complete({ system, prompt, image, maxTokens = 1500 }: AIRequest): Promise<string> {
    const content: Anthropic.ContentBlockParam[] = [];
    if (image) content.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } });
    content.push({ type: "text", text: prompt });
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content }],
    });
    return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  }
}

/** Google Gemini over plain REST (has a free tier). */
class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  constructor(private apiKey: string, private model: string) {}

  async complete({ system, prompt, image, maxTokens = 1500 }: AIRequest): Promise<string> {
    const parts: Record<string, unknown>[] = [];
    if (image) parts.push({ inline_data: { mime_type: image.mediaType, data: image.base64 } });
    parts.push({ text: prompt });
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts }],
        // Thinking models count their reasoning against this limit, so leave headroom beyond the visible answer.
        generationConfig: { maxOutputTokens: maxTokens + 8192 },
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
    return (data.candidates?.[0]?.content?.parts ?? []).map((p) => (p.thought ? "" : p.text ?? "")).join("");
  }
}

/** Asks the model to write user-facing text in the viewer's UI language. */
class LanguageAware implements AIProvider {
  constructor(private inner: AIProvider) {}
  get name() {
    return this.inner.name;
  }
  async complete(req: AIRequest): Promise<string> {
    const lang = await getLang();
    const rule =
      lang === "vi"
        ? "Write every human-readable string (assumptions, clarifications, headlines, summaries, advice) in Vietnamese, unless the prompt says to use another language. Keep JSON keys in English."
        : "Write every human-readable string in English, unless the prompt says to use another language.";
    return this.inner.complete({ ...req, system: `${req.system}\n\n${rule}` });
  }
}

let cached: AIProvider | null | undefined;

/**
 * Anthropic when AI_API_KEY is set, otherwise Gemini when GEMINI_API_KEY is set.
 * Returns null when neither is configured; callers fall back to the offline estimator.
 */
export function getAIProvider(): AIProvider | null {
  if (cached !== undefined) return cached;
  const anthropicKey = process.env.AI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (anthropicKey) cached = new LanguageAware(new AnthropicProvider(anthropicKey, process.env.AI_MODEL || "claude-sonnet-5-5"));
  else if (geminiKey) cached = new LanguageAware(new GeminiProvider(geminiKey, process.env.GEMINI_MODEL || "gemini-3.5-flash"));
  else cached = null;
  return cached;
}

export function aiAvailable(): boolean {
  return getAIProvider() !== null;
}
