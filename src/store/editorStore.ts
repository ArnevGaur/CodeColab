import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor: { line: number; col: number } | null;
}

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
}

export interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: string;
  isAI?: boolean;
}

interface EditorState {
  currentFile: string | null;
  files: FileNode[];
  collaborators: Collaborator[];
  chatMessages: ChatMessage[];
  onlineUsers: { name: string; color: string; clientId: number; currentFile?: string }[];
  terminalOpen: boolean;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  leftSidebarTab: 'files' | 'chat' | 'ai' | 'settings' | 'history' | 'sync';
  role: 'owner' | 'editor' | 'viewer';
  
  setCurrentFile: (fileId: string) => void;
  addFile: (file: FileNode) => void;
  updateFileContent: (fileId: string, content: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  toggleTerminal: () => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarTab: (tab: 'files' | 'chat' | 'ai' | 'settings' | 'history' | 'sync') => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  setOnlineUsers: (users: { name: string; color: string; clientId: number; currentFile?: string }[]) => void;
  setRole: (role: 'owner' | 'editor' | 'viewer') => void;
  terminalHeight: number;
  setTerminalHeight: (height: number) => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
  currentFile: 'readme',
  files: [
    {
      id: 'readme',
      name: 'README.md',
      type: 'file',
      content: `# Welcome to CodeColab! 🚀

CodeColab is a collaborative code editor with AI assistance.

## Getting Started

1. Create new files using the + button in the file explorer
2. Invite collaborators using the Share button
3. Use the AI assistant for code suggestions and help
4. Chat with your team in real-time

## Features

- **Real-time Collaboration**: See your teammates' cursors and edits live
- **AI-Powered Assistance**: Get intelligent code suggestions
- **Integrated Terminal**: Run commands without leaving the editor
- **Team Chat**: Communicate with your team while coding

Happy coding! 💻
`,
    },
  ],
  collaborators: [],
  chatMessages: [],
  onlineUsers: [],
  terminalOpen: false,
  leftSidebarOpen: true,
  rightSidebarOpen: true,
  leftSidebarTab: 'files',
  role: 'owner',
  terminalHeight: 220,

  setCurrentFile: (fileId) => set({ currentFile: fileId }),
  addFile: (file) => set((state) => ({ files: [...state.files, file] })),
  updateFileContent: (fileId, content) =>
    set((state) => ({
      files: state.files.map((file) =>
        file.id === fileId ? { ...file, content } : file
      ),
    })),
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  setChatMessages: (messages) => set({ chatMessages: messages }),
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  toggleTerminal: () => set((state) => ({ terminalOpen: !state.terminalOpen })),
  toggleLeftSidebar: () => set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),
  toggleRightSidebar: () => set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen })),
  setLeftSidebarTab: (tab) => set({ leftSidebarTab: tab }),
  setRole: (role) => set({ role }),
  setTerminalHeight: (height) => set({ terminalHeight: height }),
    }),
    {
      name: 'editor-storage',
    }
  )
);
