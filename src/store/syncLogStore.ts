import { create } from 'zustand';

export type SyncLogEntryType =
  | 'insert'
  | 'delete'
  | 'conflict-detected'
  | 'conflict-resolved'
  | 'user-joined'
  | 'user-left'
  | 'synced';

export interface SyncLogStats {
  totalOperationsSent: number;
  totalOperationsReceived: number;
  totalConflictsDetected: number;
  totalConflictsResolved: number;
  averageResolutionTimeMs: number;
  pendingQueueSize: number;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  type: SyncLogEntryType;
  username: string;
  userColor: string;
  detail: string;
  positionHint?: number | null;
  resolutionTimeMs?: number;
  stats: SyncLogStats;
}

interface SyncLogState {
  entries: SyncLogEntry[];
  unreadCount: number;
  pulseToken: number;
  stats: SyncLogStats;
  addEntry: (entry: SyncLogEntry, markUnread: boolean) => void;
  clearEntries: () => void;
  resetUnread: () => void;
}

const initialStats: SyncLogStats = {
  totalOperationsSent: 0,
  totalOperationsReceived: 0,
  totalConflictsDetected: 0,
  totalConflictsResolved: 0,
  averageResolutionTimeMs: 0,
  pendingQueueSize: 0,
};

export const useSyncLogStore = create<SyncLogState>((set) => ({
  entries: [],
  unreadCount: 0,
  pulseToken: 0,
  stats: { ...initialStats },
  addEntry: (entry, markUnread) =>
    set((state) => ({
      entries: [...state.entries, entry].slice(-100),
      unreadCount: markUnread ? state.unreadCount + 1 : state.unreadCount,
      pulseToken: state.pulseToken + 1,
      stats: entry.stats,
    })),
  clearEntries: () =>
    set((state) => ({
      entries: [],
      unreadCount: 0,
      pulseToken: state.pulseToken + 1,
      stats: { ...initialStats },
    })),
  resetUnread: () => set({ unreadCount: 0 }),
}));
