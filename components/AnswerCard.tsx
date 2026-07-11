/**
 * ANSWERCARD — svaret. Produktets ansigt.
 * Ren præsentation: al logik (rangering, cursor, tidsregel) bor i page.tsx.
 * Designbeslutninger (fra designplanen):
 *  - Svarsætningen ER heroen. Intet kort, ingen ikoner, intet dashboard.
 *  - Dato-øjenbryn som en lille køkkenseddel-datering.
 *  - Én primær handling (Vis retten). To stille sekundære.
 */

import type { Answer } from "../types/contracts";
import { BUTTONS, dateEyebrow, headline, minutesLine, statusLine } from "../lib/copy";

interface AnswerCardProps {
  answer: Answer;
  now: Date;
  onShowRecipe: () => void;
  onSomethingElse: () => void;
  onSurprise: () => void;
}

export default function AnswerCard({
  answer,
  now,
  onShowRecipe,
  onSomethingElse,
  onSurprise,
}: AnswerCardProps) {
  return (
    <section className="answer" aria-live="polite">
      <p className="eyebrow">{dateEyebrow(now)}</p>

      <h1 className="headline">{headline(answer.recipe.name)}</h1>

      <p className="meta">
        {minutesLine(answer.recipe.minutes)}
        <span className="meta-dot" aria-hidden="true">
          ·
        </span>
        {statusLine(answer)}
      </p>

      <div className="actions">
        <button type="button" className="primary" onClick={onShowRecipe}>
          {BUTTONS.showRecipe}
        </button>
        <div className="secondary-row">
          <button type="button" className="quiet" onClick={onSomethingElse}>
            {BUTTONS.somethingElse}
          </button>
          <button type="button" className="quiet" onClick={onSurprise}>
            {BUTTONS.surprise}
          </button>
        </div>
      </div>
    </section>
  );
}
