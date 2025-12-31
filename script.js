const FOOD_WORDS = [
  "mælk","ost","yoghurt","skyr","smør","citron","løg","kartofler",
  "olie","æg","kaffe","øl","mayonnaise","honning","brød"
];

const RECIPES = [
  {
    title: "Kaffe med mælk",
    desc: "Sort eller mild – dit valg.",
    needs: ["kaffe","mælk"]
  },
  {
    title: "Yoghurt med citron",
    desc: "Let og frisk.",
    needs: ["yoghurt","citron"]
  },
  {
    title: "Ostemad",
    desc: "Simpel klassiker.",
    needs: ["ost","brød"]
  }
];

function run() {
  const raw = document.getElementById("input").value
    .split(",")
    .map(w => w.trim().toLowerCase())
    .filter(Boolean);

  const valid = [];
  const invalid = [];

  raw.forEach(word => {
    FOOD_WORDS.includes(word) ? valid.push(word) : invalid.push(word);
  });

  let html = "";

  if (invalid.length) {
    html += `<div class="warning">Disse ord er ikke mad: ${invalid.join(", ")}</div>`;
  }

  if (!valid.length) {
    html += `<div>Ingen gyldige ingredienser fundet.</div>`;
    document.getElementById("output").innerHTML = html;
    return;
  }

  html += `<div class="selected">Du har valgt: ${valid.join(", ")}</div>`;

  RECIPES.forEach(r => {
    const missing = r.needs.filter(n => !valid.includes(n));
    html += `
      <div class="recipe">
        <strong>${r.title}</strong><br>
        ${r.desc}<br>
        <span class="missing">Mangler: ${missing.join(", ") || "intet"}</span>
      </div>
    `;
  });

  document.getElementById("output").innerHTML = html;
}
