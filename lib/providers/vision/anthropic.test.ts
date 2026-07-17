import { afterEach, describe, expect, it, vi } from "vitest";
import { buildIngredientVocabulary } from "../../ingredientRegistry";
import { AnthropicVisionProvider } from "./anthropic";

const VOCABULARY = buildIngredientVocabulary();
const FRAME =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBAQEA8PEA8QDw8PDw8PDw8PDw8QFREWFhURFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0OGxAQGy0mICUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAgMBIgACEQEDEQH/xAAXAAEAAwAAAAAAAAAAAAAAAAAAAQID/8QAFhEBAQEAAAAAAAAAAAAAAAAAAQAC/9oADAMBAAIQAxAAAAHjA//EABgQAQEBAQEAAAAAAAAAAAAAAAERACEx/9oACAEBAAEFAi2GQ//EABYRAQEBAAAAAAAAAAAAAAAAAAARIf/aAAgBAwEBPwGn/8QAFhEBAQEAAAAAAAAAAAAAAAAAABEh/9oACAECAQE/Abf/xAAaEAACAgMAAAAAAAAAAAAAAAAAAQIRITEy/9oACAEBAAY/AnErn//EABsQAQEAAwEBAQAAAAAAAAAAAAERACExQVFh/9oACAEBAAE/IW3JEqYV2QeFQmif/9oADAMBAAIAAwAAABAf/8QAFhEBAQEAAAAAAAAAAAAAAAAAARAR/9oACAEDAQE/EKf/xAAXEQEBAQEAAAAAAAAAAAAAAAABABEh/9oACAECAQE/EHyGf//EABwQAQADAQEAAwAAAAAAAAAAAAEAESExQVFhcf/aAAgBAQABPxCFB94JWKqhzyapMI2vlA38CAWc7Ien//2Q==";

describe("AnthropicVisionProvider", () => {
  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_VISION_MODEL;
    vi.restoreAllMocks();
  });

  it("kalder Messages API og parser svaret til scan-kontrakten", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              sceneType: "food",
              items: [
                {
                  rawLabel: "Heinz ketchup",
                  ingredientId: null,
                  quantity: "noget",
                  confidence: 0.93,
                },
              ],
            }),
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new AnthropicVisionProvider();
    const result = await provider.analyze({
      frames: [FRAME],
      vocabulary: VOCABULARY,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.anthropic.com/v1/messages");

    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(payload.model).toBe("claude-sonnet-5");
    expect(payload.messages[0].content[0].type).toBe("image");
    expect(payload.messages[0].content[1].type).toBe("text");

    expect(result).toEqual({
      sceneType: "food",
      items: [
        {
          rawLabel: "Heinz ketchup",
          ingredientId: "ketchup",
          quantity: "noget",
          confidence: 0.93,
        },
      ],
    });
  });

  it("fejler tydeligt hvis Claude-noeglen mangler", async () => {
    const provider = new AnthropicVisionProvider();

    await expect(
      provider.analyze({
        frames: [FRAME],
        vocabulary: VOCABULARY,
      })
    ).rejects.toThrow("ANTHROPIC_API_KEY mangler");
  });
});
