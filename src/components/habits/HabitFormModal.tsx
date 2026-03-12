import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { db } from "@/lib/db";
import { addHabit, updateHabit, addCategory } from "@/lib/db/habits";
import type { Habit, HabitFrequency, WeekDay } from "@/types";

type Props = {
  open: boolean;
  onClose: () => void;
  editHabit?: Habit | null;
};

const EMOJIS = ["✅", "💪", "📖", "🧘", "🏃", "💧", "🍎", "😴", "🎯", "🧠", "💊", "🚭", "✍️", "🎵", "🌅", "🫁"];
const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#E63B2E", "#f59e0b", "#ec4899", "#06b6d4", "#6b7280"];
const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

export function HabitFormModal({ open, onClose, editHabit }: Props) {
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("✅");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#10b981");
  const [frequency, setFrequency] = useState<HabitFrequency>("daily");
  const [customDays, setCustomDays] = useState<WeekDay[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [newCatName, setNewCatName] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);

  const categories = useLiveQuery(() => db.habitCategories.toArray()) ?? [];

  useEffect(() => {
    if (editHabit) {
      setTitle(editHabit.title);
      setEmoji(editHabit.emoji ?? "✅");
      setDescription(editHabit.description ?? "");
      setColor(editHabit.color ?? "#10b981");
      setFrequency(editHabit.frequency ?? "daily");
      setCustomDays(editHabit.customDays ?? []);
      setCategoryId(editHabit.categoryId ?? "");
    } else {
      setTitle("");
      setEmoji("✅");
      setDescription("");
      setColor("#10b981");
      setFrequency("daily");
      setCustomDays([]);
      setCategoryId("");
    }
  }, [editHabit, open]);

  const toggleDay = (day: WeekDay) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    if (frequency === "custom" && customDays.length === 0) return;

    const data = { title: title.trim(), emoji, description: description.trim() || undefined, color, categoryId: categoryId || undefined, frequency, customDays: frequency === "custom" ? customDays : undefined };

    if (editHabit) {
      await updateHabit(editHabit.id, data);
    } else {
      await addHabit(data);
    }
    onClose();
  };

  const handleNewCategory = async () => {
    if (!newCatName.trim()) return;
    const id = await addCategory({ name: newCatName.trim(), color: "#6b7280" });
    setCategoryId(id);
    setNewCatName("");
    setShowNewCat(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={editHabit ? "Editar hábito" : "Nuevo hábito"}>
      <div className="space-y-5">
        {/* Emoji selector */}
        <div>
          <label className="text-sm font-medium text-ink-50 block mb-2">Emoji</label>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg btn-magnetic ${
                  emoji === e ? "bg-signal-light border-2 border-signal" : "bg-ink-08"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <Input
          label="Nombre"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Hacer ejercicio"
          autoFocus
        />

        {/* Description */}
        <Input
          label="Descripción (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Breve descripción"
        />

        {/* Color */}
        <div>
          <label className="text-sm font-medium text-ink-50 block mb-2">Color</label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full btn-magnetic ${
                  color === c ? "ring-2 ring-offset-2 ring-offset-surface ring-ink" : ""
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-sm font-medium text-ink-50 block mb-2">Categoría</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryId("")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                !categoryId ? "bg-ink text-white" : "bg-ink-08 text-ink-50"
              }`}
            >
              Sin categoría
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryId(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  categoryId === cat.id ? "text-white" : "bg-ink-08 text-ink-50"
                }`}
                style={categoryId === cat.id ? { backgroundColor: cat.color } : undefined}
              >
                {cat.name}
              </button>
            ))}
            {showNewCat ? (
              <div className="flex gap-1 items-center">
                <input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNewCategory()}
                  placeholder="Nombre"
                  className="px-2 py-1 text-xs border border-ink-15 rounded-lg bg-paper w-24"
                  autoFocus
                />
                <button onClick={handleNewCategory} className="text-xs text-signal font-semibold">
                  OK
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewCat(true)}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-ink-08 text-signal"
              >
                + Nueva
              </button>
            )}
          </div>
        </div>

        {/* Frequency */}
        <div>
          <label className="text-sm font-medium text-ink-50 block mb-2">Frecuencia</label>
          <div className="flex gap-2">
            {(["daily", "weekly", "custom"] as HabitFrequency[]).map((f) => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium flex-1 ${
                  frequency === f
                    ? "bg-ink text-white"
                    : "bg-ink-08 text-ink-50"
                }`}
              >
                {f === "daily" ? "Diaria" : f === "weekly" ? "Semanal" : "Custom"}
              </button>
            ))}
          </div>

          {frequency === "custom" && (
            <div className="flex gap-2 mt-3 justify-center">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i as WeekDay)}
                  className={`w-9 h-9 rounded-full text-xs font-bold ${
                    customDays.includes(i as WeekDay)
                      ? "bg-signal text-white"
                      : "bg-ink-08 text-ink-30"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <Button onClick={handleSubmit} className="w-full" disabled={!title.trim()}>
          {editHabit ? "Guardar cambios" : "Crear hábito"}
        </Button>
      </div>
    </Modal>
  );
}
