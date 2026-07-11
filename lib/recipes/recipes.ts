/**
 * SEED-RETTER — 5 eksempler der demonstrerer kontrakten.
 * =======================================================
 * Formål: at Allan kan skyde på STRUKTUREN, før vi producerer 120.
 * Bemærk især:
 *  - bærende vs. fleksibel pr. ingrediens (det der gør løftet holdbart)
 *  - steps: én handling pr. trin, imperativ, ingen kokke-lyrik
 *  - approved: true = håndgodkendt. AI-udkast fødes med false.
 */

import type { Recipe } from "../../types/contracts";

export const SEED_RECIPES: Recipe[] = [
  {
    id: "one-pot-pasta-kylling",
    name: "One-pot pasta med kylling",
    minutes: 25,
    category: "pasta",
    childFriendly: true,
    allergens: ["gluten", "laktose"],
    ingredients: [
      { ingredientId: "kyllingebryst",        displayName: "kyllingebryst",        role: "bærende",   amountText: "400 g" },
      { ingredientId: "pasta_skruer",         displayName: "pastaskruer",          role: "bærende",   amountText: "300 g" },
      { ingredientId: "floede",               displayName: "fløde",                role: "bærende",   amountText: "2,5 dl" },
      { ingredientId: "loeg",                 displayName: "løg",                  role: "fleksibel", amountText: "1 stk" },
      { ingredientId: "hvidloeg",             displayName: "hvidløg",              role: "fleksibel", amountText: "2 fed" },
      { ingredientId: "revet_ost",            displayName: "revet ost",            role: "fleksibel", amountText: "en håndfuld" },
    ],
    steps: [
      "Skær kyllingen i tern.",
      "Brun kyllingen i en stor gryde, 3–4 minutter.",
      "Tilsæt hakket løg og hvidløg, steg 2 minutter.",
      "Hæld pasta, fløde og 4 dl vand i gryden.",
      "Lad det simre under låg i 12 minutter — rør et par gange.",
      "Smag til med salt og peber, top med ost.",
    ],
    approved: true,
  },
  {
    id: "kylling-i-karry",
    name: "Kylling i karry med ris",
    minutes: 30,
    category: "ris",
    childFriendly: true,
    allergens: ["laktose"],
    ingredients: [
      { ingredientId: "kyllingebryst",        displayName: "kyllingebryst",        role: "bærende",   amountText: "400 g" },
      { ingredientId: "kokosmaelk",           displayName: "kokosmælk",            role: "bærende",   amountText: "1 dåse" },
      { ingredientId: "ris",                  displayName: "ris",                  role: "bærende",   amountText: "3 dl" },
      { ingredientId: "karrypasta",           displayName: "karry",                role: "bærende",   amountText: "1 spsk" },
      { ingredientId: "loeg",                 displayName: "løg",                  role: "fleksibel", amountText: "1 stk" },
      { ingredientId: "gulerod",              displayName: "gulerødder",           role: "fleksibel", amountText: "2 stk" },
      { ingredientId: "floede",               displayName: "fløde",                role: "fleksibel", amountText: "1 dl" },
    ],
    steps: [
      "Sæt risene over efter anvisningen på posen.",
      "Skær kylling, løg og gulerødder i mundrette stykker.",
      "Steg løg og karry i gryden 1 minut, til det dufter.",
      "Tilsæt kylling og brun den kort.",
      "Hæld kokosmælk ved og lad det simre 12–15 minutter.",
      "Smag til — servér over risene.",
    ],
    approved: true,
  },
  {
    id: "pandekage-taco-torsdag",
    name: "Madpandekager med oksekødsfyld",
    minutes: 35,
    category: "pande",
    childFriendly: true,
    allergens: ["gluten", "laktose", "æg"],
    ingredients: [
      { ingredientId: "hakket_oksekoed",      displayName: "hakket oksekød",       role: "bærende",   amountText: "400 g" },
      { ingredientId: "aeg",                  displayName: "æg",                   role: "bærende",   amountText: "3 stk" },
      { ingredientId: "maelk",                displayName: "mælk",                 role: "bærende",   amountText: "4 dl" },
      { ingredientId: "hvedemel",             displayName: "hvedemel",             role: "bærende",   amountText: "250 g" },
      { ingredientId: "tomat_haakket_daase", displayName: "hakkede tomater",      role: "fleksibel", amountText: "1 dåse" },
      { ingredientId: "revet_ost",            displayName: "revet ost",            role: "fleksibel", amountText: "til topping" },
      { ingredientId: "peberfrugt",           displayName: "peberfrugt",           role: "fleksibel", amountText: "1 stk" },
    ],
    steps: [
      "Pisk æg, mælk, mel og en knivspids salt til pandekagedej — lad den hvile.",
      "Brun kødet på panden.",
      "Tilsæt hakkede tomater og evt. peberfrugt, lad det simre 10 minutter.",
      "Bag pandekagerne imens.",
      "Fyld pandekagerne med kød, top med ost, rul sammen.",
    ],
    approved: true,
  },
  {
    id: "broccolisuppe-med-broed",
    name: "Broccolisuppe med brød",
    minutes: 20,
    category: "suppe",
    childFriendly: false,
    allergens: ["laktose"],
    ingredients: [
      { ingredientId: "broccoli",             displayName: "broccoli",             role: "bærende",   amountText: "1 stort hoved" },
      { ingredientId: "kartofler",            displayName: "kartofler",            role: "bærende",   amountText: "3 stk" },
      { ingredientId: "loeg",                 displayName: "løg",                  role: "bærende",   amountText: "1 stk" },
      { ingredientId: "floede",               displayName: "fløde",                role: "fleksibel", amountText: "1 dl" },
      { ingredientId: "bouillon_terning",     displayName: "bouillonterning",      role: "fleksibel", amountText: "1 stk" },
    ],
    steps: [
      "Hak løg, kartofler og broccoli groft.",
      "Svits løget i gryden 2 minutter.",
      "Tilsæt kartofler, broccoli, bouillon og vand til det lige dækker.",
      "Kog 12 minutter, til kartoflerne er møre.",
      "Blend suppen, rør fløden i, smag til.",
    ],
    approved: true,
  },
  {
    id: "spaghetti-koedsovs-klassisk",
    name: "Spaghetti med kødsovs",
    minutes: 30,
    category: "pasta",
    childFriendly: true,
    allergens: ["gluten"],
    ingredients: [
      { ingredientId: "hakket_oksekoed",      displayName: "hakket oksekød",       role: "bærende",   amountText: "400 g" },
      { ingredientId: "spaghetti",            displayName: "spaghetti",            role: "bærende",   amountText: "300 g" },
      { ingredientId: "tomat_haakket_daase", displayName: "hakkede tomater",      role: "bærende",   amountText: "2 dåser" },
      { ingredientId: "loeg",                 displayName: "løg",                  role: "fleksibel", amountText: "1 stk" },
      { ingredientId: "hvidloeg",             displayName: "hvidløg",              role: "fleksibel", amountText: "2 fed" },
      { ingredientId: "gulerod",              displayName: "gulerod",              role: "fleksibel", amountText: "1 stk, revet" },
      { ingredientId: "parmesan",             displayName: "parmesan",             role: "fleksibel", amountText: "til servering" },
    ],
    steps: [
      "Svits løg og hvidløg i en gryde.",
      "Brun kødet ved høj varme.",
      "Tilsæt tomater og revet gulerod, lad sovsen simre 15 minutter.",
      "Kog spaghettien imens.",
      "Smag sovsen til, servér med parmesan.",
    ],
    approved: true,
  },
];
