import { describe, expect, it } from "vitest";
import { buildIngredientRegistry, buildIngredientVocabulary } from "./ingredientRegistry";
import { SEED_RECIPES } from "./recipes/recipes";

describe("buildIngredientRegistry", () => {
  it("kender ketchup som ekstra pantry-vare", () => {
    const registry = buildIngredientRegistry(SEED_RECIPES);

    expect(registry.findIngredientId("ketchup")).toBe("ketchup");
    expect(registry.findIngredientId("tomatketchup")).toBe("ketchup");
    expect(registry.displayIngredient("ketchup")).toBe("ketchup");
  });

  it("tager ekstra pantry-varer med i scan-vokabularet", () => {
    expect(buildIngredientVocabulary(SEED_RECIPES)).toContain("ketchup");
  });
});
