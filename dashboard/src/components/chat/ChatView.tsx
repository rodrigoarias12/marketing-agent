import { useState, useRef, useEffect, useCallback } from "react";
import { Header } from "../layout/Header";
import { sendChatMessage } from "../../api/client";
import type { ChatMessage } from "../../types";
import { Send, Bot, User, Loader2, Wrench, Trash2 } from "lucide-react";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);
    setToolStatus(null);

    // Build history for the API (last 20 messages for context)
    const history = messages.slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, assistantMsg]);

    try {
      await sendChatMessage(
        text,
        (chunk: string) => {
          // Check if it's a tool notification (JSON with tool field)
          try {
            const parsed = JSON.parse(chunk);
            if (parsed.tool) {
              setToolStatus(`Usando: ${parsed.tool}`);
              return;
            }
          } catch {
            // Not JSON — it's content
          }

          setToolStatus(null);
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = { ...last, content: last.content + chunk };
            }
            return updated;
          });
        },
      );
    } catch (e: any) {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: last.content || `Error: ${e.message}`,
          };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
      setToolStatus(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header view="chat">
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="btn-sm ghost text-el-low hover:text-el-high"
          >
            <Trash2 className="w-3.5 h-3.5" /> Limpiar
          </button>
        )}
      </Header>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
              <div className="text-center space-y-4 max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-green-lighter-ext flex items-center justify-center mx-auto">
                  <Bot className="w-8 h-8 text-green-darker-ext" />
                </div>
                <h3 className="title-lg text-el-high">Hola, soy Eddie</h3>
                <p className="body-sm text-el-mid">
                  Tu agente de marketing. Puedo ayudarte con research, ideas de contenido,
                  análisis de prospectos y más. Tengo acceso a toda la data de la plataforma.
                </p>
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  {[
                    "¿Cómo van los prospectos?",
                    "Armá un research de Flexport",
                    "Ideas de posts para esta semana",
                    "¿Qué campañas tenemos activas?",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                      className="label-lg px-3 py-1.5 rounded-lg bg-overlay text-el-mid hover:bg-surface-accent hover:text-el-high transition cursor-pointer"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {toolStatus && (
            <div className="flex items-center gap-2 px-4 py-2">
              <Wrench className="w-3.5 h-3.5 text-green-darker-ext animate-pulse" />
              <span className="label-lg text-green-darker-ext">{toolStatus}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-outline bg-surface p-4">
          <div className="max-w-3xl mx-auto flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Preguntale algo a Eddie..."
              rows={1}
              className="flex-1 bg-surface-accent border border-outline rounded-xl px-4 py-3 body-sm text-el-high placeholder:text-el-disabled resize-none focus:outline-none focus:ring-1 focus:ring-green-darker max-h-32 custom-scrollbar"
              style={{ minHeight: "48px" }}
              disabled={isStreaming}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="btn-primary contained p-3 rounded-xl disabled:opacity-40 shrink-0"
            >
              {isStreaming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-green-lighter-ext flex items-center justify-center shrink-0 mt-1">
          <Bot className="w-4 h-4 text-green-darker-ext" />
        </div>
      )}

      <div className={`max-w-[75%] rounded-xl px-4 py-3 ${
        isUser
          ? "bg-green-lighter-ext text-green-darker-ext"
          : "bg-surface border border-outline shadow-low"
      }`}>
        <div className={`body-sm whitespace-pre-wrap ${isUser ? "" : "text-el-high"}`}>
          {message.content || (
            <span className="flex items-center gap-2 text-el-low">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pensando...
            </span>
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-overlay flex items-center justify-center shrink-0 mt-1">
          <User className="w-4 h-4 text-el-mid" />
        </div>
      )}
    </div>
  );
}
