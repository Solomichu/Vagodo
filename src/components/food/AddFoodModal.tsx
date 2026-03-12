import { useState, useRef } from "react";
import {
  Camera,
  Sparkles,
  Loader2,
  X,
  RefreshCw,
  PenLine,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { addFoodItem, addPlate } from "@/lib/db/meals";
import {
  estimateFromImage,
  estimateFromImageWithContext,
  estimateFromText,
  correctIngredients,
  compressImage,
  type EstimatedPlate,
  type EstimatedFood,
} from "@/lib/ai/useNutritionAi";
import type { MealType } from "@/types";

type Props = {
  open: boolean;
  onClose: () => void;
  mealType: MealType;
  date: string;
};

type Step = "input" | "plate-review" | "manual";

export function AddFoodModal({ open, onClose, mealType, date }: Props) {
  // Manual form
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("100");
  const [unit, setUnit] = useState("g");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  // AI flow
  const [step, setStep] = useState<Step>("input");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [plate, setPlate] = useState<EstimatedPlate | null>(null);
  const [ingredientsOpen, setIngredientsOpen] = useState(true);
  const [correction, setCorrection] = useState("");
  const [description, setDescription] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setName("");
    setQuantity("100");
    setUnit("g");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setPreview(null);
    setPhotoBase64(null);
    setPlate(null);
    setAiError(null);
    setCorrection("");
    setDescription("");
    setStep("input");
    setIngredientsOpen(true);
  };

  // ── Photo capture ──
  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreview(url);
    setAiLoading(true);
    setAiError(null);
    setPlate(null);
    setCorrection("");

    try {
      const base64 = await compressImage(file);
      setPhotoBase64(base64);

      // If user wrote an optional description, use it
      const result = description.trim()
        ? await estimateFromImageWithContext(base64, description.trim())
        : await estimateFromImage(base64);

      if (result.ingredients.length === 0) {
        setAiError("No se pudo identificar la comida. Describe el plato o intenta otra foto.");
        setStep("plate-review");
      } else {
        setPlate(result);
        setStep("plate-review");
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Error al analizar la imagen");
      setStep("plate-review");
    } finally {
      setAiLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // ── Text estimation ──
  const handleTextEstimate = async () => {
    const text = name.trim() || description.trim();
    if (!text) return;
    setAiLoading(true);
    setAiError(null);
    setPlate(null);

    try {
      const result = await estimateFromText(text);
      if (result.ingredients.length > 0) {
        setPlate(result);
        setStep("plate-review");
      } else {
        setAiError("No se pudo estimar. Intenta con más detalle.");
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Error al estimar");
    } finally {
      setAiLoading(false);
    }
  };

  // ── Correction ──
  const handleCorrection = async () => {
    if (!correction.trim() || !plate) return;
    setAiLoading(true);
    setAiError(null);

    try {
      const result = await correctIngredients(plate, correction.trim(), photoBase64);
      if (result.ingredients.length > 0) {
        setPlate(result);
        setCorrection("");
      } else {
        setAiError("Error en la corrección. Intenta de nuevo.");
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Error al corregir");
    } finally {
      setAiLoading(false);
    }
  };

  // ── Add plate to DB ──
  const handleAddPlate = async () => {
    if (!plate || plate.ingredients.length === 0) return;
    await addPlate(
      mealType,
      plate.plateName,
      plate.ingredients.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        calories: Math.round(i.calories),
        protein: Math.round(i.protein),
        carbs: Math.round(i.carbs),
        fat: Math.round(i.fat),
        estimatedByAi: true,
      })),
      date
    );
    resetForm();
    onClose();
  };

  // ── Manual submit ──
  const handleManualSubmit = async () => {
    if (!name.trim() || !calories) return;
    await addFoodItem(
      mealType,
      {
        name: name.trim(),
        quantity: parseFloat(quantity) || 100,
        unit,
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
        estimatedByAi: false,
      },
      date
    );
    resetForm();
    onClose();
  };

  // ── Macros totals ──
  const totals = plate?.ingredients.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      protein: acc.protein + i.protein,
      carbs: acc.carbs + i.carbs,
      fat: acc.fat + i.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <Modal open={open} onClose={onClose} title="Añadir alimento">
      <div className="space-y-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          className="hidden"
        />

        {/* ═══════════ STEP: Input ═══════════ */}
        {step === "input" && (
          <>
            {/* Optional description before photo */}
            <div>
              <label className="text-xs font-medium text-ink-50 block mb-1.5">
                Descripción (opcional, mejora la detección)
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Carbonara, un plato lleno"
                className="w-full bg-paper border border-ink-15 rounded-[1rem] px-3 py-2.5 text-sm text-ink placeholder:text-ink-30 focus:outline-none focus:border-ink-30"
                style={{ fontSize: "16px" }}
              />
            </div>

            {/* Camera button */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={aiLoading}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-[1.5rem] bg-signal text-white text-sm font-semibold disabled:opacity-50 btn-magnetic"
            >
              {aiLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Camera size={18} />
              )}
              {description.trim() ? "Escanear con contexto" : "Escanear con cámara"}
            </button>

            <div className="flex items-center gap-3 text-ink-30 text-xs">
              <div className="flex-1 h-px bg-ink-08" />
              o escribe
              <div className="flex-1 h-px bg-ink-08" />
            </div>

            {/* Text input + estimate */}
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTextEstimate()}
                  placeholder="Ej: 200g arroz con pollo"
                  className="w-full bg-paper border border-ink-15 rounded-[1rem] px-3 py-3 text-sm text-ink placeholder:text-ink-30 focus:outline-none focus:border-ink-30"
                  style={{ fontSize: "16px" }}
                />
              </div>
              <button
                type="button"
                onClick={handleTextEstimate}
                disabled={aiLoading || (!name.trim() && !description.trim())}
                className="px-4 rounded-[1rem] bg-ink text-white text-sm font-semibold disabled:opacity-30 flex items-center gap-1.5"
              >
                {aiLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
              </button>
            </div>

            {aiError && (
              <p className="text-xs text-red-500 bg-red-50 rounded-[1rem] px-3 py-2">{aiError}</p>
            )}

            <button
              type="button"
              onClick={() => setStep("manual")}
              className="w-full text-center text-xs text-ink-30 hover:text-ink-50 py-1"
            >
              Introducir manualmente
            </button>
          </>
        )}

        {/* ═══════════ STEP: Plate review ═══════════ */}
        {step === "plate-review" && (
          <>
            {/* Photo preview */}
            {preview && (
              <div className="relative">
                <img
                  src={preview}
                  alt="Foto"
                  className="w-full h-32 object-cover rounded-[1.5rem] border border-ink-15"
                />
                <button
                  onClick={() => {
                    setPreview(null);
                    setPhotoBase64(null);
                    setPlate(null);
                    setStep("input");
                  }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-ink/60 text-white flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Loading */}
            {aiLoading && (
              <div className="flex items-center gap-2 text-sm text-ink-50 py-3 justify-center">
                <Loader2 size={14} className="animate-spin text-signal" />
                {correction ? "Corrigiendo..." : "Analizando..."}
              </div>
            )}

            {/* Error */}
            {aiError && !aiLoading && (
              <p className="text-xs text-red-500 bg-red-50 rounded-[1rem] px-3 py-2">{aiError}</p>
            )}

            {/* Plate card */}
            {plate && plate.ingredients.length > 0 && !aiLoading && (
              <div className="bg-paper border border-ink-15 rounded-[1.5rem] overflow-hidden">
                {/* Plate header */}
                <button
                  onClick={() => setIngredientsOpen(!ingredientsOpen)}
                  className="w-full flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <UtensilsCrossed size={16} className="text-signal shrink-0" />
                    <span className="font-semibold text-sm truncate">{plate.plateName}</span>
                    <span className="text-[10px] font-data bg-ink-08 px-2 py-0.5 rounded-full shrink-0">
                      {plate.ingredients.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {totals && (
                      <span className="text-xs font-data font-bold text-signal">
                        {Math.round(totals.calories)} kcal
                      </span>
                    )}
                    {ingredientsOpen ? (
                      <ChevronUp size={14} className="text-ink-30" />
                    ) : (
                      <ChevronDown size={14} className="text-ink-30" />
                    )}
                  </div>
                </button>

                {/* Ingredients list */}
                {ingredientsOpen && (
                  <div className="px-4 pb-3 border-t border-ink-08">
                    {plate.ingredients.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 py-2 border-b border-ink-08/50 last:border-0"
                      >
                        <div className="w-1 h-1 rounded-full bg-ink-15 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{item.name}</p>
                          <p className="text-[10px] font-data text-ink-30">
                            {item.quantity}{item.unit}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-data font-bold">
                            {Math.round(item.calories)} kcal
                          </p>
                          <p className="text-[9px] font-data text-ink-30">
                            P{Math.round(item.protein)} C{Math.round(item.carbs)} G{Math.round(item.fat)}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Totals row */}
                    {totals && plate.ingredients.length > 1 && (
                      <div className="pt-2 mt-1 border-t border-ink-15">
                        <div className="flex justify-between text-xs font-data">
                          <span className="font-bold">Total</span>
                          <span>
                            <span className="font-bold">{Math.round(totals.calories)} kcal</span>
                            <span className="text-ink-30 ml-2">
                              P{Math.round(totals.protein)} C{Math.round(totals.carbs)} G{Math.round(totals.fat)}
                            </span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Add plate button */}
            {plate && plate.ingredients.length > 0 && !aiLoading && (
              <Button onClick={handleAddPlate} className="w-full">
                Añadir plato
              </Button>
            )}

            {/* ── Correction section ── */}
            {!aiLoading && (
              <div className="border-t border-ink-08 pt-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-ink-50">
                  <PenLine size={12} />
                  <span>
                    {plate?.ingredients.length
                      ? "¿Algo no es correcto? Corrige aquí:"
                      : "Describe lo que ves en la foto:"}
                  </span>
                </div>
                <textarea
                  value={correction}
                  onChange={(e) => setCorrection(e.target.value)}
                  placeholder={
                    plate?.ingredients.length
                      ? "Ej: No son cebollas, es puerro / Es el doble de cantidad / Falta queso"
                      : "Ej: Pasta con bacon y parmesano, un plato lleno"
                  }
                  rows={2}
                  className="w-full bg-paper border border-ink-15 rounded-[1rem] px-3 py-2.5 text-sm text-ink placeholder:text-ink-30 focus:outline-none focus:border-signal/40 resize-none"
                  style={{ fontSize: "16px" }}
                />
                <button
                  type="button"
                  onClick={
                    plate?.ingredients.length
                      ? handleCorrection
                      : async () => {
                          if (!correction.trim()) return;
                          setAiLoading(true);
                          setAiError(null);
                          try {
                            const result = photoBase64
                              ? await estimateFromImageWithContext(photoBase64, correction.trim())
                              : await estimateFromText(correction.trim());
                            if (result.ingredients.length > 0) {
                              setPlate(result);
                              setCorrection("");
                            } else {
                              setAiError("No se pudo identificar. Intenta con más detalle.");
                            }
                          } catch (err) {
                            setAiError(err instanceof Error ? err.message : "Error");
                          } finally {
                            setAiLoading(false);
                          }
                        }
                  }
                  disabled={!correction.trim() || aiLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[1.25rem] bg-ink text-white text-sm font-semibold disabled:opacity-30"
                >
                  <RefreshCw size={14} />
                  {plate?.ingredients.length ? "Corregir" : "Analizar"}
                </button>
              </div>
            )}

            {/* Nav */}
            {!aiLoading && (
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => { resetForm(); }}
                  className="flex-1 text-center text-ink-30 hover:text-ink-50 py-1"
                >
                  Nueva foto
                </button>
                <button
                  onClick={() => setStep("manual")}
                  className="flex-1 text-center text-ink-30 hover:text-ink-50 py-1"
                >
                  Escribir manualmente
                </button>
              </div>
            )}
          </>
        )}

        {/* ═══════════ STEP: Manual ═══════════ */}
        {step === "manual" && (
          <>
            <button
              type="button"
              onClick={() => setStep(preview ? "plate-review" : "input")}
              className="text-xs text-ink-30 hover:text-ink-50 flex items-center gap-1"
            >
              <ChevronUp size={12} /> Volver a estimación IA
            </button>

            <Input
              label="Alimento"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Pechuga de pollo"
              autoFocus
            />

            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  label="Cantidad"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  inputMode="decimal"
                />
              </div>
              <div className="w-20">
                <label className="text-sm font-medium text-ink-50 block mb-1.5">Unidad</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full bg-paper border border-ink-15 rounded-[1rem] px-3 py-3 text-ink"
                >
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="ud">ud</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Calorías (kcal)"
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="0"
                inputMode="decimal"
              />
              <Input
                label="Proteína (g)"
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="0"
                inputMode="decimal"
              />
              <Input
                label="Carbos (g)"
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="0"
                inputMode="decimal"
              />
              <Input
                label="Grasa (g)"
                type="number"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="0"
                inputMode="decimal"
              />
            </div>

            <Button onClick={handleManualSubmit} className="w-full" disabled={!name.trim() || !calories}>
              Añadir
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
