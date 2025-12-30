// --------------------
// Elements
// --------------------
const fileInput = document.getElementById("imageInput");
const scanBtn = document.getElementById("scanBtn");
const resetBtn = document.getElementById("resetBtn");
const resultBox = document.getElementById("result");
const statusEl = document.getElementById("status");

// --------------------
// Helpers
// --------------------
function setStatus(text) {
  statusEl.textContent = text || "";
}

// --------------------
// Render manuel indtastning
// --------------------
function renderManualEntry() {
  resultBox.innerHTML = `
    <h3>✍️ Indtast indholdet af dit køleskab</h3>
    <div class="muted">Dette er den bekræftede sandhed.</div>

    <div style="margin-top:12px;">
      <input id="manualInput" type="text" placeholder="Fx mælk, skyr, citron" />
      <button id="addBtn">➕ Tilføj</button>
    </div>

    <ul id="ingredientList"></ul>

    <button id="confirmBtn" style="margin-top:16px;">Se hvad jeg kan lave</button>
  `;

  const ingredientList = document.getElementById("ingredientList");

  document.getElementById("addBtn").addEventListener("click", () => {
    const input = document.getElementById("manualInput");
    const value = input.value.trim().toLowerCase();
    if (!value) return;

    const li = document.createElement("li");
    li.textContent = value;
    ingredientList.appendChild(li);
    input.value = "";
  });

  document.getElementById("confirmBtn").addEventListener("click", () => {
    const confirmed = [];
    ingredientList.querySelectorAll("li").forEach(li => {
      confirmed.push(li.textContent);
    });
    renderRecipes(confirmed);
  });
}

// --------------------
// OPSKRIFTSMOTOR
// --------------------
const RECIPES = [
  {
    title: "Citron-skyr dressing",
    needs: ["skyr", "citron", "olie"],
    description: "Frisk dressing til salat eller grønt."
  },
  {
    title: "Citronmayonnaise",
    needs: ["majonæse", "citron"],
    description: "Perfekt til fisk, kartofler eller sandwich."
  },
  {
    title: "Kold yoghurtsauce",
    needs: ["mælk", "skyr", "citron"],
    description: "Let sauce til grønt eller kød."
  },
  {
    title: "Pandekager (basis)",
    needs: ["mælk", "æg", "mel"],
    description: "Klassiske pandekager."
  },
  {
    title: "Simpel vinaigrette",
    needs: ["olie", "citron"],
    description: "Hurtig dressing – tilsæt evt. sennep."
  }
];

// --------------------
// Render opskrifter
// --------------------
function renderRecipes(ingredients) {
  const haveSet = new Set(ingredients);
  let html = `<h3>🍽️ Det kan du lave</h3>`;

  RECIPES.forEach(r => {
    const missing = r.needs.filter(n => !haveSet.has(n));

    if (missing.length === 0) {
      html += `
        <div style="margin-top:12px;">
          <strong class="ok">✔️ ${r.title}</strong>
          <div class="muted">${r.description}</div>
        </div>
      `;
    } else {
      html += `
        <div style="margin-top:12px;">
          <strong class="warn">🛒 ${r.title}</strong>
          <div class="muted">${r.description}</div>
          <div class="muted">Mangler: ${missing.join(", ")}</div>
        </div>
      `;
    }
  });

  resultBox.innerHTML = html;
}

// --------------------
// Events
// --------------------
scanBtn.addEventListener("click", () => {
  if (!fileInput.files || fileInput.files.length === 0) {
    resultBox.innerHTML = `<strong>Vælg mindst ét billede.</strong>`;
    return;
  }
  setStatus("Billeder modtaget");
  renderManualEntry();
});

resetBtn.addEventListener("click", () => {
  fileInput.value = "";
  setStatus("");
  resultBox.innerHTML = `
    <div class="muted">
      Upload billeder og bekræft indholdet.  
      Opskrifter bygges ovenpå sandheden.
    </div>
  `;
});
