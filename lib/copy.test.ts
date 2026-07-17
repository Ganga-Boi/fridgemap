import { describe, expect, it } from "vitest";
import { scanErrorMessage } from "./copy";

describe("scanErrorMessage", () => {
  it("forklarer tydeligt naar billedet ikke ligner mad", () => {
    expect(scanErrorMessage("NON_FOOD_IMAGE")).toBe(
      "Det her ligner ikke mad eller dagligvarer. Tag et billede af indholdet i køleskabet i stedet."
    );
  });
});
