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
