const resultBox = document.getElementById("result");

// --------------------
// OPSKRIFTER (simpel, stabil)
// --------------------
const RECIPES = [
  {
    title: "Yoghurt med citron",
    needs: ["yoghurt", "citron"],
    description: "Let og frisk."
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
// STEP 1 – INPUT + BILLEDER
// --------------------
function renderInput() {
  resultBox.innerHTML = `
    <h3>Hvad har du?</h3>

    <input id="ingredientInput" type="text"
      placeholder="fx ost, kaffe, yoghurt" />

    <div class="muted">
      Du kan også uploade billeder (bruges som hjælp – ikke sandhed)
    </div>

    <input id="imageInput" type="file" multiple accept="image/*" />

    <button id="nextBtn">Næste</button>
  `;

  document.getElementById("nextBtn").onclick = () => {
    const raw = document.getElementById("ingredientInput").value;
    const list = raw
      .split(",")
      .map(i => i.trim().toLowerCase())
      .filter(Boolean);

    renderConfirm(list);
  };
}

// --------------------
// STEP 2 – BEKRÆFT (SANDHED)
// --------------------
function renderConfirm(list) {
  resultBox.innerHTML = `
    <h3>Bekræft indhold</h3>
    <div class="muted">Dette bliver den bekræftede sandhed:</div>

    <ul>
      ${list.map(i => `<li>${i}</li>`).join("")}
    </ul>

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
// STEP 3 – OPSKRIFTER (DESIGN UÆNDRET)
// --------------------
function renderRecipes(ingredients) {
  const haveSet = new Set(ingredients);

  let html = `
    <div class="have-line">
      Du har valgt: ${ingredients.join(", ")}
    </div>

    <h3>Hvad du kan lave</h3>
  `;

  RECIPES.forEach(r => {
    const missing = r.needs.filter(n => !haveSet.has(n));

    html += `
      <div class="recipe">
        <strong>${r.title}</strong><br/>
        <span class="muted">${r.description}</span><br/>
        ${
          missing.length
            ? `<span class="missing">Mangler: ${missing.join(", ")}</span>`
            : `<span style="color:#0a7a2f;">Du har det hele</span>`
        }
      </div>
    `;
  });

  resultBox.innerHTML = html;
}

// --------------------
// INIT
// --------------------
renderInput();
