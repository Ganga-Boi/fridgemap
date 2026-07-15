const OPENAI_KEY_CANDIDATES = [
  "OPENAI_API_KEY",
  "FRIDGEMAP_OPENAI_API_KEY",
] as const;

export type OpenAIKeySource = (typeof OPENAI_KEY_CANDIDATES)[number] | null;

export function getOpenAIKeySource(): OpenAIKeySource {
  for (const keyName of OPENAI_KEY_CANDIDATES) {
    if (process.env[keyName]) {
      return keyName;
    }
  }

  return null;
}

export function getOpenAIKey(): string | null {
  const keySource = getOpenAIKeySource();
  return keySource ? process.env[keySource] ?? null : null;
}

export function getOpenAIKeyDiagnostics() {
  const keySource = getOpenAIKeySource();

  return {
    hasOpenAIKey: Boolean(keySource),
    openAIKeySource: keySource,
    checkedKeyNames: [...OPENAI_KEY_CANDIDATES],
  };
}

/** P6: Verificeret 2026-07 mod OpenAI's modelkatalog. gpt-5.6 (alias for Sol)
 *  er flagskibet; Terra er den dokumenterede balance mellem kvalitet og pris
 *  og det rigtige default til ugentlige scans. Kan overstyres med
 *  OPENAI_VISION_MODEL. */
export const DEFAULT_OPENAI_VISION_MODEL = "gpt-5.6-terra";

export function getOpenAIVisionModel(): string {
  return process.env.OPENAI_VISION_MODEL ?? DEFAULT_OPENAI_VISION_MODEL;
}
