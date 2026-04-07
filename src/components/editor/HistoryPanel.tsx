import { useState, useEffect } from 'react';
import { History, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as Y from 'yjs';

interface HistoryPanelProps {
  doc: Y.Doc | null;
}

interface Snapshot {
  id: string;
  timestamp: string;
  content: string;
  author: string;
}

const HistoryPanel = ({ doc }: HistoryPanelProps) => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('codecolab-snapshots');
    if (saved) {
      try {
        setSnapshots(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const saveSnapshot = () => {
    if (!doc) return;
    const content = doc.getText('monaco').toString();
    const newSnapshot: Snapshot = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
      content,
      author: 'You (Auto-Save)',
    };
    
    const updated = [newSnapshot, ...snapshots];
    setSnapshots(updated);
    localStorage.setItem('codecolab-snapshots', JSON.stringify(updated));
  };

  const handleRestore = (content: string) => {
    if (!doc) return;
    const ytext = doc.getText('monaco');
    ytext.delete(0, ytext.length);
    ytext.insert(0, content);
  };

  return (
    <div className="h-full bg-surface border-r border-border flex flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Version History</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={saveSnapshot}
          className="h-6 w-6 p-0 hover:bg-muted"
          title="Save Snapshot"
        >
          <Save className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-2">
        {snapshots.length === 0 ? (
          <div className="text-xs text-muted-foreground p-2 text-center mt-4">
            No snapshots yet. Click the save icon to snapshot your current session.
          </div>
        ) : (
          <div className="space-y-2">
            {snapshots.map((snap) => (
              <div 
                key={snap.id} 
                className="p-3 rounded-md bg-background border border-border flex flex-col gap-2 hover:border-primary/50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-foreground">{snap.author}</span>
                  <span className="text-[10px] text-muted-foreground">{snap.timestamp}</span>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2 font-mono bg-muted p-1 rounded">
                  {snap.content.slice(0, 100)}...
                </div>
                <Button 
                  onClick={() => handleRestore(snap.content)}
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs h-7 mt-1 border-primary/20 hover:bg-primary/10 hover:text-primary"
                >
                  <RotateCcw className="w-3 h-3 mr-2" />
                  Restore This Version
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default HistoryPanel;
