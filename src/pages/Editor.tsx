import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { Button } from '@/components/ui/button';
import TopBar from '@/components/editor/TopBar';
import Sidebar from '@/components/editor/Sidebar';
import AIChat from '@/components/editor/AIChat';
import Terminal from '@/components/editor/Terminal';

const EditorPage = () => {
  const {
    currentFile,
    files,
    updateFileContent,
    terminalOpen,
    toggleTerminal,
    leftSidebarOpen,
    rightSidebarOpen,
    toggleLeftSidebar,
    toggleRightSidebar,
  } = useEditorStore();

  const [editorValue, setEditorValue] = useState('');

  useEffect(() => {
    const file = files.find((f) => f.id === currentFile);
    if (file?.content) {
      setEditorValue(file.content);
    }
  }, [currentFile, files]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && currentFile) {
      setEditorValue(value);
      updateFileContent(currentFile, value);
    }
  };

  const currentFileName = files.find((f) => f.id === currentFile)?.name || 'Untitled';
  const language = currentFileName.endsWith('.tsx') || currentFileName.endsWith('.ts')
    ? 'typescript'
    : currentFileName.endsWith('.md')
    ? 'markdown'
    : 'plaintext';

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Toggle */}
        {!leftSidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLeftSidebar}
            className="absolute left-0 top-20 z-10 bg-surface border border-border hover:bg-muted"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}

        {/* Left Sidebar */}
        {leftSidebarOpen && (
          <div className="relative">
            <Sidebar />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLeftSidebar}
              className="absolute -right-3 top-4 z-10 bg-surface border border-border hover:bg-muted"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={language}
              value={editorValue}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                fontFamily: 'JetBrains Mono, Fira Code, monospace',
                lineNumbers: 'on',
                renderWhitespace: 'selection',
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>

          {/* Terminal */}
          {terminalOpen && (
            <div className="h-48 relative">
              <Terminal />
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTerminal}
                className="absolute right-2 top-2 bg-surface border border-border hover:bg-muted"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </div>
          )}

          {!terminalOpen && (
            <div className="h-8 bg-card border-t border-border flex items-center justify-between px-4">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <button
                  onClick={toggleTerminal}
                  className="hover:text-foreground transition-colors"
                >
                  Terminal
                </button>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-success"></span>
                  Connected
                </span>
                <span>👥 3 collaborators online</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>TypeScript</span>
                <span>Ln 15, Col 22</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar Toggle */}
        {!rightSidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleRightSidebar}
            className="absolute right-0 top-20 z-10 bg-surface border border-border hover:bg-muted"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}

        {/* Right Sidebar */}
        {rightSidebarOpen && (
          <div className="w-80 relative">
            <AIChat />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRightSidebar}
              className="absolute -left-3 top-4 z-10 bg-surface border border-border hover:bg-muted"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorPage;
