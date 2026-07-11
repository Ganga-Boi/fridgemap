import { describe, expect, it } from "vitest";
import { buildIngredientVocabulary } from "../../ingredientRegistry";
import { parseAndValidate } from "./openai";

const VOCABULARY = buildIngredientVocabulary();

describe("parseAndValidate", () => {
  it("bevarer ukendte fund som rawLabel med null ingredientId", () => {
    const result = parseAndValidate(
      JSON.stringify({
        items: [
          {
            rawLabel: "glas med rester",
            ingredientId: null,
            quantity: "noget",
            confidence: 0.62,
          },
        ],
      }),
      VOCABULARY
    );

    expect(result.items).toEqual([
      {
        rawLabel: "glas med rester",
        ingredientId: null,
        quantity: "noget",
        confidence: 0.62,
      },
    ]);
  });

  it("bruger lokal registry-mapping naar rawLabel matcher et alias", () => {
    const result = parseAndValidate(
      JSON.stringify({
        items: [
          {
            rawLabel: "Heinz ketchup",
            ingredientId: null,
            quantity: "noget",
            confidence: 0.91,
          },
        ],
      }),
      VOCABULARY
    );

    expect(result.items).toEqual([
      {
        rawLabel: "Heinz ketchup",
        ingredientId: "ketchup",
        quantity: "noget",
        confidence: 0.91,
      },
    ]);
  });
});
