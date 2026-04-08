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
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#34d399', '#2dd4bf', '#38bdf8', '#818cf8', '#c084fc', '#f472b6'];
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
      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {!leftSidebarOpen && (
          <Button variant="ghost" size="icon" onClick={toggleLeftSidebar} className="absolute left-0 top-20 z-10 bg-surface border-r border-border w-6 h-8 rounded-l-none"><ChevronRight className="w-3 h-3" /></Button>
        )}
        {leftSidebarOpen && (
          <>
            <ResizablePanel defaultSize={20} minSize={10} maxSize={40} className="relative bg-surface flex flex-col"><Sidebar doc={docRef.current} /></ResizablePanel>
            <ResizableHandle className="w-1 bg-border hover:bg-primary/50" />
          </>
        )}
        <ResizablePanel defaultSize={60} minSize={30} className="flex flex-col">
          <div className="flex-1 overflow-hidden relative">
            <MonacoEditor
              height="100%"
              language={getLanguageFromExtension(currentFileName)}
              onMount={handleEditorMount}
              theme="vs-dark"
              options={{ minimap: { enabled: true }, fontSize: 14, automaticLayout: true, readOnly: role === 'viewer' }}
            />
          </div>
          <div className="h-8 bg-card border-t border-border flex items-center justify-between px-4 text-xs text-muted-foreground font-medium">
            <div className="flex items-center gap-4">
              <button onClick={toggleTerminal}>Terminal</button>
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isDocReady ? 'bg-success animate-pulse' : 'bg-destructive'}`}></span>
                {isDocReady ? 'Synced' : 'Connecting...'}
              </span>
              <span>👤 {onlineUsers} active</span>
            </div>
            <div className="flex items-center gap-4"><span>{getLanguageFromExtension(currentFileName)}</span><span>{currentFileName}</span></div>
          </div>
          {terminalOpen && <div className="h-48 relative border-t border-border bg-black"><Terminal doc={docRef.current} /><Button variant="ghost" size="icon" onClick={toggleTerminal} className="absolute right-2 top-2"><ChevronUp className="w-4 h-4" /></Button></div>}
        </ResizablePanel>
        {rightSidebarOpen && (
          <>
            <ResizableHandle className="w-1 bg-border hover:bg-primary/50" />
            <ResizablePanel defaultSize={20} minSize={15} maxSize={40} className="relative bg-surface flex flex-col"><AIChat doc={docRef.current} /></ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
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
