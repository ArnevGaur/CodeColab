import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MonacoEditor from '@monaco-editor/react';
import { ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { Button } from '@/components/ui/button';
import TopBar from '@/components/editor/TopBar';
import Sidebar from '@/components/editor/Sidebar';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import AIChat from '@/components/editor/AIChat';
import Terminal from '@/components/editor/Terminal';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { IndexeddbPersistence } from 'y-indexeddb';
import { useParams } from 'react-router-dom';
import socket from '@/lib/socket';
import { useToast } from '@/hooks/use-toast';

const EditorPage = () => {
  const { projectId } = useParams();
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
    role,
  } = useEditorStore();

  const [onlineUsers, setOnlineUsers] = useState(1);
  const [isDocReady, setIsDocReady] = useState(false);
  const { toast } = useToast();
  
  const keystrokesRef = useRef(0);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Persistent refs across file switches — these survive the entire session
  const providerRef = useRef<WebsocketProvider | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const indexeddbProviderRef = useRef<IndexeddbPersistence | null>(null);

  // These change every time the user switches files
  const bindingRef = useRef<any>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  // Track which file is currently bound so we don't re-bind unnecessarily
  const boundFileRef = useRef<string | null>(null);

  // ─── Bind editor to the Y.Text for a specific file ─────────────────────
  const bindToFile = useCallback((fileId: string) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const doc = docRef.current;
    const provider = providerRef.current;

    if (!editor || !monaco || !doc || !provider) return;
    if (boundFileRef.current === fileId) return; // already bound

    // Destroy previous binding
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }

    // Each file gets its own named Y.Text inside the shared Y.Doc
    const yText = doc.getText(`file:${fileId}`);

    // If the Y.Text is empty and we have local content, seed it
    if (yText.length === 0) {
      const localFile = useEditorStore.getState().files.find(f => f.id === fileId);
      if (localFile?.content) {
        yText.insert(0, localFile.content);
      }
    }

    // Create a fresh model for the new file
    const fileName = useEditorStore.getState().files.find(f => f.id === fileId)?.name || 'untitled';
    const language = getLanguageFromExtension(fileName);
    const existingModel = monaco.editor.getModels().find(
      (m: any) => m.uri.path === `/${fileId}`
    );

    let model: any;
    if (existingModel) {
      model = existingModel;
    } else {
      model = monaco.editor.createModel(
        yText.toString(),
        language,
        monaco.Uri.parse(`file:///${fileId}`)
      );
    }

    editor.setModel(model);

    // Bind Yjs <-> Monaco
    const binding = new MonacoBinding(
      yText,
      model,
      new Set([editor]),
      provider.awareness
    );
    bindingRef.current = binding;
    boundFileRef.current = fileId;

    // Update awareness to broadcast which file we're editing
    provider.awareness.setLocalStateField('currentFile', fileId);
  }, []);

  // ─── Save Checkpoint Helper ────────────────────────────────────────────
  const saveCheckpoint = useCallback(async (type: 'auto' | 'manual' | 'pre-execution', label?: string) => {
    if (!docRef.current || !projectId) return;
    
    const content = docRef.current.getText(`file:${currentFile}`).toString();
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch('/api/checkpoints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roomId: projectId,
          content,
          type,
          label,
          language: getLanguageFromExtension(files.find(f => f.id === currentFile)?.name || 'js')
        })
      });
      
      if (!res.ok) throw new Error('Failed to save checkpoint');
      
      if (type === 'manual') {
        toast({ title: 'Checkpoint saved', description: label || 'Manual Save' });
      }
      
      // Reset keystrokes after any save
      keystrokesRef.current = 0;
    } catch (err) {
      console.error('Checkpoint error:', err);
    }
  }, [currentFile, files, projectId, toast]);

  // ─── Initialize Y.Doc, WebSocket, and IndexedDB once on mount ──────────
  useEffect(() => {
    // Join Socket.io room
    if (projectId) {
      socket.emit('join-room', projectId);
    }

    // Listen for restores
    const handleRestore = (data: { content: string, label: string, restoredBy: string }) => {
      if (!docRef.current || !currentFile) return;
      
      const yText = docRef.current.getText(`file:${currentFile}`);
      docRef.current.transact(() => {
        yText.delete(0, yText.length);
        yText.insert(0, data.content);
      });

      toast({
        title: 'Code restored',
        description: `Restored to "${data.label}" by ${data.restoredBy}`
      });
    };

    socket.on('restore-checkpoint', handleRestore);

    // Setup 2-minute auto-save
    autoSaveTimerRef.current = setInterval(() => {
      saveCheckpoint('auto');
    }, 2 * 60 * 1000);

    return () => {
      // Clean up everything on unmount
      bindingRef.current?.destroy();
      providerRef.current?.disconnect();
      indexeddbProviderRef.current?.destroy();
      docRef.current?.destroy();
      socket.off('restore-checkpoint', handleRestore);
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [projectId, currentFile, saveCheckpoint, toast]);

  // ─── Re-bind when the selected file changes ────────────────────────────
  useEffect(() => {
    if (currentFile && editorRef.current && docRef.current) {
      bindToFile(currentFile);
    }
  }, [currentFile, bindToFile]);

  // ─── Monaco onMount: set up Yjs infrastructure + initial binding ───────
  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const doc = new Y.Doc();
    docRef.current = doc;

    const roomName = `codecolab-room-${projectId || 'demo'}`;

    // Setup local IndexedDB persistence
    const indexeddbProvider = new IndexeddbPersistence(roomName, doc);
    indexeddbProviderRef.current = indexeddbProvider;

    indexeddbProvider.on('synced', () => {
      setIsDocReady(true);
    });

    // Connect to backend WebSocket server
    const wsHost = window.location.hostname;
    const wsUrl = `ws://${wsHost}:5005`;
    const provider = new WebsocketProvider(wsUrl, roomName, doc);
    providerRef.current = provider;

    // Pull identity from JWT if available
    const token = localStorage.getItem('token');
    let myName = `User ${Math.floor(Math.random() * 1000)}`;
    let myId = Math.random().toString();

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        myName = payload.username || myName;
        myId = payload.userId || myId;
      } catch (e) {}
    }

    // Generate deterministic color from myId
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#34d399', '#2dd4bf', '#38bdf8', '#818cf8', '#c084fc', '#f472b6'];
    const colorIndex = Math.abs(myId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
    const myColor = colors[colorIndex];

    provider.awareness.setLocalStateField('user', {
      name: myName,
      color: myColor,
    });

    // ─── Awareness change handler: sync online users + cursor labels ───
    const handleAwarenessChange = () => {
      const states = Array.from(provider.awareness.getStates().entries());
      const users: { name: string; color: string; clientId: number; currentFile?: string }[] = [];

      for (const [clientId, state] of states) {
        if (state.user) {
          users.push({
            name: state.user.name,
            color: state.user.color,
            clientId: clientId as number,
            currentFile: state.currentFile,
          });
        }
      }

      useEditorStore.getState().setOnlineUsers(users);
      setOnlineUsers(users.length);

      // Inject user names into y-monaco cursor DOM elements
      setTimeout(() => {
        const cursorHeads = document.querySelectorAll('.yRemoteSelectionHead');
        cursorHeads.forEach((head) => {
          const color = (head as HTMLElement).style.borderColor;
          (head as HTMLElement).style.setProperty('--yjs-color', color);

          const matchedUser = users.find(u => u.color === color);
          head.setAttribute('data-client-name', matchedUser?.name || 'Collaborator');
        });
      }, 100);
    };

    provider.awareness.on('change', handleAwarenessChange);

    // ─── Bind to the initially selected file ───
    const initialFile = useEditorStore.getState().currentFile;
    if (initialFile) {
      bindToFile(initialFile);
    }

    // ─── Monaco Actions & Events ─────────────────
    
    // Ctrl+S / Cmd+S manual save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveCheckpoint('manual');
    });

    // Keystroke counter for auto-save
    editor.onDidChangeModelContent(() => {
      keystrokesRef.current += 1;
      if (keystrokesRef.current >= 50) {
        saveCheckpoint('auto');
      }
    });
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const currentFileName = files.find((f) => f.id === currentFile)?.name || 'Untitled';

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar />

      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {/* Left Sidebar Toggle */}
        {!leftSidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLeftSidebar}
            className="absolute left-0 top-20 z-10 bg-surface border-r border-y border-border hover:bg-muted shadow-sm w-6 h-8 rounded-l-none"
          >
            <ChevronRight className="w-3 h-3" />
          </Button>
        )}

        {/* Left Sidebar */}
        {leftSidebarOpen && (
          <>
            <ResizablePanel defaultSize={20} minSize={10} maxSize={40} className="relative bg-surface flex flex-col">
              <Sidebar doc={docRef.current} />
            </ResizablePanel>
            <ResizableHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />
          </>
        )}

        {/* Editor */}
        <ResizablePanel defaultSize={60} minSize={30} className="flex flex-col">
          <div className="flex-1 overflow-hidden relative">
            <MonacoEditor
              height="100%"
              language={getLanguageFromExtension(currentFileName)}
              onMount={handleEditorMount}
              theme="vs-dark"
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                fontFamily: 'JetBrains Mono, Fira Code, monospace',
                lineNumbers: 'on',
                renderWhitespace: 'selection',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                readOnly: role === 'viewer',
              }}
            />
          </div>

          {/* Terminal */}
          {terminalOpen && (
            <div className="h-48 relative">
              <Terminal doc={docRef.current} />
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
                <span>👥 {onlineUsers} collaborator{onlineUsers !== 1 ? 's' : ''} online</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{getLanguageFromExtension(currentFileName)}</span>
                <span>{currentFileName}</span>
              </div>
            </div>
          )}
        </ResizablePanel>

        {/* Right Sidebar Toggle */}
        {!rightSidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleRightSidebar}
            className="absolute right-0 top-20 z-10 bg-surface border-l border-y border-border hover:bg-muted shadow-sm w-6 h-8 rounded-r-none"
          >
            <ChevronLeft className="w-3 h-3" />
          </Button>
        )}

        {/* Right Sidebar */}
        {rightSidebarOpen && (
          <>
            <ResizableHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />
            <ResizablePanel defaultSize={20} minSize={15} maxSize={40} className="relative bg-surface flex flex-col">
              <div className="w-full h-full">
                <AIChat doc={docRef.current} />
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
};

// ─── Language detection helper (module-level for reuse) ───────────────────
function getLanguageFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts': case 'tsx': return 'typescript';
    case 'js': case 'jsx': return 'javascript';
    case 'py': return 'python';
    case 'go': return 'go';
    case 'java': return 'java';
    case 'c': case 'cpp': case 'h': case 'hpp': return 'cpp';
    case 'cs': return 'csharp';
    case 'html': return 'html';
    case 'css': return 'css';
    case 'json': return 'json';
    case 'md': return 'markdown';
    case 'sql': return 'sql';
    case 'sh': case 'bash': return 'shell';
    default: return 'plaintext';
  }
}

export default EditorPage;
