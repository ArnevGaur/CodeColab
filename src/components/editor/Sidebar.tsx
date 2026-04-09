import { FileText, History, MessageSquare, Settings, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import * as Y from "yjs";

import { useEditorStore } from "@/store/editorStore";
import { Button } from "@/components/ui/button";
import FileExplorer from "./FileExplorer";
import HistoryPanel from "./HistoryPanel";

interface SidebarProps {
  doc: Y.Doc | null;
}

const tabs = [
  { id: "files" as const, icon: FileText, label: "Files", description: "Switch files and create new workspace items." },
  { id: "history" as const, icon: History, label: "History", description: "Compare checkpoints and restore previous states." },
  { id: "chat" as const, icon: MessageSquare, label: "Chat", description: "Team chat surface reserved for a later pass." },
  { id: "ai" as const, icon: Sparkles, label: "Hints", description: "Quick AI affordances belong here when expanded." },
  { id: "settings" as const, icon: Settings, label: "Settings", description: "Workspace-level preferences and access controls." },
];

const Sidebar = ({ doc }: SidebarProps) => {
  const { leftSidebarTab, setLeftSidebarTab } = useEditorStore();
  const activeTab = tabs.find((tab) => tab.id === leftSidebarTab) || tabs[0];

  const renderPlaceholder = (title: string, description: string) => (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="panel-subtle p-5">
        <h3 className="font-display text-xl font-semibold text-foreground">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
      </div>
      <div className="panel-subtle flex-1 p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Reserved surface</p>
        <div className="mt-4 space-y-3">
          {[
            "This panel now has proper contrast and spacing.",
            "Interaction logic can be filled in without redesigning the shell again.",
            "The editor stays visually coherent even when a feature is not finished yet.",
          ].map((point) => (
            <div key={point} className="flex items-start gap-3 rounded-2xl border border-white/6 bg-white/[0.03] p-4">
              <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
              <p className="text-sm leading-7 text-foreground/88">{point}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 bg-surface/80">
      <div className="flex w-14 flex-col items-center gap-2 border-r border-white/8 bg-editor/75 px-2 py-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <motion.div key={tab.id} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Button
                variant={leftSidebarTab === tab.id ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setLeftSidebarTab(tab.id)}
                className={`h-11 w-11 rounded-2xl ${
                  leftSidebarTab === tab.id ? "bg-primary/12 text-primary" : "text-muted-foreground"
                }`}
                title={tab.label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            </motion.div>
          );
        })}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-white/8 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{activeTab.label}</p>
          <p className="mt-2 text-sm text-foreground/90">{activeTab.description}</p>
        </div>

        <div className="min-h-0 flex-1">
          {leftSidebarTab === "files" && <FileExplorer doc={doc} />}
          {leftSidebarTab === "history" && <HistoryPanel doc={doc} />}
          {leftSidebarTab === "chat" && renderPlaceholder("Team chat", "Keep room conversation anchored next to the files it refers to.")}
          {leftSidebarTab === "ai" && renderPlaceholder("AI workspace", "Secondary actions and canned prompts can live here without crowding the editor pane.")}
          {leftSidebarTab === "settings" && renderPlaceholder("Workspace settings", "Permissions, room metadata, and editor preferences belong in this lane.")}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
