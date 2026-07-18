import { describe, expect, it } from "vitest";
import {
  createOnboardingProfile,
  parseOnboardingProfile,
  profileToHousehold,
} from "./onboarding";

describe("onboarding profile", () => {
  it("normaliserer valg og antal personer", () => {
    const profile = createOnboardingProfile(
      ["reduce_waste", "reduce_waste", "save_money"],
      9,
      ["gluten", "gluten"],
      new Date("2026-07-18T20:00:00.000Z")
    );

    expect(profile.goals).toEqual(["reduce_waste", "save_money"]);
    expect(profile.people).toBe(5);
    expect(profile.allergies).toEqual(["gluten"]);
    expect(profile.completedAt).toBe("2026-07-18T20:00:00.000Z");
  });

  it("afviser ugyldige gemte profiler", () => {
    expect(parseOnboardingProfile("not-json")).toBeNull();
    expect(parseOnboardingProfile(JSON.stringify({ version: 1, goals: [] }))).toBeNull();
  });

  it("fører allergier videre til matcherens husholdning", () => {
    const profile = createOnboardingProfile(["quick_meals"], 2, ["nødder"]);
    const household = profileToHousehold(profile);

    expect(household.adults).toBe(2);
    expect(household.allergies).toEqual(["nødder"]);
  });
});
