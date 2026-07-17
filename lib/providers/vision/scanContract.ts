import type { ScanAnalysisResponse } from "../../../types/contracts";
import { buildIngredientRegistry, normalizeIngredientLookup } from "../../ingredientRegistry";

const INGREDIENT_REGISTRY = buildIngredientRegistry();

export function parseAndValidateVisionResponse(
  text: string,
  vocabulary: string[]
): ScanAnalysisResponse {
  const vocab = new Set(vocabulary);
  const clean = text.replace(/```json|```/g, "").trim();

  let parsed: any;
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new Error("VISION_JSON_PARSE_ERROR");
  }

  const sceneType = parsed?.sceneType === "non_food" ? "non_food" : "food";
  const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
  const items: ScanAnalysisResponse["items"] = [];
  const seen = new Set<string>();

  if (sceneType === "non_food") {
    return { sceneType, items: [] };
  }

  for (const it of rawItems) {
    const providerRawLabel = typeof it?.rawLabel === "string" ? it.rawLabel.trim() : "";
    const providerIngredientId = typeof it?.ingredientId === "string" ? it.ingredientId.trim() : "";
    const ingredientId = vocab.has(providerIngredientId)
      ? providerIngredientId
      : providerRawLabel
        ? INGREDIENT_REGISTRY.findIngredientId(providerRawLabel)
        : null;

    const rawLabel =
      providerRawLabel || (ingredientId ? INGREDIENT_REGISTRY.displayIngredient(ingredientId) : "");
    if (!rawLabel) continue;

    const dedupeKey = ingredientId
      ? `id:${ingredientId}`
      : `raw:${normalizeIngredientLookup(rawLabel)}`;
    if (!dedupeKey || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const q = it?.quantity;
    const quantity = q === "rigeligt" || q === "noget" || q === "lidt" ? q : "noget";

    const c = Number(it?.confidence);
    const confidence = Number.isFinite(c) ? Math.min(1, Math.max(0, c)) : 0.5;

    items.push({ rawLabel, ingredientId, quantity, confidence });
  }

  return { sceneType, items };
}
