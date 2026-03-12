import { getSetting } from "@/lib/db/settings";

export type EstimatedFood = {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type EstimatedPlate = {
  plateName: string;
  ingredients: EstimatedFood[];
};

const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const TEXT_MODEL = "llama-3.3-70b-versatile";

const JSON_FORMAT = `{"plateName":"Carbonara","ingredients":[{"name":"Pasta spaghetti","quantity":200,"unit":"g","calories":262,"protein":9,"carbs":52,"fat":1.3},{"name":"Bacon","quantity":40,"unit":"g","calories":172,"protein":5,"carbs":0.5,"fat":17}]}`;

const VISION_PROMPT = `Analiza esta imagen de comida. Identifica el plato y desglosa TODOS sus ingredientes visibles con sus macros nutricionales.

Responde SOLO con JSON, sin texto adicional, sin markdown.
Formato exacto:
${JSON_FORMAT}

Si no puedes identificar la comida, responde: {"plateName":"","ingredients":[]}
Sé preciso. Estima cantidades realistas según la porción visible en la imagen.`;

const REFINED_PROMPT = `El usuario ha tomado esta foto y describe el plato como: "{DESCRIPTION}"

Usando la imagen como referencia de la ración y la descripción para identificar correctamente el plato y sus ingredientes, desglosa CADA ingrediente con sus macros.

Responde SOLO con JSON:
${JSON_FORMAT}

Sé preciso. Usa la imagen para estimar cantidades y la descripción para identificar ingredientes.`;

const TEXT_PROMPT = `Estima los macros nutricionales del siguiente alimento/plato. Si es un plato compuesto, desglosa cada ingrediente por separado.

Responde SOLO con JSON:
${JSON_FORMAT}

Alimento: `;

const CORRECTION_PROMPT = `Tienes esta estimación de un plato:

Plato: "{PLATE_NAME}"
Ingredientes actuales:
{INGREDIENTS_JSON}

El usuario corrige: "{CORRECTION}"

INSTRUCCIONES:
- Corrige SOLO lo que el usuario menciona explícitamente.
- Los ingredientes NO mencionados deben mantenerse EXACTAMENTE igual (mismos nombres, cantidades y macros, sin cambiar nada).
- Si el usuario corrige un ingrediente (ej: "no son cebollas, es puerro"), reemplaza ese ingrediente y recalcula sus macros.
- Si el usuario corrige cantidades (ej: "el doble", "la mitad", "un poco más"), ajusta las cantidades y recalcula macros proporcionalmente.
- Si el usuario añade un ingrediente nuevo, agrégalo.
- Si el usuario dice que algo no está, elimínalo.

Responde SOLO con JSON:
${JSON_FORMAT}`;

async function getApiKey(): Promise<string> {
  const key = await getSetting("groq_api_key");
  if (!key) throw new Error("Configura tu API key de Groq en Ajustes.");
  return key;
}

function parsePlateResponse(text: string): EstimatedPlate {
  // Try object format first: {"plateName":"...","ingredients":[...]}
  const objMatch = text.match(/\{[\s\S]*"plateName"[\s\S]*"ingredients"[\s\S]*\}/);
  if (objMatch) {
    try {
      const parsed = JSON.parse(objMatch[0]);
      if (typeof parsed.plateName === "string" && Array.isArray(parsed.ingredients)) {
        return {
          plateName: parsed.plateName,
          ingredients: parsed.ingredients.filter(
            (item: Record<string, unknown>) =>
              typeof item.name === "string" && typeof item.calories === "number"
          ),
        };
      }
    } catch {
      // fall through
    }
  }

  // Fallback: try array format [...] (old format compatibility)
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      const parsed = JSON.parse(arrMatch[0]);
      if (Array.isArray(parsed)) {
        const ingredients = parsed.filter(
          (item: Record<string, unknown>) =>
            typeof item.name === "string" && typeof item.calories === "number"
        );
        return {
          plateName: ingredients.length === 1 ? ingredients[0].name : "Plato",
          ingredients,
        };
      }
    } catch {
      // fall through
    }
  }

  return { plateName: "", ingredients: [] };
}

export async function estimateFromImage(base64: string): Promise<EstimatedPlate> {
  const apiKey = await getApiKey();

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: VISION_PROMPT },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64}` },
            },
          ],
        },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ?? `Error ${res.status}`
    );
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  return parsePlateResponse(content);
}

export async function estimateFromImageWithContext(
  base64: string,
  description: string
): Promise<EstimatedPlate> {
  const apiKey = await getApiKey();
  const prompt = REFINED_PROMPT.replace("{DESCRIPTION}", description);

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64}` },
            },
          ],
        },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ?? `Error ${res.status}`
    );
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  return parsePlateResponse(content);
}

export async function estimateFromText(description: string): Promise<EstimatedPlate> {
  const apiKey = await getApiKey();

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: [
        { role: "user", content: TEXT_PROMPT + description },
      ],
      temperature: 0.3,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ?? `Error ${res.status}`
    );
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  return parsePlateResponse(content);
}

export async function correctIngredients(
  currentPlate: EstimatedPlate,
  correction: string,
  base64?: string | null
): Promise<EstimatedPlate> {
  const apiKey = await getApiKey();

  const ingredientsJson = JSON.stringify(currentPlate.ingredients, null, 2);
  const prompt = CORRECTION_PROMPT
    .replace("{PLATE_NAME}", currentPlate.plateName)
    .replace("{INGREDIENTS_JSON}", ingredientsJson)
    .replace("{CORRECTION}", correction);

  // If we have an image, use vision model for better context
  if (base64) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64}` },
              },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { error?: { message?: string } }).error?.message ?? `Error ${res.status}`
      );
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    return parsePlateResponse(content);
  }

  // Text-only correction
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: [
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ?? `Error ${res.status}`
    );
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  return parsePlateResponse(content);
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function compressImage(file: File, maxSize = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No canvas context"));
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      resolve(dataUrl.split(",")[1]);
    };
    img.onerror = reject;
    img.src = url;
  });
}
