/**
 * MVP 0.1 — MASTER-KONTRAKT (kode-form)
 * =====================================
 * Dette er den eneste sandhedskilde for datamodeller og AI-grænseflader.
 * Regler:
 *  - Ingen komponent eller lib-fil må definere egne domænetyper.
 *  - Ændringer her kræver eksplicit godkendelse (additiv udvikling).
 *  - AI-output SKAL valideres mod disse typer før brug (zod-skemaer i 0.1.1).
 */

/* ------------------------------------------------------------------ */
/* 1. HUSSTAND — skrives ved onboarding, ændres sjældent               */
/* ------------------------------------------------------------------ */

export interface Household {
  adults: number;                 // 1–4
  children: number;               // 0–5
  likedRecipeIds: string[];       // valgt i onboarding blandt viste retter
  dislikedIngredients: string[];  // normaliserede ingrediens-id'er
  allergies: Allergen[];          // HÅRD constraint — må ALDRIG brydes
  supermarket: Supermarket;
  createdAt: string;              // ISO
}

export type Allergen =
  | "gluten" | "laktose" | "nødder" | "æg" | "fisk" | "skaldyr" | "soja";

export type Supermarket =
  | "netto" | "rema" | "føtex" | "lidl" | "coop" | "andet";

/* ------------------------------------------------------------------ */
/* 2. LAGER (pantry) — skrives ved scan og fradrag                     */
/*    Konfidens er INTERN. Den vises aldrig i UI som tal.              */
/* ------------------------------------------------------------------ */

export type QuantityEstimate = "rigeligt" | "noget" | "lidt";

export interface PantryItem {
  ingredientId: string;           // normaliseret mod INGREDIENT_VOCABULARY
  quantity: QuantityEstimate;
  confidence: number;             // 0–1, falder over tid (decay i pantry.ts)
  source: "scan" | "deduction" | "onboarding";
  seenAt: string;                 // ISO — hvornår sidst bekræftet
}

export interface Pantry {
  items: PantryItem[];
  lastScanAt: string | null;      // ISO
  deductions: Deduction[];        // "vi lavede den"-historik
}

export interface Deduction {
  recipeId: string;
  madeAt: string;                 // ISO
}

/* ------------------------------------------------------------------ */
/* 3. RETTER — kataloget. Struktur bygget til tusinder, seedet med 120 */
/* ------------------------------------------------------------------ */

export type IngredientRole = "bærende" | "fleksibel";
/**
 * bærende:   mangler den, kan retten kun foreslås som "mangler kun X"
 *            (max 1 manglende bærende ingrediens pr. forslag — ellers udgår retten)
 * fleksibel: mangler den, foreslås retten stadig, med note ("jeg springer persillen over")
 */

export interface RecipeIngredient {
  ingredientId: string;           // normaliseret
  displayName: string;            // "hakket oksekød", vises i UI
  role: IngredientRole;
  amountText: string;             // "400 g" — tekst, ingen beregning i 0.1
}

export type RecipeCategory =
  | "pasta" | "ris" | "kartoffel" | "suppe" | "salat"
  | "pande" | "ovn" | "gryde" | "brød_wraps";

export interface Recipe {
  id: string;                     // slug, fx "one-pot-pasta-kylling"
  name: string;                   // "One-pot pasta med kylling"
  minutes: number;                // total tid, 15–40 i 0.1
  category: RecipeCategory;       // bruges til variation (aldrig 2 ens i træk)
  childFriendly: boolean;
  ingredients: RecipeIngredient[];
  steps: string[];                // korte imperativer, én handling pr. trin
  allergens: Allergen[];          // afledt, men eksplicit — hård filtrering
  seasonTags?: ("sommer" | "vinter")[];
  approved: boolean;              // AI-udkast starter false; kun approved=true kan foreslås
}

/* ------------------------------------------------------------------ */
/* 4. AI-KONTRAKT A — Scan-analyse (vision)                            */
/*    Model returnerer KUN dette JSON-skema. Alt andet = fejl + retry. */
/* ------------------------------------------------------------------ */

export interface ScanAnalysisRequest {
  frames: string[];               // 2–4 base64 JPEG, client-side udtrukket
  vocabulary: string[];           // INGREDIENT_VOCABULARY — tvinger normalisering
}

export interface ScanAnalysisResponse {
  items: {
    ingredientId: string;         // SKAL findes i vocabulary — ellers kasseres
    quantity: QuantityEstimate;
    confidence: number;           // 0–1
  }[];
}

/* ------------------------------------------------------------------ */
/* 5. AI-KONTRAKT B — Menuvalg (rangering ved scan-tid, IKKE tryk-tid) */
/* ------------------------------------------------------------------ */

export interface MenuRankingRequest {
  pantry: PantryItem[];
  household: Pick<Household, "adults" | "children" | "likedRecipeIds"
                           | "dislikedIngredients" | "allergies">;
  recentDeductions: Deduction[];  // sidste 7 dage — undgå gentagelse
  candidateRecipeIds: string[];   // FOR-FILTRERET af matcher.ts:
                                  // allergier og dislikes er allerede fjernet.
                                  // AI ser ALDRIG retter, den ikke må vælge.
}

export interface MenuRankingResponse {
  ranked: {
    recipeId: string;             // SKAL være blandt candidateRecipeIds
    reason: string;               // maks 12 ord, intern — bruges til debugging/telemetri
  }[];                            // 8–12 stk
}

/** Cachen det daglige tryk læser fra. Gyldighed: 5 dage eller til næste scan. */
export interface MenuCache {
  ranked: MenuRankingResponse["ranked"];
  generatedAt: string;            // ISO
  pantryScanAt: string;           // hvilket scan den bygger på
  cursor: number;                 // hvor langt "noget andet" er nået
}

/* ------------------------------------------------------------------ */
/* 6. SVARET — det eneste, brugeren møder                              */
/* ------------------------------------------------------------------ */

export interface Answer {
  recipe: Recipe;
  missing: RecipeIngredient[];    // 0 eller 1 bærende + evt. fleksible
  copyKey: AnswerCopyKey;         // hvilken formulering copy.ts skal bruge
}

export type AnswerCopyKey =
  | "har_det_hele"                // høj konfidens, intet mangler
  | "mangler_en_ting"             // 1 bærende mangler
  | "springer_over"               // kun fleksible mangler
  | "tjek_lige";                  // lav konfidens på en bærende ingrediens

/* ------------------------------------------------------------------ */
/* 7. TELEMETRI — de tre måltal + pr.-ret-læring                       */
/* ------------------------------------------------------------------ */

export type LogEvent =
  | { type: "app_open"; at: string }
  | { type: "answer_shown"; at: string; recipeId: string; rank: number }
  | { type: "answer_accepted"; at: string; recipeId: string; rank: number }
  | { type: "answer_rejected"; at: string; recipeId: string }   // "noget andet"
  | { type: "surprise_used"; at: string; recipeId: string }
  | { type: "made_it"; at: string; recipeId: string }
  | { type: "rescan"; at: string; itemCount: number }
  | { type: "onboarding_done"; at: string; seconds: number };

/* ------------------------------------------------------------------ */
/* 8. INGREDIENS-VOKABULAR (uddrag — fuld liste genereres fra          */
/*    ret-kataloget, så vokabular og retter aldrig kan divergere)      */
/* ------------------------------------------------------------------ */

export const INGREDIENT_VOCABULARY_SAMPLE = [
  "hakket_oksekoed", "kyllingebryst", "bacon", "pasta_skruer", "spaghetti",
  "ris", "kartofler", "loeg", "hvidloeg", "gulerod", "peberfrugt", "broccoli",
  "tomat_frisk", "tomat_haakket_daase", "floede", "maelk", "creme_fraiche",
  "smoer", "aeg", "revet_ost", "parmesan", "kokosmaelk", "karrypasta",
] as const;

/* ------------------------------------------------------------------ */
/* 9. PROVIDER-ABSTRAKTION — Allans regel: AI bestemmer aldrig         */
/*    arkitekturen. AI er en udskiftelig komponent. Frontend og        */
/*    forretningslogik må KUN kende disse interfaces — aldrig en       */
/*    konkret leverandør (OpenAI/Claude/Gemini/lokal model).           */
/* ------------------------------------------------------------------ */

export interface VisionProvider {
  /** Analyserer køleskabsbilleder. Output er ALTID normaliseret mod vocabulary. */
  analyze(req: ScanAnalysisRequest): Promise<ScanAnalysisResponse>;
}

export interface MenuProvider {
  /** Rangerer for-filtrerede kandidatretter. Implementeres i scan-trinnet. */
  rank(req: MenuRankingRequest): Promise<MenuRankingResponse>;
}

/** Den eneste lovlige måde at få en provider på. Skift = én linje her. */
export type ProviderName = "openai" | "claude" | "gemini" | "local";
