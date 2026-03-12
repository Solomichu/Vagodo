import { createContext, useContext, useCallback, useRef, useState, type ReactNode } from "react";
import { buildFullContext, parseActionsFromContent } from "./index";
import { executeAction } from "./action-executor";
import { getSetting } from "@/lib/db/settings";
import { buildSystemPrompt } from "./prompt-builders";
import { newId } from "@/lib/ids";
import type { ChatMessage, AiAction, ActionState, ActionResult } from "./types";

type HistoryEntry = { role: "user" | "assistant"; content: string };

function cleanStreamingDisplay(raw: string): string {
  return raw
    .replace(/<\s*ACTION\s*>[\s\S]*?<\s*\/\s*ACTION\s*>/gi, "")
    .replace(/<\s*ACTION\s*>[\s\S]*$/i, "")
    .replace(/\{\{[^}]*$/g, "") // incomplete smart ref at end
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type ChatContextType = {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  confirmAction: (msgId: string, idx: number) => Promise<ActionResult | null>;
  rejectAction: (msgId: string, idx: number) => void;
  initializeChat: () => Promise<void>;
  clearChat: () => void;
  abort: () => void;
};

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const greetingInitialized = useRef(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  async function streamToMessage(
    userMessage: string,
    history: HistoryEntry[],
    targetMessageId: string
  ): Promise<void> {
    abortRef.current = new AbortController();
    let accumulated = "";

    const context = await buildFullContext();
    const systemPrompt = buildSystemPrompt(context);
    const apiKey = await getSetting("groq_api_key");

    if (!apiKey) {
      throw new Error("Configura tu API key de Groq en Ajustes.");
    }

    const groqMessages = [
      { role: "system" as const, content: systemPrompt },
      ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
      { role: "user" as const, content: userMessage },
    ];

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: abortRef.current.signal,
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      let errorMsg = `Error ${res.status}`;
      try {
        const data = await res.json();
        errorMsg = data.error?.message ?? errorMsg;
      } catch { /* ignore */ }
      throw new Error(errorMsg);
    }

    if (!res.body) throw new Error("Sin respuesta del servidor.");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split("\n");
      sseBuffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();

        if (data === "[DONE]") {
          const { text, actions } = parseActionsFromContent(accumulated);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === targetMessageId
                ? {
                    ...m,
                    content: actions.length > 0 ? text : (text || accumulated),
                    actions,
                    actionStates: Object.fromEntries(
                      actions.map((_: AiAction, i: number) => [i, "pending" as ActionState])
                    ),
                    isStreaming: false,
                  }
                : m
            )
          );
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) {
            accumulated += token;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === targetMessageId
                  ? { ...m, content: cleanStreamingDisplay(accumulated), isStreaming: true }
                  : m
              )
            );
          }
        } catch { /* ignore malformed JSON */ }
      }
    }

    if (accumulated) {
      const { text, actions } = parseActionsFromContent(accumulated);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === targetMessageId
            ? {
                ...m,
                content: actions.length > 0 ? text : (text || accumulated),
                actions,
                actionStates: Object.fromEntries(
                  actions.map((_: AiAction, i: number) => [i, "pending" as ActionState])
                ),
                isStreaming: false,
              }
            : m
        )
      );
    }
  }

  const initializeChat = useCallback(async () => {
    if (greetingInitialized.current) return;
    greetingInitialized.current = true;

    const userName = await getSetting("user_name");
    const hour = new Date().getHours();
    const greeting =
      hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";

    setMessages([
      {
        id: newId(),
        role: "assistant",
        content: userName
          ? `${greeting} ${userName}, ¿en qué te puedo ayudar?`
          : `¡${greeting}! ¿En qué te puedo ayudar?`,
        isStreaming: false,
      },
    ]);
  }, []);

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || isLoadingRef.current) return;

    const userMsgId = newId();
    const assistantMsgId = newId();

    const history: HistoryEntry[] = messagesRef.current
      .filter((m) => !m.isStreaming && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: userText },
      { id: assistantMsgId, role: "assistant", content: "", isStreaming: true },
    ]);
    setIsLoading(true);
    setError(null);

    try {
      await streamToMessage(userText, history, assistantMsgId);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Error";
      setError(msg);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: `Error: ${msg}`, isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const confirmAction = useCallback(async (messageId: string, actionIndex: number): Promise<ActionResult | null> => {
    const message = messagesRef.current.find((m) => m.id === messageId);
    if (!message?.actions?.[actionIndex]) return null;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, actionStates: { ...m.actionStates, [actionIndex]: "confirmed" as ActionState } }
          : m
      )
    );

    try {
      const result = await executeAction(message.actions[actionIndex]);
      if (result) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, actionResults: { ...m.actionResults, [actionIndex]: result } }
              : m
          )
        );
      }
      return result;
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, actionStates: { ...m.actionStates, [actionIndex]: "pending" as ActionState } }
            : m
        )
      );
      setError(e instanceof Error ? e.message : "Error");
      return null;
    }
  }, []);

  const rejectAction = useCallback((messageId: string, actionIndex: number) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, actionStates: { ...m.actionStates, [actionIndex]: "rejected" as ActionState } }
          : m
      )
    );
  }, []);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsLoading(false);
    setError(null);
    greetingInitialized.current = false;
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        error,
        sendMessage,
        confirmAction,
        rejectAction,
        initializeChat,
        clearChat,
        abort,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useAiChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useAiChat must be used within ChatProvider");
  return ctx;
}
