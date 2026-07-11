/**
 * VISION-FABRIK — eneste lovlige indgang til vision-AI (Allans regel 3).
 * Leverandørskift = miljøvariablen VISION_PROVIDER. Intet andet ændres.
 */
import type { VisionProvider } from "../../../types/contracts";
import { OpenAIVisionProvider } from "./openai";
import { AnthropicVisionProvider } from "./anthropic";
import { GeminiVisionProvider } from "./gemini";

export function getVisionProvider(): VisionProvider {
  const name = process.env.VISION_PROVIDER ?? "openai";
  switch (name) {
    case "openai":    return new OpenAIVisionProvider();
    case "claude":    return new AnthropicVisionProvider();
    case "gemini":    return new GeminiVisionProvider();
    default: throw new Error(`Ukendt VISION_PROVIDER: ${name}`);
  }
}
