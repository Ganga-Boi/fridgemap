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
// Render manuel input (ingen forslag)
// --------------------
function renderManualEntry() {
  resultBox.innerHTML = `
    <h3>✍️ Indtast indholdet af dit køleskab</h3>
    <div class="muted">
      Billedanalyse er endnu ikke aktiv.  
      Indtast selv de ingredienser, du kan se.
    </div>

    <div style="margin-top:12px;">
      <input id="manualInput" type="text" placeholder="Fx mælk, løg, mayonnaise" />
      <button id="addBtn">➕ Tilføj</button>
    </div>

    <ul id="ingredientList"></ul>

    <button id="confirmBtn" style="margin-top:16px;">Bekræft indhold</button>
  `;

  const ingredientList = document.getElementById("ingredientList");

  document.getElementById("addBtn").addEventListener("click", () => {
    const input = document.getElementById("manualInput");
    const value = input.value.trim();
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

    renderConfirmedResult(confirmed);
  });
}

// --------------------
// Render bekræftet sandhed
// --------------------
function renderConfirmedResult(list) {
  if (!list.length) {
    resultBox.innerHTML = `
      <h3>Ingen ingredienser angivet</h3>
      <div class="muted">Du kan tilføje ingredienser manuelt.</div>
    `;
    return;
  }

  resultBox.innerHTML = `
    <h3>✅ Dit køleskab indeholder</h3>
    <ul>${list.map(i => `<li>${i}</li>`).join("")}</ul>
    <div class="muted">
      Dette er den bekræftede sandhed.  
      Opskrifter og mangelliste bygges ovenpå dette.
    </div>
  `;

  console.log("CONFIRMED INGREDIENTS:", list);
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
      Upload billeder af dit køleskab og tryk Scan.  
      Billedanalyse er ikke aktiv endnu.
    </div>
  `;
});
