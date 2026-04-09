import { useEffect, useState } from "react";
import { BookOpen, Bug, Send, Sparkles, Wand2 } from "lucide-react";
import * as Y from "yjs";

import { useEditorStore, type ChatMessage } from "@/store/editorStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AIChatProps {
  doc: Y.Doc | null;
}

const quickActions = [
  { label: "Explain", icon: BookOpen },
  { label: "Refactor", icon: Wand2 },
  { label: "Debug", icon: Bug },
  { label: "Ideas", icon: Sparkles },
];

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

const AIChat = ({ doc }: AIChatProps) => {
  const { chatMessages, setChatMessages, currentFile } = useEditorStore();
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

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

  const fetchAIResponse = async (userText: string, actionType?: string) => {
    if (!doc) return;
    setIsTyping(true);

    try {
      const currentCode =
        currentFile && doc ? doc.getText(`file:${currentFile}`).toString() || "/* No code in editor */" : "/* No code in editor */";
      const activeFileName =
        useEditorStore.getState().files.find((file) => file.id === currentFile)?.name || "Untitled";
      const chatSnapshot = doc.getArray<ChatMessage>("chat").toArray();
      const priorMessages =
        chatSnapshot.length > 0 && !chatSnapshot[chatSnapshot.length - 1].isAI
          ? chatSnapshot.slice(0, -1)
          : chatSnapshot;
      const conversationHistory = buildConversationHistory(priorMessages);

      let prompt = userText;

      if (actionType) {
        prompt = `Please ${actionType.toLowerCase()} the active file. ${userText ? `User request: ${userText}` : "Focus on the current code and be specific."}`;
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful AI coding assistant in a collaborative editor called CodeColab. Continue the existing conversation naturally instead of restarting from scratch. Keep responses concise, technical, and actionable. When useful, reference the active file and current code. Format code snippets with markdown fences.",
            },
            ...conversationHistory,
            {
              role: "user",
              content: `Active file: ${activeFileName}\n\nUser request: ${prompt}\n\n### Current Editor Code ###\n\`\`\`\n${currentCode}\n\`\`\``,
            },
          ],
          temperature: 0.35,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq request failed (${response.status})`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error.message || "Groq API error");

      const aiText = data.choices?.[0]?.message?.content || "I could not generate a response.";

      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        user: "CodeColab AI",
        message: aiText,
        isAI: true,
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      };

      doc.getArray<ChatMessage>("chat").push([aiMessage]);
    } catch (error: any) {
      console.error(error);
      doc.getArray<ChatMessage>("chat").push([
        {
          id: Date.now().toString(),
          user: "System",
          message: `Error connecting to AI: ${error.message}`,
          isAI: true,
          timestamp: new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    const textToProcess = message.trim();
    if (!textToProcess || !doc || isTyping) return;

    const timestamp = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    doc.getArray<ChatMessage>("chat").push([
      {
        id: Date.now().toString(),
        user: "You",
        message: textToProcess,
        timestamp,
      },
    ]);

    setMessage("");
    await fetchAIResponse(textToProcess);
  };

  const handleQuickAction = async (actionLabel: string) => {
    if (!doc || isTyping) return;

    const timestamp = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    doc.getArray<ChatMessage>("chat").push([
      {
        id: Date.now().toString(),
        user: "You",
        message: `Triggered quick action: ${actionLabel}`,
        timestamp,
      },
    ]);

    await fetchAIResponse("", actionLabel);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface/80">
      <div className="border-b border-white/8 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Assistant</p>
            <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              AI + room chat
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => useEditorStore.getState().toggleRightSidebar()}
            className="h-9 w-9 rounded-2xl"
          >
            <span className="text-lg leading-none">&times;</span>
          </Button>
        </div>
      </div>

      <div className="border-b border-white/8 px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction(action.label)}
              className="rounded-full px-3"
            >
              <action.icon className="h-3.5 w-3.5" />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-4">
        {chatMessages.length === 0 ? (
          <div className="panel-subtle flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-foreground">Ask for a real edit, not generic tips.</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Use the quick actions or send a prompt tied to the current file. The assistant now reads from the active file content.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {chatMessages.map((msg) => (
              <div key={msg.id} className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className={`font-semibold ${msg.isAI ? "text-primary" : "text-foreground"}`}>{msg.user}</span>
                  <span className="text-muted-foreground">{msg.timestamp}</span>
                </div>
                <div
                  className={`rounded-[1.35rem] border p-4 text-sm leading-7 ${
                    msg.isAI
                      ? "border-primary/15 bg-primary/10 text-foreground"
                      : "border-white/8 bg-white/[0.03] text-foreground/92"
                  }`}
                >
                  {msg.message.split(/(```[\s\S]*?```)/g).map((part, index) => {
                    if (part.startsWith("```") && part.endsWith("```")) {
                      const lines = part.slice(3, -3).split("\n");
                      const language = lines[0].trim();
                      const code = lines.slice(1).join("\n").trim() || lines[0];

                      return (
                        <div key={index} className="my-3 overflow-hidden rounded-2xl border border-white/8 bg-editor">
                          <div className="flex items-center justify-between border-b border-white/8 px-3 py-2">
                            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                              {language || "CODE"}
                            </span>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 rounded-full px-3 text-[11px]"
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
                          <pre className="overflow-x-auto p-3 text-xs text-foreground">{code}</pre>
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
            ))}

            {isTyping ? (
              <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                AI is thinking...
              </div>
            ) : null}
          </div>
        )}
      </ScrollArea>

      <div className="border-t border-white/8 p-4">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask AI to explain, refactor, or debug the active file..."
          />
          <Button onClick={handleSend} size="icon" className="accent-ring">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
