import { useState, useRef, useEffect } from "react";
import { Send, Check, X, Loader2, Zap, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";
import { useAiChat } from "@/lib/ai/useAiChat";
import { MiniDashboard } from "./MiniDashboard";
import {
  SmartContent,
  parseSmartContent,
  groupSmartSegments,
  hasBubbleContent,
  BlockRefCard,
  InlineSegment,
} from "./SmartRef";
import type { ChatMessage, AiAction, ActionState, ActionResult } from "@/lib/ai/types";

// ── Quick Action Suggestions ─────────────────────────────────

const QUICK_ACTIONS = [
  { emoji: "📋", label: "Resúmeme mi día", prompt: "Resúmeme mi día" },
  { emoji: "📅", label: "Mi semana", prompt: "Dame un resumen de mi semana hasta el domingo" },
  { emoji: "🎯", label: "¿Qué hago ahora?", prompt: "¿Qué debería hacer ahora según mis prioridades?" },
  { emoji: "🍽️", label: "Registrar comida", prompt: "Quiero registrar una comida" },
];

// ── Action Card (prominent, full-width) ─────────────────────

function ActionCard({
  action,
  state,
  result,
  onConfirm,
  onReject,
  onNavigate,
}: {
  action: AiAction;
  state: ActionState;
  result?: ActionResult;
  onConfirm: () => void;
  onReject: () => void;
  onNavigate?: () => void;
}) {
  if (state === "confirmed") {
    return (
      <button
        onClick={onNavigate}
        disabled={!onNavigate}
        className="w-full rounded-2xl bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-3 card-enter text-left disabled:cursor-default"
      >
        <div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
          <Check size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-800 truncate">{action.description}</p>
          <p className="text-[11px] text-green-600">Ejecutado</p>
        </div>
        {result && (
          <ChevronRight size={16} className="text-green-400 shrink-0" />
        )}
      </button>
    );
  }

  if (state === "rejected") {
    return (
      <div className="rounded-2xl bg-ink-08 px-4 py-3 flex items-center gap-3 card-enter">
        <div className="w-7 h-7 rounded-full bg-ink-15 text-ink-30 flex items-center justify-center shrink-0">
          <X size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-ink-30 line-through truncate">{action.description}</p>
          <p className="text-[11px] text-ink-30">Descartado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-signal/25 bg-signal-light overflow-hidden card-enter">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-signal/15 text-signal flex items-center justify-center shrink-0 mt-0.5">
            <Zap size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-signal uppercase tracking-wider mb-0.5">
              Accion sugerida
            </p>
            <p className="text-sm font-medium text-ink leading-snug">
              {action.description}
            </p>
          </div>
        </div>
      </div>
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-signal text-white text-sm font-semibold btn-magnetic"
        >
          <Check size={14} />
          Aceptar
        </button>
        <button
          onClick={onReject}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-ink-15 text-ink-50 text-sm font-medium hover:bg-ink-08 transition-colors"
        >
          <X size={14} />
          Descartar
        </button>
      </div>
    </div>
  );
}

// ── Message Bubble ──────────────────────────────────────────

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[90%] px-1 text-[13px] leading-[1.65] text-ink/85">
      {children}
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";

  // User messages: simple bubble
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[1.25rem] px-4 py-3 text-sm bg-ink text-white rounded-br-md">
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    );
  }

  // Streaming with no content: typing dots
  if (msg.isStreaming && !msg.content) {
    return (
      <AssistantBubble>
        <div className="flex gap-1 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-ink-30 animate-pulse" />
          <span className="w-1.5 h-1.5 rounded-full bg-ink-30 animate-pulse [animation-delay:0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-ink-30 animate-pulse [animation-delay:0.3s]" />
        </div>
      </AssistantBubble>
    );
  }

  // Streaming with content: single bubble (content still building)
  if (msg.isStreaming) {
    return (
      <AssistantBubble>
        <SmartContent content={msg.content} />
      </AssistantBubble>
    );
  }

  // Finished assistant message: grouped rendering (text bubbles + standalone cards)
  if (!msg.content) return null;

  const segments = parseSmartContent(msg.content);
  const groups = groupSmartSegments(segments);

  return (
    <>
      {groups.map((group, i) => {
        if (group.kind === "card") {
          return <BlockRefCard key={i} refType={group.refType} />;
        }
        if (!hasBubbleContent(group.segments)) return null;
        return (
          <AssistantBubble key={i}>
            {group.segments.map((seg, j) => (
              <InlineSegment key={j} segment={seg} />
            ))}
          </AssistantBubble>
        );
      })}
    </>
  );
}

// ── Main Chat Component ─────────────────────────────────────

export function AiChat() {
  const {
    messages,
    isLoading,
    sendMessage,
    confirmAction,
    rejectAction,
    initializeChat,
  } = useAiChat();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledAwayRef = useRef(false);
  const prevMsgCountRef = useRef(0);
  const expandedRef = useRef<HTMLDivElement>(null);
  const compactRef = useRef<HTMLDivElement>(null);

  const hasInteracted = messages.some((m) => m.role === "user");

  const handleConfirmAction = async (msgId: string, idx: number) => {
    const result = await confirmAction(msgId, idx);
    if (result) {
      navigate(result.route, {
        state: { detailId: result.entityId, detailType: result.entityType, date: result.date },
      });
    }
  };

  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  // Scroll-driven dashboard crossfade (cover → fixed header)
  useEffect(() => {
    const scrollEl = scrollRef.current;
    const expandedEl = expandedRef.current;
    const compactEl = compactRef.current;
    if (!scrollEl || !expandedEl || !compactEl) return;

    const RANGE = 200; // px of scroll for full transition
    const onScroll = () => {
      const t = Math.min(Math.max(scrollEl.scrollTop / RANGE, 0), 1);

      // Expanded: fade out + subtle scale
      expandedEl.style.opacity = String(Math.max(1 - t * 1.5, 0));
      expandedEl.style.transform = `scale(${1 - t * 0.03})`;
      expandedEl.style.transformOrigin = "top center";

      // Compact overlay: fade in
      compactEl.style.opacity = String(Math.min(t * 2, 1));
      compactEl.style.pointerEvents = t > 0.4 ? "auto" : "none";

      // Track user scroll for auto-scroll
      const distFromBottom =
        scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;
      userScrolledAwayRef.current = distFromBottom > 60;
    };

    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => scrollEl.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !hasInteracted) return;

    const isNewMessage = messages.length !== prevMsgCountRef.current;
    const prevCount = prevMsgCountRef.current;
    prevMsgCountRef.current = messages.length;

    if (isNewMessage) {
      userScrolledAwayRef.current = false;
    }
    if (!userScrolledAwayRef.current) {
      // First scroll (after greeting only) = smooth for visible collapse
      if (prevCount <= 1) {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      } else {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [messages, hasInteracted]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <>
      {/* Scroll area with compact overlay (cover → fixed header) */}
      <div className="flex-1 min-h-0 relative">
        {/* Compact dashboard overlay — fades in as you scroll down */}
        <div
          ref={compactRef}
          className="absolute top-0 inset-x-0 z-20 opacity-0 pointer-events-none bg-surface"
        >
          <MiniDashboard expanded={false} />
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} className="h-full overflow-y-auto">
          {/* Expanded dashboard — scrolls naturally, fades out */}
          <div ref={expandedRef}>
            <MiniDashboard expanded />
          </div>

          {/* Chat messages */}
          <div className="px-4 py-3 space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-2">
              <MessageBubble msg={msg} />

              {/* Action cards rendered outside the bubble */}
              {msg.actions &&
                msg.actions.length > 0 &&
                msg.actions.map((action, i) => {
                  const actionResult = msg.actionResults?.[i];
                  return (
                    <ActionCard
                      key={`${msg.id}-action-${i}`}
                      action={action}
                      state={msg.actionStates?.[i] ?? "pending"}
                      result={actionResult}
                      onConfirm={() => handleConfirmAction(msg.id, i)}
                      onReject={() => rejectAction(msg.id, i)}
                      onNavigate={
                        actionResult
                          ? () =>
                              navigate(actionResult.route, {
                                state: {
                                  detailId: actionResult.entityId,
                                  detailType: actionResult.entityType,
                                  date: actionResult.date,
                                },
                              })
                          : undefined
                      }
                    />
                  );
                })}
            </div>
          ))}

          {/* Quick action suggestions (before first interaction) */}
          {!hasInteracted && !isLoading && messages.length > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-2 pb-4">
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa.label}
                  onClick={() => sendMessage(qa.prompt)}
                  className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl border border-ink-10 bg-paper text-left active:scale-[0.97] transition-all shadow-sm"
                >
                  <span className="text-lg leading-none">{qa.emoji}</span>
                  <span className="text-[12px] font-medium text-ink-60 leading-tight">
                    {qa.label}
                  </span>
                </button>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Input bar — sticks to bottom above nav */}
      <div className="shrink-0 border-t border-ink-08 bg-surface/80 backdrop-blur-sm px-4 py-3 pb-nav flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Pregunta a Michi..."
          className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-ink-30"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="w-9 h-9 rounded-full bg-signal text-white flex items-center justify-center disabled:opacity-30 btn-magnetic shrink-0"
        >
          {isLoading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Send size={15} />
          )}
        </button>
      </div>
    </>
  );
}
