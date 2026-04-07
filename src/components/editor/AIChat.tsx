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

  const handleSend = () => {
    if (!message.trim() || !doc) return;

    const chatArray = doc.getArray<ChatMessage>('chat');
    
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      user: 'You', // In a real app we'd use the user's login name, for anon we just say You locally but we should really sync the awareness name.
      message,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    };

    chatArray.push([newMessage]);
    setMessage('');
  };

  const quickActions = [
    { label: 'Explain', icon: '📖' },
    { label: 'Optimize', icon: '⚡' },
    { label: 'Debug', icon: '🐛' },
    { label: 'Test', icon: '✅' },
  ];

  return (
    <div className="h-full bg-surface border-l border-border flex flex-col">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">AI Assistant & Chat</span>
      </div>

      <div className="p-3 border-b border-border">
        <div className="flex gap-2 flex-wrap">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
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
                className={`text-sm p-3 rounded-lg ${
                  msg.isAI
                    ? 'bg-muted border border-primary/20'
                    : 'bg-background border border-border'
                }`}
              >
                {msg.message}
              </div>
            </div>
          ))}
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
