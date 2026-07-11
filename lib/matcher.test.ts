/**
 * MATCHER-TESTS — fundamentets regler som eksekverbare krav.
 * Hver test refererer den regel, den beskytter.
 */

import { describe, it, expect } from "vitest";
import { filterCandidates, rankFallback, buildAnswer, effectiveConfidence } from "./matcher";
import { SEED_RECIPES } from "./recipes/recipes";
import type { Pantry, PantryItem, Household } from "../types/contracts";

const NOW = "2026-07-10T16:30:00.000Z";

 function item(ingredientId: string | null, overrides: Partial<PantryItem> = {}): PantryItem {
  return {
    rawLabel: overrides.rawLabel ?? ingredientId ?? "ukendt vare",
    ingredientId,
    quantity: "noget",
    confidence: 0.9,
    source: "scan",
    seenAt: NOW,
    ...overrides,
  };
}

function pantryWith(ids: string[]): Pantry {
  return { items: ids.map((id) => item(id)), lastScanAt: NOW, deductions: [] };
}

const FULL_HOUSEHOLD: Pick<Household, "allergies" | "dislikedIngredients" | "likedRecipeIds"> = {
  allergies: [],
  dislikedIngredients: [],
  likedRecipeIds: [],
};

describe("filterCandidates — hårde constraints (fundament: løftet må aldrig brydes)", () => {
  it("fjerner ALLE retter med en allergen fra husstanden", () => {
    const out = filterCandidates(SEED_RECIPES, { allergies: ["gluten"], dislikedIngredients: [] });
    expect(out.every((r) => !r.allergens.includes("gluten"))).toBe(true);
    // Sanity: gluten-retter findes i seed, så filteret skal have fjernet noget
    expect(out.length).toBeLessThan(SEED_RECIPES.length);
  });

  it("fjerner retter hvor en BÆRENDE ingrediens er disliket", () => {
    const out = filterCandidates(SEED_RECIPES, { allergies: [], dislikedIngredients: ["kyllingebryst"] });
    expect(out.some((r) => r.id === "kylling-i-karry")).toBe(false);
    expect(out.some((r) => r.id === "one-pot-pasta-kylling")).toBe(false);
  });

  it("beholder retter hvor kun en FLEKSIBEL ingrediens er disliket", () => {
    const out = filterCandidates(SEED_RECIPES, { allergies: [], dislikedIngredients: ["parmesan"] });
    expect(out.some((r) => r.id === "spaghetti-koedsovs-klassisk")).toBe(true);
  });

  it("foreslår ALDRIG ikke-godkendte retter (approved=false)", () => {
    const draft = { ...SEED_RECIPES[0], id: "draft", approved: false };
    const out = filterCandidates([...SEED_RECIPES, draft], FULL_HOUSEHOLD);
    expect(out.some((r) => r.id === "draft")).toBe(false);
  });
});

describe("rankFallback — fundament: max ÉN manglende bærende ingrediens", () => {
  it("udelukker retter med 2+ manglende bærende ingredienser", () => {
    // Kun kylling i lageret → kylling-i-karry mangler kokosmælk, ris OG karry (3 bærende)
    const pantry = pantryWith(["kyllingebryst"]);
    const ranked = rankFallback(SEED_RECIPES, pantry, FULL_HOUSEHOLD, [], NOW);
    expect(ranked.some((r) => r.recipe.id === "kylling-i-karry")).toBe(false);
  });

  it("tillader retter med præcis 1 manglende bærende (\"mangler kun X\")", () => {
    // Alt til karry undtagen kokosmælk
    const pantry = pantryWith(["kyllingebryst", "ris", "karrypasta"]);
    const ranked = rankFallback(SEED_RECIPES, pantry, FULL_HOUSEHOLD, [], NOW);
    const karry = ranked.find((r) => r.recipe.id === "kylling-i-karry");
    expect(karry).toBeDefined();
    expect(karry!.missingCore.map((i) => i.ingredientId)).toEqual(["kokosmaelk"]);
  });

  it("rangerer 'har det hele' over 'mangler én ting'", () => {
    const pantry = pantryWith([
      "kyllingebryst", "pasta_skruer", "floede",          // one-pot: alt bærende
      "ris", "karrypasta",                                  // karry: mangler kokosmælk
    ]);
    const ranked = rankFallback(SEED_RECIPES, pantry, FULL_HOUSEHOLD, [], NOW);
    const onePot = ranked.findIndex((r) => r.recipe.id === "one-pot-pasta-kylling");
    const karry = ranked.findIndex((r) => r.recipe.id === "kylling-i-karry");
    expect(onePot).toBeGreaterThanOrEqual(0);
    expect(karry).toBeGreaterThanOrEqual(0);
    expect(onePot).toBeLessThan(karry);
  });

  it("straffer en ret lavet inden for 6 dage (variation)", () => {
    const pantry = pantryWith(["kyllingebryst", "pasta_skruer", "floede", "hakket_oksekoed", "spaghetti", "tomat_haakket_daase"]);
    const noRepeat = rankFallback(SEED_RECIPES, pantry, FULL_HOUSEHOLD, [], NOW);
    const withRepeat = rankFallback(
      SEED_RECIPES, pantry, FULL_HOUSEHOLD,
      [{ recipeId: "one-pot-pasta-kylling", madeAt: "2026-07-08T18:00:00.000Z" }],
      NOW
    );
    const before = noRepeat.find((r) => r.recipe.id === "one-pot-pasta-kylling")!.score;
    const after = withRepeat.find((r) => r.recipe.id === "one-pot-pasta-kylling")!.score;
    expect(after).toBeLessThan(before);
  });

  it("bruger den nyeste historik for samme ret, ikke det første match i arrayet", () => {
    const pantry = pantryWith(["kyllingebryst", "pasta_skruer", "floede"]);
    const baseline = rankFallback(SEED_RECIPES, pantry, FULL_HOUSEHOLD, [], NOW);
    const mixedHistory = rankFallback(
      SEED_RECIPES,
      pantry,
      FULL_HOUSEHOLD,
      [
        { recipeId: "one-pot-pasta-kylling", madeAt: "2026-06-01T18:00:00.000Z" },
        { recipeId: "kylling-i-karry", madeAt: "2026-07-09T18:00:00.000Z" },
        { recipeId: "one-pot-pasta-kylling", madeAt: "2026-07-08T18:00:00.000Z" },
      ],
      NOW
    );

    const before = baseline.find((r) => r.recipe.id === "one-pot-pasta-kylling")!.score;
    const after = mixedHistory.find((r) => r.recipe.id === "one-pot-pasta-kylling")!.score;
    expect(after).toBeLessThan(before);
  });
});

describe("buildAnswer — copyKeys (konfidens oversættes, vises aldrig)", () => {
  it("har_det_hele når alle ingredienser er til stede med god konfidens", () => {
    const pantry = pantryWith(["kyllingebryst", "pasta_skruer", "floede", "loeg", "hvidloeg", "revet_ost"]);
    const a = buildAnswer(SEED_RECIPES[0], pantry, NOW);
    expect(a.copyKey).toBe("har_det_hele");
    expect(a.missing).toHaveLength(0);
  });

  it("mangler_en_ting når 1 bærende mangler", () => {
    const pantry = pantryWith(["kyllingebryst", "ris", "karrypasta", "loeg", "gulerod", "floede"]);
    const karry = SEED_RECIPES.find((r) => r.id === "kylling-i-karry")!;
    const a = buildAnswer(karry, pantry, NOW);
    expect(a.copyKey).toBe("mangler_en_ting");
    expect(a.missing[0].ingredientId).toBe("kokosmaelk");
  });

  it("springer_over når kun fleksible mangler", () => {
    const pantry = pantryWith(["kyllingebryst", "pasta_skruer", "floede"]); // ingen løg/hvidløg/ost
    const a = buildAnswer(SEED_RECIPES[0], pantry, NOW);
    expect(a.copyKey).toBe("springer_over");
  });

  it("tjek_lige når en bærende ingrediens har lav (men ikke nul) konfidens", () => {
    const pantry: Pantry = {
      items: [
        item("kyllingebryst"),
        item("pasta_skruer"),
        item("floede", { confidence: 0.4 }), // usikker fløde
        item("loeg"), item("hvidloeg"), item("revet_ost"),
      ],
      lastScanAt: NOW,
      deductions: [],
    };
    const a = buildAnswer(SEED_RECIPES[0], pantry, NOW);
    expect(a.copyKey).toBe("tjek_lige");
  });

  it("ignorerer ukendte pantry-fund i matching uden at knække svaret", () => {
    const pantry: Pantry = {
      items: [
        item("kyllingebryst"),
        item("pasta_skruer"),
        item("floede"),
        item(null, { rawLabel: "Heinz ketchup" }),
      ],
      lastScanAt: NOW,
      deductions: [],
    };

    const a = buildAnswer(SEED_RECIPES[0], pantry, NOW);
    expect(a.copyKey).toBe("springer_over");
  });
});

describe("effectiveConfidence — lagertillid falder med alderen", () => {
  it("falder ~0.08 pr. dag siden varen sidst blev set", () => {
    const fresh = item("floede", { confidence: 0.9, seenAt: NOW });
    const old = item("floede", { confidence: 0.9, seenAt: "2026-07-05T16:30:00.000Z" }); // 5 dage
    expect(effectiveConfidence(fresh, NOW)).toBeCloseTo(0.9, 2);
    expect(effectiveConfidence(old, NOW)).toBeCloseTo(0.9 - 5 * 0.08, 2);
  });
});
