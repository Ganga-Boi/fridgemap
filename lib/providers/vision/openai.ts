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
import { parseAndValidateVisionResponse } from "./scanContract";
import { getOpenAIKey } from "./openaiConfig";

/* ---------------- OpenAI-implementering ----------------------------- */

const MAX_IMAGES = 4;

export class OpenAIVisionProvider implements VisionProvider {
  async analyze(req: ScanAnalysisRequest): Promise<ScanAnalysisResponse> {
    const apiKey = getOpenAIKey();
    if (!apiKey) throw new Error("OPENAI_API_KEY mangler");

    const system = [
      "Du analyserer billeder af et køleskab og identificerer madvarer.",
      "Detekter frit det du faktisk ser: emballage, mærkevarer, rester, glas, flasker og halve varer.",
      "Hvis du kan mappe et fund sikkert til et ingrediens-id fra denne liste, så brug det.",
      "Hvis du IKKE kan mappe sikkert, skal ingredientId være null. Gæt ALDRIG en nabo-ingrediens.",
      "Brug rawLabel til det du faktisk ser på billedet, også når ingredientId er null.",
      "Mulige ingrediens-id'er:",
      req.vocabulary.join(", "),
      "",
      "Returnér KUN gyldig JSON efter dette skema, ingen forklaring, ingen markdown:",
      '{ "items": [ { "rawLabel": "<det du ser>",',
      '               "ingredientId": "<id fra listen>" | null,',
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
    return parseAndValidateVisionResponse(text, req.vocabulary);
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

