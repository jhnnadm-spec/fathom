/**
 * The AI "slot". Fathom talks to any AI through this one small interface,
 * so switching provider (or upgrading to a paid model) means adding one file,
 * not changing the app.
 */
export type AiProvider = {
  name: string; // shown in saved explanations, e.g. "cloudflare:@cf/openai/gpt-oss-120b"
  complete(system: string, user: string): Promise<string>;
};

/** Cloudflare Workers AI. Needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN. */
export function cloudflareProvider(model = process.env.CLOUDFLARE_MODEL || "@cf/openai/gpt-oss-120b"): AiProvider {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token) throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set");

  return {
    name: `cloudflare:${model}`,
    async complete(system, user) {
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          max_tokens: 6000,
          temperature: 0.2,
        }),
      });
      const body = await res.text();
      if (!res.ok) throw new Error(`Cloudflare AI returned ${res.status}: ${body.slice(0, 400)}`);
      return readReply(JSON.parse(body));
    },
  };
}

/** Different Cloudflare models put the answer in different places; find the text wherever it is. */
export function readReply(payload: unknown): string {
  const result = (payload as { result?: unknown }).result ?? payload;
  const r = result as Record<string, unknown>;
  if (typeof r.response === "string") return r.response;
  if (r.response && typeof r.response === "object") return JSON.stringify(r.response);
  const choice = (r.choices as { message?: { content?: unknown } }[] | undefined)?.[0];
  if (typeof choice?.message?.content === "string") return choice.message.content;
  // Responses-style output: [{ type: "message", content: [{ type: "output_text", text }] }]
  const output = r.output as { type?: string; content?: { text?: string }[] }[] | undefined;
  const texts = output?.flatMap((o) => (o.type === "message" ? (o.content ?? []).map((c) => c.text ?? "") : [])) ?? [];
  if (texts.join("").trim()) return texts.join("");
  throw new Error(`Couldn't find the AI's answer in: ${JSON.stringify(payload).slice(0, 300)}`);
}
