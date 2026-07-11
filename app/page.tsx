"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AnswerCard from "../components/AnswerCard";
import {
  BUTTONS,
  CAMERA_HELP,
  EMPTY_PANTRY,
  LOADING_HEADLINE,
  ONBOARDING_LEAD,
  OUT_OF_IDEAS,
  SCAN_TIPS,
  statusLine,
} from "../lib/copy";
import {
  MAX_REJECTIONS,
  applyEveningRule,
  createInitialSuggestionState,
  rejectCurrentSuggestion,
} from "../lib/homeState";
import { FIXTURE_HOUSEHOLD } from "../lib/fixtures";
import { buildIngredientRegistry, normalizeIngredientLookup } from "../lib/ingredientRegistry";
import { buildAnswer, filterCandidates, rankFallback, type RankedRecipe } from "../lib/matcher";
import { allApprovedRecipes } from "../lib/recipes/recipeEngine";
import type { Answer, Pantry, PantryItem, ScanAnalysisResponse } from "../types/contracts";

const API_URL = "/api/analyze";
const LOW_CONFIDENCE_CUTOFF = 0.68;
const MAX_FRAMES = 4;
const APPROVED_RECIPES = allApprovedRecipes();
const HOUSEHOLD_PROFILE = FIXTURE_HOUSEHOLD;
const CANDIDATE_RECIPES = filterCandidates(APPROVED_RECIPES, HOUSEHOLD_PROFILE);
const INGREDIENT_REGISTRY = buildIngredientRegistry();

type ScanRouteResponse = {
  ok: boolean;
  items?: ScanAnalysisResponse["items"];
  error?: string;
  details?: string;
};

function displayIngredient(ingredientId: string) {
  return INGREDIENT_REGISTRY.displayIngredient(ingredientId);
}

function displayPantryItem(item: Pick<PantryItem, "ingredientId" | "rawLabel">) {
  return item.ingredientId ? displayIngredient(item.ingredientId) : item.rawLabel;
}

function pantrySourceLabel(item: Pick<PantryItem, "ingredientId" | "source">) {
  if (item.source === "onboarding") {
    return item.ingredientId ? "lagt til af dig" : "lagt til af dig - ikke koblet endnu";
  }

  return item.ingredientId ? "fra billederne" : "fra billederne - ikke koblet endnu";
}

function findIngredientId(value: string) {
  return INGREDIENT_REGISTRY.findIngredientId(value);
}

function filesToDataUrls(files: File[]) {
  return Promise.all(
    files.slice(0, MAX_FRAMES).map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        })
    )
  );
}

async function postJSON(body: unknown) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`API fejl (${response.status}): ${text}`.trim());
  }

  return (await response.json()) as ScanRouteResponse;
}

function makeDraftItem(
  item: ScanAnalysisResponse["items"][number],
  seenAt: string
): PantryItem {
  return {
    rawLabel: item.rawLabel,
    ingredientId: item.ingredientId,
    quantity: item.quantity,
    confidence: item.confidence,
    source: "scan",
    seenAt,
  };
}

function sortDraftItems(items: PantryItem[]) {
  return [...items].sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return displayPantryItem(a).localeCompare(displayPantryItem(b), "da-DK");
  });
}

function createPantry(items: PantryItem[], lastScanAt: string, previous: Pantry | null): Pantry {
  return {
    items: sortDraftItems(items),
    lastScanAt,
    deductions: previous?.deductions ?? [],
  };
}

function buildSuggestionDeck(pantry: Pantry, now: Date) {
  return applyEveningRule(
    rankFallback(
      CANDIDATE_RECIPES,
      pantry,
      HOUSEHOLD_PROFILE,
      pantry.deductions,
      now.toISOString()
    ),
    now.getHours()
  );
}

function pickSurpriseIndex(deck: RankedRecipe[]) {
  const complete = deck
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.missingCore.length === 0);

  if (complete.length > 0) {
    return complete[complete.length - 1].index;
  }

  return deck.length > 0 ? deck.length - 1 : 0;
}

function mergeSelectedFiles(current: File[], incoming: File[]) {
  const merged = [...current];

  for (const file of incoming) {
    const alreadyAdded = merged.some(
      (existing) =>
        existing.name === file.name &&
        existing.size === file.size &&
        existing.lastModified === file.lastModified
    );

    if (!alreadyAdded) merged.push(file);
    if (merged.length >= MAX_FRAMES) break;
  }

  return merged.slice(0, MAX_FRAMES);
}

function fileSummary(files: File[]) {
  switch (files.length) {
    case 0:
      return "Ingen billeder endnu. Tag første billede.";
    case 1:
      return "1 billede klar. Tag gerne 1-3 mere fra andre vinkler.";
    case 2:
      return "2 billeder klar. Det er et godt startpunkt.";
    case 3:
      return "3 billeder klar. Du kan tage ét mere.";
    default:
      return "4 billeder klar. Jeg har nok.";
  }
}

function quantityLabel(quantity: PantryItem["quantity"]) {
  switch (quantity) {
    case "rigeligt":
      return "Rigeligt";
    case "noget":
      return "Noget";
    case "lidt":
      return "Lidt";
  }
}

function errorMessage(error: string | undefined) {
  switch (error) {
    case "OPENAI_API_KEY_MISSING":
      return "Jeg mangler stadig nøglen til billedforståelsen i produktion.";
    case "ANTHROPIC_API_KEY_MISSING":
      return "Jeg mangler stadig Claude-nøglen til billedforståelsen i produktion.";
    case "VISION_JSON_PARSE_ERROR":
      return "Jeg kunne ikke læse billederne rent nok denne gang. Prøv gerne igen med 2-4 tydelige billeder.";
    case "NO_FRAMES":
      return "Tag mindst ét billede først.";
    default:
      return "Der gik noget galt. Prøv gerne igen om et øjeblik.";
  }
}

export default function Home() {
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recipeRef = useRef<HTMLElement | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [draftItems, setDraftItems] = useState<PantryItem[]>([]);
  const [committedPantry, setCommittedPantry] = useState<Pantry | null>(null);
  const [lastScanAt, setLastScanAt] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [ingredientsDirty, setIngredientsDirty] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showRecipe, setShowRecipe] = useState(false);
  const [suggestionState, setSuggestionState] = useState(createInitialSuggestionState());

  const groupedItems = useMemo(() => {
    const sorted = sortDraftItems(draftItems).map((item, index) => ({ item, index }));
    return {
      certain: sorted.filter(({ item }) => item.confidence >= LOW_CONFIDENCE_CUTOFF),
      doubleCheck: sorted.filter(({ item }) => item.confidence < LOW_CONFIDENCE_CUTOFF),
    };
  }, [draftItems]);

  const suggestionDeck = committedPantry ? buildSuggestionDeck(committedPantry, new Date()) : [];
  const currentIndex = suggestionDeck.length > 0
    ? Math.min(suggestionState.cursor, suggestionDeck.length - 1)
    : 0;
  const currentRanked = suggestionDeck[currentIndex] ?? null;
  const currentAnswer = currentRanked && committedPantry
    ? buildAnswer(currentRanked.recipe, committedPantry, new Date().toISOString())
    : null;
  const alternatives = committedPantry
    ? suggestionDeck
        .map((entry, index) => ({
          index,
          answer: buildAnswer(entry.recipe, committedPantry, new Date().toISOString()),
        }))
        .filter(({ index }) => index !== currentIndex)
        .slice(0, 3)
    : [];
  const hitLimit = suggestionState.rejections >= MAX_REJECTIONS;
  const filePreviews = useMemo(
    () =>
      files.map((file, index) => ({
        id: `${file.name}-${file.lastModified}-${index}`,
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    [files]
  );

  useEffect(() => {
    setShowRecipe(false);
  }, [currentIndex, committedPantry?.lastScanAt]);

  useEffect(() => {
    return () => {
      filePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [filePreviews]);

  useEffect(() => {
    if (showRecipe) {
      recipeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showRecipe]);

  useEffect(() => {
    return () => {
      releaseCameraStream();
    };
  }, []);

  function resetPickerInputs() {
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }

  function releaseCameraStream() {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function stopCamera() {
    releaseCameraStream();
    setCameraOpen(false);
    setCameraBusy(false);
  }

  async function handleOpenCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Dit device giver ikke direkte kamera-adgang her. Brug galleriet som fallback.");
      return;
    }

    try {
      setCameraBusy(true);
      setCameraError(null);
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
        },
      });

      streamRef.current = stream;
      setCameraOpen(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch {
      setCameraError("Jeg kunne ikke åbne kameraet. Tjek kamera-tilladelsen, eller brug galleriet.");
      stopCamera();
    } finally {
      setCameraBusy(false);
    }
  }

  async function handleCapturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("Kameraet er ikke helt klar endnu. Prøv igen om et øjeblik.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Jeg kunne ikke tage billedet rent teknisk. Prøv igen.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      setCameraError("Billedet blev ikke gemt ordentligt. Prøv igen.");
      return;
    }

    const stamp = Date.now();
    const capturedFile = new File([blob], `fridgemap-${stamp}.jpg`, {
      type: "image/jpeg",
      lastModified: stamp,
    });

    let nextCount = 0;
    setFiles((current) => {
      const merged = mergeSelectedFiles(current, [capturedFile]);
      nextCount = merged.length;
      return merged;
    });

    setCameraError(null);
    setStatus("Billede tilføjet. Tag gerne et mere fra en anden vinkel.");

    if (nextCount >= MAX_FRAMES) {
      stopCamera();
    }
  }

  function handleRemovePhoto(indexToRemove: number) {
    setFiles((current) => current.filter((_, index) => index !== indexToRemove));
  }

  function replaceDraftItems(nextItems: PantryItem[]) {
    setDraftItems(sortDraftItems(nextItems));
    if (committedPantry) setIngredientsDirty(true);
  }

  function handlePickedFiles(nextFiles: File[]) {
    if (!nextFiles.length) return;

    const merged = mergeSelectedFiles(files, nextFiles);
    setFiles(merged);
    setCameraError(null);
    resetPickerInputs();

    if (merged.length < files.length + nextFiles.length) {
      setStatus("Jeg holder mig til de første 4 billeder, så scanningen forbliver skarp.");
      return;
    }

    if (status === "VÃ¦lg mindst Ã©t billede fÃ¸rst.") {
      setStatus(null);
    }
  }

  function resetAll() {
    stopCamera();
    setFiles([]);
    setDraftItems([]);
    setCommittedPantry(null);
    setLastScanAt(null);
    setStatus(null);
    setLoading(false);
    setManualInput("");
    setIngredientsDirty(false);
    setShowRecipe(false);
    setSuggestionState(createInitialSuggestionState());
    resetPickerInputs();
  }

  async function handleScan() {
    if (!files.length) {
      setStatus("Tag mindst ét billede først.");
      return;
    }

    try {
      stopCamera();
      setLoading(true);
      setStatus("Jeg kigger lige i køleskabet.");

      const frames = await filesToDataUrls(files);
      const result = await postJSON({ frames });

      if (!result.ok) {
        setStatus(errorMessage(result.error));
        return;
      }

      const seenAt = new Date().toISOString();
      const nextItems = (result.items ?? []).map((item) => makeDraftItem(item, seenAt));

      setDraftItems(sortDraftItems(nextItems));
      setCommittedPantry(null);
      setLastScanAt(seenAt);
      setIngredientsDirty(false);
      setShowRecipe(false);
      setSuggestionState(createInitialSuggestionState());

      if (nextItems.length === 0) {
        setStatus("Jeg fandt ikke nok endnu. Tilføj gerne et par ting selv.");
        return;
      }

      setStatus("Jeg fandt noget. Ret listen, så giver jeg et konkret bud.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Fejl: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleQuantityChange(indexToUpdate: number, quantity: PantryItem["quantity"]) {
    replaceDraftItems(
      draftItems.map((item, index) =>
        index === indexToUpdate ? { ...item, quantity } : item
      )
    );
  }

  function handleRemove(indexToRemove: number) {
    replaceDraftItems(draftItems.filter((_, index) => index !== indexToRemove));
  }

  function handleManualAdd() {
    const rawLabel = manualInput.trim();
    if (!rawLabel) {
      setStatus("Skriv en vare først.");
      return;
    }

    const ingredientId = findIngredientId(rawLabel);
    const duplicate = draftItems.some((item) =>
      ingredientId
        ? item.ingredientId === ingredientId
        : !item.ingredientId && normalizeIngredientLookup(item.rawLabel) === normalizeIngredientLookup(rawLabel)
    );

    if (duplicate) {
      setStatus(`${ingredientId ? displayIngredient(ingredientId) : rawLabel} står allerede på listen.`);
      setManualInput("");
      return;
    }

    const seenAt = lastScanAt ?? new Date().toISOString();
    const nextItem: PantryItem = {
      rawLabel,
      ingredientId,
      quantity: "noget",
      confidence: 1,
      source: "onboarding",
      seenAt,
    };

    replaceDraftItems([
      ...draftItems,
      nextItem,
    ]);
    setLastScanAt(seenAt);
    setManualInput("");
    setStatus(`${displayPantryItem(nextItem)} er lagt til.`);
  }

  function handleSuggest() {
    if (!draftItems.length) {
      setStatus("Tilføj mindst én vare først.");
      return;
    }

    const pantry = createPantry(
      draftItems,
      lastScanAt ?? new Date().toISOString(),
      committedPantry
    );
    const deck = buildSuggestionDeck(pantry, new Date());

    setCommittedPantry(pantry);
    setSuggestionState(createInitialSuggestionState());
    setIngredientsDirty(false);
    setShowRecipe(false);

    if (!deck.length) {
      setStatus("Jeg kan ikke finde en god hverdagsret ud fra det her endnu. Tilføj gerne noget mere bærende.");
      return;
    }

    const firstAnswer = buildAnswer(deck[0].recipe, pantry, new Date().toISOString());
    setStatus(statusLine(firstAnswer));
  }

  function handleSomethingElse() {
    if (!suggestionDeck.length) return;

    const nextState = rejectCurrentSuggestion(suggestionState, suggestionDeck.length);
    setSuggestionState(nextState);
    setShowRecipe(false);

    if (nextState.rejections >= MAX_REJECTIONS) {
      setStatus(OUT_OF_IDEAS);
      return;
    }

    const nextIndex = Math.min(nextState.cursor, suggestionDeck.length - 1);
    const nextAnswer = buildAnswer(
      suggestionDeck[nextIndex].recipe,
      committedPantry!,
      new Date().toISOString()
    );
    setStatus(statusLine(nextAnswer));
  }

  function handleSurprise() {
    if (!suggestionDeck.length) return;
    const surpriseIndex = pickSurpriseIndex(suggestionDeck);
    setSuggestionState((current) => ({ ...current, cursor: surpriseIndex }));
    setShowRecipe(false);

    const surpriseAnswer = buildAnswer(
      suggestionDeck[surpriseIndex].recipe,
      committedPantry!,
      new Date().toISOString()
    );
    setStatus(statusLine(surpriseAnswer));
  }

  function handleResetSuggestions() {
    setSuggestionState(createInitialSuggestionState());
    setShowRecipe(false);
    if (currentAnswer) setStatus(statusLine(currentAnswer));
  }

  function handlePickAlternative(index: number) {
    setSuggestionState({ cursor: index, rejections: 0 });
    setShowRecipe(false);
    const answer = buildAnswer(
      suggestionDeck[index].recipe,
      committedPantry!,
      new Date().toISOString()
    );
    setStatus(statusLine(answer));
  }

  const canAddMorePhotos = files.length < MAX_FRAMES;
  const cameraButtonLabel = files.length === 0 ? "Åbn kameraet" : "Tag et billede mere";

  return (
    <main className="page-shell">
      <div className="page-header">
        <div className="brand-mark">FM</div>
        <div className="brand-copy">
          <p className="kicker">FridgeMap</p>
          <h1>Tag billeder af køleskabet. Få ét godt bud til aftensmad.</h1>
          <p className="lead">{ONBOARDING_LEAD}</p>
        </div>
      </div>

      <div className="page-body">
        <section className="scan-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-label">1. Kig i køleskabet</p>
              <h2>Start med 2-4 tydelige billeder</h2>
              <ul className="scan-tips">
                {SCAN_TIPS.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
            <button type="button" className="quiet-button" onClick={resetAll}>
              Ny runde
            </button>
          </div>

          <div className="scan-controls">
            <div className="file-picker camera-picker">
              <div className="camera-copy">
                <span>Brug kameraet på telefonen</span>
                <p className="camera-hint">{CAMERA_HELP}</p>
              </div>
              {cameraOpen ? (
                <div className="camera-live">
                  <video
                    ref={videoRef}
                    className="camera-preview"
                    autoPlay
                    muted
                    playsInline
                  />

                  <div className="camera-actions">
                    <button
                      type="button"
                      className="cta-button"
                      onClick={handleCapturePhoto}
                      disabled={cameraBusy || loading || !canAddMorePhotos}
                    >
                      Tag billede
                    </button>
                    <button
                      type="button"
                      className="quiet-button"
                      onClick={stopCamera}
                      disabled={cameraBusy}
                    >
                      Luk kamera
                    </button>
                  </div>
                </div>
              ) : (
                <div className="camera-actions">
                  <button
                    type="button"
                    className="cta-button"
                    onClick={handleOpenCamera}
                    disabled={cameraBusy || loading || !canAddMorePhotos}
                  >
                    {cameraBusy ? "Åbner kamera" : cameraButtonLabel}
                  </button>

                  <label className="quiet-button picker-fallback">
                    <span>{BUTTONS.useGallery}</span>
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={cameraBusy || loading || !canAddMorePhotos}
                      onChange={(event) => handlePickedFiles(Array.from(event.target.files || []))}
                    />
                  </label>
                </div>
              )}

              {cameraError ? <p className="camera-error">{cameraError}</p> : null}

              {filePreviews.length > 0 ? (
                <div className="capture-strip" aria-label="Valgte billeder">
                  {filePreviews.map((preview, index) => (
                    <article className="capture-card" key={preview.id}>
                      <img
                        src={preview.url}
                        alt={`Køleskabsbillede ${index + 1}`}
                        className="capture-thumb"
                      />
                      <button
                        type="button"
                        className="capture-remove"
                        onClick={() => handleRemovePhoto(index)}
                      >
                        Fjern
                      </button>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="cta-button"
              onClick={handleScan}
              disabled={loading || files.length === 0}
            >
              {loading ? LOADING_HEADLINE : BUTTONS.inspectPhotos}
            </button>
          </div>

          <p className="helper-text">{fileSummary(files)}</p>

          {status ? (
            <div className="status-banner" role="status">
              <span className="status-pill" />
              <p>{status}</p>
            </div>
          ) : null}

          <div className="editor-grid">
            <section className="editor-card">
              <div className="section-head">
                <div>
                  <p className="panel-label">2. Tjek listen</p>
                  <h3>{draftItems.length > 0 ? "Det her ser jeg" : "Varerne lander her"}</h3>
                </div>
                {draftItems.length > 0 ? (
                  <button type="button" className="quiet-button" onClick={handleSuggest}>
                    Foreslå aftensmad
                  </button>
                ) : null}
              </div>

              {draftItems.length === 0 ? (
                <p className="empty-copy">{EMPTY_PANTRY}</p>
              ) : (
                <>
                  {groupedItems.certain.length > 0 ? (
                    <div className="review-block">
                      <p className="list-label">Ser rigtigt ud</p>
                      <div className="ingredient-list">
                        {groupedItems.certain.map(({ item, index }) => (
                          <article className="ingredient-card" key={`${item.ingredientId ?? item.rawLabel}-${index}`}>
                            <div className="ingredient-copy">
                              <strong>{displayPantryItem(item)}</strong>
                              <span>{pantrySourceLabel(item)}</span>
                            </div>
                            <div className="ingredient-actions">
                              <select
                                className="quantity-select"
                                value={item.quantity}
                                onChange={(event) =>
                                  handleQuantityChange(
                                    index,
                                    event.target.value as PantryItem["quantity"]
                                  )
                                }
                              >
                                <option value="rigeligt">{quantityLabel("rigeligt")}</option>
                                <option value="noget">{quantityLabel("noget")}</option>
                                <option value="lidt">{quantityLabel("lidt")}</option>
                              </select>
                              <button
                                type="button"
                                className="remove-button"
                                onClick={() => handleRemove(index)}
                              >
                                Fjern
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {groupedItems.doubleCheck.length > 0 ? (
                    <div className="review-block warning-block">
                      <p className="list-label">Tjek lige de her</p>
                      <div className="ingredient-list">
                        {groupedItems.doubleCheck.map(({ item, index }) => (
                          <article className="ingredient-card warning-card" key={`${item.ingredientId ?? item.rawLabel}-${index}`}>
                            <div className="ingredient-copy">
                              <strong>{displayPantryItem(item)}</strong>
                              <span>jeg er ikke helt sikker på den</span>
                            </div>
                            <div className="ingredient-actions">
                              <select
                                className="quantity-select"
                                value={item.quantity}
                                onChange={(event) =>
                                  handleQuantityChange(
                                    index,
                                    event.target.value as PantryItem["quantity"]
                                  )
                                }
                              >
                                <option value="rigeligt">{quantityLabel("rigeligt")}</option>
                                <option value="noget">{quantityLabel("noget")}</option>
                                <option value="lidt">{quantityLabel("lidt")}</option>
                              </select>
                              <button
                                type="button"
                                className="remove-button"
                                onClick={() => handleRemove(index)}
                              >
                                Fjern
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="manual-box">
                    <p className="list-label">Tilføj selv noget jeg ikke fik med</p>
                    <div className="manual-row">
                      <input
                        className="text-input"
                        type="text"
                        value={manualInput}
                        placeholder="fx mælk, ris, revet ost eller broccoli"
                        onChange={(event) => setManualInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") handleManualAdd();
                        }}
                      />
                      <button type="button" className="quiet-button" onClick={handleManualAdd}>
                        Tilføj
                      </button>
                    </div>
                  </div>

                  {ingredientsDirty ? (
                    <p className="dirty-note">
                      Listen er ændret. Tryk på <strong>Foreslå aftensmad</strong> igen, så
                      opdaterer jeg buddet.
                    </p>
                  ) : null}
                </>
              )}
            </section>

            <section className="hero-panel">
              <p className="panel-label">3. Mit bedste bud</p>

              {!currentAnswer ? (
                <div className="hero-empty">
                  <h3>Buddet kommer her</h3>
                  <p>
                    Når listen ser rigtig ud, får du ét konkret forslag og det, der eventuelt mangler.
                  </p>
                </div>
              ) : hitLimit ? (
                <div className="out-of-ideas">
                  <h3>Vi er ved kanten af listen</h3>
                  <p>{OUT_OF_IDEAS}</p>
                  <div className="out-of-ideas-actions">
                    <button type="button" className="cta-button" onClick={handleScan} disabled={loading || files.length === 0}>
                      Kig igen
                    </button>
                    <button type="button" className="quiet-button" onClick={handleResetSuggestions}>
                      {BUTTONS.tryAgain}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <AnswerCard
                    answer={currentAnswer}
                    now={new Date()}
                    onShowRecipe={() => setShowRecipe(true)}
                    onSomethingElse={handleSomethingElse}
                    onSurprise={handleSurprise}
                  />

                  {alternatives.length > 0 ? (
                    <div className="alternatives">
                      <div className="section-head compact-head">
                        <div>
                          <p className="panel-label">Flere muligheder</p>
                          <h3>Hvis du vil dreje en tand</h3>
                        </div>
                      </div>

                      <div className="alternatives-grid">
                        {alternatives.map(({ answer, index }) => (
                          <button
                            type="button"
                            className="alternative-card"
                            key={`${answer.recipe.id}-${index}`}
                            onClick={() => handlePickAlternative(index)}
                          >
                            <strong>{answer.recipe.name}</strong>
                            <span>{answer.recipe.minutes} minutter</span>
                            <p>{statusLine(answer)}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </section>
          </div>
        </section>

        {currentAnswer && showRecipe ? (
          <section className="recipe-sheet" ref={recipeRef}>
            <div className="section-head">
              <div>
                <p className="panel-label">Vis retten</p>
                <h2>{currentAnswer.recipe.name}</h2>
              </div>
              <div className="recipe-meta-badge">{currentAnswer.recipe.minutes} minutter</div>
            </div>

            <div className="recipe-grid">
              <div className="recipe-side">
                <div className="recipe-block">
                  <h3>Det bruger jeg</h3>
                  <ul className="ingredient-summary">
                    {currentAnswer.recipe.ingredients
                      .filter(
                        (ingredient) =>
                          !currentAnswer.missing.some(
                            (missing) => missing.ingredientId === ingredient.ingredientId
                          )
                      )
                      .map((ingredient) => (
                        <li key={`have-${ingredient.ingredientId}`}>
                          <span>{ingredient.displayName}</span>
                          <strong>{ingredient.amountText}</strong>
                        </li>
                      ))}
                  </ul>
                </div>

                <div className="recipe-block">
                  <h3>Det mangler I</h3>
                  {currentAnswer.missing.length > 0 ? (
                    <ul className="ingredient-summary missing-summary">
                      {currentAnswer.missing.map((ingredient) => (
                        <li key={`missing-${ingredient.ingredientId}`}>
                          <span>{ingredient.displayName}</span>
                          <strong>{ingredient.amountText}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty-copy">I har det hele.</p>
                  )}
                </div>
              </div>

              <div className="recipe-steps-card">
                <h3>Sådan gør du</h3>
                <ol className="recipe-steps">
                  {currentAnswer.recipe.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
