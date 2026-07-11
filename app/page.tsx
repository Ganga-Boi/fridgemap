"use client";

/**
 * FORSIDEN — appen åbner PÅ svaret (friktionsregel 8).
 * Logikken bor her, præsentationen i AnswerCard.
 *
 * Indbyggede regler:
 *  - Tidsreglen (friktionsregel 9): efter kl. 17 foreslås kun retter
 *    med fuld dækning, hvis der findes nogen. "Mangler kun kokosmælk"
 *    er et godt svar kl. 14 og et dårligt kl. 17.45.
 *  - 3 × "noget andet" → lageret er nok forkert → foreslå et kig
 *    i køleskabet (OUT_OF_IDEAS). Aldrig en fejl, altid en invitation.
 *  - "Overrask mig": en ret med fuld dækning, som familien ikke selv
 *    ville have valgt (ingen liked-bonus, ikke den aktuelle).
 *
 * Trin 3-afgrænsning: kører mod FIXTURE-data. Dexie + rigtige data
 * kobles på i trin 5-6. "Vis retten" navigerer til trin 4-siden.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AnswerCard from "../components/AnswerCard";
import { filterCandidates, rankFallback, buildAnswer } from "../lib/matcher";
import { allApprovedRecipes } from "../lib/recipes/recipeEngine";
import { FIXTURE_HOUSEHOLD, FIXTURE_PANTRY } from "../lib/fixtures";
import { BUTTONS, EMPTY_PANTRY, LOADING_HEADLINE, OUT_OF_IDEAS } from "../lib/copy";
import {
  advanceSuggestion,
  applyEveningRule,
  createInitialSuggestionState,
  rejectCurrentSuggestion,
} from "../lib/homeState";

export default function Home() {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);
  const [suggestions, setSuggestions] = useState(createInitialSuggestionState);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const nowIso = now?.toISOString() ?? null;

  const ranked = useMemo(() => {
    if (!now || !nowIso) return [];

    const candidates = filterCandidates(allApprovedRecipes(), FIXTURE_HOUSEHOLD);
    return applyEveningRule(
      rankFallback(
        candidates,
        FIXTURE_PANTRY,
        FIXTURE_HOUSEHOLD,
        FIXTURE_PANTRY.deductions,
        nowIso
      ),
      now.getHours()
    );
  }, [now, nowIso]);

  if (!now || !nowIso) {
    return (
      <main className="page">
        <section className="answer" aria-live="polite" aria-busy="true">
          <h1 className="headline">{LOADING_HEADLINE}</h1>
        </section>
      </main>
    );
  }

  const current = ranked[suggestions.cursor];
  const outOfIdeas = suggestions.rejections >= 3;
  const noSuggestions = ranked.length === 0;

  function somethingElse() {
    setSuggestions((state) => rejectCurrentSuggestion(state, ranked.length));
  }

  function resetSuggestions() {
    setSuggestions(createInitialSuggestionState());
  }

  function surprise() {
    const pool = ranked.filter(
      (recipe, index) =>
        index !== suggestions.cursor && recipe.missingCore.length === 0
    );
    if (!pool.length) {
      setSuggestions((state) => advanceSuggestion(state, ranked.length));
      return;
    }

    const pick = pool[pool.length - 1];
    setSuggestions((state) => ({
      ...state,
      cursor: ranked.indexOf(pick),
    }));
  }

  function showRecipe() {
    if (!current) return;
    // Trin 4: naviger til /recipe/[id]. Indtil da: markér hensigten.
    router.push(`/recipe/${current.recipe.id}`);
  }

  if (noSuggestions) {
    return (
      <main className="page">
        <section className="answer" aria-live="polite">
          <h1 className="headline">{EMPTY_PANTRY}</h1>
        </section>
      </main>
    );
  }

  if (outOfIdeas || !current) {
    return (
      <main className="page">
        <section className="answer" aria-live="polite">
          <h1 className="headline">{OUT_OF_IDEAS}</h1>
          <div className="actions single-action">
            <button type="button" className="primary" onClick={resetSuggestions}>
              {BUTTONS.tryAgain}
            </button>
          </div>
        </section>
      </main>
    );
  }

  const answer = buildAnswer(current.recipe, FIXTURE_PANTRY, nowIso);

  return (
    <main className="page">
      <AnswerCard
        answer={answer}
        now={now}
        onShowRecipe={showRecipe}
        onSomethingElse={somethingElse}
        onSurprise={surprise}
      />
    </main>
  );
}
