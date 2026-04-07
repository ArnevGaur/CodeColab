import { create } from 'zustand';

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
  terminalOpen: boolean;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  leftSidebarTab: 'files' | 'chat' | 'ai' | 'settings';
  
  setCurrentFile: (fileId: string) => void;
  addFile: (file: FileNode) => void;
  updateFileContent: (fileId: string, content: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  toggleTerminal: () => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarTab: (tab: 'files' | 'chat' | 'ai' | 'settings') => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentFile: 'readme',
  files: [
    {
      id: 'readme',
      name: 'README.md',
      type: 'file',
      content: `# Welcome to CodeMate! 🚀

CodeMate is a collaborative code editor with AI assistance.

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
  chatMessages: [
    {
      id: '1',
      user: 'You',
      message: 'Can you help optimize this function?',
      timestamp: '2:34 PM',
    },
    {
      id: '2',
      user: 'AI',
      message: 'Of course! I can help optimize your code. Could you share which function you\'d like me to review?',
      timestamp: '2:34 PM',
      isAI: true,
    },
    {
      id: '3',
      user: 'Arnev',
      message: 'I\'ve pushed the latest changes to the main branch',
      timestamp: '2:35 PM',
    },
  ],
  terminalOpen: false,
  leftSidebarOpen: true,
  rightSidebarOpen: true,
  leftSidebarTab: 'files',

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
  toggleTerminal: () => set((state) => ({ terminalOpen: !state.terminalOpen })),
  toggleLeftSidebar: () => set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),
  toggleRightSidebar: () => set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen })),
  setLeftSidebarTab: (tab) => set({ leftSidebarTab: tab }),
}));
