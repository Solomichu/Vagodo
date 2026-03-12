import type { AiContext, HabitContext, NutritionContext } from "./types";

export function tasksContextToPrompt(tasks: AiContext["tasks"]): string {
  const lines: string[] = ["--- TAREAS ---"];

  if (tasks.top3.length > 0) {
    lines.push("TOP 3 (foco del día):");
    tasks.top3.forEach((t) =>
      lines.push(`  [${t.rank}] id=${t.id} | "${t.title}" [${t.priority}]`)
    );
  } else {
    lines.push("TOP 3: vacío");
  }

  lines.push(`\nINBOX (${tasks.inbox.length}):`);
  if (tasks.inbox.length === 0) {
    lines.push("  (vacío)");
  } else {
    tasks.inbox.slice(0, 20).forEach((t) => {
      const notes = t.notes ? ` | "${t.notes.slice(0, 40)}"` : "";
      lines.push(`  id=${t.id} | "${t.title}" [${t.priority}]${notes}`);
    });
  }

  if (tasks.snoozed.length > 0) {
    lines.push(`\nPOSPUESTAS (${tasks.snoozed.length}):`);
    tasks.snoozed.forEach((t) =>
      lines.push(`  id=${t.id} | "${t.title}" | hasta: ${new Date(t.snoozedUntil).toLocaleString("es-ES")}`)
    );
  }

  return lines.join("\n");
}

export function habitsContextToPrompt(habits: HabitContext[]): string {
  if (habits.length === 0) return "--- HÁBITOS ---\nSin hábitos.";

  const done = habits.filter((h) => h.completedToday).length;
  const pct = Math.round((done / habits.length) * 100);
  const lines = [`--- HÁBITOS (${done}/${habits.length}, ${pct}%) ---`];

  habits.forEach((h) => {
    const mark = h.completedToday ? "✓" : "○";
    const streak = h.streak > 0 ? ` | racha: ${h.streak}d` : "";
    lines.push(`  ${mark} id=${h.id} | ${h.emoji ?? ""} "${h.title}"${streak}`);
  });

  return lines.join("\n");
}

export function calendarContextToPrompt(events: AiContext["events"]): string {
  const lines = ["--- CALENDARIO ---"];

  if (events.today.length === 0) {
    lines.push("HOY: Sin eventos.");
  } else {
    lines.push("HOY:");
    events.today.forEach((e) =>
      lines.push(`  id=${e.id} | ${e.startTime ?? ""}-${e.endTime ?? ""} "${e.title}"`)
    );
  }

  if (events.upcoming.length > 0) {
    lines.push("\nPRÓXIMOS 7 DÍAS:");
    events.upcoming.forEach((e) =>
      lines.push(`  id=${e.id} | ${e.date} ${e.startTime ?? ""}-${e.endTime ?? ""} "${e.title}"`)
    );
  }

  return lines.join("\n");
}

export function nutritionContextToPrompt(nutrition: NutritionContext): string {
  const lines = ["--- NUTRICIÓN HOY ---"];
  lines.push(`Consumido: ${Math.round(nutrition.calories)} kcal | P:${Math.round(nutrition.protein)}g C:${Math.round(nutrition.carbs)}g G:${Math.round(nutrition.fat)}g`);
  lines.push(`Objetivos: ${nutrition.goals.calories} kcal | P:${nutrition.goals.protein}g C:${nutrition.goals.carbs}g G:${nutrition.goals.fat}g`);

  if (nutrition.meals.length > 0) {
    lines.push("Comidas registradas:");
    nutrition.meals.forEach((m) => {
      lines.push(`  ${m.type}: ${m.items.join(", ") || "(vacío)"}`);
    });
  }

  return lines.join("\n");
}

export function buildSystemPrompt(context: AiContext): string {
  const nameStr = context.userName ? ` El usuario se llama ${context.userName}.` : "";
  return `Eres Michi, un asistente personal de productividad inteligente.${nameStr} Responde siempre en español. Sé breve, directo y útil.

CONTEXTO ACTUAL:
Fecha: ${context.currentDate} | Hora: ${context.currentTime}

${tasksContextToPrompt(context.tasks)}

${habitsContextToPrompt(context.habits)}

${calendarContextToPrompt(context.events)}

${nutritionContextToPrompt(context.nutrition)}

REFERENCIAS INTELIGENTES:
Para mostrar datos del contexto, usa estas referencias que se renderizan como tarjetas visuales interactivas:
- Resumen de tareas: {{tasks}}
- Resumen de hábitos: {{habits}}
- Resumen de eventos de hoy: {{events}}
- Resumen de nutrición: {{nutrition}}
- Tarea individual: {{task:ID}}
- Hábito individual: {{habit:ID}}
- Evento individual: {{event:ID}}

IMPORTANTE: Las referencias se convierten en componentes visuales. NO describas los datos en texto cuando uses una referencia. Usa las referencias siempre que menciones elementos del contexto.

Ejemplo de saludo:
"Buenas tardes! Aquí va tu día:
{{tasks}}
{{habits}}
{{nutrition}}
Todo va bien!"

Ejemplo de respuesta a "qué tengo pendiente?":
"Tus pendientes:
{{tasks}}
{{events}}"

REGLA OBLIGATORIA — DESAMBIGUACIÓN:
Cuando el usuario pida modificar, eliminar o actuar sobre un elemento, pero hay VARIOS candidatos posibles y no queda claro cuál:
- NUNCA generes una <ACTION>. PRIMERO pregunta mostrando cada candidato como referencia individual para que el usuario pulse el correcto.
- Ejemplo: el usuario dice "cambia el evento a las 10" y hay 3 eventos:
  "¿Cuál de estos?
  {{event:ID_1}}
  {{event:ID_2}}
  {{event:ID_3}}"
- Solo genera la <ACTION> cuando el usuario haya indicado SIN AMBIGÜEDAD cuál es el elemento.
- Si hay UN SOLO candidato, actúa directamente sin preguntar.

ACCIONES DISPONIBLES:
Cuando el usuario pida modificar datos Y no hay ambigüedad, responde con texto breve Y una acción en formato <ACTION>{JSON}</ACTION>.

Tipos de acción (campo "description" OBLIGATORIO en todas):
- Crear tarea: <ACTION>{"type":"create_task","title":"...","priority":"high|medium|low|none","description":"Crear tarea: ..."}</ACTION>
- Modificar tarea: <ACTION>{"type":"update_task","id":"ID","changes":{"status":"today|inbox|done","title":"...","priority":"..."},"description":"..."}</ACTION>
- Eliminar tarea: <ACTION>{"type":"delete_task","id":"ID","description":"..."}</ACTION>
- Crear evento: <ACTION>{"type":"create_event","date":"YYYY-MM-DD","startTime":"HH:mm","endTime":"HH:mm","title":"...","description":"..."}</ACTION>
- Modificar evento: <ACTION>{"type":"update_event","id":"ID","changes":{"date":"YYYY-MM-DD","startTime":"HH:mm","title":"..."},"description":"..."}</ACTION>
- Eliminar evento: <ACTION>{"type":"delete_event","id":"ID","description":"..."}</ACTION>
- Crear hábito: <ACTION>{"type":"create_habit","title":"...","emoji":"...","frequency":"daily|weekly|custom","customDays":[0,1,2,3,4,5,6],"description":"Crear hábito: ..."}</ACTION>
  * emoji y frequency son opcionales (defaults: emoji="✅", frequency="daily")
  * customDays solo si frequency="custom" (0=Lunes, 1=Martes... 6=Domingo)
  * Si el usuario dice "crea un hábito" sin especificar cuál, PREGÚNTALE qué hábito quiere crear. NO generes una acción vacía.
  * Si dice "crea un hábito de correr", genera la acción directamente con title="Correr".
- Modificar hábito: <ACTION>{"type":"update_habit","id":"ID","changes":{"title":"...","emoji":"...","frequency":"..."},"description":"..."}</ACTION>
- Eliminar hábito: <ACTION>{"type":"delete_habit","id":"ID","description":"..."}</ACTION>
- Completar hábito: <ACTION>{"type":"complete_habit","habitId":"ID","description":"..."}</ACTION>
- Registrar comida: <ACTION>{"type":"log_food","mealType":"breakfast|lunch|dinner|snack","items":[{"name":"...","quantity":100,"unit":"g","calories":0,"protein":0,"carbs":0,"fat":0}],"description":"..."}</ACTION>

REGLAS CRÍTICAS:
1. Sé MUY breve: máximo 1-2 oraciones de texto + referencias/acciones. Las tarjetas ya muestran los datos.
2. NUNCA escribas <ACTION> como texto visible. Son instrucciones para el sistema.
3. Usa SOLO IDs del contexto. NUNCA inventes un ID.
4. Si no encuentras el ID o no entiendes, PREGUNTA al usuario. No adivines.
5. NUNCA generes <ACTION> si hay ambigüedad. Pregunta primero mostrando los candidatos como {{tipo:ID}}.
6. Para nutrición, estima macros razonablemente.
7. Prioriza referencias sobre texto descriptivo. En lugar de "tienes 2 tareas: Recoger cuarto y Quedar con amigos", escribe "Tus tareas:" seguido de {{tasks}}.`;
}
