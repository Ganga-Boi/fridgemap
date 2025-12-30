// Elements
const fileInput = document.getElementById("imageInput");
const scanBtn = document.getElementById("scanBtn");
const resultBox = document.getElementById("result");

// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Scan button click
scanBtn.addEventListener("click", async () => {
  if (!fileInput.files.length) {
    resultBox.innerHTML = "<p>Vælg mindst ét billede.</p>";
    return;
  }

  resultBox.innerHTML = "<p>Analyserer billede…</p>";

  try {
    // Convert files to base64
    const images = [];
    for (const file of fileInput.files) {
      const base64 = await fileToBase64(file);
      images.push(base64);
    }

    // Send til backend
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images })
    });

    const data = await res.json();
    renderResult(data);

  } catch (err) {
    console.error(err);
    resultBox.innerHTML = "<p>Kunne ikke analysere billederne. Prøv igen.</p>";
  }
});

// Render result (matcher analyze.js output)
function renderResult(data) {
  const ingredients = data.ingredients_detected || [];
  const simple = data.recipes?.simple || {};
  const advanced = data.recipes?.advanced || {};
  const shopping = data.shopping_list || [];

  if (!ingredients.length) {
    resultBox.innerHTML = `
      <p><strong>Ingen ingredienser fundet</strong></p>
      <p>Prøv at tage nye billeder med bedre lys.</p>
    `;
    return;
  }

  let html = "";

  // Ingredients
  html += "<h3>Ingredienser fundet</h3><ul>";
  ingredients.forEach(i => {
    html += `<li>${i}</li>`;
  });
  html += "</ul>";

  // Simple recipe
  if (simple.title) {
    html += `
      <h3>Simpel ret</h3>
      <p><strong>${simple.title}</strong></p>
      ${simple.missing?.length ? `<p>Mangler: ${simple.missing.join(", ")}</p>` : "<p>Alt på lager</p>"}
    `;
  }

  // Advanced recipe
  if (advanced.title) {
    html += `
      <h3>Avanceret ret</h3>
      <p><strong>${advanced.title}</strong></p>
      ${advanced.missing?.length ? `<p>Mangler: ${advanced.missing.join(", ")}</p>` : "<p>Alt på lager</p>"}
    `;
  }

  // Shopping list
  if (shopping.length) {
    html += "<h3>Indkøbsliste</h3><ul>";
    shopping.forEach(i => {
      html += `<li>${i}</li>`;
    });
    html += "</ul><p><small>Målrettet REMA 1000</small></p>";
  }

  resultBox.innerHTML = html;
}
