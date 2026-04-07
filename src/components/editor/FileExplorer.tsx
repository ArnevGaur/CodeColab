import { useState, useEffect } from 'react';
import { FileText, Folder, ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { Button } from '@/components/ui/button';
import * as Y from 'yjs';

interface FileExplorerProps {
  doc: Y.Doc | null;
}

const FileExplorer = ({ doc }: FileExplorerProps) => {
  const { files, currentFile, setCurrentFile, addFile } = useEditorStore();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };
  
  useEffect(() => {
    if (!doc) return;
    const fileMap = doc.getMap('files');
    
    // Observe file creations from others
    const observer = () => {
      const filesArray = Array.from(fileMap.values()) as any[];
      if (filesArray.length > 0) {
        useEditorStore.setState({ files: filesArray });
      }
    };
    fileMap.observe(observer);
    return () => fileMap.unobserve(observer);
  }, [doc]);

  const handleCreateFile = () => {
    if (!newFileName.trim()) {
      setIsCreating(false);
      setNewFileName('');
      return;
    }
    
    if (!doc) return;
    
    // Determine comment syntax based on language extension
    const ext = newFileName.split('.').pop()?.toLowerCase();
    let defaultContent = '// Start coding here\n';
    if (ext === 'py' || ext === 'sh' || ext === 'rb' || ext === 'yaml' || ext === 'yml') {
      defaultContent = '# Start coding here\n';
    } else if (ext === 'html' || ext === 'xml') {
      defaultContent = '<!-- Start coding here -->\n';
    } else if (ext === 'css') {
      defaultContent = '/* Start coding here */\n';
    }

    const newFile = {
      id: `file-${Date.now()}`,
      name: newFileName.trim(),
      type: 'file' as const,
      content: defaultContent,
    };
    
    // Broadcast creation to everyone using Yjs
    const fileMap = doc.getMap('files');
    fileMap.set(newFile.id, newFile);
    
    // Local fallback
    addFile(newFile);
    setCurrentFile(newFile.id);
    setIsCreating(false);
    setNewFileName('');
  };

  return (
    <div className="h-full bg-surface border-r border-border flex flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">EXPLORER</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCreating(true)}
          className="h-6 w-6 p-0 hover:bg-muted"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {isCreating && (
          <div className="flex items-center gap-2 w-full px-2 py-1 mb-1">
            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFile();
                if (e.key === 'Escape') {
                  setIsCreating(false);
                  setNewFileName('');
                }
              }}
              onBlur={() => {
                if (!newFileName.trim()) {
                  setIsCreating(false);
                  setNewFileName('');
                }
              }}
              placeholder="filename.ext"
              className="bg-background text-sm text-foreground outline-none border border-primary/50 w-full rounded px-1 min-w-0"
            />
          </div>
        )}
        {files.map((file) => (
          <div key={file.id}>
            {file.type === 'folder' ? (
              <div>
                <button
                  onClick={() => toggleFolder(file.id)}
                  className="flex items-center gap-2 w-full px-2 py-1 text-sm text-foreground hover:bg-muted rounded transition-colors"
                >
                  {expandedFolders.has(file.id) ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <Folder className="w-4 h-4 text-primary" />
                  <span>{file.name}</span>
                </button>
                {expandedFolders.has(file.id) && file.children && (
                  <div className="ml-4">
                    {file.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => setCurrentFile(child.id)}
                        className={`flex items-center gap-2 w-full px-2 py-1 text-sm rounded transition-colors ${
                          currentFile === child.id
                            ? 'bg-muted text-primary'
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span>{child.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setCurrentFile(file.id)}
                className={`flex items-center gap-2 w-full px-2 py-1 text-sm rounded transition-colors ${
                  currentFile === file.id
                    ? 'bg-muted text-primary'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span>{file.name}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileExplorer;
