/**
 * COPY — tonekontrakten. AL brugerrettet tekst bor HER og kun her.
 * ================================================================
 * Regler (fra fundamentet), håndhævet ved konvention + review:
 *  - Ordene "AI", "scan", "lager", "analyse", "konfidens" optræder ALDRIG.
 *  - Appen bebrejder aldrig. Ingen skyld, ingen løftede pegefingre.
 *  - Varme gennem adfærd, ikke pynt: ingen emojis i faste tekster,
 *    ingen "min ven". Rolig, konkret, kortfattet.
 *  - Lav sikkerhed formuleres som en mikro-handling ("tjek lige"),
 *    aldrig som usikkerhed eller tal.
 *  - Én sætning gør ét job.
 */

import type { Answer } from "../types/contracts";

/* ---------------- Dato-øjenbryn ------------------------------------- */

export function dateEyebrow(now: Date): string {
  return now
    .toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" })
    .toLowerCase();
}

/* ---------------- Svaret --------------------------------------------- */

export function headline(recipeName: string): string {
  return `Jeg ville lave ${recipeName.toLowerCase()} i dag.`;
}

export function minutesLine(minutes: number): string {
  return `${minutes} minutter`;
}

/** Underlinjen — oversættelsen af copyKey. Konfidens bliver til sprog her. */
export function statusLine(answer: Answer): string {
  const names = answer.missing.map((i) => i.displayName);
  switch (answer.copyKey) {
    case "har_det_hele":
      return "I har det hele.";
    case "mangler_en_ting":
      return `I mangler kun ${names[0]}.`;
    case "springer_over":
      return names.length === 1
        ? `I har det hele — jeg springer ${names[0]} over.`
        : `I har det hele — jeg springer ${liste(names)} over.`;
    case "tjek_lige":
      return "I har det hele — tjek lige køleskabet efter, når I går i gang.";
  }
}

function liste(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} og ${names[names.length - 1]}`;
}

/* ---------------- Knapper -------------------------------------------- */

export const BUTTONS = {
  showRecipe: "Vis retten",
  somethingElse: "Noget andet",
  surprise: "Overrask mig",
  madeIt: "Vi lavede den",
  tryAgain: "Tag en ny runde",
} as const;

export const LOADING_HEADLINE = "Et øjeblik.";

/* ---------------- Grænsetilstande ------------------------------------ */

/** Efter 3 × "noget andet": lageret er nok forkert — foreslå kalibrering. */
export const OUT_OF_IDEAS =
  "Hm. Skal vi tage et hurtigt kig i køleskabet i stedet? Så rammer jeg bedre.";

/** Tomt/umuligt lager: aldrig en fejlmeddelelse, altid en invitation. */
export const EMPTY_PANTRY =
  "Jeg har ikke set jeres køleskab endnu. Tag et hurtigt kig med mig, så finder jeg noget til i aften.";

/** Kvittering efter "vi lavede den" — kort, varm, færdig. */
export const MADE_IT_RECEIPT = "Godt. Vi ses i morgen.";

/* ---------------- Dagen-efter-spørgsmålet (bruges fra trin 4) -------- */
/** Erstatter "vi lavede den"-knappen: ét tryk morgenen efter, ja er default. */
export function madeItQuestion(recipeName: string): string {
  return `Blev det til ${recipeName.toLowerCase()} i går?`;
}
export const MADE_IT_YES = "Ja";
export const MADE_IT_NO = "Nej, det blev noget andet";
