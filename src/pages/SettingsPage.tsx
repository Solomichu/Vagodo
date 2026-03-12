import { useState, useEffect } from "react";
import { ArrowLeft, Download, Upload, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getSetting, setSetting } from "@/lib/db/settings";
import { getNutritionGoals, setNutritionGoals } from "@/lib/db/meals";
import { db } from "@/lib/db";

export function SettingsPage() {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState("");
  const [calories, setCalories] = useState("2000");
  const [protein, setProtein] = useState("150");
  const [carbs, setCarbs] = useState("250");
  const [fat, setFat] = useState("65");
  const [userName, setUserName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSetting("user_name").then((v) => v && setUserName(v));
    getSetting("groq_api_key").then((v) => v && setApiKey(v));
    getNutritionGoals().then((g) => {
      setCalories(String(g.calories));
      setProtein(String(g.protein));
      setCarbs(String(g.carbs));
      setFat(String(g.fat));
    });
  }, []);

  const handleSave = async () => {
    await setSetting("user_name", userName.trim());
    if (apiKey.trim()) await setSetting("groq_api_key", apiKey.trim());
    await setNutritionGoals({
      calories: parseInt(calories) || 2000,
      protein: parseInt(protein) || 150,
      carbs: parseInt(carbs) || 250,
      fat: parseInt(fat) || 65,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = async () => {
    const data = {
      tasks: await db.tasks.toArray(),
      taskLists: await db.taskLists.toArray(),
      habits: await db.habits.toArray(),
      habitEntries: await db.habitEntries.toArray(),
      habitCategories: await db.habitCategories.toArray(),
      calendarEvents: await db.calendarEvents.toArray(),
      meals: await db.meals.toArray(),
      foodItems: await db.foodItems.toArray(),
      nutritionGoals: await db.nutritionGoals.toArray(),
      appSettings: await db.appSettings.toArray(),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `michi-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.tasks) await db.tasks.bulkPut(data.tasks);
      if (data.taskLists) await db.taskLists.bulkPut(data.taskLists);
      if (data.habits) await db.habits.bulkPut(data.habits);
      if (data.habitEntries) await db.habitEntries.bulkPut(data.habitEntries);
      if (data.habitCategories) await db.habitCategories.bulkPut(data.habitCategories);
      if (data.calendarEvents) await db.calendarEvents.bulkPut(data.calendarEvents);
      if (data.meals) await db.meals.bulkPut(data.meals);
      if (data.foodItems) await db.foodItems.bulkPut(data.foodItems);
      if (data.nutritionGoals) await db.nutritionGoals.bulkPut(data.nutritionGoals);
      if (data.appSettings) await db.appSettings.bulkPut(data.appSettings);

      window.location.reload();
    };
    input.click();
  };

  const handleClearAll = async () => {
    if (!confirm("¿Borrar TODOS los datos? Esta acción no se puede deshacer.")) return;
    await db.delete();
    window.location.reload();
  };

  return (
    <PageShell
      title="Ajustes"
      action={
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-ink-08 text-ink-50"
        >
          <ArrowLeft size={20} />
        </button>
      }
    >
      <div className="space-y-5">
        {/* Perfil */}
        <Card>
          <h3 className="font-bold text-sm mb-3">Perfil</h3>
          <Input
            label="Tu nombre"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Ej: Miguel"
          />
          <p className="text-[10px] text-ink-30 mt-1">
            Michi te saludará por tu nombre.
          </p>
        </Card>

        {/* AI */}
        <Card>
          <h3 className="font-bold text-sm mb-3">Inteligencia Artificial</h3>
          <Input
            label="API Key de Groq"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="gsk_..."
            type="password"
          />
          <p className="text-[10px] text-ink-30 mt-1">
            Obtén tu key gratis en groq.com. Se almacena localmente.
          </p>
        </Card>

        {/* Nutrition Goals */}
        <Card>
          <h3 className="font-bold text-sm mb-3">Objetivos Nutricionales</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Calorías" type="number" value={calories} onChange={(e) => setCalories(e.target.value)} inputMode="numeric" />
            <Input label="Proteína (g)" type="number" value={protein} onChange={(e) => setProtein(e.target.value)} inputMode="numeric" />
            <Input label="Carbos (g)" type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} inputMode="numeric" />
            <Input label="Grasa (g)" type="number" value={fat} onChange={(e) => setFat(e.target.value)} inputMode="numeric" />
          </div>
        </Card>

        <Button onClick={handleSave} className="w-full">
          {saved ? "Guardado ✓" : "Guardar ajustes"}
        </Button>

        {/* Data */}
        <Card>
          <h3 className="font-bold text-sm mb-3">Datos</h3>
          <div className="space-y-2">
            <button onClick={handleExport} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-ink-08 text-sm hover:bg-ink-15">
              <Download size={16} /> Exportar datos (JSON)
            </button>
            <button onClick={handleImport} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-ink-08 text-sm hover:bg-ink-15">
              <Upload size={16} /> Importar datos
            </button>
            <button onClick={handleClearAll} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-signal hover:bg-signal-light">
              <Trash2 size={16} /> Borrar todos los datos
            </button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
