const resultBox = document.getElementById("result");

// --------------------
// OPSKRIFTER
// --------------------
const RECIPES = [
  {
    title: "Yoghurt med ost og citron",
    needs: ["yoghurt", "ost", "citron"],
    description: "Let, cremet og frisk."
  },
  {
    title: "Ostemad",
    needs: ["ost", "brød"],
    description: "Simpel klassiker."
  },
  {
    title: "Kaffe med mælk",
    needs: ["kaffe", "mælk"],
    description: "Sort eller mild – dit valg."
  },
  {
    title: "Yoghurt bowl",
    needs: ["yoghurt", "honning"],
    description: "God til morgenmad."
  }
];

// --------------------
// STEP 1 – INPUT
// --------------------
function renderInput() {
  resultBox.innerHTML = `
    <h3>✍️ Hvad har du?</h3>
    <input id="ingredientInput" type="text" placeholder="fx ost, kaffe, yoghurt" />
    <button id="nextBtn">Næste</button>
  `;

  document.getElementById("nextBtn").onclick = () => {
    const raw = document.getElementById("ingredientInput").value;
    const list = raw
      .split(",")
      .map(i => i.trim().toLowerCase())
      .filter(Boolean);

    if (!list.length) return;
    renderConfirm(list);
  };
}

// --------------------
// STEP 2 – BEKRÆFT
// --------------------
function renderConfirm(list) {
  resultBox.innerHTML = `
    <h3>✅ Bekræft indhold</h3>
    <div class="muted">Du har indtastet:</div>
    <ul>${list.map(i => `<li>${i}</li>`).join("")}</ul>
    <button id="confirmBtn">Ja, det er korrekt</button>
    <button id="backBtn">Ret</button>
  `;

  document.getElementById("confirmBtn").onclick = () => {
    renderRecipes(list);
  };

  document.getElementById("backBtn").onclick = () => {
    renderInput();
  };
}

// --------------------
// STEP 3 – OPSKRIFTER
// --------------------
function renderRecipes(ingredients) {
  const have = new Set(ingredients);
  let html = `<h3>🍽️ Hvad du kan lave</h3>`;

  RECIPES.forEach(r => {
    const missing = r.needs.filter(n => !have.has(n));

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
// INIT
// --------------------
renderInput();
