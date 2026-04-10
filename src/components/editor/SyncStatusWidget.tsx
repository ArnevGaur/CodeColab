import { useEffect, useState } from 'react';

import socket from '@/lib/socket';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/store/editorStore';
import { useSyncLogStore } from '@/store/syncLogStore';

interface SyncStatusWidgetProps {
  isSynced: boolean;
}

const SyncStatusWidget = ({ isSynced }: SyncStatusWidgetProps) => {
  const stats = useSyncLogStore((state) => state.stats);
  const pulseToken = useSyncLogStore((state) => state.pulseToken);
  const [isSocketConnected, setIsSocketConnected] = useState(socket.connected);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    const handleConnect = () => setIsSocketConnected(true);
    const handleDisconnect = () => setIsSocketConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  useEffect(() => {
    setIsPulsing(true);
    const timeout = window.setTimeout(() => setIsPulsing(false), 320);
    return () => window.clearTimeout(timeout);
  }, [pulseToken]);

  const statusTone = !isSocketConnected ? 'bg-rose-500' : isSynced ? 'bg-emerald-500' : 'bg-amber-400';

  return (
    <button
      type="button"
      onClick={() => {
        useEditorStore.setState({ leftSidebarOpen: true, leftSidebarTab: 'sync' });
        useSyncLogStore.getState().resetUnread();
      }}
      className="absolute bottom-4 right-4 z-30 flex items-center gap-3 rounded-full border border-white/8 bg-card/92 px-3 py-2 font-mono text-[11px] text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur transition hover:bg-card"
    >
      <span className="relative flex h-3 w-3 items-center justify-center">
        <span className={cn('h-2.5 w-2.5 rounded-full transition-transform', statusTone, isPulsing && 'scale-125')} />
        {isPulsing ? (
          <span className={cn('absolute inset-0 rounded-full animate-ping opacity-70', statusTone)} />
        ) : null}
      </span>
      <span className="text-[11px] text-muted-foreground">
        ↑{stats.totalOperationsSent} ↓{stats.totalOperationsReceived}
      </span>
    </button>
  );
};

export default SyncStatusWidget;
