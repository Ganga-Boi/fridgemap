export const runtime = "nodejs";

const RECIPE_DATABASE = {
  simple: [
    { title: "Spejlæg", requires: ["æg"], missing: [] },
    { title: "Brød med ost", requires: ["brød", "ost"], missing: [] },
    { title: "Yoghurt med frugt", requires: ["yoghurt"], missing: [] },
  ],
  advanced: [
    { title: "Æggekage med grønt", requires: ["æg"], missing: ["løg", "peberfrugt", "fløde"] },
    { title: "Pasta carbonara", requires: ["æg", "ost"], missing: ["pasta", "bacon", "fløde"] },
  ]
};

function normalize(i){
  const m={egg:"æg",eggs:"æg",æg:"æg",cheese:"ost",ost:"ost",bread:"brød",brød:"brød",
  yogurt:"yoghurt",yoghurt:"yoghurt",milk:"mælk",mælk:"mælk",butter:"smør",smør:"smør",
  onion:"løg",løg:"løg",pepper:"peberfrugt",peberfrugt:"peberfrugt",cream:"fløde",fløde:"fløde"};
  const k=String(i||"").toLowerCase().trim(); return m[k]||k;
}
function findRecipes(ings){
  const has=i=>ings.includes(i);
  const simple=RECIPE_DATABASE.simple.find(r=>r.requires.every(has))||{title:"",missing:[]};
  const advanced=RECIPE_DATABASE.advanced.find(r=>r.requires.every(has))||{title:"",missing:[]};
  return {simple,advanced};
}
function extractBase64(s){
  const m=String(s).match(/^data:[^;]+;base64,(.+)$/); return m?m[1]:String(s);
}
function detectType(s){
  const m=String(s).match(/^data:([^;]+);base64,/); if(m) return m[1];
  const r=String(s).slice(0,20);
  if(r.startsWith("/9j/")) return "image/jpeg";
  if(r.startsWith("iVBOR")) return "image/png";
  if(r.startsWith("UklG")) return "image/webp";
  return "image/jpeg";
}
function safeArr(t){
  try{const m=String(t||"").match(/\[[\s\S]*\]/); if(!m) return [];
  const p=JSON.parse(m[0]); return Array.isArray(p)?p:[];}catch{return[];}
}
function pickBest(images){
  let b=images[0],l=extractBase64(b).length;
  for(const i of images){const x=extractBase64(i).length; if(x>l){b=i;l=x;}}
  return b;
}

async function analyzeWithClaude(image, apiKey){
  const data=extractBase64(image);
  if(!data||data.length<20000) return [];
  const res=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-api-key":apiKey,
      "anthropic-version":"2024-02-01"
    },
    body:JSON.stringify({
      model:"claude-sonnet-4-20250514",
      max_tokens:500,
      messages:[{role:"user",content:[
        {type:"image",source:{type:"base64",media_type:detectType(image),data}},
        {type:"text",text:"Returner KUN et JSON array med danske ingredienser. Hvis ingen, returner []"}
      ]}]
    })
  });
  if(!res.ok) return [];
  const j=await res.json();
  return safeArr(j?.content?.[0]?.text);
}

export default async function handler(req,res){
  if(req.method==="GET") return res.status(200).json({status:"API OK"});
  if(req.method!=="POST") return res.status(405).end();

  const body=typeof req.body==="string"?JSON.parse(req.body):req.body;
  const images=body?.images||[];
  if(!images.length) return res.status(200).json({ingredients_detected:[],recipes:{simple:{},advanced:{}},shopping_list:[]});

  const apiKey=process.env.ANTHROPIC_API_KEY;
  const best=pickBest(images);
  const raw=await analyzeWithClaude(best, apiKey);
  const ingredients=[...new Set(raw.map(normalize))].filter(x=>x.length>1);
  const recipes=findRecipes(ingredients);
  const shopping=[...new Set([...(recipes.simple.missing||[]),...(recipes.advanced.missing||[])])];

  res.status(200).json({ingredients_detected:ingredients,recipes,shopping_list:shopping});
}
