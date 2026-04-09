import { useCallback, useEffect, useState } from "react";
import { Clock, Eye, History, Play, RotateCcw, Save, User, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useParams } from "react-router-dom";
import * as Y from "yjs";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { authenticatedFetch } from "@/lib/auth";
import { useEditorStore } from "@/store/editorStore";
import DiffModal from "./DiffModal";

interface HistoryPanelProps {
  doc: Y.Doc | null;
}

interface Checkpoint {
  _id: string;
  roomId: string;
  content: string;
  type: "auto" | "manual" | "pre-execution";
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
      const res = await authenticatedFetch(`/api/checkpoints/${projectId}`);

      if (res.ok) {
        const data = await res.json();
        setCheckpoints(data);
      }
    } catch (err) {
      console.error("Failed to fetch checkpoints", err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCheckpoints();
    const interval = setInterval(fetchCheckpoints, 30000);
    return () => clearInterval(interval);
  }, [fetchCheckpoints]);

  const handleRestore = async (id: string, label: string) => {
    try {
      const res = await authenticatedFetch(`/api/checkpoints/restore/${id}`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Restore failed");

      toast({ title: "Code restored", description: `Restored checkpoint: ${label}` });
    } catch (err) {
      toast({
        title: "Restore failed",
        description: "Could not restore this version.",
        variant: "destructive",
      });
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "auto":
        return (
          <Badge variant="secondary" className="border-white/10 bg-white/[0.04] text-muted-foreground">
            <Clock className="mr-1 h-3 w-3" />
            Auto
          </Badge>
        );
      case "manual":
        return (
          <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
            <Save className="mr-1 h-3 w-3" />
            Manual
          </Badge>
        );
      case "pre-execution":
        return (
          <Badge variant="secondary" className="border-accent/20 bg-accent/10 text-accent">
            <Play className="mr-1 h-3 w-3" />
            Before Run
          </Badge>
        );
      default:
        return <Badge variant="outline">Version</Badge>;
    }
  };

  const getCurrentEditorContent = () => {
    if (!doc || !currentFile) return "";
    return doc.getText(`file:${currentFile}`).toString();
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface/75">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">History</p>
          <div className="mt-1 flex items-center gap-2 text-sm text-foreground">
            <History className="h-4 w-4 text-muted-foreground" />
            Checkpoints
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchCheckpoints}
          className="h-9 w-9 rounded-2xl text-muted-foreground hover:text-foreground"
          title="Refresh"
        >
          <RotateCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-3">
        {checkpoints.length === 0 && !isLoading ? (
          <div className="m-1 flex flex-col items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/8 text-muted-foreground">
              <Zap className="h-5 w-5" />
            </div>
            <p className="max-w-xs text-sm leading-7 text-muted-foreground">
              No checkpoints yet. Automatic saves appear here, plus the pre-run snapshots created before execution.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {checkpoints.map((checkpoint) => (
              <div key={checkpoint._id} className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    {getTypeBadge(checkpoint.type)}
                    <div>
                      <p className="text-sm font-semibold text-foreground">{checkpoint.label || "Saved checkpoint"}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        {checkpoint.author}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-full border border-white/8 px-3 py-1 text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(checkpoint.createdAt), { addSuffix: true })}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/6 bg-editor/70 p-3">
                  <p className="line-clamp-3 whitespace-pre-wrap text-[12px] leading-6 text-muted-foreground">
                    {checkpoint.content}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button onClick={() => setDiffTarget(checkpoint)} variant="outline" size="sm" className="justify-center">
                    <Eye className="h-3.5 w-3.5" />
                    Diff
                  </Button>
                  <Button
                    onClick={() => handleRestore(checkpoint._id, checkpoint.label)}
                    variant="outline"
                    size="sm"
                    className="justify-center"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {diffTarget ? (
        <DiffModal
          isOpen={!!diffTarget}
          onClose={() => setDiffTarget(null)}
          originalContent={diffTarget.content}
          modifiedContent={getCurrentEditorContent()}
          label={diffTarget.label}
          language={diffTarget.language}
        />
      ) : null}
    </div>
  );
};

export default HistoryPanel;
