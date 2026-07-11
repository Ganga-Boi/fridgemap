const ANTHROPIC_KEY_CANDIDATES = [
  "ANTHROPIC_API_KEY",
  "CLAUDE_API_KEY",
  "FRIDGEMAP_ANTHROPIC_API_KEY",
  "FRIDGEMAP_CLAUDE_API_KEY",
] as const;

export type AnthropicKeySource = (typeof ANTHROPIC_KEY_CANDIDATES)[number] | null;

export const DEFAULT_ANTHROPIC_VISION_MODEL = "claude-sonnet-5";

export function getAnthropicKeySource(): AnthropicKeySource {
  for (const keyName of ANTHROPIC_KEY_CANDIDATES) {
    if (process.env[keyName]?.trim()) {
      return keyName;
    }
  }

  return null;
}

export function getAnthropicKey(): string | null {
  const keySource = getAnthropicKeySource();
  return keySource ? process.env[keySource] ?? null : null;
}

export function getAnthropicVisionModel() {
  return process.env.ANTHROPIC_VISION_MODEL ?? DEFAULT_ANTHROPIC_VISION_MODEL;
}

export function getAnthropicKeyDiagnostics() {
  const keySource = getAnthropicKeySource();

  return {
    hasAnthropicKey: Boolean(keySource),
    anthropicKeySource: keySource,
    checkedKeyNames: [...ANTHROPIC_KEY_CANDIDATES],
    anthropicVisionModel: getAnthropicVisionModel(),
  };
}
