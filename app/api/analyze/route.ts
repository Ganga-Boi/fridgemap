import { NextResponse } from "next/server";
import { getVisionProvider } from "../../../lib/providers/vision";
import { buildVocabulary } from "../../../lib/vocabulary";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET() {
  return json({
    ok: true,
    message: "FRIDGEMAP_SCAN_READY",
    vocabularySize: buildVocabulary().length,
    diagnostics: {
      hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
      vercelEnv: process.env.VERCEL_ENV ?? null,
      nodeEnv: process.env.NODE_ENV ?? null,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const frames = Array.isArray(body.frames)
      ? body.frames
      : Array.isArray(body.images)
        ? body.images
        : [];

    if (!frames.length) {
      return json({
        ok: false,
        error: "NO_FRAMES",
      });
    }

    const provider = getVisionProvider();
    const result = await provider.analyze({
      frames,
      vocabulary: buildVocabulary(),
    });

    const items = [...result.items].sort((a, b) => b.confidence - a.confidence);
    return json({ ok: true, items });
  } catch (error) {
    const details = String((error as Error)?.message || error);

    if (details.includes("OPENAI_API_KEY")) {
      return json({
        ok: false,
        error: "OPENAI_API_KEY_MISSING",
        details,
      });
    }

    if (details.includes("VISION_JSON_PARSE_ERROR")) {
      return json({
        ok: false,
        error: "VISION_JSON_PARSE_ERROR",
        details,
      });
    }

    return json({
      ok: false,
      error: "VISION_PROVIDER_ERROR",
      details,
    });
  }
}
