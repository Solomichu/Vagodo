import { useEffect, useState, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useLocation, useNavigate } from "react-router";
import { Inbox, CheckCircle2, Plus, Target } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { QuickCapture, type CaptureTarget } from "@/components/checklist/QuickCapture";
import { TopThreeSection } from "@/components/checklist/TopThreeSection";
import { TaskCard } from "@/components/checklist/TaskCard";
import { SnoozedSection } from "@/components/checklist/SnoozedSection";
import { EntityDetailModal } from "@/components/ui/EntityDetailModal";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { db } from "@/lib/db";
import { reactivateExpiredSnoozed } from "@/lib/db/tasks";

type NavState = { detailId?: string; detailType?: string } | null;

export function ChecklistPage() {
  const location = useLocation();
  const nav = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [captureTarget, setCaptureTarget] = useState<CaptureTarget>("inbox");
  const captureRef = useRef<HTMLInputElement>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as NavState;
    if (state?.detailId && state?.detailType === "task") {
      setDetailId(state.detailId);
      nav(".", { replace: true, state: null });
    }
  }, [location.state, nav]);

  const handlePickPosition = (pos: CaptureTarget) => {
    setPickerOpen(false);
    setCaptureTarget(pos);
    setTimeout(() => {
      captureRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      captureRef.current?.focus();
    }, 150);
  };

  useEffect(() => {
    reactivateExpiredSnoozed();
  }, []);

  const top3 = useLiveQuery(
    () =>
      db.tasks
        .where("status")
        .equals("today")
        .and((t) => t.todayRank !== undefined)
        .toArray(),
    []
  );

  const inbox = useLiveQuery(
    () =>
      db.tasks
        .where("status")
        .equals("inbox")
        .toArray()
        .then((tasks) => tasks.sort((a, b) => (a.listOrder ?? 0) - (b.listOrder ?? 0))),
    []
  );

  const snoozed = useLiveQuery(
    () => db.tasks.where("status").equals("snoozed").toArray(),
    []
  );

  const doneToday = useLiveQuery(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return db.tasks
      .where("status")
      .equals("done")
      .and((t) => (t.completedAt ?? 0) >= startOfDay.getTime())
      .toArray();
  }, []);

  if (!top3 || !inbox || !snoozed || !doneToday) return null;

  const top3Full = top3.length >= 3;

  return (
    <PageShell
      title="Tareas"
      subtitle="Tu sistema GTD"
      action={
        <Button size="sm" onClick={() => setPickerOpen(true)}>
          <Plus size={16} /> Nuevo
        </Button>
      }
    >
      <QuickCapture
        target={captureTarget}
        onClearTarget={() => setCaptureTarget("inbox")}
        inputRef={captureRef}
      />

      <TopThreeSection tasks={top3} />

      <SnoozedSection tasks={snoozed} />

      {/* Inbox */}
      {inbox.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-ink-50">
            <Inbox size={14} /> Inbox ({inbox.length})
          </h3>
          <div className="space-y-2">
            {inbox.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {/* Done today */}
      {doneToday.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-ink-30">
            <CheckCircle2 size={14} /> Hechas hoy ({doneToday.length})
          </h3>
          <div className="space-y-2">
            {doneToday.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {inbox.length === 0 && top3.length === 0 && snoozed.length === 0 && doneToday.length === 0 && (
        <div className="text-center text-ink-30 py-12">
          <p className="text-5xl mb-3">✅</p>
          <p className="font-medium">Sin tareas pendientes</p>
          <p className="text-sm mt-1">Captura tu primera tarea arriba</p>
        </div>
      )}

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="¿Dónde añadimos?">
        <div className="space-y-2">
          <button
            onClick={() => handlePickPosition("top3")}
            disabled={top3Full}
            className="w-full flex items-center gap-3 p-3 rounded-[1.25rem] border border-ink-08 hover:border-ink-15 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <Target size={18} className="text-signal shrink-0" />
            <div className="text-left">
              <span className="text-sm font-medium">Top 3</span>
              <p className="text-[10px] text-ink-30">
                {top3Full ? "Las 3 posiciones están ocupadas" : "Tus prioridades del día"}
              </p>
            </div>
          </button>
          <button
            onClick={() => handlePickPosition("inbox")}
            className="w-full flex items-center gap-3 p-3 rounded-[1.25rem] border border-ink-08 hover:border-ink-15 transition-colors"
          >
            <Inbox size={18} className="text-ink-50 shrink-0" />
            <div className="text-left">
              <span className="text-sm font-medium">Inbox</span>
              <p className="text-[10px] text-ink-30">Tareas por clasificar</p>
            </div>
          </button>
        </div>
      </Modal>

      {detailId && (
        <EntityDetailModal
          entityId={detailId}
          entityType="task"
          onClose={() => setDetailId(null)}
        />
      )}
    </PageShell>
  );
}
