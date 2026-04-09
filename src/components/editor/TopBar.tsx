import { useState } from "react";
import { FolderGit2, LogOut, Share2, Sparkles, Terminal, Users } from "lucide-react";
import { motion } from "framer-motion";

import BrandMark from "@/components/layout/BrandMark";
import { useEditorStore } from "@/store/editorStore";
import { Button } from "@/components/ui/button";
import ShareModal from "./ShareModal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const TopBar = () => {
  const [showShareModal, setShowShareModal] = useState(false);
  const {
    role,
    setRole,
    onlineUsers,
    files,
    currentFile,
    leftSidebarOpen,
    rightSidebarOpen,
    terminalOpen,
    toggleLeftSidebar,
    toggleRightSidebar,
    toggleTerminal,
  } = useEditorStore();

  const currentFileName = files.find((file) => file.id === currentFile)?.name || "Untitled";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const getFileName = (fileId?: string) => {
    if (!fileId) return "No file selected";
    const file = files.find((entry) => entry.id === fileId);
    return file?.name || fileId;
  };

  return (
    <>
      <div className="border-b border-white/8 bg-[hsl(var(--surface-bg)/0.82)] backdrop-blur-2xl">
        <div className="flex min-h-14 flex-col gap-2 px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark compact quiet subtitle={currentFileName} />
            <div className="hidden items-center gap-2 xl:flex">
              <div className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                Collaborative room
              </div>
              <div className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                {onlineUsers.length || 1} active now
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={leftSidebarOpen ? "secondary" : "ghost"}
              size="sm"
              onClick={toggleLeftSidebar}
              className="rounded-full px-2.5 text-[12px]"
            >
              <FolderGit2 className="h-4 w-4" />
              Files
            </Button>
            <Button
              variant={rightSidebarOpen ? "secondary" : "ghost"}
              size="sm"
              onClick={toggleRightSidebar}
              className="rounded-full px-2.5 text-[12px]"
            >
              <Sparkles className="h-4 w-4" />
              Assistant
            </Button>
            <Button
              variant={terminalOpen ? "secondary" : "ghost"}
              size="sm"
              onClick={toggleTerminal}
              className="rounded-full px-2.5 text-[12px]"
            >
              <Terminal className="h-4 w-4" />
              Terminal
            </Button>

            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "owner" | "editor" | "viewer")}
              className="h-8 rounded-full border border-white/8 bg-secondary/80 px-3 text-[12px] text-foreground outline-none transition focus:border-primary"
            >
              <option value="owner">Owner</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>

            <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-2 py-1">
              <div className="hidden items-center gap-2 pl-1.5 text-[11px] font-semibold text-muted-foreground sm:flex">
                <Users className="h-3.5 w-3.5 text-accent" />
                Team
              </div>
              <div className="flex -space-x-2">
                {onlineUsers.length > 0 ? (
                  onlineUsers.map((user, index) => (
                    <Tooltip key={user.clientId}>
                      <TooltipTrigger asChild>
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2, delay: index * 0.04 }}
                          className="relative flex h-7 w-7 items-center justify-center rounded-xl border border-editor text-[10px] font-bold text-background shadow-md"
                          style={{ backgroundColor: user.color }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-editor bg-success" />
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[15rem] border-white/10 bg-card/95 text-xs">
                        <div className="font-semibold" style={{ color: user.color }}>
                          {user.name}
                        </div>
                        <div className="mt-1 text-muted-foreground">Editing: {getFileName(user.currentFile)}</div>
                      </TooltipContent>
                    </Tooltip>
                  ))
                ) : (
                  <div className="flex h-7 items-center rounded-full px-2.5 text-[11px] text-muted-foreground">Just you</div>
                )}
              </div>
            </div>

            <Button onClick={() => setShowShareModal(true)} size="sm" className="accent-ring rounded-full px-3 text-[12px]">
              <Share2 className="h-4 w-4" />
              Share
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="border-white/10 bg-card/95 text-xs">
                Log out
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      <ShareModal open={showShareModal} onOpenChange={setShowShareModal} />
    </>
  );
};

export default TopBar;
