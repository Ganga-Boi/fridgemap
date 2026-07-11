/**
 * COPY — tonekontrakten. Al brugerrettet tekst bor her.
 */

import type { Answer } from "../types/contracts";

export function dateEyebrow(now: Date): string {
  return now
    .toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" })
    .toLowerCase();
}

export function headline(recipeName: string): string {
  return `Jeg ville lave ${recipeName.toLowerCase()} i dag.`;
}

export function minutesLine(minutes: number): string {
  return `${minutes} minutter`;
}

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

export const BUTTONS = {
  showRecipe: "Vis retten",
  somethingElse: "Noget andet",
  surprise: "Overrask mig",
  madeIt: "Vi lavede den",
  tryAgain: "Tag en ny runde",
  inspectPhotos: "Se hvad jeg fandt",
  useGallery: "Brug billeder du allerede har",
} as const;

export const LOADING_HEADLINE = "Et øjeblik.";

export const ONBOARDING_LEAD =
  "Tag 2-4 billeder af hylderne. Så samler jeg varerne og giver ét konkret bud.";

export const CAMERA_HELP =
  "Start med køleskabet. Brug kun billeder du allerede har, hvis de ligger på telefonen.";

export const SCAN_TIPS = [
  "Én hylde ad gangen",
  "Godt lys",
  "Hele fronten med",
] as const;

export const OUT_OF_IDEAS =
  "Hm. Skal vi tage et hurtigt kig i køleskabet i stedet? Så rammer jeg bedre.";

export const EMPTY_PANTRY = "Når billederne er taget, samler jeg varerne her.";

export const MADE_IT_RECEIPT = "Godt. Vi ses i morgen.";

export function madeItQuestion(recipeName: string): string {
  return `Blev det til ${recipeName.toLowerCase()} i går?`;
}

export const MADE_IT_YES = "Ja";
export const MADE_IT_NO = "Nej, det blev noget andet";
