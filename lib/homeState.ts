import type { RankedRecipe } from "./matcher";

export interface HomeSuggestionState {
  cursor: number;
  rejections: number;
}

export const MAX_REJECTIONS = 3;
export const EVENING_HOUR = 17;

export function createInitialSuggestionState(): HomeSuggestionState {
  return { cursor: 0, rejections: 0 };
}

export function applyEveningRule(
  ranked: RankedRecipe[],
  hour: number
): RankedRecipe[] {
  if (hour < EVENING_HOUR) return ranked;

  const complete = ranked.filter((recipe) => recipe.missingCore.length === 0);
  return complete.length > 0 ? complete : ranked;
}

export function rejectCurrentSuggestion(
  state: HomeSuggestionState,
  rankedLength: number
): HomeSuggestionState {
  return {
    cursor: rankedLength > 0 ? Math.min(state.cursor + 1, rankedLength - 1) : 0,
    rejections: state.rejections + 1,
  };
}

export function advanceSuggestion(
  state: HomeSuggestionState,
  rankedLength: number
): HomeSuggestionState {
  return {
    ...state,
    cursor: rankedLength > 0 ? Math.min(state.cursor + 1, rankedLength - 1) : 0,
  };
}
