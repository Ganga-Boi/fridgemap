"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AnswerCard from "../components/AnswerCard";
import FoodIllustration from "../components/FoodIllustration";
import Onboarding from "../components/Onboarding";
import {
  HOME_COPY,
  BUTTONS,
  CAMERA_FALLBACK,
  EMPTY_PANTRY,
  LOADING_HEADLINE,
  OUT_OF_IDEAS,
  REVIEW_OPTIONAL_HEADING,
  REVIEW_OPTIONAL_SUB,
  SCAN_REASSURANCE,
  SCAN_STATUS,
  SCAN_TIPS,
  addedToList,
  alreadyOnList,
  allergySummary,
  fileSummary,
  goalLabel,
  peopleLabel,
  scanErrorMessage,
  statusLine,
} from "../lib/copy";
import {
  MAX_REJECTIONS,
  applyEveningRule,
  createInitialSuggestionState,
  rejectCurrentSuggestion,
} from "../lib/homeState";
import { DEFAULT_HOUSEHOLD } from "../lib/household";
import { buildIngredientRegistry, normalizeIngredientLookup } from "../lib/ingredientRegistry";
import { buildAnswer, filterCandidates, rankFallback, type RankedRecipe } from "../lib/matcher";
import {
  ONBOARDING_STORAGE_KEY,
  parseOnboardingProfile,
  profileToHousehold,
  type OnboardingProfile,
} from "../lib/onboarding";
import { allApprovedRecipes } from "../lib/recipes/recipeEngine";
import {
  ACCEPTED_CONFIDENCE_CUTOFF,
  type Pantry,
  type PantryItem,
  type ScanAnalysisResponse,
} from "../types/contracts";

const API_URL = "/api/analyze";
const MAX_FRAMES = 4;
const MAX_IMAGE_DIMENSION = 1280; // P1: klientkomprimering (Vercel-grænse ~4,5 MB)
const JPEG_QUALITY = 0.72;
const APPROVED_RECIPES = allApprovedRecipes();
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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** P1: Nedskalér og komprimér på klienten, så 4 mobilfotos aldrig
 *  rammer Vercels payload-grænse. Falder tilbage til rå dataURL,
 *  hvis dekodning fejler — et scan må aldrig strande på komprimering. */
async function fileToCompressedDataUrl(file: File): Promise<string> {
  const rawDataUrl = await readFileAsDataUrl(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("IMAGE_DECODE_FAILED"));
      el.src = rawDataUrl;
    });

    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(1, longest));

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext("2d");
    if (!context) return rawDataUrl;

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } catch {
    return rawDataUrl;
  }
}

function filesToDataUrls(files: File[]) {
  return Promise.all(files.slice(0, MAX_FRAMES).map(fileToCompressedDataUrl));
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

function buildSuggestionDeck(
  pantry: Pantry,
  now: Date,
  candidateRecipes: ReturnType<typeof filterCandidates>,
  householdProfile: typeof DEFAULT_HOUSEHOLD
) {
  return applyEveningRule(
    rankFallback(
      candidateRecipes,
      pantry,
      householdProfile,
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

/** Androids dokumentvælger kan tilbagekalde sin midlertidige filreference,
 *  så snart change-eventet er slut. Kopiér derfor bytes med det samme til en
 *  selvstændig File, som appen ejer, før brugeren når videre til scanning. */
async function materializePickedFiles(files: File[]) {
  return Promise.all(
    files.slice(0, MAX_FRAMES).map(async (file, index) => {
      const bytes = await file.arrayBuffer();
      return new File([bytes], file.name || `fridgemap-upload-${index + 1}.jpg`, {
        type: file.type || "image/jpeg",
        lastModified: file.lastModified || Date.now(),
      });
    })
  );
}

function isPhotoReadError(error: unknown) {
  const name =
    typeof DOMException !== "undefined" && error instanceof DOMException
      ? error.name
      : "";
  const message = error instanceof Error ? error.message : String(error);

  return (
    ["NotReadableError", "NotFoundError", "SecurityError"].includes(name) ||
    /requested file could not be read|permission|file.*read/i.test(message)
  );
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


function isTouchLikeDevice() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const coarsePointer =
    typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  const hasTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
  const isTouchMac = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || isTouchMac;

  return isMobileDevice && (hasTouch || coarsePointer);
}

function waitForVideoReady(video: HTMLVideoElement, timeoutMs = 2500) {
  if (video.videoWidth > 0 && video.videoHeight > 0) {
    return Promise.resolve(true);
  }

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      settle(video.videoWidth > 0 && video.videoHeight > 0);
    }, timeoutMs);

    function cleanup() {
      window.clearTimeout(timeoutId);
      video.removeEventListener("loadedmetadata", handleReady);
      video.removeEventListener("loadeddata", handleReady);
      video.removeEventListener("canplay", handleReady);
      video.removeEventListener("playing", handleReady);
    }

    function settle(ready: boolean) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(ready);
    }

    function handleReady() {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        settle(true);
      }
    }

    video.addEventListener("loadedmetadata", handleReady);
    video.addEventListener("loadeddata", handleReady);
    video.addEventListener("canplay", handleReady);
    video.addEventListener("playing", handleReady);
  });
}

export default function Home() {
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recipeRef = useRef<HTMLElement | null>(null);
  const scanPanelRef = useRef<HTMLElement | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [draftItems, setDraftItems] = useState<PantryItem[]>([]);
  const [committedPantry, setCommittedPantry] = useState<Pantry | null>(null);
  const [lastScanAt, setLastScanAt] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [touchLikeDevice, setTouchLikeDevice] = useState(false);
  const [showRecipe, setShowRecipe] = useState(false);
  const [suggestionState, setSuggestionState] = useState(createInitialSuggestionState());
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [onboardingProfile, setOnboardingProfile] = useState<OnboardingProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);

  const householdProfile = useMemo(
    () => onboardingProfile ? profileToHousehold(onboardingProfile) : DEFAULT_HOUSEHOLD,
    [onboardingProfile]
  );
  const candidateRecipes = useMemo(
    () => filterCandidates(APPROVED_RECIPES, householdProfile),
    [householdProfile]
  );

  const groupedItems = useMemo(() => {
    const sorted = sortDraftItems(draftItems).map((item, index) => ({ item, index }));
    return {
      certain: sorted.filter(({ item }) => item.confidence >= ACCEPTED_CONFIDENCE_CUTOFF),
      doubleCheck: sorted.filter(({ item }) => item.confidence < ACCEPTED_CONFIDENCE_CUTOFF),
    };
  }, [draftItems]);

  const suggestionDeck = committedPantry
    ? buildSuggestionDeck(committedPantry, new Date(), candidateRecipes, householdProfile)
    : [];
  const currentIndex = suggestionDeck.length > 0
    ? Math.min(suggestionState.cursor, suggestionDeck.length - 1)
    : 0;
  const currentRanked = suggestionDeck[currentIndex] ?? null;
  const currentAnswer = currentRanked && committedPantry
    ? buildAnswer(currentRanked.recipe, committedPantry, new Date().toISOString())
    : null;
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
    setTouchLikeDevice(isTouchLikeDevice());
  }, []);

  useEffect(() => {
    const savedProfile = parseOnboardingProfile(
      window.localStorage.getItem(ONBOARDING_STORAGE_KEY)
    );
    setOnboardingProfile(savedProfile);
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    return () => {
      releaseCameraStream();
    };
  }, []);

  function resetPickerInputs() {
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = "";
  }

  function openNativeCamera() {
    nativeCameraInputRef.current?.click();
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
    setCameraReady(false);
  }

  /** P5: Preview-fejl må aldrig efterlade brugeren uden udgang.
   *  Mobil: åbn native kamera direkte. Desktop: åbn galleri-vælgeren.
   *  Beskeden er følgeskab — handlingen er allerede sket. */
  function fallbackToNativeCapture() {
    stopCamera();
    setCameraError(null);
    if (touchLikeDevice || isTouchLikeDevice()) {
      setStatus(CAMERA_FALLBACK.mobile);
      openNativeCamera();
      return;
    }
    setStatus(CAMERA_FALLBACK.desktop);
    galleryInputRef.current?.click();
  }

  async function handleOpenCamera() {
    const shouldUseNativeCamera = touchLikeDevice || isTouchLikeDevice();
    if (shouldUseNativeCamera) {
      setTouchLikeDevice(true);
      setCameraError(null);
      openNativeCamera();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      fallbackToNativeCapture();
      return;
    }

    try {
      setCameraBusy(true);
      setCameraReady(false);
      setCameraError(null);
      releaseCameraStream();
      setCameraOpen(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
        },
      });

      streamRef.current = stream;

      setCameraOpen(true);
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

      const video = videoRef.current;
      if (!video) {
        fallbackToNativeCapture();
        return;
      }

      video.srcObject = stream;
      await video.play().catch(() => undefined);

      const previewReady = await waitForVideoReady(video);
      if (!previewReady) {
        fallbackToNativeCapture();
        return;
      }
      setCameraReady(true);
    } catch {
      fallbackToNativeCapture();
    } finally {
      setCameraBusy(false);
    }
  }

  async function handleCapturePhoto() {
    const video = videoRef.current;
    if (!cameraReady || !video || !video.videoWidth || !video.videoHeight) {
      fallbackToNativeCapture();
      return;
    }

    const captureScale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(video.videoWidth, video.videoHeight)
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * captureScale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * captureScale));

    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError(CAMERA_FALLBACK.captureFailed);
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
    });

    if (!blob) {
      setCameraError(CAMERA_FALLBACK.captureFailed);
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
    setStatus(SCAN_STATUS.photoAdded);

    if (nextCount >= MAX_FRAMES) {
      stopCamera();
    }
  }

  function handleRemovePhoto(indexToRemove: number) {
    setFiles((current) => current.filter((_, index) => index !== indexToRemove));
  }

  /** P2: Fælles commit — pantry bygges, deck beregnes, svaret sættes.
   *  Kaldes af scan OG af enhver frivillig rettelse: buddet opdaterer
   *  sig selv, brugeren skal aldrig trykke "foreslå" (produktloven). */
  function commitAndSuggest(items: PantryItem[], seenAt: string) {
    const pantry = createPantry(items, seenAt, committedPantry);
    const deck = buildSuggestionDeck(
      pantry,
      new Date(),
      candidateRecipes,
      householdProfile
    );

    setCommittedPantry(pantry);
    setSuggestionState(createInitialSuggestionState());
    setShowRecipe(false);

    if (!deck.length) {
      setStatus(SCAN_STATUS.noGoodDish);
      return;
    }

    setStatus(statusLine(buildAnswer(deck[0].recipe, pantry, new Date().toISOString())));
  }

  function replaceDraftItems(nextItems: PantryItem[]) {
    const sorted = sortDraftItems(nextItems);
    setDraftItems(sorted);
    if (committedPantry) {
      commitAndSuggest(sorted, lastScanAt ?? new Date().toISOString());
    }
  }

  async function handlePickedFiles(nextFiles: File[]) {
    if (!nextFiles.length) {
      resetPickerInputs();
      return;
    }

    try {
      const durableFiles = await materializePickedFiles(nextFiles);
      const merged = mergeSelectedFiles(files, durableFiles);
      setFiles(merged);
      stopCamera();
      setCameraError(null);

      if (merged.length < files.length + durableFiles.length) {
        setStatus(SCAN_STATUS.keepingFirstFour);
        return;
      }

      setStatus(SCAN_STATUS.photoAdded);
    } catch {
      setStatus(SCAN_STATUS.photoReadFailed);
    } finally {
      resetPickerInputs();
    }
  }

  function handleCompleteOnboarding(profile: OnboardingProfile) {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(profile));
    setOnboardingProfile(profile);
    setEditingProfile(false);
    setSuggestionState(createInitialSuggestionState());
    setShowRecipe(false);
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
    setCameraError(null);
    setShowRecipe(false);
    setSuggestionState(createInitialSuggestionState());
    resetPickerInputs();
  }

  async function handleScan() {
    if (!files.length) {
      setStatus(SCAN_STATUS.needPhotoFirst);
      return;
    }

    try {
      stopCamera();
      setLoading(true);
      setStatus(SCAN_STATUS.looking);

      const frames = await filesToDataUrls(files);
      const result = await postJSON({ frames });

      if (!result.ok) {
        setStatus(scanErrorMessage(result.error));
        return;
      }

      const seenAt = new Date().toISOString();
      const nextItems = (result.items ?? []).map((item) => makeDraftItem(item, seenAt));

      const sorted = sortDraftItems(nextItems);
      setDraftItems(sorted);
      setLastScanAt(seenAt);

      if (nextItems.length === 0) {
        setCommittedPantry(null);
        setStatus(SCAN_STATUS.foundNothing);
        return;
      }

      // P2 — produktloven: scan → svar direkte. Ingen port.
      commitAndSuggest(sorted, seenAt);
    } catch (error) {
      setStatus(isPhotoReadError(error) ? SCAN_STATUS.photoReadFailed : SCAN_STATUS.scanFailed);
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
      setStatus(SCAN_STATUS.writeItemFirst);
      return;
    }

    const ingredientId = findIngredientId(rawLabel);
    const duplicate = draftItems.some((item) =>
      ingredientId
        ? item.ingredientId === ingredientId
        : !item.ingredientId &&
          normalizeIngredientLookup(item.rawLabel) === normalizeIngredientLookup(rawLabel)
    );

    if (duplicate) {
      setStatus(alreadyOnList(ingredientId ? displayIngredient(ingredientId) : rawLabel));
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

    replaceDraftItems([...draftItems, nextItem]);
    setLastScanAt(seenAt);
    setManualInput("");
    setStatus(addedToList(displayPantryItem(nextItem)));
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
  const hasRoundActivity = Boolean(
    files.length || draftItems.length || committedPantry || status || loading || cameraOpen
  );
  const hasScanResult = Boolean(lastScanAt || draftItems.length || committedPantry);

  if (!profileLoaded) {
    return (
      <main className="profile-loading" aria-label="Indlæser FridgeMap">
        <span className="mini-brand-mark">FM</span>
      </main>
    );
  }

  if (!onboardingProfile || editingProfile) {
    return (
      <Onboarding
        initialProfile={editingProfile ? onboardingProfile : null}
        onComplete={handleCompleteOnboarding}
        onCancel={onboardingProfile ? () => setEditingProfile(false) : undefined}
      />
    );
  }

  return (
    <main className={`page-shell${hasRoundActivity ? " page-shell--active" : ""}`}>
      <header className="app-topbar">
        <div className="mini-brand" aria-label="FridgeMap">
          <span className="mini-brand-mark">FM</span>
          <span>FridgeMap</span>
        </div>

        <button type="button" className="profile-button" onClick={() => setEditingProfile(true)}>
          <span className="profile-button-dot" aria-hidden="true" />
          {HOME_COPY.savedProfile}
        </button>
      </header>

      <div className="page-body">
        {!hasRoundActivity ? (
          <section className="home-hero">
            <div className="home-hero-copy">
              <p className="kicker">{HOME_COPY.eyebrow}</p>
              <h1>{HOME_COPY.headline}</h1>
              <p className="home-lead">{HOME_COPY.lead}</p>

              <div className="profile-chips" aria-label="Din profil">
                <span>{peopleLabel(onboardingProfile.people)}</span>
                <span>{goalLabel(onboardingProfile.goals[0])}</span>
                <span>{allergySummary(onboardingProfile.allergies)}</span>
              </div>

              <p className="home-promise">{HOME_COPY.promise}</p>

              <button
                type="button"
                className="home-scan-button"
                onClick={() => scanPanelRef.current?.scrollIntoView({ behavior: "smooth" })}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="capture-icon">
                  <path d="M8.5 5.5 10 3.75h4l1.5 1.75H18A3 3 0 0 1 21 8.5v8A3 3 0 0 1 18 19.5H6a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3h2.5Z" />
                  <circle cx="12" cy="12.5" r="3.25" />
                </svg>
                {HOME_COPY.scanCta}
              </button>
            </div>

            <div className="home-hero-visual">
              <FoodIllustration compact />
              <div className="home-visual-note">
                <span className="home-visual-number">01</span>
                <div>
                  <strong>Se, hvad du har</strong>
                  <small>Så finder vi det bedste sted at starte.</small>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section
          ref={scanPanelRef}
          className={`scan-panel${hasRoundActivity ? "" : " scan-panel--intro"}`}
        >
          <div className="panel-heading">
            <div>
              <p className="panel-label">{HOME_COPY.scanEyebrow}</p>
              <h2>{HOME_COPY.scanHeadline}</h2>
              <p className="scan-lead">{HOME_COPY.scanLead}</p>
              <ul className="scan-tips">
                {SCAN_TIPS.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
            {hasRoundActivity ? (
              <button type="button" className="round-reset" onClick={resetAll}>
                Start forfra
              </button>
            ) : null}
          </div>

          <div className="scan-controls">
            <div className="camera-picker">
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
                      disabled={cameraBusy || loading || !canAddMorePhotos || !cameraReady}
                    >
                      {cameraReady ? "Tag billede" : "Klargør kamera..."}
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
                <div className="capture-actions">
                  <button
                    type="button"
                    className="capture-primary"
                    onClick={handleOpenCamera}
                    disabled={cameraBusy || loading || !canAddMorePhotos}
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="capture-icon">
                      <path d="M8.5 5.5 10 3.75h4l1.5 1.75H18A3 3 0 0 1 21 8.5v8A3 3 0 0 1 18 19.5H6a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3h2.5Z" />
                      <circle cx="12" cy="12.5" r="3.25" />
                    </svg>
                    <span>{cameraBusy ? "Åbner kamera" : BUTTONS.takePhotos}</span>
                  </button>

                  <button
                    type="button"
                    className="capture-secondary"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={cameraBusy || loading || !canAddMorePhotos}
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="capture-icon">
                      <rect x="3" y="4" width="18" height="16" rx="2.5" />
                      <circle cx="9" cy="9" r="1.5" />
                      <path d="m5.5 17 4.25-4.25 3.25 3.25 2.25-2.25L19 17.5" />
                    </svg>
                    <span>{BUTTONS.useGallery}</span>
                  </button>

                  <input
                    ref={nativeCameraInputRef}
                    className="sr-only-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    tabIndex={-1}
                    disabled={cameraBusy || loading || !canAddMorePhotos}
                    onChange={(event) => handlePickedFiles(Array.from(event.target.files || []))}
                  />

                  <input
                    ref={galleryInputRef}
                    className="sr-only-input"
                    type="file"
                    accept="image/*"
                    multiple
                    tabIndex={-1}
                    disabled={cameraBusy || loading || !canAddMorePhotos}
                    onChange={(event) => handlePickedFiles(Array.from(event.target.files || []))}
                  />
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

            {files.length > 0 ? (
              <button
                type="button"
                className="cta-button scan-submit"
                onClick={handleScan}
                disabled={loading}
              >
                {loading ? LOADING_HEADLINE : BUTTONS.inspectPhotos}
              </button>
            ) : null}
          </div>

          <p className="helper-text">
            {files.length > 0 ? fileSummary(files.length) : SCAN_REASSURANCE}
          </p>

          {status ? (
            <div className="status-banner" role="status">
              <span className="status-pill" />
              <p>{status}</p>
            </div>
          ) : null}

          {hasScanResult ? (
          <div className="editor-grid">
            <section className="editor-card">
              <div className="section-head">
                <div>
                  <p className="panel-label">{REVIEW_OPTIONAL_HEADING}</p>
                  <h3>{draftItems.length > 0 ? "Det her ser jeg" : "Varerne lander her"}</h3>
                  {draftItems.length > 0 ? (
                    <p className="empty-copy">{REVIEW_OPTIONAL_SUB}</p>
                  ) : null}
                </div>
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
                          <article
                            className="ingredient-card"
                            key={`${item.ingredientId ?? item.rawLabel}-${index}`}
                          >
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
                          <article
                            className="ingredient-card warning-card"
                            key={`${item.ingredientId ?? item.rawLabel}-${index}`}
                          >
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

                </>
              )}
            </section>

            <section className="hero-panel">
              <p className="panel-label">Mit bedste bud</p>

              {!currentAnswer ? (
                <div className="hero-empty">
                  <h3>Buddet kommer her</h3>
                  <p>Tag billederne, så kommer buddet af sig selv — med det, der eventuelt mangler.</p>
                </div>
              ) : hitLimit ? (
                <div className="out-of-ideas">
                  <h3>Vi er ved kanten af listen</h3>
                  <p>{OUT_OF_IDEAS}</p>
                  <div className="out-of-ideas-actions">
                    <button
                      type="button"
                      className="cta-button"
                      onClick={handleScan}
                      disabled={loading || files.length === 0}
                    >
                      Kig igen
                    </button>
                    <button
                      type="button"
                      className="quiet-button"
                      onClick={handleResetSuggestions}
                    >
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

                </>
              )}
            </section>
          </div>
          ) : null}
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
