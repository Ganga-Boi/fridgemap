import { describe, expect, it } from "vitest";
import { validateCatalog } from "./recipeEngine";
import { SEED_RECIPES } from "./recipes";

describe("validateCatalog", () => {
  it("holder seed-kataloget gyldigt", () => {
    expect(validateCatalog(SEED_RECIPES)).toEqual([]);
  });
});
