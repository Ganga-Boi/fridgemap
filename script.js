/* FridgeMap v1.4 – Frontend
   - Scan billeder -> /api/analyze (Edge)
   - Modtag: safe/unsure + nonFood
   - Brugeren retter og bekræfter
   - Send bekræftet liste -> /api/analyze (ingredients mode)
   - Modtag: sorterede opskrifter med overlap + mangler
*/

const API_URL = "/api/analyze";

const els = {
  files: document.getElementById("files"),
  people: document.getElementById("people"),
  scanBtn: document.getElementById("scanBtn"),
  resetBtn: document.getElementById("resetBtn"),
  demoBtn: document.getElementById("demoBtn"),

  status: document.getElementById("status"),
  statusText: document.getElementById("statusText"),

  loadingBox: document.getElementById("loadingBox"),

  suggestionsEmpty: document.getElementById("suggestionsEmpty"),
  suggestionsWrap: document.getElementById("suggestionsWrap"),

  safeRow: document.getElementById("safeRow"),
  unsureRow: document.getElementById("unsureRow"),

  nonFoodWrap: document.getElementById("nonFoodWrap"),
  nonFoodRow: document.getElementById("nonFoodRow"),

  manualInput: document.getElementById("manualInput"),
  addBtn: document.getElementById("addBtn"),

  truthRow: document.getElementById("truthRow"),
  confirmBtn: document.getElementById("confirmBtn"),
  editBtn: document.getElementById("editBtn"),

  truthBanner: document.getElementById("truthBanner"),
  truthBannerList: document.getElementById("truthBannerList"),

  recipesEmpty: document.getElementById("recipesEmpty"),
  recipesWrap: document.getElementById("recipesWrap"),
};

const state = {
  safe: new Set(),
  unsure: new Set(),
  nonFood: new Set(),
  truth: new Set(),
};

function normalize(s) {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?()"]/g, "");
}

function showStatus(text) {
  els.status.classList.remove("hidden");
  els.statusText.textContent = text;
}
function hideStatus() {
  els.status.classList.add("hidden");
}

function showLoading(on) {
  if (on) els.loadingBox.classList.remove("hidden");
  else els.loadingBox.classList.add("hidden");
}

function setSuggestionsVisible(visible) {
  if (visible) {
    els.suggestionsEmpty.classList.add("hidden");
    els.suggestionsWrap.classList.remove("hidden");
  } else {
    els.suggestionsEmpty.classList.remove("hidden");
    els.suggestionsWrap.classList.add("hidden");
  }
}

function renderPill(text, variant, { onClick, onRemove } = {}) {
  const pill = document.createElement("div");
  pill.className = `pill ${variant || ""}`.trim();
  pill.textContent = text;

  if (onClick) {
    pill.style.cursor = "pointer";
    pill.addEventListener("click", (e) => {
      if (e.target && e.target.tagName === "BUTTON") return;
      onClick();
    });
  }

  if (onRemove) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.title = "Fjern";
    btn.textContent = "×";
    btn.addEventListener("click", onRemove);
    pill.appendChild(btn);
  }
  return pill;
}

function renderLists() {
  els.safeRow.innerHTML = "";
  els.unsureRow.innerHTML = "";
  els.nonFoodRow.innerHTML = "";
  els.truthRow.innerHTML = "";

  const safe = Array.from(state.safe).sort();
  const unsure = Array.from(state.unsure).sort();
  const nonFood = Array.from(state.nonFood).sort();
  const truth = Array.from(state.truth).sort();

  safe.forEach((item) => {
    els.safeRow.appendChild(
      renderPill(item, "good", {
        onRemove: () => {
          state.safe.delete(item);
          state.truth.delete(item);
          renderLists();
        }
      })
    );
  });

  unsure.forEach((item) => {
    els.unsureRow.appendChild(
      renderPill(item, "warn", {
        onClick: () => {
          state.unsure.delete(item);
          state.safe.add(item);
          state.truth.add(item);
          renderLists();
        },
        onRemove: () => {
          state.unsure.delete(item);
          state.truth.delete(item);
          renderLists();
        }
      })
    );
  });

  if (nonFood.length) {
    els.nonFoodWrap.classList.remove("hidden");
    nonFood.forEach((item) => {
      els.nonFoodRow.appendChild(
        renderPill(item, "bad", {
          onRemove: () => {
            // fjern fra nonFood og fra truth (så den ikke påvirker forslag)
            state.nonFood.delete(item);
            state.truth.delete(item);
            renderLists();
          }
        })
      );
    });
  } else {
    els.nonFoodWrap.classList.add("hidden");
  }

  if (truth.length) {
    truth.forEach((item) => {
      els.truthRow.appendChild(
        renderPill(item, "selected", {
          onRemove: () => {
            state.truth.delete(item);
            state.safe.delete(item);
            state.unsure.delete(item);
            state.nonFood.delete(item);
            renderLists();
          }
        })
      );
    });
  } else {
    els.truthRow.appendChild(document.createTextNode("Ingen ingredienser endnu."));
  }
}

function seedFromAnalysis(payload) {
  state.safe.clear();
  state.unsure.clear();
  state.nonFood.clear();
  state.truth.clear();

  const safe = (payload?.ingredients?.safe || []).map(normalize).filter(Boolean);
  const unsure = (payload?.ingredients?.unsure || []).map(normalize).filter(Boolean);
  const nonFood = (payload?.ingredients?.nonFood || []).map(normalize).filter(Boolean);

  // safe > unsure
  const safeSet = new Set(safe);
  const unsureSet = new Set(unsure.filter((x) => !safeSet.has(x)));

  safeSet.forEach((x) => { state.safe.add(x); state.truth.add(x); });
  unsureSet.forEach((x) => { state.unsure.add(x); state.truth.add(x); });

  // nonFood må ikke automatisk med i truth – men vi viser dem som “ikke-mad”
  nonFood.forEach((x) => state.nonFood.add(x));

  setSuggestionsVisible(true);
  renderLists();
}

async function filesToDataUrls(fileList) {
  const files = Array.from(fileList || []);
  const urls = [];
  for (const f of files.slice(0, 8)) {
    const url = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
    urls.push(url);
  }
  return urls;
}

async function postJSON(body) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`API fejl (${res.status}): ${t}`.trim());
  }
  return res.json();
}

function renderRecipes(payload) {
  const recipes = payload?.recipes || [];
  const chosen = payload?.chosen || [];
  const peopleLabel = payload?.peopleLabel || "";

  els.truthBanner.classList.remove("hidden");
  els.truthBannerList.textContent = chosen.length ? chosen.join(", ") : "";

  els.recipesEmpty.classList.add("hidden");
  els.recipesWrap.classList.remove("hidden");
  els.recipesWrap.innerHTML = "";

  if (!recipes.length) {
    const card = document.createElement("div");
    card.className = "recipe-card";
    card.innerHTML = `
      <div class="recipe-title">Ingen gode forslag endnu</div>
      <div class="recipe-desc">Tilføj 1–2 relevante ting (fx brød, kartofler, æg) og prøv igen.</div>
    `;
    els.recipesWrap.appendChild(card);
    return;
  }

  recipes.forEach((r) => {
    const uses = (r.uses || []);
    const missing = (r.missing || []);

    const usesHtml = uses.length
      ? uses.map(x => `<span class="pill selected" style="padding:6px 10px; font-size:12px;">${escapeHtml(x)}</span>`).join(" ")
      : `<span class="mini">—</span>`;

    const missingHtml = missing.length
      ? missing.map(x => `<span class="pill warn" style="padding:6px 10px; font-size:12px;">${escapeHtml(x)}</span>`).join(" ")
      : `<span class="pill good" style="padding:6px 10px; font-size:12px;">Mangler intet kritisk</span>`;

    const card = document.createElement("div");
    card.className = "recipe-card";
    card.innerHTML = `
      <div class="recipe-title">${escapeHtml(r.title)}</div>
      <div class="recipe-desc">${escapeHtml(r.desc)}</div>

      <div class="recipe-meta">
        <span class="label">${peopleLabel ? escapeHtml(peopleLabel) : ""}</span>
      </div>

      <div class="recipe-meta" style="margin-top:8px;">
        <span class="label">Bruger:</span>
      </div>
      <div class="pill-row" style="margin-top:6px;">${usesHtml}</div>

      <div class="recipe-meta" style="margin-top:10px;">
        <span class="label">Mangler:</span>
      </div>
      <div class="pill-row" style="margin-top:6px;">${missingHtml}</div>
    `;
    els.recipesWrap.appendChild(card);
  });
}

function escapeHtml(s) {
  return (s || "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* Events */

els.scanBtn.addEventListener("click", async () => {
  try {
    if (!els.files.files || els.files.files.length === 0) {
      showStatus("Vælg mindst ét billede.");
      return;
    }

    showStatus("Analyserer billeder…");
    showLoading(true);
    els.scanBtn.disabled = true;

    const people = els.people.value;
    const images = await filesToDataUrls(els.files.files);

    const out = await postJSON({ images, people });

    if (out?.ok !== true) {
      showStatus("Kunne ikke analysere.");
      showLoading(false);
      els.scanBtn.disabled = false;
      return;
    }

    seedFromAnalysis(out);

    showStatus("Forslag klar. Ret listen og klik “Foreslå retter”.");
  } catch (err) {
    showStatus(`Fejl: ${err.message}`);
  } finally {
    showLoading(false);
    els.scanBtn.disabled = false;
  }
});

els.demoBtn.addEventListener("click", () => {
  // Demo: viser flow uden billeder
  seedFromAnalysis({
    ok: true,
    ingredients: {
      safe: ["mælk", "skyr", "mayonnaise"],
      unsure: ["citron", "olie"],
      nonFood: ["benzin"]
    }
  });
  showStatus("Test-mode: ret listen og klik “Foreslå retter”.");
});

els.resetBtn.addEventListener("click", () => {
  state.safe.clear();
  state.unsure.clear();
  state.nonFood.clear();
  state.truth.clear();

  els.safeRow.innerHTML = "";
  els.unsureRow.innerHTML = "";
  els.nonFoodRow.innerHTML = "";
  els.truthRow.innerHTML = "";
  els.recipesWrap.innerHTML = "";

  els.truthBanner.classList.add("hidden");
  els.recipesWrap.classList.add("hidden");
  els.recipesEmpty.classList.remove("hidden");

  setSuggestionsVisible(false);
  els.files.value = "";
  els.manualInput.value = "";
  hideStatus();
});

els.addBtn.addEventListener("click", () => {
  const item = normalize(els.manualInput.value);
  if (!item) return;

  // Manuel input er “sikker” – men vi lader API afgøre, om det er mad/non-food
  state.truth.add(item);
  state.safe.add(item);
  state.unsure.delete(item);
  state.nonFood.delete(item);

  els.manualInput.value = "";
  renderLists();
});

els.manualInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") els.addBtn.click();
});

els.editBtn.addEventListener("click", () => {
  els.truthBanner.classList.add("hidden");
  els.recipesWrap.classList.add("hidden");
  els.recipesEmpty.classList.remove("hidden");
  showStatus("Ret listen og klik “Foreslå retter”.");
});

els.confirmBtn.addEventListener("click", async () => {
  try {
    const people = els.people.value;
    const chosen = Array.from(state.truth).map(normalize).filter(Boolean);

    if (!chosen.length) {
      showStatus("Tilføj mindst én ingrediens.");
      return;
    }

    showStatus("Beregner forslag…");
    showLoading(true);
    els.confirmBtn.disabled = true;

    const out = await postJSON({ ingredients: chosen, people });

    if (out?.ok !== true) {
      showStatus("Kunne ikke beregne forslag.");
      return;
    }

    // API kan returnere “nonFoodFromChosen” (ord der ikke er mad)
    const nonFoodFromChosen = (out?.nonFoodFromChosen || []).map(normalize).filter(Boolean);
    if (nonFoodFromChosen.length) {
      // flyt dem ud som nonFood og ud af truth
      nonFoodFromChosen.forEach((x) => {
        state.nonFood.add(x);
        state.truth.delete(x);
        state.safe.delete(x);
        state.unsure.delete(x);
      });
      renderLists();
      showStatus("Nogle ord ligner ikke mad og er taget ud af listen. Klik “Foreslå retter” igen.");
      return;
    }

    renderRecipes(out);
    showStatus("Klar.");
  } catch (err) {
    showStatus(`Fejl: ${err.message}`);
  } finally {
    showLoading(false);
    els.confirmBtn.disabled = false;
  }
});
