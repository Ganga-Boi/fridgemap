import type { Allergen, Household } from "../types/contracts";

export const ONBOARDING_STORAGE_KEY = "fridgemap.onboarding.v1";

export type OnboardingGoal =
  | "use_what_i_have"
  | "reduce_waste"
  | "save_money"
  | "quick_meals"
  | "eat_healthier"
  | "more_protein";

export interface OnboardingProfile {
  version: 1;
  goals: OnboardingGoal[];
  people: number;
  allergies: Allergen[];
  completedAt: string;
}

const GOALS: OnboardingGoal[] = [
  "use_what_i_have",
  "reduce_waste",
  "save_money",
  "quick_meals",
  "eat_healthier",
  "more_protein",
];

const ALLERGENS: Allergen[] = [
  "gluten",
  "laktose",
  "nødder",
  "æg",
  "fisk",
  "skaldyr",
  "soja",
];

export function createOnboardingProfile(
  goals: OnboardingGoal[],
  people: number,
  allergies: Allergen[],
  now = new Date()
): OnboardingProfile {
  return {
    version: 1,
    goals: [...new Set(goals)].filter((goal) => GOALS.includes(goal)),
    people: Math.max(1, Math.min(5, Math.round(people))),
    allergies: [...new Set(allergies)].filter((allergen) => ALLERGENS.includes(allergen)),
    completedAt: now.toISOString(),
  };
}

export function isOnboardingProfile(value: unknown): value is OnboardingProfile {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<OnboardingProfile>;

  return (
    candidate.version === 1 &&
    Array.isArray(candidate.goals) &&
    candidate.goals.length > 0 &&
    candidate.goals.every((goal) => GOALS.includes(goal)) &&
    typeof candidate.people === "number" &&
    candidate.people >= 1 &&
    candidate.people <= 5 &&
    Array.isArray(candidate.allergies) &&
    candidate.allergies.every((allergen) => ALLERGENS.includes(allergen)) &&
    typeof candidate.completedAt === "string"
  );
}

export function parseOnboardingProfile(raw: string | null): OnboardingProfile | null {
  if (!raw) return null;

  try {
    const value: unknown = JSON.parse(raw);
    return isOnboardingProfile(value) ? value : null;
  } catch {
    return null;
  }
}

export function profileToHousehold(profile: OnboardingProfile): Household {
  return {
    adults: Math.min(4, profile.people),
    children: 0,
    likedRecipeIds: [],
    dislikedIngredients: [],
    allergies: profile.allergies,
    supermarket: "andet",
    createdAt: profile.completedAt,
  };
}
