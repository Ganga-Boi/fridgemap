/**
 * /api/analyze — tynd route. Al logik bor i provider + matcher.
 * Arvet mønster fra FridgeMap: ét endpoint, JSON ind/ud, fejl som { ok:false }.
 */
import { NextResponse } from "next/server";
import { getVisionProvider } from "@/lib/providers/vision";
import { buildVocabulary } from "@/lib/vocabulary";

export const runtime = "edge"; // arvet fra FridgeMaps vercel.json-valg

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const frames: string[] = Array.isArray(body.frames) ? body.frames : [];

    if (!frames.length) {
      return NextResponse.json({ ok: false, error: "NO_FRAMES" }, { status: 400 });
    }

    const provider = getVisionProvider();
    const result = await provider.analyze({ frames, vocabulary: buildVocabulary() });

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}
