const fileInput = document.getElementById("imageInput");
const scanBtn = document.getElementById("scanBtn");
const resultBox = document.getElementById("result");

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

scanBtn.addEventListener("click", async () => {
  if (!fileInput || !scanBtn || !resultBox) {
    alert("HTML mangler imageInput / scanBtn / result");
    return;
  }

  if (!fileInput.files || fileInput.files.length === 0) {
    resultBox.innerHTML = "<p>Vælg mindst ét billede.</p>";
    return;
  }

  resultBox.innerHTML = "<p>Analyserer…</p>";

  try {
    const images = [];
    for (const file of fileInput.files) {
      images.push(await fileToBase64(file));
    }

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images })
    });

    const data = await res.json();

    // MATCHER DIN analyze.js
    const ingredients = data.ingredients_detected || [];
    const simple = data.recipes?.simple || {};
    const advanced = data.recipes?.advanced || {};
    const shopping = data.shopping_list || [];

    if (!ingredients.length) {
      resultBox.innerHTML = `<p><strong>Ingen ingredienser fundet</strong></p>`;
      return;
    }

    let html = "<h3>Ingredienser</h3><ul>";
    ingredients.forEach(i => (html += `<li>${i}</li>`));
    html += "</ul>";

    if (simple.title) {
      html += `<h3>Simpel ret</h3><p><strong>${simple.title}</strong></p>`;
    }
    if (advanced.title) {
      html += `<h3>Avanceret ret</h3><p><strong>${advanced.title}</strong></p>`;
    }

    if (shopping.length) {
      html += "<h3>Indkøbsliste</h3><ul>";
      shopping.forEach(i => (html += `<li>${i}</li>`));
      html += "</ul>";
    }

    resultBox.innerHTML = html;
  } catch (e) {
    console.error(e);
    resultBox.innerHTML = "<p>Kunne ikke analysere. Prøv igen.</p>";
  }
});
