// --------------------
// Elements
// --------------------
const fileInput = document.getElementById("imageInput");
const scanBtn = document.getElementById("scanBtn");
const resetBtn = document.getElementById("resetBtn");
const resultBox = document.getElementById("result");
const statusEl = document.getElementById("status");

// --------------------
// MOCK vision-resultat
// (erstattes senere af rigtig billedanalyse)
// --------------------
const mockVisionResult = {
  confirmed: ["kartofler", "løg", "øl"],
  uncertain: [
    { label: "mayonnaise", alternatives: ["remoulade", "dressing"] },
    { label: "sauce", alternatives: ["pesto", "chili", "soja"] }
  ]
};

// --------------------
// Helpers
// --------------------
function setStatus(text) {
  statusEl.textContent = text || "";
}

function showLoading() {
  resultBox.innerHTML = `
    <div style="text-align:center; padding:32px;">
      <div class="muted">Analyserer billeder…</div>
    </div>
  `;
}

// --------------------
// Render forslagsskærm
// --------------------
function renderSuggestions(data) {
  resultBox.innerHTML = `
    <h3>🧠 FridgeMap foreslår</h3>

    <h4>✔️ Sikker</h4>
    <ul id="confirmedList"></ul>

    <h4>❓ Usikker</h4>
    <ul id="uncertainList"></ul>

    <div style="margin-top:12px;">
      <input id="manualInput" type="text" placeholder="Tilføj ingrediens…" />
      <button id="addManualBtn">➕ Tilføj</button>
    </div>

    <button id="confirmBtn" style="margin-top:16px;">Bekræft indhold</button>
  `;

  const confirmedList = document.getElementById("confirmedList");
  const uncertainList = document.getElementById("uncertainList");

  // Sikker
  data.confirmed.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    li.dataset.value = item;
    confirmedList.appendChild(li);
  });

  // Usikker
  data.uncertain.forEach(item => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = item.label + " ";

    const select = document.createElement("select");
    [item.label, ...item.alternatives, "Fjern"].forEach(opt => {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      select.appendChild(o);
    });

    li.appendChild(label);
    li.appendChild(select);
    uncertainList.appendChild(li);
  });

  // Manuel tilføjelse
  document.getElementById("addManualBtn").addEventListener("click", () => {
    const input = document.getElementById("manualInput");
    const value = input.value.trim();
    if (!value) return;

    const li = document.createElement("li");
    li.textContent = value;
    li.dataset.value = value;
    confirmedList.appendChild(li);
    input.value = "";
  });

  // Bekræft sandheden
  document.getElementById("confirmBtn").addEventListener("click", () => {
    const confirmed = [];

    document.querySelectorAll("#confirmedList li").forEach(li => {
      confirmed.push(li.dataset.value);
    });

    document.querySelectorAll("#uncertainList select").forEach(sel => {
      if (sel.value !== "Fjern") {
        confirmed.push(sel.value);
      }
    });

    renderConfirmedResult(confirmed);
  });
}

// --------------------
// Render bekræftet sandhed
// --------------------
function renderConfirmedResult(list) {
  resultBox.innerHTML = `
    <h3>✅ Dit køleskab indeholder</h3>
    <ul>${list.map(i => `<li>${i}</li>`).join("")}</ul>
    <div class="muted">Dette er nu den bekræftede sandhed.</div>
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

  setStatus("Forbereder…");
  showLoading();

  // Simuler analyse
  setTimeout(() => {
    setStatus("");
    renderSuggestions(mockVisionResult);
  }, 800);
});

resetBtn.addEventListener("click", () => {
  fileInput.value = "";
  setStatus("");
  resultBox.innerHTML = `<div class="muted">Vælg 1–8 billeder af dit køleskab og tryk Scan.</div>`;
});
