import { afterEach, describe, expect, it } from "vitest";
import { getVisionProviderDiagnostics, getVisionProviderName } from "./index";

const VISION_PROVIDER = process.env.VISION_PROVIDER;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FRIDGEMAP_OPENAI_API_KEY = process.env.FRIDGEMAP_OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const FRIDGEMAP_ANTHROPIC_API_KEY = process.env.FRIDGEMAP_ANTHROPIC_API_KEY;

function resetEnv() {
  if (VISION_PROVIDER === undefined) delete process.env.VISION_PROVIDER;
  else process.env.VISION_PROVIDER = VISION_PROVIDER;

  if (OPENAI_API_KEY === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = OPENAI_API_KEY;

  if (FRIDGEMAP_OPENAI_API_KEY === undefined) delete process.env.FRIDGEMAP_OPENAI_API_KEY;
  else process.env.FRIDGEMAP_OPENAI_API_KEY = FRIDGEMAP_OPENAI_API_KEY;

  if (ANTHROPIC_API_KEY === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ANTHROPIC_API_KEY;

  if (FRIDGEMAP_ANTHROPIC_API_KEY === undefined) delete process.env.FRIDGEMAP_ANTHROPIC_API_KEY;
  else process.env.FRIDGEMAP_ANTHROPIC_API_KEY = FRIDGEMAP_ANTHROPIC_API_KEY;
}

describe("vision provider selection", () => {
  afterEach(() => {
    resetEnv();
  });

  it("vælger Claude automatisk når Anthropic-nøglen findes", () => {
    delete process.env.VISION_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.FRIDGEMAP_OPENAI_API_KEY;
    process.env.ANTHROPIC_API_KEY = "anthropic-test";

    expect(getVisionProviderName()).toBe("claude");
    expect(getVisionProviderDiagnostics()).toMatchObject({
      provider: "claude",
      providerSelectionMode: "automatic",
      explicitProvider: null,
      hasAnthropicKey: true,
    });
  });

  it("respekterer VISION_PROVIDER når den er sat eksplicit", () => {
    process.env.VISION_PROVIDER = "openai";
    process.env.ANTHROPIC_API_KEY = "anthropic-test";
    process.env.OPENAI_API_KEY = "openai-test";

    expect(getVisionProviderName()).toBe("openai");
    expect(getVisionProviderDiagnostics()).toMatchObject({
      provider: "openai",
      providerSelectionMode: "explicit",
      explicitProvider: "openai",
      hasOpenAIKey: true,
      hasAnthropicKey: true,
    });
  });
});
