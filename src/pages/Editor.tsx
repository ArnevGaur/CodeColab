import { useCallback, useEffect, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { ChevronRight, ChevronUp, Sparkles } from 'lucide-react';
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
  const [isEditorReady, setIsEditorReady] = useState(false);
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

    if (!editor || !monaco || !doc || !provider) {
      console.log('[Editor] Deferred binding: missing editor, monaco, doc, or provider');
      return;
    }
    
    if (boundFileRef.current === fileId && bindingRef.current) return;

    console.log('[Editor] Binding to fileId:', fileId);

    // Destroy previous binding
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }

    const yText = doc.getText(`file:${fileId}`);
    const fileName = useEditorStore.getState().files.find(f => f.id === fileId)?.name || 'untitled';
    const language = getLanguageFromExtension(fileName);
    
    // Manage models correctly to avoid duplicates
    const modelUri = monaco.Uri.parse(`file:///${fileId}`);
    let model = monaco.editor.getModel(modelUri);
    
    if (!model) {
      model = monaco.editor.createModel(yText.toString(), language, modelUri);
    }
    
    editor.setModel(model);

    // Create new binding
    const binding = new MonacoBinding(
      yText,
      model,
      new Set([editor]),
      provider.awareness
    );
    
    bindingRef.current = binding;
    boundFileRef.current = fileId;

    provider.awareness.setLocalStateField('currentFile', fileId);
  }, []);

  // ─── Save Checkpoint Helper ────────────────────────────────────────────
  const saveCheckpoint = useCallback(async (type: 'auto' | 'manual' | 'pre-execution', label?: string) => {
    if (!docRef.current || !projectId || !currentFile) return;
    
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
      if (type === 'manual') toast({ title: 'Checkpoint saved', description: label || 'Manual Save' });
      keystrokesRef.current = 0;
    } catch (err) {
      console.error('Checkpoint error:', err);
    }
  }, [currentFile, files, projectId, toast]);

  // ─── Lifecycle Phase 1: Initialize Yjs Network & Persistence ───────────
  useEffect(() => {
    if (!projectId) return;

    console.log('[Editor] Initializing Yjs for projectId:', projectId);
    const doc = new Y.Doc();
    docRef.current = doc;

    const roomName = `codecolab-room-${projectId}`;
    
    // 1. IndexedDB (Local cache)
    const indexeddbProvider = new IndexeddbPersistence(roomName, doc);
    indexeddbProviderRef.current = indexeddbProvider;
    indexeddbProvider.on('synced', () => {
      console.log('[Editor] IndexedDB synced');
      setIsDocReady(true);
    });

    // 2. WebSocket (Network)
    const wsHost = window.location.hostname;
    const wsUrl = `ws://${wsHost}:5005`;
    const provider = new WebsocketProvider(wsUrl, roomName, doc);
    providerRef.current = provider;

    provider.on('status', (event: any) => console.log('[Editor] Yjs Connection Status:', event.status));
    
    // 3. Fallback Seeding Logic
    provider.on('sync', async (isSynced: boolean) => {
      if (!isSynced || !projectId) return;
      console.log('[Editor] Yjs Network Synced');
      
      // Check if doc is genuinely empty
      let hasContent = false;
      for (const [_, value] of doc.share) {
        if (value instanceof Y.Text && value.length > 0) {
          hasContent = true;
          break;
        }
      }

      if (!hasContent) {
        console.log('[Editor] Room is empty, fetching lastContent fallback...');
        try {
          const res = await fetch(`/api/rooms/${projectId}`);
          if (res.ok) {
            const roomData = await res.json();
            if (roomData.lastContent) {
              console.log('[Editor] Seeding from backup...');
              const parts = roomData.lastContent.split(/--- (file:[a-zA-Z0-9-]+) ---\n/);
              doc.transact(() => {
                for (let i = 1; i < parts.length; i += 2) {
                  const key = parts[i];
                  const content = parts[i + 1]?.trim();
                  if (key && content) {
                    const yText = doc.getText(key);
                    if (yText.length === 0) yText.insert(0, content);
                  }
                }
              });
            }
          }
        } catch (e) { console.error('[Editor] Fallback failed:', e); }
      }
    });

    // 4. Presence Awareness
    const handleAwareness = () => {
      const states = Array.from(provider.awareness.getStates().entries());
      const users: any[] = [];
      for (const [clientId, state] of states) {
        if (state.user) users.push({ ...state.user, clientId, currentFile: state.currentFile });
      }
      useEditorStore.getState().setOnlineUsers(users);
      setOnlineUsers(users.length);
    };
    provider.awareness.on('change', handleAwareness);

    // Identity setup
    const token = localStorage.getItem('token');
    let myName = 'User ' + Math.floor(Math.random() * 1000);
    let myId = Math.random().toString();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        myName = payload.username || myName;
        myId = payload.userId || myId;
      } catch {}
    }
    const colors = ['#e8e8e8', '#d6d6d6', '#c4c4c4', '#b3b3b3', '#a1a1a1', '#8f8f8f', '#7d7d7d', '#dcdcdc', '#cacaca', '#aaaaaa', '#8a8a8a'];
    const myColor = colors[Math.abs(myId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % colors.length];
    provider.awareness.setLocalStateField('user', { name: myName, color: myColor });

    // Join Socket.io for other features
    socket.emit('join-room', projectId);
    
    const handleRestore = (data: any) => {
      if (!docRef.current || !currentFile) return;
      const yText = docRef.current.getText(`file:${currentFile}`);
      docRef.current.transact(() => {
        yText.delete(0, yText.length);
        yText.insert(0, data.content);
      });
      toast({ title: 'Restored', description: `By ${data.restoredBy}` });
    };
    socket.on('restore-checkpoint', handleRestore);

    autoSaveTimerRef.current = setInterval(() => saveCheckpoint('auto'), 2 * 60 * 1000);

    return () => {
      console.log('[Editor] Destroying Yjs session');
      provider.disconnect();
      indexeddbProvider.destroy();
      doc.destroy();
      socket.off('restore-checkpoint', handleRestore);
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [projectId]);

  // ─── Lifecycle Phase 2: Handle Monaco Loading ──────────────────────────
  const handleEditorMount = (editor: any, monaco: any) => {
    console.log('[Editor] Monaco mounted');
    editorRef.current = editor;
    monacoRef.current = monaco;
    setIsEditorReady(true);

    monaco.editor.defineTheme('codecolab-midnight', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6E6E6E' },
        { token: 'keyword', foreground: 'D6D6D6' },
        { token: 'string', foreground: 'C4C4C4' },
        { token: 'number', foreground: 'E6E6E6' },
        { token: 'type', foreground: 'B8B8B8' },
      ],
      colors: {
        'editor.background': '#080808',
        'editorGutter.background': '#080808',
        'editor.lineHighlightBackground': '#141414',
        'editorLineNumber.foreground': '#686868',
        'editorLineNumber.activeForeground': '#E0E0E0',
        'editorCursor.foreground': '#E0E0E0',
        'editor.selectionBackground': '#2A2A2A',
        'editor.inactiveSelectionBackground': '#1A1A1A',
        'editorIndentGuide.background1': '#1A1A1A',
        'editorIndentGuide.activeBackground1': '#303030',
        'editorBracketMatch.border': '#FFFFFF33',
      },
    });
    monaco.editor.setTheme('codecolab-midnight');

    // Ctrl+S / Cmd+S manual save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveCheckpoint('manual'));

    editor.onDidChangeModelContent(() => {
      keystrokesRef.current += 1;
      if (keystrokesRef.current >= 50) saveCheckpoint('auto');
    });
  };

  // ─── Lifecycle Phase 3: Bind Yjs to Editor ─────────────────────────────
  useEffect(() => {
    if (isEditorReady && isDocReady && currentFile) {
      bindToFile(currentFile);
    }
  }, [isEditorReady, isDocReady, currentFile, bindToFile]);

  const currentFileName = files.find((f) => f.id === currentFile)?.name || 'Untitled';

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar />
      <div className="relative flex-1 overflow-hidden p-3 pt-2">
        <div className="panel-glass relative flex h-full overflow-hidden">
          {!leftSidebarOpen && (
            <Button
              variant="outline"
              size="icon"
              onClick={toggleLeftSidebar}
              className="absolute left-4 top-4 z-20 h-10 w-10 rounded-full bg-card/90"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {!rightSidebarOpen && (
            <Button
              variant="outline"
              size="icon"
              onClick={toggleRightSidebar}
              className="absolute right-4 top-4 z-20 h-10 w-10 rounded-full bg-card/90"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          )}

          <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
            {leftSidebarOpen && (
              <>
                <ResizablePanel defaultSize={20} minSize={12} maxSize={38} className="relative flex flex-col bg-surface/80">
                  <Sidebar doc={docRef.current} />
                </ResizablePanel>
                <ResizableHandle className="w-px bg-white/8 hover:bg-primary/40" />
              </>
            )}
            <ResizablePanel defaultSize={60} minSize={30} className="flex flex-col bg-editor">
              <div className="flex-1 overflow-hidden">
                <MonacoEditor
                  height="100%"
                  language={getLanguageFromExtension(currentFileName)}
                  onMount={handleEditorMount}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    automaticLayout: true,
                    readOnly: role === 'viewer',
                    fontLigatures: true,
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    padding: { top: 18, bottom: 18 },
                    roundedSelection: true,
                  }}
                />
              </div>
              <div className="flex h-12 flex-wrap items-center justify-between gap-3 border-t border-white/8 bg-surface/85 px-4 text-xs font-medium text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    onClick={toggleTerminal}
                    className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-foreground transition hover:border-primary/20 hover:bg-primary/10"
                  >
                    Terminal
                  </button>
                  <span className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">
                    <span className={`h-2 w-2 rounded-full ${isDocReady ? 'bg-success shadow-[0_0_12px_hsl(var(--success)/0.8)]' : 'bg-destructive'}`} />
                    {isDocReady ? 'Synced' : 'Connecting'}
                  </span>
                  <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">
                    {onlineUsers} active
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">
                    {getLanguageFromExtension(currentFileName)}
                  </span>
                  <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">
                    {currentFileName}
                  </span>
                  <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">
                    {role}
                  </span>
                </div>
              </div>
              {terminalOpen ? (
                <div className="relative h-56 border-t border-white/8 bg-editor">
                  <Terminal doc={docRef.current} />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTerminal}
                    className="absolute right-3 top-3 z-10 rounded-full bg-card/70"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </ResizablePanel>
            {rightSidebarOpen && (
              <>
                <ResizableHandle className="w-px bg-white/8 hover:bg-primary/40" />
                <ResizablePanel defaultSize={24} minSize={18} maxSize={38} className="relative flex flex-col bg-surface/80">
                  <AIChat doc={docRef.current} />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
};

function getLanguageFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts': case 'tsx': return 'typescript';
    case 'js': case 'jsx': return 'javascript';
    case 'py': return 'python';
    case 'html': return 'html';
    case 'css': return 'css';
    default: return 'plaintext';
  }
}

export default EditorPage;
