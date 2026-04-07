import { useState } from 'react';
import { FileText, Folder, ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { Button } from '@/components/ui/button';

const FileExplorer = () => {
  const { files, currentFile, setCurrentFile, addFile } = useEditorStore();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleNewFile = () => {
    const newFile = {
      id: `file-${Date.now()}`,
      name: 'untitled.tsx',
      type: 'file' as const,
      content: '// New file\n',
    };
    addFile(newFile);
    setCurrentFile(newFile.id);
  };

  return (
    <div className="h-full bg-surface border-r border-border flex flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">EXPLORER</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewFile}
          className="h-6 w-6 p-0 hover:bg-muted"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-2">
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
