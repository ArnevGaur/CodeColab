const Y = require('yjs');

const SYNC_LOG_BEFORE_TEXTS = Symbol('sync-log-before-texts');
const DOC_INSTRUMENTED = Symbol('sync-log-instrumented');
const CONFLICT_WINDOW_MS = 200;
const RECENT_OPERATION_WINDOW_MS = 2000;

const roomStates = new Map();
const originIds = new WeakMap();
let originCounter = 0;

function createStats() {
  return {
    totalOperationsSent: 0,
    totalOperationsReceived: 0,
    totalConflictsDetected: 0,
    totalConflictsResolved: 0,
    averageResolutionTimeMs: 0,
    pendingQueueSize: 0,
  };
}

function createRoomState() {
  return {
    logCounter: 0,
    stats: createStats(),
    recentOperations: [],
    totalResolutionTimeMs: 0,
  };
}

function getRoomState(roomId) {
  if (!roomStates.has(roomId)) {
    roomStates.set(roomId, createRoomState());
  }

  return roomStates.get(roomId);
}

function getRoomIdFromDocName(docName) {
  return docName.replace(/^codecolab-room-/, '');
}

function cloneStats(stats) {
  return {
    totalOperationsSent: stats.totalOperationsSent,
    totalOperationsReceived: stats.totalOperationsReceived,
    totalConflictsDetected: stats.totalConflictsDetected,
    totalConflictsResolved: stats.totalConflictsResolved,
    averageResolutionTimeMs: stats.averageResolutionTimeMs,
    pendingQueueSize: stats.pendingQueueSize,
  };
}

function createLogId(roomState) {
  roomState.logCounter += 1;
  return `sync-log-${Date.now()}-${roomState.logCounter}`;
}

function truncateSnippet(value) {
  if (!value) return '';
  return value.length > 20 ? `${value.slice(0, 20)}…` : value;
}

function getShareKeyForType(doc, type) {
  for (const [key, value] of doc.share.entries()) {
    if (value === type) {
      return key;
    }
  }
  return null;
}

function computeLineNumber(text, position) {
  if (typeof text !== 'string') return null;
  const safePosition = Math.max(0, Math.min(position, text.length));
  return text.slice(0, safePosition).split('\n').length;
}

function getUserFromAwareness(doc, clientId) {
  if (typeof clientId !== 'number') return null;
  const awarenessState = doc.awareness.getStates().get(clientId);
  if (!awarenessState?.user) return null;

  return {
    clientId,
    username: awarenessState.user.name || `User ${clientId}`,
    userColor: awarenessState.user.color || '#d4d4d8',
  };
}

function getUserFromOrigin(doc, origin) {
  if (!origin || !doc.conns?.has(origin)) {
    return null;
  }

  const controlledIds = Array.from(doc.conns.get(origin) || []);
  for (const clientId of controlledIds) {
    const match = getUserFromAwareness(doc, clientId);
    if (match) {
      return match;
    }
  }

  if (controlledIds.length > 0) {
    return {
      clientId: controlledIds[0],
      username: `User ${controlledIds[0]}`,
      userColor: '#d4d4d8',
    };
  }

  return null;
}

function getOriginIdentity(origin) {
  if (!origin || (typeof origin !== 'object' && typeof origin !== 'function')) {
    return null;
  }

  if (!originIds.has(origin)) {
    originCounter += 1;
    originIds.set(origin, `origin-${originCounter}`);
  }

  return originIds.get(origin);
}

function decodeUpdateMetadata(update) {
  try {
    const decoded = Y.decodeUpdate(update);
    const structs = Array.isArray(decoded?.structs) ? decoded.structs : [];
    const firstStruct = structs[0] || null;

    return {
      structClientId:
        typeof firstStruct?.id?.client === 'number'
          ? firstStruct.id.client
          : null,
      structKinds: structs
        .map((struct) => struct?.constructor?.name)
        .filter(Boolean)
        .slice(0, 4),
    };
  } catch (error) {
    return {
      structClientId: null,
      structKinds: [],
    };
  }
}

function getRecipientCount(doc) {
  return Math.max(doc.conns.size - 1, 0);
}

function emitLogEntry(io, roomId, roomState, payload) {
  io.to(roomId).emit('sync-log-entry', {
    id: createLogId(roomState),
    timestamp: new Date().toISOString(),
    ...payload,
    stats: cloneStats(roomState.stats),
  });
}

function extractTextOperations(doc, transaction) {
  const operations = [];
  const beforeTextByKey = transaction.meta.get(SYNC_LOG_BEFORE_TEXTS) || new Map();

  // Instead of relying on changedParentTypes (which is empty for remote updates),
  // compare before/after text for every tracked shared text type.
  for (const [shareKey, beforeText] of beforeTextByKey.entries()) {
    const type = doc.share.get(shareKey);
    if (!type || type.constructor.name !== 'YText') continue;

    const afterText = type.toString();
    if (beforeText === afterText) continue;

    // Determine if this was an insert or delete (or both) by comparing lengths
    const lenDiff = afterText.length - beforeText.length;

    if (lenDiff > 0) {
      // Net insert
      const insertedText = findInsertedText(beforeText, afterText);
      const position = findChangePosition(beforeText, afterText);
      operations.push({
        type: 'insert',
        shareKey,
        position,
        length: insertedText.length,
        snippet: truncateSnippet(insertedText),
        positionHint: computeLineNumber(afterText, position),
      });
    } else if (lenDiff < 0) {
      // Net delete
      const deletedText = findInsertedText(afterText, beforeText); // reverse diff
      const position = findChangePosition(beforeText, afterText);
      operations.push({
        type: 'delete',
        shareKey,
        position,
        length: deletedText.length,
        snippet: truncateSnippet(deletedText),
        positionHint: computeLineNumber(beforeText, position),
      });
    } else {
      // Same length but different content — treat as a replace (insert)
      const position = findChangePosition(beforeText, afterText);
      const changedText = afterText.slice(position, position + 1);
      operations.push({
        type: 'insert',
        shareKey,
        position,
        length: 1,
        snippet: truncateSnippet(changedText || 'replaced'),
        positionHint: computeLineNumber(afterText, position),
      });
    }
  }

  return operations;
}

/**
 * Find the position where two strings first differ.
 */
function findChangePosition(before, after) {
  const minLen = Math.min(before.length, after.length);
  for (let i = 0; i < minLen; i++) {
    if (before[i] !== after[i]) return i;
  }
  return minLen;
}

/**
 * Find the inserted text by comparing before and after strings.
 * Assumes `after` is longer than `before`.
 */
function findInsertedText(shorter, longer) {
  const pos = findChangePosition(shorter, longer);
  const lenDiff = longer.length - shorter.length;
  return longer.slice(pos, pos + lenDiff);
}

function rangesOverlap(a, b) {
  const aStart = a.position;
  const aEnd = a.position + Math.max(a.length, 1);
  const bStart = b.position;
  const bEnd = b.position + Math.max(b.length, 1);

  return aStart < bEnd && bStart < aEnd;
}

function getMergedResultSnippet(doc, shareKey, start, end) {
  const type = doc.share.get(shareKey);
  if (type?.constructor.name !== 'YText') {
    return '';
  }

  const content = type.toString();
  const snippetStart = Math.max(0, start - 8);
  const snippetEnd = Math.min(content.length, end + 12);
  return truncateSnippet(content.slice(snippetStart, snippetEnd).replace(/\n/g, '\\n'));
}

function cleanupRecentOperations(roomState, now) {
  roomState.recentOperations = roomState.recentOperations.filter((operation) => now - operation.timestampMs <= RECENT_OPERATION_WINDOW_MS);
}

function handleConflict(io, roomId, roomState, doc, currentOperation) {
  const now = currentOperation.timestampMs;
  cleanupRecentOperations(roomState, now);

  const conflictCandidate = roomState.recentOperations.find((previousOperation) => {
    const withinWindow = now - previousOperation.timestampMs <= CONFLICT_WINDOW_MS;
    const sameDocument = previousOperation.shareKey === currentOperation.shareKey;
    const differentActor = previousOperation.actorKey !== currentOperation.actorKey;
    return withinWindow && sameDocument && differentActor && rangesOverlap(previousOperation, currentOperation);
  });

  if (!conflictCandidate) {
    roomState.recentOperations.push(currentOperation);
    return;
  }

  conflictCandidate.conflicted = true;
  currentOperation.conflicted = true;

  roomState.stats.totalConflictsDetected += 1;

  const sharedLine = currentOperation.positionHint || conflictCandidate.positionHint || null;
  const conflictDetail = `${conflictCandidate.username} and ${currentOperation.username} changed overlapping text in ${currentOperation.shareKey}`;

  emitLogEntry(io, roomId, roomState, {
    type: 'conflict-detected',
    username: currentOperation.username,
    userColor: currentOperation.userColor,
    detail: conflictDetail,
    positionHint: sharedLine,
  });

  const resolutionTimeMs = Math.max(1, now - conflictCandidate.timestampMs);
  const resolutionStart = Math.min(conflictCandidate.position, currentOperation.position);
  const resolutionEnd = Math.max(
    conflictCandidate.position + Math.max(conflictCandidate.length, 1),
    currentOperation.position + Math.max(currentOperation.length, 1),
  );
  const mergedResult = getMergedResultSnippet(doc, currentOperation.shareKey, resolutionStart, resolutionEnd);

  roomState.stats.totalConflictsResolved += 1;
  roomState.totalResolutionTimeMs += resolutionTimeMs;
  roomState.stats.averageResolutionTimeMs = Math.round(
    roomState.totalResolutionTimeMs / roomState.stats.totalConflictsResolved,
  );

  emitLogEntry(io, roomId, roomState, {
    type: 'conflict-resolved',
    username: currentOperation.username,
    userColor: currentOperation.userColor,
    detail: `Merged overlapping edits in ${currentOperation.shareKey} -> "${mergedResult || 'merged update'}"`,
    positionHint: sharedLine,
    resolutionTimeMs,
  });

  roomState.recentOperations.push(currentOperation);
}

function instrumentDoc(docName, doc, io) {
  if (doc[DOC_INSTRUMENTED]) {
    return;
  }

  doc[DOC_INSTRUMENTED] = true;

  doc.on('beforeTransaction', (transaction, ydoc) => {
    if (transaction.meta.has(SYNC_LOG_BEFORE_TEXTS)) return;
    const beforeTextByKey = new Map();
    for (const [key, value] of ydoc.share.entries()) {
      if (value.constructor.name === 'YText') {
        beforeTextByKey.set(key, value.toString());
      }
    }
    transaction.meta.set(SYNC_LOG_BEFORE_TEXTS, beforeTextByKey);
  });

  doc.on('afterTransaction', (transaction, ydoc) => {
    const roomId = getRoomIdFromDocName(docName);
    const roomState = getRoomState(roomId);
    const operations = extractTextOperations(ydoc, transaction);

    if (operations.length === 0) {
      return;
    }

    const origin = transaction.origin;
    const actor =
      getUserFromOrigin(ydoc, origin) || {
        clientId: transaction.doc.clientID,
        username: `User ${transaction.doc.clientID}`,
        userColor: '#d4d4d8',
      };
    const actorKey =
      actor.clientId !== null && actor.clientId !== undefined
        ? `client-${actor.clientId}`
        : getOriginIdentity(origin) || `fallback-${actor.username}-${actor.userColor}`;

    roomState.stats.pendingQueueSize += operations.length;

    operations.forEach((operation) => {
      roomState.stats.totalOperationsSent += 1;
      roomState.stats.totalOperationsReceived += getRecipientCount(ydoc);

      const detail = operation.type === 'insert'
        ? `${actor.username} inserted "${operation.snippet || 'text'}" in ${operation.shareKey}`
        : `${actor.username} deleted "${operation.snippet || 'text'}" in ${operation.shareKey}`;
      const trackedOperation = {
        ...operation,
        clientId: actor.clientId,
        actorKey,
        username: actor.username,
        userColor: actor.userColor,
        timestampMs: Date.now(),
        rawUpdateLength: 0,
      };

      emitLogEntry(io, roomId, roomState, {
        type: operation.type,
        username: actor.username,
        userColor: actor.userColor,
        detail: detail,
        positionHint: operation.positionHint,
      });

      handleConflict(io, roomId, roomState, ydoc, trackedOperation);
    });

    roomState.stats.pendingQueueSize = Math.max(0, roomState.stats.pendingQueueSize - operations.length);
    cleanupRecentOperations(roomState, Date.now());
  });
}

function emitRoomLifecycleEntry(io, roomId, payload) {
  const roomState = getRoomState(roomId);
  emitLogEntry(io, roomId, roomState, payload);
}

module.exports = {
  instrumentDoc,
  emitRoomLifecycleEntry,
  getRoomState,
  getRoomIdFromDocName,
};
