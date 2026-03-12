import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export function Modal({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-0 p-0 bg-transparent backdrop:bg-ink/30 backdrop:backdrop-blur-sm fixed inset-0 z-[100] max-w-none max-h-none w-full h-full"
    >
      {/* Backdrop clickable */}
      <div
        className="fixed inset-0 flex items-end justify-center"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="bg-surface w-full max-w-lg rounded-t-[2rem] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[85dvh] overflow-y-auto animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold tracking-brutalist">{title}</h2>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-ink-08">
                <X size={20} />
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </dialog>
  );
}
