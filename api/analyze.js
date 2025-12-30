const fileInput = document.getElementById("imageInput");
const scanBtn = document.getElementById("scanBtn");
const resultBox = document.getElementById("result");

scanBtn.addEventListener("click", async () => {
  if (!fileInput.files.length) {
    resultBox.innerHTML = "<p>Vælg et billede først.</p>";
    return;
  }

  resultBox.innerHTML = "<p>Analyserer billede…</p>";

  const formData = new FormData();
  formData.append("image", fileInput.files[0]);

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    renderResult(data);
  } catch (err) {
    console.error(err);
    resultBox.innerHTML = "<p>Der opstod en fejl.</p>";
  }
});

function renderResult(data) {
  const ingredients = data.ingredients || [];
  const recipe = data.recipe || null;
  const shop = data.shop || null;

  if (!ingredients.length) {
    resultBox.innerHTML = `
      <p><strong>Ingen ingredienser fundet</strong></p>
      <p>Prøv at tage nye billeder med bedre lys.</p>
    `;
    return;
  }

  let html = `<h3>Fundne ingredienser</h3><ul>`;
  ingredients.forEach(i => {
    html += `<li>${i}</li>`;
  });
  html += `</ul>`;

  if (recipe) {
    html += `
      <h3>Forslag til ret</h3>
      <p><strong>${recipe.title}</strong></p>
      <p>${recipe.description}</p>
      <h4>Sådan gør du</h4>
      <ol>
        ${recipe.steps.map(s => `<li>${s}</li>`).join("")}
      </ol>
    `;
  }

  if (shop) {
    html += `
      <h3>Indkøb (${shop.store})</h3>
      <ul>
        ${shop.items.map(
          i => `<li>${i.name} – ${i.price} kr.</li>`
        ).join("")}
      </ul>
      <p><strong>Total: ${shop.total} kr.</strong></p>
    `;
  }

  resultBox.innerHTML = html;
}
