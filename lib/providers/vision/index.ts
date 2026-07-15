/**
 * VISION-FABRIK — eneste lovlige indgang til vision-AI (Allans regel 3).
 * Leverandørskift = miljøvariablen VISION_PROVIDER. Intet andet ændres.
 */
import type { ProviderName, VisionProvider } from "../../../types/contracts";
import { OpenAIVisionProvider } from "./openai";
import { AnthropicVisionProvider } from "./anthropic";
import { GeminiVisionProvider } from "./gemini";
import {
  DEFAULT_ANTHROPIC_VISION_MODEL,
  getAnthropicKeyDiagnostics,
  getAnthropicKeySource,
} from "./anthropicConfig";
import { getOpenAIKeyDiagnostics, getOpenAIKeySource, getOpenAIVisionModel } from "./openaiConfig";

const DEFAULT_VISION_PROVIDER: ProviderName = "openai";

export function getVisionProviderName(): ProviderName {
  const explicitProvider = process.env.VISION_PROVIDER?.trim();
  const name = explicitProvider
    ? explicitProvider
    : getAnthropicKeySource()
      ? "claude"
      : getOpenAIKeySource()
        ? "openai"
        : DEFAULT_VISION_PROVIDER;

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
  const explicitProvider = process.env.VISION_PROVIDER?.trim() ?? null;
  const providerSelectionMode = explicitProvider ? "explicit" : "automatic";
  const availableKeys = {
    ...getOpenAIKeyDiagnostics(),
    ...getAnthropicKeyDiagnostics(),
  };

  switch (provider) {
    case "openai":
      return {
        provider,
        providerSelectionMode,
        explicitProvider,
        providerModel: getOpenAIVisionModel(),
        ...availableKeys,
      };
    case "claude":
      return {
        provider,
        providerSelectionMode,
        explicitProvider,
        providerModel: process.env.ANTHROPIC_VISION_MODEL ?? DEFAULT_ANTHROPIC_VISION_MODEL,
        ...availableKeys,
      };
    case "gemini":
    case "local":
      return {
        provider,
        providerSelectionMode,
        explicitProvider,
        providerModel: null,
        ...availableKeys,
      };
  }
}
