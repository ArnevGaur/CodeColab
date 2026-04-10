import { useEffect, useMemo, useRef, useState } from 'react';

import socket from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/store/editorStore';
import {
  type SyncLogEntry,
  type SyncLogEntryType,
  useSyncLogStore,
} from '@/store/syncLogStore';

type SyncLogFilter = 'all' | 'edits' | 'conflicts' | 'users';

const entryStyles: Record<SyncLogEntryType, { icon: string; border: string }> = {
  insert: { icon: '✏️', border: 'border-l-emerald-400' },
  delete: { icon: '🗑️', border: 'border-l-rose-400' },
  'conflict-detected': { icon: '⚠️', border: 'border-l-amber-400' },
  'conflict-resolved': { icon: '✅', border: 'border-l-sky-400' },
  'user-joined': { icon: '👤', border: 'border-l-teal-400' },
  'user-left': { icon: '👋', border: 'border-l-zinc-400' },
  synced: { icon: '🔗', border: 'border-l-emerald-500' },
};

function formatRelativeTimestamp(timestamp: string, now: number) {
  const elapsedMs = Math.max(0, now - new Date(timestamp).getTime());
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  if (elapsedSeconds <= 1) return 'just now';
  if (elapsedSeconds < 60) return `${elapsedSeconds}s ago`;

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays}d ago`;
}

function matchesFilter(entry: SyncLogEntry, filter: SyncLogFilter) {
  if (filter === 'all') return true;
  if (filter === 'edits') return entry.type === 'insert' || entry.type === 'delete';
  if (filter === 'conflicts') return entry.type === 'conflict-detected' || entry.type === 'conflict-resolved';
  return entry.type === 'user-joined' || entry.type === 'user-left' || entry.type === 'synced';
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  const previousValueRef = useRef(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (previousValueRef.current !== value) {
      previousValueRef.current = value;
      setFlash(true);
      const timeout = window.setTimeout(() => setFlash(false), 360);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [value]);

  return (
    <div
      className={cn(
        'group flex min-h-[2rem] min-w-0 items-center justify-between gap-2.5 rounded-lg border border-white/6 bg-white/[0.01] px-2.5 py-1.5 transition-all hover:bg-white/[0.03]',
        flash && 'border-primary/20 bg-primary/10',
      )}
    >
      <span className="min-w-0 text-[10px] uppercase font-medium tracking-tight text-muted-foreground group-hover:text-muted-foreground/80">{label}</span>
      <span className="shrink-0 font-mono text-[11px] font-semibold text-foreground/80">{value}</span>
    </div>
  );
}

interface SyncLogProps {
  className?: string;
}

const SyncLog = ({ className }: SyncLogProps) => {
  const entries = useSyncLogStore((state) => state.entries);
  const clearEntries = useSyncLogStore((state) => state.clearEntries);
  const resetUnread = useSyncLogStore((state) => state.resetUnread);
  const stats = useSyncLogStore((state) => state.stats);
  const activeTab = useEditorStore((state) => state.leftSidebarTab);
  const onlineUsers = useEditorStore((state) => state.onlineUsers);

  const [filter, setFilter] = useState<SyncLogFilter>('all');
  const [isPaused, setIsPaused] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleEntry = (entry: SyncLogEntry) => {
      const isSyncTabActive = useEditorStore.getState().leftSidebarTab === 'sync';
      useSyncLogStore.getState().addEntry(entry, !isSyncTabActive);
    };

    socket.on('sync-log-entry', handleEntry);
    return () => {
      socket.off('sync-log-entry', handleEntry);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'sync') {
      resetUnread();
    }
  }, [activeTab, resetUnread]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isPaused) {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [entries.length, isPaused]);

  const filteredEntries = useMemo(() => entries.filter((entry) => matchesFilter(entry, filter)), [entries, filter]);

  const statItems: Array<{ label: string; value: string | number }> = [
    { label: 'Ops Sent', value: stats.totalOperationsSent },
    { label: 'Ops Recv', value: stats.totalOperationsReceived },
    { label: 'Conflicts', value: stats.totalConflictsDetected },
    { label: 'Avg Res', value: `${stats.averageResolutionTimeMs}ms` },
  ];

  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-hidden bg-transparent', className)}>
      <div className="shrink-0 space-y-4 px-4 py-4 border-b border-white/5 bg-white/[0.005]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full ring-4 ring-opacity-10',
                isPaused ? 'bg-amber-500 ring-amber-500' : 'bg-emerald-500 ring-emerald-500',
              )}
            />
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/80">
              {isPaused ? 'Paused' : 'Live Sync'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 rounded-md px-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 hover:bg-white/[0.05] hover:text-foreground"
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <div className="h-3 w-px bg-white/10 mx-0.5" />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 rounded-md px-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 hover:bg-white/[0.05] hover:text-foreground"
              onClick={clearEntries}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {statItems.map((item) => (
            <StatPill key={item.label} label={item.label} value={item.value} />
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-widest text-muted-foreground/50">
            <span>Collaborators ({onlineUsers.length})</span>
          </div>

          <div className="overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max gap-2">
              {onlineUsers.length > 0 ? (
                onlineUsers.map((user) => (
                  <div
                    key={user.clientId}
                    className="flex min-w-[7.5rem] shrink-0 items-center gap-2 rounded-lg border border-white/6 bg-white/[0.015] px-2.5 py-1.5"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: user.color }} />
                    <div className="min-w-0 overflow-hidden">
                      <p className="truncate text-xs font-medium text-foreground/90">{user.name}</p>
                      <p className="truncate font-mono text-[9px] text-muted-foreground/70">
                        {user.currentFile ? `f:${user.currentFile.slice(0, 8)}` : 'root'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-white/8 bg-white/[0.01] px-3 py-2 text-[11px] text-muted-foreground/60">
                  No active collaborators.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {([
            ['all', 'All'],
            ['edits', 'Edits'],
            ['conflicts', 'Conflicts'],
            ['users', 'Users'],
          ] as Array<[SyncLogFilter, string]>).map(([value, label]) => (
            <Button
              key={value}
              variant={filter === value ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'h-6 rounded-md px-2 font-mono text-[9px] uppercase tracking-wider',
                filter === value ? 'bg-white/[0.08] text-foreground' : 'text-muted-foreground/60 hover:bg-white/[0.04] hover:text-foreground',
              )}
              onClick={() => setFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-2 p-3 pb-8">
          {filteredEntries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
              No sync activity yet. Open a second client and edit the same file to watch operations and conflict
              resolution stream in.
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const style = entryStyles[entry.type];

              return (
                <div
                  key={entry.id}
                  className={cn(
                    'rounded-xl border border-white/8 border-l-4 bg-white/[0.02] p-3 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.02)]',
                    style.border,
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{style.icon}</span>
                        <span className="font-semibold" style={{ color: entry.userColor }}>
                          {entry.username}
                        </span>
                        <span>{formatRelativeTimestamp(entry.timestamp, now)}</span>
                        {typeof entry.positionHint === 'number' ? (
                          <span className="rounded-full border border-white/8 px-2 py-0.5 text-[10px]">
                            line {entry.positionHint}
                          </span>
                        ) : null}
                        {entry.type === 'conflict-resolved' && typeof entry.resolutionTimeMs === 'number' ? (
                          <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[10px] text-sky-200">
                            resolved in {entry.resolutionTimeMs}ms
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 whitespace-pre-wrap font-mono text-[12px] leading-6 text-foreground/90">
                        {entry.detail}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
};

export default SyncLog;
