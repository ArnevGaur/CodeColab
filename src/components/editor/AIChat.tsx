import { useState, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { useEditorStore, ChatMessage } from '@/store/editorStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as Y from 'yjs';

interface AIChatProps {
  doc: Y.Doc | null;
}

const AIChat = ({ doc }: AIChatProps) => {
  const { chatMessages, setChatMessages } = useEditorStore();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!doc) return;
    const chatArray = doc.getArray<ChatMessage>('chat');
    
    // Initial load
    setChatMessages(chatArray.toArray());

    // Observe changes from websockets
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
      const currentCode = doc.getText('monaco').toString() || '/* No code in editor */';
      let prompt = userText;
      
      if (actionType) {
        prompt = `Please ${actionType.toLowerCase()} the following code context. \nUser Request: ${userText}`;
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI coding assistant in a collaborative editor called CodeColab. Keep your responses concise, highly technical, and immediately actionable. Format your code snippets nicely using markdown.'
            },
            {
              role: 'user',
              content: `${prompt}\n\n### Current Editor Code ###\n\`\`\`\n${currentCode}\n\`\`\``
            }
          ]
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'Groq API error');
      
      const aiText = data.choices?.[0]?.message?.content || 'I could not generate a response.';
      
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        user: 'CodeColab AI',
        message: aiText,
        isAI: true,
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
      };
      
      doc.getArray<ChatMessage>('chat').push([aiMessage]);
    } catch (error: any) {
      console.error(error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        user: 'System',
        message: `Error connecting to AI: ${error.message}`,
        isAI: true,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      };
      doc.getArray<ChatMessage>('chat').push([errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    const textToProcess = message.trim();
    if (!textToProcess || !doc) return;

    const chatArray = doc.getArray<ChatMessage>('chat');
    
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      user: 'You',
      message: textToProcess,
      timestamp,
    };

    chatArray.push([newMessage]);
    setMessage('');
    
    // Always trigger AI for now as a demo
    await fetchAIResponse(textToProcess);
  };
  
  const handleQuickAction = async (actionLabel: string) => {
    if (!doc) return;
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    doc.getArray<ChatMessage>('chat').push([{
      id: Date.now().toString(),
      user: 'You',
      message: `Triggered quick action: ${actionLabel}`,
      timestamp
    }]);
    
    await fetchAIResponse('', actionLabel);
  };

  const quickActions = [
    { label: 'Explain', icon: '📖' },
    { label: 'Optimize', icon: '⚡' },
    { label: 'Debug', icon: '🐛' },
    { label: 'Test', icon: '✅' },
  ];

  return (
    <div className="h-full bg-surface border-l border-border flex flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">AI Assistant & Chat</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => useEditorStore.getState().toggleRightSidebar()}
          className="h-6 w-6 p-0 hover:bg-muted"
        >
          <span className="text-xs">&times;</span>
        </Button>
      </div>

      <div className="p-3 border-b border-border">
        <div className="flex gap-2 flex-wrap">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction(action.label)}
              className="text-xs bg-background border-border hover:bg-muted"
            >
              <span className="mr-1">{action.icon}</span>
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-4">
          {chatMessages.map((msg) => (
            <div key={msg.id} className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-xs font-medium ${
                    msg.isAI ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {msg.user}
                </span>
                <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
              </div>
              <div
                className={`text-sm p-3 rounded-lg overflow-hidden ${
                  msg.isAI
                    ? 'bg-muted border border-primary/20'
                    : 'bg-background border border-border'
                }`}
              >
                {msg.message.split(/(```[\s\S]*?```)/g).map((part, index) => {
                  if (part.startsWith('```') && part.endsWith('```')) {
                    const lines = part.slice(3, -3).split('\n');
                    const language = lines[0].trim();
                    // Handle edge case where first line has no content and just code starts immediately
                    const code = lines.slice(1).join('\n').trim() || lines[0];
                    
                    return (
                      <div key={index} className="relative my-2 rounded border border-border group bg-card">
                        <div className="flex items-center justify-between px-2 py-1 bg-surface border-b border-border">
                          <span className="text-[10px] text-muted-foreground uppercase">{language || 'CODE'}</span>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-5 text-[10px] px-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary"
                            onClick={() => {
                              if (doc) {
                                doc.transact(() => {
                                  const text = doc.getText('monaco');
                                  text.delete(0, text.length);
                                  text.insert(0, code);
                                });
                              }
                            }}
                          >
                            Apply to Editor
                          </Button>
                        </div>
                        <pre className="p-2 overflow-x-auto text-xs font-mono font-medium text-foreground">
                          {code}
                        </pre>
                      </div>
                    );
                  }
                  return <span key={index} className="whitespace-pre-wrap font-sans block">{part}</span>;
                })}
              </div>
            </div>
          ))}
          {isTyping && (
             <div className="flex items-center gap-2 p-2">
               <Sparkles className="w-4 h-4 text-primary animate-pulse" />
               <span className="text-xs text-muted-foreground animate-pulse">AI is thinking...</span>
             </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask AI or chat with team..."
            className="bg-background border-border"
          />
          <Button onClick={handleSend} size="icon" className="bg-gradient-primary">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
