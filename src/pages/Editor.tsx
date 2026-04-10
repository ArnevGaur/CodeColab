import { useCallback, useEffect, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, ChevronUp, Sparkles } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { Button } from '@/components/ui/button';
import TopBar from '@/components/editor/TopBar';
import Sidebar from '@/components/editor/Sidebar';
import AIChat from '@/components/editor/AIChat';
import SyncStatusWidget from '@/components/editor/SyncStatusWidget';
import Terminal from '@/components/editor/Terminal';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { IndexeddbPersistence } from 'y-indexeddb';
import { useParams } from 'react-router-dom';
import socket from '@/lib/socket';
import { useToast } from '@/hooks/use-toast';
import { authenticatedFetch } from '@/lib/auth';

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
    terminalHeight,
    setTerminalHeight,
  } = useEditorStore();

  const [isResizing, setIsResizing] = useState(false);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newHeight = window.innerHeight - e.clientY;
        if (newHeight > 64 && newHeight < window.innerHeight * 0.7) {
          setTerminalHeight(newHeight);
        }
      }
    },
    [isResizing, setTerminalHeight]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

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
  const sessionIdentityRef = useRef<{
    username: string;
    userColor: string;
    yClientId: number | null;
  } | null>(null);
  const hasReportedSyncRef = useRef(false);

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
    try {
      const res = await authenticatedFetch('/api/checkpoints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
    hasReportedSyncRef.current = false;
    const doc = new Y.Doc();
    docRef.current = doc;

    // Track local edits and emit sync log events via socket.io
    let localEditCount = 0;
    doc.on('update', (update: Uint8Array, origin: any) => {
      const originName = origin?.constructor?.name || typeof origin;
      // Only track local edits (from MonacoBinding), not remote syncs
      if (originName === 'MonacoBinding') {
        localEditCount++;
        socket.emit('sync-operation', {
          roomId: projectId,
          type: 'insert',
          size: update.length,
          editNumber: localEditCount,
        });
      }
    });

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
    
    // DIAGNOSTIC: Log WebSocket provider state
    provider.on('sync', (synced: boolean) => {
      console.log(`[SYNC-DEBUG] Provider synced: ${synced} | wsconnected: ${provider.wsconnected}`);
    });
    
    // 3. Fallback Seeding Logic
    provider.on('sync', async (isSynced: boolean) => {
      if (!isSynced || !projectId) return;
      console.log('[Editor] Yjs Network Synced');

      if (!hasReportedSyncRef.current && sessionIdentityRef.current) {
        socket.emit('room-synced', {
          roomId: projectId,
          username: sessionIdentityRef.current.username,
          userColor: sessionIdentityRef.current.userColor,
          yClientId: sessionIdentityRef.current.yClientId,
        });
        hasReportedSyncRef.current = true;
      }
      
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
    sessionIdentityRef.current = {
      username: myName,
      userColor: myColor,
      yClientId: provider.awareness.clientID,
    };

    // Join Socket.io for other features
    socket.emit('join-room', {
      roomId: projectId,
      username: myName,
      userColor: myColor,
      yClientId: provider.awareness.clientID,
    });
    
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
      if (projectId && sessionIdentityRef.current) {
        socket.emit('leave-room', {
          roomId: projectId,
          username: sessionIdentityRef.current.username,
          userColor: sessionIdentityRef.current.userColor,
          yClientId: sessionIdentityRef.current.yClientId,
        });
      }
      sessionIdentityRef.current = null;
      hasReportedSyncRef.current = false;
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
        { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'C792EA' },
        { token: 'operator', foreground: '89DDFF' },
        { token: 'string', foreground: 'C3E88D' },
        { token: 'number', foreground: 'F78C6C' },
        { token: 'regexp', foreground: 'F78C6C' },
        { token: 'type', foreground: '82AAFF' },
        { token: 'type.identifier', foreground: '82AAFF' },
        { token: 'class', foreground: 'FFCB6B' },
        { token: 'class.identifier', foreground: 'FFCB6B' },
        { token: 'function', foreground: '82AAFF' },
        { token: 'function.identifier', foreground: '82AAFF' },
        { token: 'variable', foreground: 'EEFFFF' },
        { token: 'variable.predefined', foreground: 'F07178' },
        { token: 'tag', foreground: 'F07178' },
        { token: 'attribute.name', foreground: 'FFCB6B' },
        { token: 'attribute.value', foreground: 'C3E88D' },
        { token: 'delimiter', foreground: '89DDFF' },
      ],
      colors: {
        'editor.background': '#0B1220',
        'editorGutter.background': '#0B1220',
        'editor.lineHighlightBackground': '#111A2C',
        'editorLineNumber.foreground': '#546178',
        'editorLineNumber.activeForeground': '#D6DEEB',
        'editorCursor.foreground': '#FFCB6B',
        'editor.selectionBackground': '#21304A',
        'editor.inactiveSelectionBackground': '#182235',
        'editorIndentGuide.background1': '#1A2438',
        'editorIndentGuide.activeBackground1': '#31415F',
        'editorBracketMatch.border': '#82AAFF55',
        'editorBracketMatch.background': '#82AAFF11',
        'editor.selectionHighlightBackground': '#21304A66',
        'editor.findMatchBackground': '#FFCB6B33',
        'editor.findMatchBorder': '#FFCB6B66',
        'editor.wordHighlightBackground': '#89DDFF22',
        'editor.wordHighlightStrongBackground': '#C792EA22',
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
      <div className="relative flex-1 overflow-hidden p-2.5">
        <div className="relative flex h-full overflow-hidden rounded-[1.25rem] border border-white/8 bg-card/70">
          {!leftSidebarOpen && (
            <Button
              variant="outline"
              size="icon"
              onClick={toggleLeftSidebar}
              className="absolute left-3 top-3 z-20 h-9 w-9 rounded-full bg-card/90"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {!rightSidebarOpen && (
            <Button
              variant="outline"
              size="icon"
              onClick={toggleRightSidebar}
              className="absolute right-3 top-3 z-20 h-9 w-9 rounded-full bg-card/90"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          )}

          <div className="flex min-w-0 flex-1 overflow-hidden">
            <motion.aside
              initial={false}
              animate={{
                width: leftSidebarOpen ? 304 : 0,
                opacity: leftSidebarOpen ? 1 : 0,
              }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className={`relative shrink-0 overflow-hidden border-r border-white/8 bg-surface/72 ${
                leftSidebarOpen ? '' : 'pointer-events-none border-r-transparent'
              }`}
            >
              <motion.div
                initial={false}
                animate={{ x: leftSidebarOpen ? 0 : -18, opacity: leftSidebarOpen ? 1 : 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="h-full w-[19rem]"
              >
                <Sidebar doc={docRef.current} />
              </motion.div>
            </motion.aside>

            <div className="flex min-w-0 flex-1 flex-col bg-editor">
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
                <div className="flex min-h-10 flex-wrap items-center justify-between gap-2 border-t border-white/8 bg-surface/80 px-3 py-2 text-[11px] text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <button
                      onClick={toggleTerminal}
                      className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-foreground transition hover:bg-white/[0.05]"
                    >
                      Terminal
                    </button>
                    <span
                      className={`flex items-center gap-2 rounded-full px-2.5 py-1 ${
                        isDocReady
                          ? 'border border-white/8 bg-white/[0.03] text-foreground'
                          : 'border border-white/8 bg-white/[0.03] text-muted-foreground'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${isDocReady ? 'bg-success' : 'bg-destructive'}`} />
                      {isDocReady ? 'Synced' : 'Connecting'}
                    </span>
                    <span className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-foreground">
                      <span className="h-2 w-2 rounded-full bg-success" />
                      {onlineUsers} active
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">
                      {getLanguageFromExtension(currentFileName)}
                    </span>
                    <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">
                      {currentFileName}
                    </span>
                    <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">
                      {role}
                    </span>
                  </div>
                </div>
                <AnimatePresence initial={false}>
                  {terminalOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: terminalHeight || 220, opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="relative overflow-hidden border-t border-white/8 bg-[#0B1220]"
                    >
                      <div
                        className="absolute left-0 right-0 top-0 z-50 h-1 cursor-ns-resize bg-transparent hover:bg-primary/40 transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setIsResizing(true);
                        }}
                      />
                      <div className="h-full w-full">
                        <Terminal doc={docRef.current} />
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <SyncStatusWidget isSynced={isDocReady} />
            </div>

            <motion.aside
              initial={false}
              animate={{
                width: rightSidebarOpen ? 336 : 0,
                opacity: rightSidebarOpen ? 1 : 0,
              }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className={`relative shrink-0 overflow-hidden border-l border-white/8 bg-surface/72 ${
                rightSidebarOpen ? '' : 'pointer-events-none border-l-transparent'
              }`}
            >
              <motion.div
                initial={false}
                animate={{ x: rightSidebarOpen ? 0 : 18, opacity: rightSidebarOpen ? 1 : 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="h-full w-[21rem]"
              >
                <AIChat doc={docRef.current} />
              </motion.div>
            </motion.aside>
          </div>
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
