import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, FileText, Folder, Plus } from "lucide-react";
import * as Y from "yjs";

import { useEditorStore } from "@/store/editorStore";
import { Button } from "@/components/ui/button";

interface FileExplorerProps {
  doc: Y.Doc | null;
}

const FileExplorer = ({ doc }: FileExplorerProps) => {
  const { files, currentFile, setCurrentFile } = useEditorStore();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  const fileCount = files.filter((file) => file.type === "file").length;

  const toggleFolder = (folderId: string) => {
    const next = new Set(expandedFolders);
    if (next.has(folderId)) {
      next.delete(folderId);
    } else {
      next.add(folderId);
    }
    setExpandedFolders(next);
  };

  useEffect(() => {
    if (!doc) return;
    const fileMap = doc.getMap("files");

    if (fileMap.size === 0) {
      const defaultFiles = useEditorStore.getState().files;
      defaultFiles.forEach((file) => fileMap.set(file.id, file));
    }

    const syncFromMap = () => {
      const filesArray = Array.from(fileMap.values()) as any[];
      if (filesArray.length > 0) {
        useEditorStore.setState({ files: filesArray });
      }
    };

    syncFromMap();
    fileMap.observe(syncFromMap);
    return () => fileMap.unobserve(syncFromMap);
  }, [doc]);

  const handleCreateFile = () => {
    if (!newFileName.trim()) {
      setIsCreating(false);
      setNewFileName("");
      return;
    }

    if (!doc) return;

    const ext = newFileName.split(".").pop()?.toLowerCase();
    let defaultContent = "// Start coding here\n";
    if (ext === "py" || ext === "sh" || ext === "rb" || ext === "yaml" || ext === "yml") {
      defaultContent = "# Start coding here\n";
    } else if (ext === "html" || ext === "xml") {
      defaultContent = "<!-- Start coding here -->\n";
    } else if (ext === "css") {
      defaultContent = "/* Start coding here */\n";
    }

    const newFile = {
      id: `file-${Date.now()}`,
      name: newFileName.trim(),
      type: "file" as const,
      content: defaultContent,
    };

    doc.getMap("files").set(newFile.id, newFile);
    setCurrentFile(newFile.id);
    setIsCreating(false);
    setNewFileName("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface/75">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{fileCount} file(s)</p>
        </div>
        <Button variant="secondary" size="icon" onClick={() => setIsCreating(true)} className="h-9 w-9 rounded-2xl">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-auto p-3">
        {isCreating ? (
          <div className="rounded-2xl border border-primary/25 bg-primary/10 p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <input
                autoFocus
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFile();
                  if (e.key === "Escape") {
                    setIsCreating(false);
                    setNewFileName("");
                  }
                }}
                onBlur={() => {
                  if (!newFileName.trim()) {
                    setIsCreating(false);
                    setNewFileName("");
                  }
                }}
                placeholder="filename.ext"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        ) : null}

        {files.map((file) => (
          <div key={file.id}>
            {file.type === "folder" ? (
              <div className="space-y-1">
                <button
                  onClick={() => toggleFolder(file.id)}
                  className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-white/[0.04]"
                >
                  {expandedFolders.has(file.id) ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Folder className="h-4 w-4 text-primary" />
                  <span>{file.name}</span>
                </button>
                {expandedFolders.has(file.id) && file.children ? (
                  <div className="ml-5 space-y-1">
                    {file.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => setCurrentFile(child.id)}
                        className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm transition ${
                          currentFile === child.id
                            ? "border border-primary/20 bg-primary/12 text-foreground"
                            : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                        }`}
                      >
                        <FileText className="h-4 w-4" />
                        <span>{child.name}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                onClick={() => setCurrentFile(file.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                  currentFile === file.id
                    ? "border border-primary/20 bg-primary/12 text-foreground"
                    : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                }`}
              >
                <FileText className={`h-4 w-4 ${currentFile === file.id ? "text-primary" : "text-muted-foreground"}`} />
                <span className="truncate">{file.name}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileExplorer;
