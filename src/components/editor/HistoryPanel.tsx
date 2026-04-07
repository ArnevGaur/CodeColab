import { useState, useEffect, useCallback } from 'react';
import { History, RotateCcw, Eye, Clock, User, Zap, Save, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import * as Y from 'yjs';
import DiffModal from './DiffModal';
import { useToast } from '@/hooks/use-toast';
import { useEditorStore } from '@/store/editorStore';

interface HistoryPanelProps {
  doc: Y.Doc | null;
}

interface Checkpoint {
  _id: string;
  roomId: string;
  content: string;
  type: 'auto' | 'manual' | 'pre-execution';
  author: string;
  language: string;
  label: string;
  createdAt: string;
}

const HistoryPanel = ({ doc }: HistoryPanelProps) => {
  const { projectId } = useParams();
  const { currentFile } = useEditorStore();
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [diffTarget, setDiffTarget] = useState<Checkpoint | null>(null);
  const { toast } = useToast();

  const fetchCheckpoints = useCallback(async () => {
    if (!projectId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/checkpoints/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCheckpoints(data);
      }
    } catch (err) {
      console.error('Failed to fetch checkpoints', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCheckpoints();
    // Refresh list every 30 seconds
    const interval = setInterval(fetchCheckpoints, 30000);
    return () => clearInterval(interval);
  }, [fetchCheckpoints]);

  const handleRestore = async (id: string, label: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/checkpoints/restore/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Restore failed');
      
      toast({ title: 'Code restored', description: `Successfully restored to: ${label}` });
    } catch (err) {
      toast({ title: 'Restore failed', description: 'Could not restore this version.', variant: 'destructive' });
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'auto':
        return <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20"><Clock className="w-2.5 h-2.5 mr-1" /> Auto</Badge>;
      case 'manual':
        return <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20"><Save className="w-2.5 h-2.5 mr-1" /> Manual</Badge>;
      case 'pre-execution':
        return <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20"><Play className="w-2.5 h-2.5 mr-1" /> Before Run</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">Version</Badge>;
    }
  };

  const getCurrentEditorContent = () => {
    if (!doc || !currentFile) return '';
    return doc.getText(`file:${currentFile}`).toString();
  };

  return (
    <div className="h-full bg-surface border-r border-border flex flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between bg-card">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Checkpoint History</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchCheckpoints}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          title="Refresh"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-2">
        {checkpoints.length === 0 && !isLoading ? (
          <div className="text-xs text-muted-foreground p-8 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center opacity-50">
                <Zap className="w-6 h-6" />
            </div>
            No checkpoints yet. Code is saved automatically every 2 minutes or before you run code.
          </div>
        ) : (
          <div className="space-y-3 p-1">
            {checkpoints.map((cp) => (
              <div 
                key={cp._id} 
                className="p-3 rounded-lg bg-card border border-border group hover:border-primary/50 transition-all shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col gap-1">
                    {getTypeBadge(cp.type)}
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mt-1">
                      <User className="w-3 h-3 text-muted-foreground" />
                      {cp.author}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap bg-muted px-1.5 py-0.5 rounded">
                    {formatDistanceToNow(new Date(cp.createdAt), { addSuffix: true })}
                  </span>
                </div>

                <div className="text-[11px] text-muted-foreground line-clamp-2 font-mono bg-editor/50 p-2 rounded border border-border/50 mb-3 select-none">
                  {cp.content.slice(0, 60)}...
                </div>

                <div className="grid grid-cols-2 gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                  <Button 
                    onClick={() => setDiffTarget(cp)}
                    variant="outline" 
                    size="sm" 
                    className="text-[11px] h-7 border-border hover:bg-primary/10 hover:text-primary"
                  >
                    <Eye className="w-3 h-3 mr-1.5" />
                    Diff
                  </Button>
                  <Button 
                    onClick={() => handleRestore(cp._id, cp.label)}
                    variant="outline" 
                    size="sm" 
                    className="text-[11px] h-7 border-border hover:bg-primary/10 hover:text-primary"
                  >
                    <RotateCcw className="w-3 h-3 mr-1.5" />
                    Restore
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Diff Modal */}
      {diffTarget && (
        <DiffModal
          isOpen={!!diffTarget}
          onClose={() => setDiffTarget(null)}
          originalContent={diffTarget.content}
          modifiedContent={getCurrentEditorContent()}
          label={diffTarget.label}
          language={diffTarget.language}
        />
      )}
    </div>
  );
};

export default HistoryPanel;
