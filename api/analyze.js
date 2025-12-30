export const config = {
  maxDuration: 30,
};

// Recipe database - simple mapping based on common ingredients
const RECIPE_DATABASE = {
  simple: [
    { title: "Omelet med ost", requires: ["æg", "ost"], missing: [] },
    { title: "Spejlæg", requires: ["æg"], missing: [] },
    { title: "Ostesandwich", requires: ["ost", "brød"], missing: [] },
    { title: "Yoghurt med frugt", requires: ["yoghurt"], missing: [] },
    { title: "Rugbrød med smør", requires: ["brød", "smør"], missing: [] },
    { title: "Ost og skinke", requires: ["ost", "skinke"], missing: [] },
    { title: "Æg og bacon", requires: ["æg", "bacon"], missing: [] },
    { title: "Simpel salat", requires: ["salat", "tomat"], missing: [] },
    { title: "Kogt æg med mayo", requires: ["æg", "mayonnaise"], missing: [] },
    { title: "Brød med ost", requires: ["brød", "ost"], missing: [] },
  ],
  advanced: [
    { title: "Æggekage med grønt", requires: ["æg"], missing: ["løg", "peberfrugt", "fløde"] },
    { title: "Pasta carbonara", requires: ["æg", "ost"], missing: ["pasta", "bacon", "fløde"] },
    { title: "Kyllingesalat", requires: ["salat"], missing: ["kylling", "dressing", "croutoner"] },
    { title: "Omelett med fyld", requires: ["æg", "ost"], missing: ["skinke", "champignon", "peberfrugt"] },
    { title: "Grøn smoothie", requires: ["mælk", "yoghurt"], missing: ["banan", "spinat", "honning"] },
    { title: "Pandestegte kartofler med æg", requires: ["æg"], missing: ["kartofler", "løg", "persille"] },
    { title: "Toast med avocado og æg", requires: ["æg", "brød"], missing: ["avocado", "citron", "chili"] },
    { title: "Cremede scrambled eggs", requires: ["æg", "smør"], missing: ["fløde", "purløg", "brød"] },
    { title: "Cheese quesadilla", requires: ["ost"], missing: ["tortilla", "salsa", "creme fraiche"] },
    { title: "Grøntsagssuppe", requires: ["gulerod"], missing: ["kartofler", "løg", "bouillon", "selleri"] },
  ]
};

// Normalize ingredient names
function normalizeIngredient(ingredient) {
  const normalized = ingredient.toLowerCase().trim();
  
  const mappings = {
    'egg': 'æg', 'eggs': 'æg', 'æg': 'æg',
    'cheese': 'ost', 'ost': 'ost',
    'milk': 'mælk', 'mælk': 'mælk',
    'butter': 'smør', 'smør': 'smør',
    'bread': 'brød', 'brød': 'brød',
    'ham': 'skinke', 'skinke': 'skinke',
    'bacon': 'bacon',
    'yogurt': 'yoghurt', 'yoghurt': 'yoghurt',
    'cream': 'fløde', 'fløde': 'fløde',
    'onion': 'løg', 'løg': 'løg',
    'tomato': 'tomat', 'tomater': 'tomat', 'tomat': 'tomat',
    'lettuce': 'salat', 'salat': 'salat',
    'chicken': 'kylling', 'kylling': 'kylling',
    'carrot': 'gulerod', 'gulerødder': 'gulerod', 'gulerod': 'gulerod',
    'pepper': 'peberfrugt', 'peberfrugt': 'peberfrugt',
    'mushroom': 'champignon', 'champignon': 'champignon', 'svampe': 'champignon',
    'mayonnaise': 'mayonnaise', 'mayo': 'mayonnaise',
    'cucumber': 'agurk', 'agurk': 'agurk',
    'potato': 'kartoffel', 'kartofler': 'kartoffel', 'kartoffel': 'kartoffel',
  };
  
  return mappings[normalized] || normalized;
}

// Find best matching recipes
function findRecipes(ingredients) {
  const normalizedIngredients = ingredients.map(normalizeIngredient);
  
  // Find simple recipe (most ingredients matched, fewest missing)
  let bestSimple = null;
  let bestSimpleScore = -1;
  
  for (const recipe of RECIPE_DATABASE.simple) {
    const matched = recipe.requires.filter(r => 
      normalizedIngredients.some(i => i.includes(r) || r.includes(i))
    ).length;
    
    if (matched > 0 && matched >= bestSimpleScore) {
      bestSimpleScore = matched;
      bestSimple = {
        title: recipe.title,
        missing: recipe.requires.filter(r => 
          !normalizedIngredients.some(i => i.includes(r) || r.includes(i))
        )
      };
    }
  }
  
  // Find advanced recipe
  let bestAdvanced = null;
  let bestAdvancedScore = -1;
  
  for (const recipe of RECIPE_DATABASE.advanced) {
    const matched = recipe.requires.filter(r => 
      normalizedIngredients.some(i => i.includes(r) || r.includes(i))
    ).length;
    
    if (matched > 0 && matched >= bestAdvancedScore) {
      bestAdvancedScore = matched;
      const alreadyHave = recipe.requires.filter(r => 
        normalizedIngredients.some(i => i.includes(r) || r.includes(i))
      );
      const stillNeed = recipe.requires.filter(r => 
        !normalizedIngredients.some(i => i.includes(r) || r.includes(i))
      );
      bestAdvanced = {
        title: recipe.title,
        missing: [...stillNeed, ...recipe.missing]
      };
    }
  }
  
  // Fallback recipes
  if (!bestSimple) {
    bestSimple = { title: "Spejlæg", missing: ["æg"] };
  }
  if (!bestAdvanced) {
    bestAdvanced = { title: "Æggekage med grønt", missing: ["æg", "løg", "peberfrugt", "fløde"] };
  }
  
  return { simple: bestSimple, advanced: bestAdvanced };
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    // Extract base64 data
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    
    // Call Claude API for image analysis
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Data
                }
              },
              {
                type: 'text',
                text: 'Identificer alle fødevarer og ingredienser du kan se i dette køleskabsbillede. Returner KUN en JSON array med ingrediensnavne på dansk. Eksempel: ["æg", "mælk", "ost", "smør"]. Ingen forklaringer, kun JSON array.'
              }
            ]
          }
        ]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      return res.status(500).json({ error: 'Image analysis failed' });
    }
    
    const data = await response.json();
    const textContent = data.content?.[0]?.text || '[]';
    
    // Parse ingredients from response
    let ingredients = [];
    try {
      // Extract JSON array from response
      const jsonMatch = textContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        ingredients = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      // Try to extract ingredients from text
      const words = textContent.split(/[,\n]+/).map(w => w.trim().replace(/["\[\]]/g, '')).filter(w => w.length > 1);
      ingredients = words.slice(0, 15);
    }
    
    // Normalize ingredients
    const normalizedIngredients = [...new Set(ingredients.map(normalizeIngredient))];
    
    // Find recipes
    const recipes = findRecipes(normalizedIngredients);
    
    // Build shopping list
    const shoppingList = [...new Set([
      ...(recipes.simple.missing || []),
      ...(recipes.advanced.missing || [])
    ])];
    
    // Return structured response per contract
    const result = {
      ingredients_detected: normalizedIngredients,
      recipes: {
        simple: {
          title: recipes.simple.title,
          missing: recipes.simple.missing || []
        },
        advanced: {
          title: recipes.advanced.title,
          missing: recipes.advanced.missing || []
        }
      },
      shopping_list: shoppingList
    };
    
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
