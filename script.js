// Elements
const fileInput = document.getElementById("imageInput");
const peopleSelect = document.getElementById("peopleSelect");
const scanBtn = document.getElementById("scanBtn");
const resetBtn = document.getElementById("resetBtn");
const resultBox = document.getElementById("result");
const statusEl = document.getElementById("status");

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error(`Billedet er for stort (${(file.size / 1024 / 1024).toFixed(1)} MB). Maks 2 MB.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string' && result.length > 3_000_000) {
        reject(new Error("Billedet er for stort efter konvertering."));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Kunne ikke læse billedfilen."));
    reader.readAsDataURL(file);
  });
}

function setStatus(text) {
  statusEl.textContent = text || "";
}

function showLoading() {
  resultBox.innerHTML = `
    <div style="text-align:center; padding:32px;">
      <div style="width:40px; height:40px; border:4px solid #ddd; border-top:4px solid #2aa793; border-radius:50%; animation: spin 1s linear infinite; margin:0 auto;"></div>
      <div class="muted" style="margin-top:16px;">Analyserer billeder…</div>
    </div>
    <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
  `;
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
      <div><strong>🔍 Ingen ingredienser fundet</strong></div>
      <div class="muted">Prøv billeder med bedre lys eller nærmeoptagelser.</div>
      ${data?.debug ? `<div class="small muted">Debug: ${escapeHtml(data.debug)}</div>` : ""}
    `;
    return;
  }

  let html = "";

  html += `<h3>✅ Fundne ingredienser</h3><ul>`;
  have.forEach(i => html += `<li class="ok">${escapeHtml(i)}</li>`);
  html += `</ul>`;

  if (missing.length) {
    html += `<h3>🛒 Mangler</h3><ul>`;
    missing.forEach(i => html += `<li class="bad">${escapeHtml(i)}</li>`);
    html += `</ul>`;
  }

  if (recipe.title) {
    html += `
      <h3>🍳 Forslag til ret</h3>
      <div><strong>${escapeHtml(recipe.title)}</strong> <span class="muted">(${escapeHtml(recipe.difficulty || "nem")})</span></div>
      <div class="muted">${escapeHtml(recipe.description || "")}</div>
    `;
  }

  if ((priceEstimate.min || 0) > 0 || (priceEstimate.max || 0) > 0) {
    html += `
      <h3>💰 Prisestimat</h3>
      <div><strong>${escapeHtml(priceEstimate.min)}–${escapeHtml(priceEstimate.max)} ${escapeHtml(priceEstimate.currency || "DKK")}</strong></div>
      <div class="small muted">${escapeHtml(priceEstimate.store || "")}</div>
    `;
  }

  resultBox.innerHTML = html;
}

resetBtn.addEventListener("click", () => {
  fileInput.value = "";
  peopleSelect.value = "1";
  setStatus("");
  resultBox.innerHTML = `<div class="muted">Vælg 1–8 billeder (gerne tæt på hylderne), og tryk Scan.</div>`;
});

scanBtn.addEventListener("click", async () => {
  if (!fileInput.files || fileInput.files.length === 0) {
    resultBox.innerHTML = `<div><strong>Vælg mindst ét billede.</strong></div>`;
    return;
  }

  scanBtn.disabled = true;
  try {
    setStatus("Forbereder…");
    showLoading();

    const images = [];
    for (const file of fileInput.files) {
      if (images.length >= 8) break;
      try {
        const base64 = await fileToBase64(file);
        images.push(base64);
      } catch (err) {
        resultBox.innerHTML = `<div><strong>❌ ${escapeHtml(err.message)}</strong></div>`;
        scanBtn.disabled = false;
        return;
      }
    }

    const people = peopleSelect.value;
    setStatus("Sender til server…");

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images, people })
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      resultBox.innerHTML = `<div><strong>Kunne ikke analysere.</strong></div><div class="small muted">${escapeHtml(t)}</div>`;
      return;
    }

    const data = await res.json().catch(() => null);
    if (!data) {
      resultBox.innerHTML = `<div><strong>Ugyldigt svar.</strong></div>`;
      return;
    }

    if (data.error_code) {
      resultBox.innerHTML = `
        <div><strong>Kunne ikke analysere billeder.</strong></div>
        <div class="small muted">Kode: ${escapeHtml(data.error_code)}</div>
        ${data.debug ? `<div class="small muted">Debug: ${escapeHtml(data.debug)}</div>` : ""}
      `;
      return;
    }

    renderResult(data);

  } catch (err) {
    console.error(err);
    resultBox.innerHTML = `<div><strong>Der opstod en fejl.</strong></div><div class="small muted">${escapeHtml(err?.message)}</div>`;
  } finally {
    scanBtn.disabled = false;
    setStatus("");
  }
});
