export interface ImpactStats {
  mealsRescued: number;
  ingredientsUsed: number;
  estimatedSavingsDkk: number;
  savedKeys: string[];
  lastRescuedAt: string | null;
}

export const EMPTY_IMPACT: ImpactStats = {
  mealsRescued: 0,
  ingredientsUsed: 0,
  estimatedSavingsDkk: 0,
  savedKeys: [],
  lastRescuedAt: null,
};

export const ESTIMATED_VALUE_PER_INGREDIENT_DKK = 8;

export function recordRescuedMeal(
  current: ImpactStats,
  key: string,
  ingredientCount: number,
  rescuedAt: string
): ImpactStats {
  if (current.savedKeys.includes(key)) return current;

  const used = Math.max(0, Math.round(ingredientCount));

  return {
    mealsRescued: current.mealsRescued + 1,
    ingredientsUsed: current.ingredientsUsed + used,
    estimatedSavingsDkk:
      current.estimatedSavingsDkk + used * ESTIMATED_VALUE_PER_INGREDIENT_DKK,
    savedKeys: [...current.savedKeys, key].slice(-100),
    lastRescuedAt: rescuedAt,
  };
}

export function readImpactStats(value: string | null): ImpactStats {
  if (!value) return EMPTY_IMPACT;

  try {
    const parsed = JSON.parse(value) as Partial<ImpactStats>;
    return {
      mealsRescued: Number(parsed.mealsRescued) || 0,
      ingredientsUsed: Number(parsed.ingredientsUsed) || 0,
      estimatedSavingsDkk: Number(parsed.estimatedSavingsDkk) || 0,
      savedKeys: Array.isArray(parsed.savedKeys)
        ? parsed.savedKeys.filter((key): key is string => typeof key === "string")
        : [],
      lastRescuedAt: typeof parsed.lastRescuedAt === "string" ? parsed.lastRescuedAt : null,
    };
  } catch {
    return EMPTY_IMPACT;
  }
}
