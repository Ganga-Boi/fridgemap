/**
 * VISION PROVIDERS — Allans regel 3 i praksis.
 * ============================================
 * Resten af appen importerer KUN getVisionProvider().
 * Leverandørskift (OpenAI → Claude → Gemini → lokal) = ændr VISION_PROVIDER
 * i miljøvariablerne. Nul ændringer i frontend eller forretningslogik.
 *
 * Arvet fra FridgeMap (api/analyze/index.js):
 *  - OpenAI responses-API-mønsteret inkl. robust output_text-udtræk
 *  - Loft på antal billeder pr. kald
 *  - "Returnér KUN JSON"-systemprompten (nu skærpet med vokabular-tvang)
 */

import type {
  ScanAnalysisRequest,
  ScanAnalysisResponse,
  VisionProvider,
} from "../../../types/contracts";

/* ---------------- OpenAI-implementering ----------------------------- */

const MAX_IMAGES = 4;

export class OpenAIVisionProvider implements VisionProvider {
  async analyze(req: ScanAnalysisRequest): Promise<ScanAnalysisResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY mangler");

    const system = [
      "Du analyserer billeder af et køleskab og identificerer madvarer.",
      "Du må KUN bruge ingrediens-id'er fra denne liste (alt andet kasseres):",
      req.vocabulary.join(", "),
      "",
      "Returnér KUN gyldig JSON efter dette skema, ingen forklaring, ingen markdown:",
      '{ "items": [ { "ingredientId": "<id fra listen>",',
      '               "quantity": "rigeligt" | "noget" | "lidt",',
      '               "confidence": <tal 0-1> } ] }',
    ].join("\n");

    const payload = {
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-5.6",
      input: [
        { role: "system", content: [{ type: "input_text", text: system }] },
        {
          role: "user",
          content: [
            { type: "input_text", text: "Identificér madvarerne på billederne. Kun JSON." },
            ...req.frames.slice(0, MAX_IMAGES).map((dataUrl) => ({
              type: "input_image",
              image_url: dataUrl,
            })),
          ],
        },
      ],
      max_output_tokens: 800,
    };

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      throw new Error(`VISION_PROVIDER_ERROR (${resp.status}): ${t.slice(0, 300)}`);
    }

    const data = await resp.json();
    const text = extractOutputText(data);
    return parseAndValidate(text, req.vocabulary);
  }
}

/* ---------------- Arvet: robust tekst-udtræk fra responses-API ------ */

function extractOutputText(data: any): string {
  if (typeof data.output_text === "string" && data.output_text) return data.output_text.trim();
  let text = "";
  if (Array.isArray(data.output)) {
    for (const itm of data.output) {
      if (itm?.type === "message" && Array.isArray(itm.content)) {
        for (const c of itm.content) {
          if ((c?.type === "output_text" || c?.type === "text") && typeof c.text === "string") {
            text += c.text;
          }
        }
      }
    }
  }
  return text.trim();
}

/* ---------------- Kontrakt-validering ------------------------------- */
/* Modeloutput er upålideligt input. Alt valideres, alt ukendt kasseres. */

function parseAndValidate(text: string, vocabulary: string[]): ScanAnalysisResponse {
  const vocab = new Set(vocabulary);
  const clean = text.replace(/```json|```/g, "").trim();

  let parsed: any;
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new Error("VISION_JSON_PARSE_ERROR");
  }

  const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
  const items: ScanAnalysisResponse["items"] = [];
  const seen = new Set<string>();

  for (const it of rawItems) {
    const id = typeof it?.ingredientId === "string" ? it.ingredientId : "";
    if (!vocab.has(id) || seen.has(id)) continue; // vokabular-tvang + dedup
    seen.add(id);

    const q = it?.quantity;
    const quantity = q === "rigeligt" || q === "noget" || q === "lidt" ? q : "noget";

    const c = Number(it?.confidence);
    const confidence = Number.isFinite(c) ? Math.min(1, Math.max(0, c)) : 0.5;

    items.push({ ingredientId: id, quantity, confidence });
  }

  return { items };
}
