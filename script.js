// Elements
const fileInput = document.getElementById("imageInput");
const scanBtn = document.getElementById("scanBtn");
const resetBtn = document.getElementById("resetBtn");
const resultBox = document.getElementById("result");
const statusEl = document.getElementById("status");

// Convert file to base64 (DataURL)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setStatus(text) {
  statusEl.textContent = text || "";
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderResult(data) {
  const recipe = data?.recipe || {};
  const ingredients = data?.ingredients || {};
  const priceEstimate = data?.priceEstimate || {};

  const have = ingredients.have || [];
  const missing = ingredients.missing || [];

  if (!have.length) {
    resultBox.innerHTML = `
      <div><strong>Ingen ingredienser fundet</strong></div>
      <div class="muted">Prøv at tage nye billeder med bedre lys.</div>
      ${data?.debug ? `<div class="small muted">Debug: ${escapeHtml(data.debug)}</div>` : ""}
    `;
    return;
  }

  let html = "";

  html += `<h3>Fundne ingredienser</h3><ul>`;
  have.forEach(i => html += `<li class="ok">✓ ${escapeHtml(i)}</li>`);
  html += `</ul>`;

  if (missing.length) {
    html += `<h3>Mangler</h3><ul>`;
    missing.forEach(i => html += `<li class="bad">✗ ${escapeHtml(i)}</li>`);
    html += `</ul>`;
  }

  if (recipe.title) {
    html += `
      <h3>Forslag til ret</h3>
      <div><strong>${escapeHtml(recipe.title)}</strong> <span class="muted">(${escapeHtml(recipe.difficulty || "nem")})</span></div>
      <div class="muted">${escapeHtml(recipe.description || "")}</div>
    `;
  }

  if ((priceEstimate.min || 0) > 0 || (priceEstimate.max || 0) > 0) {
    html += `
      <h3>Prisestimat</h3>
      <div><strong>${escapeHtml(priceEstimate.min)}–${escapeHtml(priceEstimate.max)} ${escapeHtml(priceEstimate.currency || "DKK")}</strong></div>
      <div class="small muted">${escapeHtml(priceEstimate.store || "")}</div>
    `;
  }

  resultBox.innerHTML = html;
}

resetBtn.addEventListener("click", () => {
  // Nulstil UI stabilt
  fileInput.value = "";
  setStatus("");
  resultBox.innerHTML = `<div class="muted">Vælg 1–8 billeder (gerne tæt på hylderne), og tryk Scan.</div>`;
});

scanBtn.addEventListener("click", async () => {
  try {
    if (!fileInput.files || fileInput.files.length === 0) {
      resultBox.innerHTML = `<div><strong>Vælg et billede først.</strong></div>`;
      return;
    }

    setStatus("Konverterer billeder…");
    resultBox.innerHTML = `<div class="muted">Analyserer…</div>`;

    // Convert selected files to base64
    const images = [];
    for (const file of fileInput.files) {
      // rimelig limit (undgå at sende 30 billeder)
      if (images.length >= 8) break;
      const base64 = await fileToBase64(file);
      images.push(base64);
    }

    setStatus("Sender til /api/analyze…");

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images })
    });

    // Hvis API fejler helt, vis tydelig fejl
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      setStatus("");
      resultBox.innerHTML = `<div><strong>Kunne ikke analysere billederne. Prøv igen.</strong></div><div class="small muted">${escapeHtml(t)}</div>`;
      return;
    }

    const data = await res.json().catch(() => null);
    setStatus("");

    if (!data) {
      resultBox.innerHTML = `<div><strong>Ugyldigt svar fra server.</strong></div>`;
      return;
    }

    // Standardiseret: hvis backend sender error_code
    if (data.error_code) {
      resultBox.innerHTML = `
        <div><strong>Kunne ikke analysere billederne. Prøv igen.</strong></div>
        <div class="small muted">Kode: ${escapeHtml(data.error_code)}</div>
        ${data.debug ? `<div class="small muted">Debug: ${escapeHtml(data.debug)}</div>` : ""}
      `;
      return;
    }

    renderResult(data);

  } catch (err) {
    console.error(err);
    setStatus("");
    resultBox.innerHTML = `<div><strong>Der opstod en fejl.</strong></div><div class="small muted">${escapeHtml(err?.message)}</div>`;
  }
});
