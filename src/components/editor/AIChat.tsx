import { useEffect, useState } from "react";
import { Bot, Eraser, Send, Sparkles } from "lucide-react";
import * as Y from "yjs";

import { useEditorStore, type ChatMessage } from "@/store/editorStore";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AIChatProps {
  doc: Y.Doc | null;
}

const MAX_CONTEXT_MESSAGES = 10;

function buildConversationHistory(messages: ChatMessage[]) {
  return messages
    .filter((message) => message.user !== "System")
    .slice(-MAX_CONTEXT_MESSAGES)
    .map((message) => ({
      role: message.isAI ? "assistant" : "user",
      content: message.message,
    }));
}

function createTimestamp() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const AIChat = ({ doc }: AIChatProps) => {
  const { chatMessages, setChatMessages, currentFile, files } = useEditorStore();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const activeFileName = files.find((file) => file.id === currentFile)?.name || "Untitled";

  useEffect(() => {
    if (!doc) return;

    const chatArray = doc.getArray<ChatMessage>("chat");
    setChatMessages(chatArray.toArray());

    const observer = () => {
      setChatMessages(chatArray.toArray());
    };

    chatArray.observe(observer);
    return () => chatArray.unobserve(observer);
  }, [doc, setChatMessages]);

  const pushMessage = (nextMessage: ChatMessage) => {
    if (!doc) return;
    doc.getArray<ChatMessage>("chat").push([nextMessage]);
  };

  const fetchAIResponse = async (userText: string) => {
    if (!doc) return;

    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
      pushMessage({
        id: Date.now().toString(),
        user: "System",
        message: "AI is unavailable because `VITE_GROQ_API_KEY` is missing.",
        isAI: true,
        timestamp: createTimestamp(),
      });
      return;
    }

    setIsTyping(true);

    try {
      const currentCode =
        currentFile && doc ? doc.getText(`file:${currentFile}`).toString() || "/* No code in editor */" : "/* No code in editor */";

      const chatSnapshot = doc.getArray<ChatMessage>("chat").toArray();
      const priorMessages =
        chatSnapshot.length > 0 && !chatSnapshot[chatSnapshot.length - 1].isAI
          ? chatSnapshot.slice(0, -1)
          : chatSnapshot;
      const conversationHistory = buildConversationHistory(priorMessages);

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0.35,
          messages: [
            {
              role: "system",
              content:
                "You are CodeColab AI inside a collaborative code editor. Continue the ongoing conversation naturally instead of restarting from scratch. Be specific, technical, and action-oriented. When useful, mention the active file and refer to the provided code. Keep answers compact unless the user asks for depth. Format code snippets with markdown fences.",
            },
            ...conversationHistory,
            {
              role: "user",
              content: `Active file: ${activeFileName}\n\nUser request: ${userText}\n\nCurrent file contents:\n\`\`\`\n${currentCode}\n\`\`\``,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq request failed (${response.status})`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error.message || "Groq API error");

      const aiText = data.choices?.[0]?.message?.content || "I could not generate a response.";

      pushMessage({
        id: Date.now().toString(),
        user: "CodeColab AI",
        message: aiText,
        isAI: true,
        timestamp: createTimestamp(),
      });
    } catch (error: any) {
      console.error(error);
      pushMessage({
        id: Date.now().toString(),
        user: "System",
        message: `Error connecting to AI: ${error.message}`,
        isAI: true,
        timestamp: createTimestamp(),
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    const text = message.trim();
    if (!text || !doc || isTyping) return;

    pushMessage({
      id: Date.now().toString(),
      user: "You",
      message: text,
      timestamp: createTimestamp(),
    });

    setMessage("");
    await fetchAIResponse(text);
  };

  const handleClearChat = () => {
    if (!doc || isTyping) return;

    const chatArray = doc.getArray<ChatMessage>("chat");
    if (chatArray.length === 0) return;

    doc.transact(() => {
      chatArray.delete(0, chatArray.length);
    });

    setMessage("");
    toast({
      title: "Chat cleared",
      description: "The shared AI conversation has been reset.",
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface/82">
      <div className="border-b border-white/8 px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Assistant</p>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-muted-foreground">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-foreground">CodeColab AI Chat</p>
                <p className="truncate text-[10px] text-muted-foreground">Working on {activeFileName}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearChat}
              disabled={chatMessages.length === 0 || isTyping}
              className="h-7 rounded-full px-2 text-[10px]"
            >
              <Eraser className="h-3.5 w-3.5" />
              Clear chat
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => useEditorStore.getState().toggleRightSidebar()}
              className="h-7 w-7 rounded-full"
            >
              <span className="text-base leading-none">&times;</span>
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {chatMessages.length === 0 ? (
          <div className="px-3 py-3 pr-4">
            <div className="flex min-h-[11rem] flex-col items-center justify-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-4 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/8 bg-editor text-muted-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="font-display text-base font-semibold text-foreground">Start a real back-and-forth.</p>
                <p className="mt-1.5 max-w-xs text-[11px] leading-5 text-muted-foreground">
                  Ask for an explanation, a fix, or a refactor. The assistant now keeps conversation context instead of answering like a one-shot prompt.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 px-3 py-3 pr-4">
            {chatMessages.map((msg) => {
              const isUser = !msg.isAI && msg.user !== "System";
              const isSystem = msg.user === "System";

              return (
                <div
                  key={msg.id}
                  className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "flex max-w-[88%] min-w-0 flex-col space-y-1.5",
                      isUser ? "items-end" : "items-start",
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-2 text-[10px]",
                        isUser ? "justify-end text-muted-foreground" : "justify-start text-muted-foreground",
                      )}
                    >
                      <span className={cn("font-semibold", msg.isAI ? "text-primary" : "text-foreground")}>{msg.user}</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div
                      className={cn(
                        "w-full overflow-hidden rounded-[1.05rem] border p-3 text-[13px] leading-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]",
                        isUser && "border-primary/14 bg-primary/92 text-primary-foreground",
                        msg.isAI && !isSystem && "border-white/8 bg-white/[0.03] text-foreground",
                        isSystem && "border-white/10 bg-white/[0.05] text-foreground",
                      )}
                    >
                      {msg.message.split(/(```[\s\S]*?```)/g).map((part, index) => {
                        if (part.startsWith("```") && part.endsWith("```")) {
                          const lines = part.slice(3, -3).split("\n");
                          const language = lines[0].trim();
                          const code = lines.slice(1).join("\n").trim() || lines[0];

                          return (
                            <div key={index} className="my-2 overflow-hidden rounded-xl border border-white/8 bg-[#0B1220]">
                              <div className="flex items-center justify-between border-b border-white/8 px-3 py-2">
                                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                  {language || "CODE"}
                                </span>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={!doc || !currentFile}
                                  className="h-7 rounded-full px-3 text-[10px]"
                                  onClick={() => {
                                    if (doc && currentFile) {
                                      doc.transact(() => {
                                        const text = doc.getText(`file:${currentFile}`);
                                        text.delete(0, text.length);
                                        text.insert(0, code);
                                      });
                                    }
                                  }}
                                >
                                  Apply to file
                                </Button>
                              </div>
                              <pre className="overflow-x-auto p-3 text-[12px] leading-5 text-slate-100">{code}</pre>
                            </div>
                          );
                        }

                        return (
                          <span key={index} className="block whitespace-pre-wrap">
                            {part}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping ? (
              <div className="flex justify-start">
                <div className="rounded-[1.05rem] border border-white/8 bg-white/[0.03] px-3 py-2 text-[12px] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" />
                    AI is thinking...
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </ScrollArea>

      <div className="border-t border-white/8 px-3 py-2">
        <div className="rounded-[0.95rem] border border-white/8 bg-white/[0.025] p-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Ask AI to explain, debug, or rewrite the active file..."
            className="min-h-[42px] resize-none border-0 bg-transparent px-0 py-0 text-[12px] leading-5 shadow-none focus-visible:ring-0"
          />

          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Enter to send. Shift+Enter for newline.
            </p>
            <Button onClick={() => void handleSend()} disabled={!message.trim() || isTyping} size="sm" className="h-8 rounded-full px-3 text-[11px]">
              <Send className="h-3.5 w-3.5" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
