/**
 * VISION-FABRIK — eneste lovlige indgang til vision-AI (Allans regel 3).
 * Leverandørskift = miljøvariablen VISION_PROVIDER. Intet andet ændres.
 */
import type { ProviderName, VisionProvider } from "../../../types/contracts";
import { OpenAIVisionProvider } from "./openai";
import { AnthropicVisionProvider } from "./anthropic";
import { GeminiVisionProvider } from "./gemini";
import { DEFAULT_ANTHROPIC_VISION_MODEL, getAnthropicKeyDiagnostics } from "./anthropicConfig";
import { getOpenAIKeyDiagnostics } from "./openaiConfig";

const DEFAULT_VISION_PROVIDER: ProviderName = "openai";

export function getVisionProviderName(): ProviderName {
  const name = process.env.VISION_PROVIDER ?? DEFAULT_VISION_PROVIDER;

  switch (name) {
    case "openai":
    case "claude":
    case "gemini":
    case "local":
      return name;
    default:
      throw new Error(`Ukendt VISION_PROVIDER: ${name}`);
  }
}

export function getVisionProvider(): VisionProvider {
  const name = getVisionProviderName();
  switch (name) {
    case "openai":    return new OpenAIVisionProvider();
    case "claude":    return new AnthropicVisionProvider();
    case "gemini":    return new GeminiVisionProvider();
    default: throw new Error(`Ukendt VISION_PROVIDER: ${name}`);
  }
}

export function getVisionProviderDiagnostics() {
  const provider = getVisionProviderName();

  switch (provider) {
    case "openai":
      return {
        provider,
        providerModel: process.env.OPENAI_VISION_MODEL ?? "gpt-5.6",
        ...getOpenAIKeyDiagnostics(),
      };
    case "claude":
      return {
        provider,
        providerModel: process.env.ANTHROPIC_VISION_MODEL ?? DEFAULT_ANTHROPIC_VISION_MODEL,
        ...getAnthropicKeyDiagnostics(),
      };
    case "gemini":
    case "local":
      return {
        provider,
        providerModel: null,
      };
  }
}
