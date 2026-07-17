/**
 * VISION PROVIDERS - Allans regel 3 i praksis.
 * Resten af appen importerer KUN getVisionProvider().
 */

import type {
  ScanAnalysisRequest,
  ScanAnalysisResponse,
  VisionProvider,
} from "../../../types/contracts";
import { parseAndValidateVisionResponse } from "./scanContract";
import { getOpenAIKey, getOpenAIVisionModel } from "./openaiConfig";

const MAX_IMAGES = 4;

export class OpenAIVisionProvider implements VisionProvider {
  async analyze(req: ScanAnalysisRequest): Promise<ScanAnalysisResponse> {
    const apiKey = getOpenAIKey();
    if (!apiKey) throw new Error("OPENAI_API_KEY mangler");

    const system = [
      "Du analyserer billeder af et koeleskab og identificerer madvarer.",
      "Vurder foerst om billederne faktisk viser mad, drikkevarer, dagligvarer eller indhold fra et koeleskab eller skab.",
      "Hvis billederne primaert viser noget andet end mad eller dagligvarer, fx en bog, et menneske eller et rum, skal sceneType vaere non_food og items skal vaere en tom liste.",
      "Detekter frit det du faktisk ser: emballage, maerkevarer, rester, glas, flasker og halve varer.",
      "Hvis du kan mappe et fund sikkert til et ingrediens-id fra denne liste, saa brug det.",
      "Hvis du IKKE kan mappe sikkert, skal ingredientId vaere null. Gaet ALDRIG en nabo-ingrediens.",
      "Brug rawLabel til det du faktisk ser paa billedet, ogsaa naar ingredientId er null.",
      "Mulige ingrediens-id'er:",
      req.vocabulary.join(", "),
      "",
      "Returner KUN gyldig JSON efter dette skema, ingen forklaring, ingen markdown:",
      '{ "sceneType": "food" | "non_food",',
      '  "items": [ { "rawLabel": "<det du ser>",',
      '               "ingredientId": "<id fra listen>" | null,',
      '               "quantity": "rigeligt" | "noget" | "lidt",',
      '               "confidence": <tal 0-1> } ] }',
    ].join("\n");

    const payload = {
      model: getOpenAIVisionModel(),
      input: [
        { role: "system", content: [{ type: "input_text", text: system }] },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Identificer madvarerne paa billederne. Hvis det ikke er mad, returner sceneType non_food og en tom liste. Kun JSON.",
            },
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

function extractOutputText(data: any): string {
  if (typeof data.output_text === "string" && data.output_text) return data.output_text.trim();
  let text = "";
  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item?.type === "message" && Array.isArray(item.content)) {
        for (const content of item.content) {
          if (
            (content?.type === "output_text" || content?.type === "text") &&
            typeof content.text === "string"
          ) {
            text += content.text;
          }
        }
      }
    }
  }
  return text.trim();
}
