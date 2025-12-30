export const config = {
  maxDuration: 60,
};

// Recipe database
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
  
  let bestAdvanced = null;
  let bestAdvancedScore = -1;
  
  for (const recipe of RECIPE_DATABASE.advanced) {
    const matched = recipe.requires.filter(r => 
      normalizedIngredients.some(i => i.includes(r) || r.includes(i))
    ).length;
    
    if (matched > 0 && matched >= bestAdvancedScore) {
      bestAdvancedScore = matched;
      const stillNeed = recipe.requires.filter(r => 
        !normalizedIngredients.some(i => i.includes(r) || r.includes(i))
      );
      bestAdvanced = {
        title: recipe.title,
        missing: [...stillNeed, ...recipe.missing]
      };
    }
  }
  
  if (!bestSimple) {
    bestSimple = { title: "Spejlæg", missing: ["æg"] };
  }
  if (!bestAdvanced) {
    bestAdvanced = { title: "Æggekage med grønt", missing: ["æg", "løg", "peberfrugt", "fløde"] };
  }
  
  return { simple: bestSimple, advanced: bestAdvanced };
}

// Quality gate: Score image quality based on base64 data characteristics
function scoreImageQuality(base64Data) {
  // Decode base64 to get raw bytes for analysis (Node.js compatible)
  const buffer = Buffer.from(base64Data, 'base64');
  const bytes = new Uint8Array(buffer);
  
  // Calculate basic quality metrics from JPEG data
  let score = 50; // Base score
  
  // 1. File size indicator (larger usually means more detail)
  const sizeKB = bytes.length / 1024;
  if (sizeKB > 100) score += 15;
  else if (sizeKB > 50) score += 10;
  else if (sizeKB < 20) score -= 20;
  
  // 2. Analyze byte variance (indicates image complexity/detail)
  let sum = 0;
  let sumSq = 0;
  const sampleSize = Math.min(bytes.length, 10000);
  const step = Math.floor(bytes.length / sampleSize);
  
  for (let i = 0; i < bytes.length; i += step) {
    sum += bytes[i];
    sumSq += bytes[i] * bytes[i];
  }
  
  const n = Math.floor(bytes.length / step);
  const mean = sum / n;
  const variance = (sumSq / n) - (mean * mean);
  
  // Higher variance = more detail = better quality
  if (variance > 5000) score += 20;
  else if (variance > 3000) score += 10;
  else if (variance < 1000) score -= 15;
  
  // 3. Check for very dark or very bright images (mean byte value)
  if (mean < 50) score -= 20; // Too dark
  else if (mean > 200) score -= 15; // Overexposed
  else if (mean > 80 && mean < 170) score += 10; // Good exposure
  
  return Math.max(0, Math.min(100, score));
}

// Quality gate: Filter and select best images
function qualityGate(images, maxImages = 3) {
  const scored = images.map((img, index) => {
    const base64Data = img.replace(/^data:image\/\w+;base64,/, '');
    const score = scoreImageQuality(base64Data);
    return { index, image: img, score };
  });
  
  // Filter out images below minimum threshold
  const minThreshold = 40;
  const passing = scored.filter(s => s.score >= minThreshold);
  
  if (passing.length === 0) {
    return { passed: [], allFailed: true };
  }
  
  // Sort by score descending and take top K
  passing.sort((a, b) => b.score - a.score);
  const selected = passing.slice(0, maxImages);
  
  return { 
    passed: selected.map(s => s.image), 
    allFailed: false,
    scores: selected.map(s => s.score)
  };
}

// Analyze single image with Claude API
async function analyzeImage(base64Data, apiKey) {
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
    throw new Error('API request failed');
  }
  
  const data = await response.json();
  const textContent = data.content?.[0]?.text || '[]';
  
  // Parse ingredients
  let ingredients = [];
  try {
    const jsonMatch = textContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      ingredients = JSON.parse(jsonMatch[0]);
    }
  } catch (parseError) {
    const words = textContent.split(/[,\n]+/).map(w => w.trim().replace(/["\[\]]/g, '')).filter(w => w.length > 1);
    ingredients = words.slice(0, 15);
  }
  
  return ingredients;
}

// Merge ingredients from multiple images
function mergeIngredients(ingredientArrays) {
  const allIngredients = ingredientArrays.flat();
  const normalized = allIngredients.map(normalizeIngredient);
  const unique = [...new Set(normalized)];
  return unique;
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
    // Support both single image and multiple images
    let images = req.body.images || [];
    if (req.body.image) {
      images = [req.body.image];
    }
    
    if (!images || images.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    // B2/B3: Quality gate - filter and select best images
    const qualityResult = qualityGate(images, 3);
    
    // B5: Failure mode - no usable images
    if (qualityResult.allFailed) {
      return res.status(200).json({
        ingredients_detected: [],
        recipes: {
          simple: { title: "", missing: [] },
          advanced: { title: "", missing: [] }
        },
        shopping_list: [],
        error_code: "NO_USABLE_IMAGES"
      });
    }
    
    // Analyze each passing image
    const ingredientResults = [];
    for (const image of qualityResult.passed) {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      try {
        const ingredients = await analyzeImage(base64Data, apiKey);
        ingredientResults.push(ingredients);
      } catch (err) {
        console.error('Image analysis error:', err);
        // Continue with other images
      }
    }
    
    // B4: Merge logic - combine and deduplicate
    const mergedIngredients = mergeIngredients(ingredientResults);
    
    // Find recipes
    const recipes = findRecipes(mergedIngredients);
    
    // Build shopping list
    const shoppingList = [...new Set([
      ...(recipes.simple.missing || []),
      ...(recipes.advanced.missing || [])
    ])];
    
    // B6: Return structured response
    const result = {
      ingredients_detected: mergedIngredients,
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
