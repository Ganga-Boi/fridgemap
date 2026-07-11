import { describe, expect, it } from "vitest";
import { buildIngredientRegistry, buildIngredientVocabulary } from "./ingredientRegistry";

describe("buildIngredientRegistry", () => {
  it("kender ketchup som ekstra pantry-vare", () => {
    const registry = buildIngredientRegistry();

    expect(registry.findIngredientId("ketchup")).toBe("ketchup");
    expect(registry.findIngredientId("tomatketchup")).toBe("ketchup");
    expect(registry.displayIngredient("ketchup")).toBe("ketchup");
  });

  it("tager ekstra pantry-varer med i scan-vokabularet", () => {
    expect(buildIngredientVocabulary()).toContain("ketchup");
  });
});
