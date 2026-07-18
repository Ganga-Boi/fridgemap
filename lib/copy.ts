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
  takePhotos: "Tag billeder",
  showRecipe: "Vis retten",
  somethingElse: "Noget andet",
  surprise: "Overrask mig",
  madeIt: "Vi lavede den",
  tryAgain: "Tag en ny runde",
  inspectPhotos: "Se hvad jeg fandt",
  useGallery: "Vælg fra telefonen",
} as const;

export const LOADING_HEADLINE = "Et øjeblik.";

export const ONBOARDING_LEAD =
  "Tag 2-4 billeder af hylderne. Så samler jeg varerne og giver ét konkret bud.";

export const CAMERA_HELP =
  "Start med køleskabet. Brug kun billeder du allerede har, hvis de ligger på telefonen.";

export const SCAN_LEAD = "Så finder vi retter, du kan lave.";

export const SCAN_REASSURANCE =
  "Du kan gennemse billederne, før de sendes.";

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


/* ---------------- Scan-flowets stemme (P3: flyttet fra page.tsx) ------ */

export const SCAN_STATUS = {
  needPhotoFirst: "Tag mindst ét billede først.",
  photoAdded: "Billede tilføjet. Tag gerne et mere fra en anden vinkel.",
  keepingFirstFour: "Jeg holder mig til de første 4 billeder, så scanningen forbliver skarp.",
  looking: "Jeg kigger lige i køleskabet.",
  foundNothing: "Jeg fandt ikke nok endnu. Tilføj gerne et par ting selv.",
  writeItemFirst: "Skriv en vare først.",
  /* Allans regel: aldrig en fejl — altid et naturligt næste skridt.
     Nævner begge veje videre (billede ELLER manuel vare), intet fagsprog. */
  noGoodDish:
    "Jeg mangler lige et par flere ingredienser, før jeg kan anbefale en ret. Tag gerne et billede mere eller tilføj et par varer.",
} as const;

export function fileSummary(count: number): string {
  switch (count) {
    case 0:
      return "Ingen billeder endnu. Tag første billede.";
    case 1:
      return "1 billede klar. Tag gerne 1-3 mere fra andre vinkler.";
    case 2:
      return "2 billeder klar. Det er et godt startpunkt.";
    case 3:
      return "3 billeder klar. Du kan tage ét mere.";
    default:
      return "4 billeder klar. Jeg har nok.";
  }
}

export function scanErrorMessage(error: string | undefined): string {
  switch (error) {
    case "NON_FOOD_IMAGE":
      return "Det her ligner ikke mad eller dagligvarer. Tag et billede af indholdet i køleskabet i stedet.";
    case "OPENAI_API_KEY_MISSING":
      return "Jeg mangler stadig nøglen til billedforståelsen i produktion.";
    case "ANTHROPIC_API_KEY_MISSING":
      return "Jeg mangler stadig Claude-nøglen til billedforståelsen i produktion.";
    case "VISION_JSON_PARSE_ERROR":
      return "Jeg kunne ikke læse billederne rent nok denne gang. Prøv gerne igen med 2-4 tydelige billeder.";
    case "NO_FRAMES":
      return "Tag mindst ét billede først.";
    default:
      return "Der gik noget galt. Prøv gerne igen om et øjeblik.";
  }
}

/* P5: fallback er en HANDLING (kameraet åbnes), teksten er kun følgeskab. */
export const CAMERA_FALLBACK = {
  mobile: "Live-kameraet drillede, så jeg åbner telefonens kamera i stedet.",
  desktop: "Live-kameraet drillede. Vælg i stedet et billede her fra computeren.",
  captureFailed: "Billedet blev ikke gemt ordentligt. Prøv igen.",
} as const;

export function addedToList(name: string): string {
  return `${name} er lagt til.`;
}

export function alreadyOnList(name: string): string {
  return `${name} står allerede på listen.`;
}

/* P2: listen er en frivillig detalje under svaret — aldrig en port. */
export const REVIEW_OPTIONAL_HEADING = "Ret listen, hvis noget ser galt ud";
export const REVIEW_OPTIONAL_SUB = "Det er frivilligt — buddet opdaterer sig selv, når du retter.";
