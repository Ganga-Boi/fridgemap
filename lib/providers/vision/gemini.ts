/** Gemini vision — bevidst tom skal i 0.1. Implementeres når/hvis vi skifter. */
import type { ScanAnalysisRequest, ScanAnalysisResponse, VisionProvider } from "../../../types/contracts";

export class GeminiVisionProvider implements VisionProvider {
  async analyze(_req: ScanAnalysisRequest): Promise<ScanAnalysisResponse> {
    throw new Error("GeminiVisionProvider: ikke implementeret i 0.1 (sæt VISION_PROVIDER=openai)");
  }
}
