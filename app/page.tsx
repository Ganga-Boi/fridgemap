"use client";

import { useMemo, useState } from "react";

const API_URL = "/api/analyze";

type IngredientPayload = {
  safe?: string[];
  unsure?: string[];
  nonFood?: string[];
};

type RecipeResult = {
  title: string;
  desc: string;
  uses: string[];
  missing: string[];
  score: number;
};

type AnalyzeResponse = {
  ok: boolean;
  mode?: "images" | "ingredients" | "empty";
  ingredients?: IngredientPayload;
  nonFoodFromChosen?: string[];
  chosen?: string[];
  peopleLabel?: string;
  recipes?: RecipeResult[];
  message?: string;
  error?: string;
  details?: string;
};

function normalize(value: string) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?()"]/g, "");
}

function sortItems(items: Iterable<string>) {
  return Array.from(items).sort((a, b) => a.localeCompare(b, "da-DK"));
}

async function filesToDataUrls(files: File[]) {
  const urls: string[] = [];
  for (const file of files.slice(0, 8)) {
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    urls.push(url);
  }
  return urls;
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

  return (await response.json()) as AnalyzeResponse;
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [people, setPeople] = useState("1");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [safe, setSafe] = useState<string[]>([]);
  const [unsure, setUnsure] = useState<string[]>([]);
  const [nonFood, setNonFood] = useState<string[]>([]);
  const [truth, setTruth] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [recipeData, setRecipeData] = useState<{
    chosen: string[];
    peopleLabel: string;
    recipes: RecipeResult[];
  } | null>(null);

  const safeItems = useMemo(() => sortItems(safe), [safe]);
  const unsureItems = useMemo(() => sortItems(unsure), [unsure]);
  const nonFoodItems = useMemo(() => sortItems(nonFood), [nonFood]);
  const truthItems = useMemo(() => sortItems(truth), [truth]);

  const suggestionsVisible =
    safeItems.length > 0 || unsureItems.length > 0 || nonFoodItems.length > 0 || truthItems.length > 0;

  function setFromAnalysis(payload: AnalyzeResponse) {
    const nextSafe = sortItems((payload.ingredients?.safe || []).map(normalize).filter(Boolean));
    const nextSafeSet = new Set(nextSafe);
    const nextUnsure = sortItems(
      (payload.ingredients?.unsure || [])
        .map(normalize)
        .filter((item) => Boolean(item) && !nextSafeSet.has(item))
    );
    const nextNonFood = sortItems((payload.ingredients?.nonFood || []).map(normalize).filter(Boolean));

    setSafe(nextSafe);
    setUnsure(nextUnsure);
    setNonFood(nextNonFood);
    setTruth(sortItems(new Set([...nextSafe, ...nextUnsure])));
    setRecipeData(null);
  }

  function resetAll() {
    setFiles([]);
    setPeople("1");
    setStatus(null);
    setLoading(false);
    setSafe([]);
    setUnsure([]);
    setNonFood([]);
    setTruth([]);
    setManualInput("");
    setRecipeData(null);
  }

  function removeEverywhere(item: string) {
    setSafe((current) => current.filter((entry) => entry !== item));
    setUnsure((current) => current.filter((entry) => entry !== item));
    setNonFood((current) => current.filter((entry) => entry !== item));
    setTruth((current) => current.filter((entry) => entry !== item));
  }

  function moveUnsureToSafe(item: string) {
    setUnsure((current) => current.filter((entry) => entry !== item));
    setSafe((current) => sortItems(new Set([...current, item])));
    setTruth((current) => sortItems(new Set([...current, item])));
  }

  async function handleScan() {
    try {
      if (!files.length) {
        setStatus("Vælg mindst ét billede.");
        return;
      }

      setStatus("Analyserer billeder…");
      setLoading(true);

      const images = await filesToDataUrls(files);
      const result = await postJSON({ images, people });

      if (!result.ok) {
        setStatus("Kunne ikke analysere.");
        return;
      }

      if (result.message === "OPENAI_API_KEY_MISSING") {
        setSafe([]);
        setUnsure([]);
        setNonFood([]);
        setTruth([]);
        setRecipeData(null);
        setStatus("Scanningen er klar i appen, men OPENAI_API_KEY mangler i Vercel. Tilføj nøglen under Settings -> Environment Variables.");
        return;
      }

      setFromAnalysis(result);
      setStatus("Forslag klar. Ret listen og klik “Foreslå retter”.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Fejl: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleDemo() {
    setFromAnalysis({
      ok: true,
      ingredients: {
        safe: ["mælk", "skyr", "mayonnaise"],
        unsure: ["citron", "olie"],
        nonFood: ["benzin"],
      },
    });
    setStatus("Test-mode: ret listen og klik “Foreslå retter”.");
  }

  function handleAddManual() {
    const item = normalize(manualInput);
    if (!item) return;

    setTruth((current) => sortItems(new Set([...current, item])));
    setSafe((current) => sortItems(new Set([...current, item])));
    setUnsure((current) => current.filter((entry) => entry !== item));
    setNonFood((current) => current.filter((entry) => entry !== item));
    setManualInput("");
  }

  async function handleConfirm() {
    try {
      const chosen = truthItems.map(normalize).filter(Boolean);
      if (!chosen.length) {
        setStatus("Tilføj mindst én ingrediens.");
        return;
      }

      setStatus("Beregner forslag…");
      setLoading(true);

      const result = await postJSON({ ingredients: chosen, people });
      if (!result.ok) {
        setStatus("Kunne ikke beregne forslag.");
        return;
      }

      const nonFoodFromChosen = (result.nonFoodFromChosen || []).map(normalize).filter(Boolean);
      if (nonFoodFromChosen.length) {
        setNonFood((current) => sortItems(new Set([...current, ...nonFoodFromChosen])));
        setTruth((current) => current.filter((entry) => !nonFoodFromChosen.includes(entry)));
        setSafe((current) => current.filter((entry) => !nonFoodFromChosen.includes(entry)));
        setUnsure((current) => current.filter((entry) => !nonFoodFromChosen.includes(entry)));
        setStatus("Nogle ord ligner ikke mad og er taget ud af listen. Klik “Foreslå retter” igen.");
        return;
      }

      setRecipeData({
        chosen: result.chosen || chosen,
        peopleLabel: result.peopleLabel || "",
        recipes: result.recipes || [],
      });
      setStatus("Klar.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Fejl: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="fridge-page">
      <div className="wrap">
        <div className="header">
          <div className="logo">
            <img src="/icon-192.png" alt="FridgeMap icon" />
          </div>
          <div className="title">
            <h1>FridgeMap</h1>
            <div className="sub">Upload billeder, ret forslag, og få realistiske retter + mangelliste.</div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="controls">
              <label className="file">
                <span>Billeder</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => setFiles(Array.from(event.target.files || []))}
                />
              </label>

              <select value={people} onChange={(event) => setPeople(event.target.value)}>
                <option value="1">1 person</option>
                <option value="2">2 personer</option>
                <option value="3">3 personer</option>
                <option value="4">4+ personer</option>
              </select>

              <button className="btn" type="button" onClick={handleScan} disabled={loading}>
                Scan
              </button>
              <button className="btn secondary" type="button" onClick={resetAll} disabled={loading}>
                Ny scanning
              </button>
              <button className="btn ghost" type="button" onClick={handleDemo} disabled={loading}>
                Test uden billeder
              </button>
            </div>

            {status ? (
              <div className="status">
                <div className="dot" />
                <div className="text">{status}</div>
              </div>
            ) : null}
          </div>

          <div className="panel-body">
            <div className="grid">
              <div>
                <div className="section-title">1) Forslag (Sikker / Usikker)</div>

                {loading ? (
                  <div className="loading-box">
                    <div className="spinner" />
                    <div className="mini">Analyserer…</div>
                  </div>
                ) : null}

                {!suggestionsVisible ? (
                  <div className="mini">Ingen data endnu. Upload billeder og tryk Scan.</div>
                ) : (
                  <div>
                    <div className="row">
                      <div className="mini">Klik på “Usikker” for at gøre den “Sikker”. Fjern med kryds.</div>
                    </div>

                    <div className="pill-row">
                      {safeItems.map((item) => (
                        <div className="pill good" key={`safe-${item}`}>
                          {item}
                          <button type="button" title="Fjern" onClick={() => removeEverywhere(item)}>
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="pill-row spaced">
                      {unsureItems.map((item) => (
                        <button
                          className="pill warn pill-button"
                          key={`unsure-${item}`}
                          type="button"
                          onClick={() => moveUnsureToSafe(item)}
                        >
                          <span>{item}</span>
                          <span
                            className="remove-inline"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeEverywhere(item);
                            }}
                          >
                            ×
                          </span>
                        </button>
                      ))}
                    </div>

                    {nonFoodItems.length ? (
                      <div className="non-food-wrap">
                        <div className="mini">Ikke-mad (kan fjernes fra listen):</div>
                        <div className="pill-row">
                          {nonFoodItems.map((item) => (
                            <div className="pill bad" key={`non-food-${item}`}>
                              {item}
                              <button type="button" title="Fjern" onClick={() => removeEverywhere(item)}>
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="line" />

                    <div className="section-title">2) Tilføj manuelt</div>
                    <div className="row">
                      <input
                        type="text"
                        placeholder="Tilføj (fx ost, kaffe, yoghurt)"
                        value={manualInput}
                        onChange={(event) => setManualInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") handleAddManual();
                        }}
                      />
                      <button className="btn secondary" type="button" onClick={handleAddManual}>
                        Tilføj
                      </button>
                    </div>

                    <div className="confirm-box">
                      <div className="section-title">Du har valgt:</div>
                      <div className="pill-row">
                        {truthItems.length ? (
                          truthItems.map((item) => (
                            <div className="pill selected" key={`truth-${item}`}>
                              {item}
                              <button type="button" title="Fjern" onClick={() => removeEverywhere(item)}>
                                ×
                              </button>
                            </div>
                          ))
                        ) : (
                          <span>Ingen ingredienser endnu.</span>
                        )}
                      </div>

                      <div className="confirm-actions">
                        <button className="btn" type="button" onClick={handleConfirm} disabled={loading}>
                          Foreslå retter
                        </button>
                        <button className="btn ghost" type="button" onClick={() => setRecipeData(null)}>
                          Ret listen
                        </button>
                      </div>

                      <div className="footer-note">Retter og mangler beregnes ud fra din valgte liste.</div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="section-title">3) Forslag</div>

                {recipeData ? (
                  <>
                    <div className="status status-static">
                      <div className="dot" />
                      <div className="text">
                        <div className="chosen-title">Du har valgt:</div>
                        <div>{recipeData.chosen.join(", ")}</div>
                      </div>
                    </div>

                    <div className="recipes-list">
                      {recipeData.recipes.length ? (
                        recipeData.recipes.map((recipe) => (
                          <div className="recipe-card" key={recipe.title}>
                            <div className="recipe-title">{recipe.title}</div>
                            <div className="recipe-desc">{recipe.desc}</div>

                            <div className="recipe-meta">
                              <span className="label">{recipeData.peopleLabel}</span>
                            </div>

                            <div className="recipe-meta top-gap">
                              <span className="label">Bruger:</span>
                            </div>
                            <div className="pill-row compact">
                              {recipe.uses.length ? (
                                recipe.uses.map((item) => (
                                  <span className="pill selected compact-pill" key={`${recipe.title}-uses-${item}`}>
                                    {item}
                                  </span>
                                ))
                              ) : (
                                <span className="mini">—</span>
                              )}
                            </div>

                            <div className="recipe-meta top-gap">
                              <span className="label">Mangler:</span>
                            </div>
                            <div className="pill-row compact">
                              {recipe.missing.length ? (
                                recipe.missing.map((item) => (
                                  <span className="pill warn compact-pill" key={`${recipe.title}-missing-${item}`}>
                                    {item}
                                  </span>
                                ))
                              ) : (
                                <span className="pill good compact-pill">Mangler intet kritisk</span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="recipe-card">
                          <div className="recipe-title">Ingen gode forslag endnu</div>
                          <div className="recipe-desc">
                            Tilføj 1–2 relevante ting (fx brød, kartofler, æg) og prøv igen.
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="mini top-gap">Klik “Foreslå retter” for at få relevante forslag + mangler.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
