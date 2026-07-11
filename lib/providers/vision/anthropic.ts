import type {
  ScanAnalysisRequest,
  ScanAnalysisResponse,
  VisionProvider,
} from "../../../types/contracts";
import {
  getAnthropicKey,
  getAnthropicVisionModel,
} from "./anthropicConfig";
import { parseAndValidateVisionResponse } from "./scanContract";

const MAX_IMAGES = 4;
const ANTHROPIC_VERSION = "2023-06-01";

type AnthropicImageBlock = {
  type: "image";
  source: {
    type: "base64";
    media_type: string;
    data: string;
  };
};

export class AnthropicVisionProvider implements VisionProvider {
  async analyze(req: ScanAnalysisRequest): Promise<ScanAnalysisResponse> {
    const apiKey = getAnthropicKey();
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY mangler");

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
      model: getAnthropicVisionModel(),
      max_tokens: 900,
      system,
      messages: [
        {
          role: "user",
          content: [
            ...req.frames.slice(0, MAX_IMAGES).map(toAnthropicImageBlock),
            {
              type: "text",
              text: "Identificér madvarerne på billederne. Returnér kun JSON.",
            },
          ],
        },
      ],
    };

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
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

function toAnthropicImageBlock(dataUrl: string): AnthropicImageBlock {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) {
    throw new Error("VISION_UNSUPPORTED_IMAGE_FORMAT");
  }

  return {
    type: "image",
    source: {
      type: "base64",
      media_type: match[1],
      data: match[2],
    },
  };
}

function extractOutputText(data: any): string {
  if (!Array.isArray(data?.content)) return "";

  return data.content
    .filter((block: any) => block?.type === "text" && typeof block?.text === "string")
    .map((block: any) => block.text)
    .join("")
    .trim();
}
