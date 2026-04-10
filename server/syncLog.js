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
  
  const fs = require('fs');
  fs.appendFileSync('/Users/arnevgaur/projects/CodeColab/sync_debug.log', 
    `[${new Date().toISOString()}] extractTextOperations: ${transaction.changedParentTypes.size} parent types changed.\n`);

  for (const [type, events] of transaction.changedParentTypes.entries()) {
    const typeName = type.constructor.name;
    fs.appendFileSync('/Users/arnevgaur/projects/CodeColab/sync_debug.log', 
      `[${new Date().toISOString()}] Checking type: ${typeName} | Proto: ${type.__proto__?.constructor?.name}\n`);
    
    // Robust check for YText regardless of constructor identity
    if (typeName !== 'YText' && !typeName.includes('Text')) continue;

    const shareKey = getShareKeyForType(doc, type);
    if (!shareKey) continue;

    const beforeText = beforeTextByKey.get(shareKey) || '';
    const afterText = type.toString();

    for (const event of events) {
      const delta = event.delta || [];
      let cursor = 0;

      for (const segment of delta) {
        if (segment.retain) {
          cursor += segment.retain;
          continue;
        }

        if (segment.insert) {
          const insertedText = typeof segment.insert === 'string'
            ? segment.insert
            : JSON.stringify(segment.insert);

          operations.push({
            type: 'insert',
            shareKey,
            position: cursor,
            length: insertedText.length || 1,
            snippet: truncateSnippet(insertedText),
            positionHint: computeLineNumber(afterText, cursor),
          });

          cursor += insertedText.length;
          continue;
        }

        if (segment.delete) {
          const deletedText = beforeText.slice(cursor, cursor + segment.delete);
          operations.push({
            type: 'delete',
            shareKey,
            position: cursor,
            length: segment.delete,
            snippet: truncateSnippet(deletedText || `${segment.delete} chars`),
            positionHint: computeLineNumber(beforeText, cursor),
          });
        }
      }
    }
  }

  return operations;
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
  const fs = require('fs');
  fs.appendFileSync('/Users/arnevgaur/projects/CodeColab/sync_debug.log', 
    `[${new Date().toISOString()}] instrumentDoc called for ${docName}. Doc GUID: ${doc.guid}\n`);

  if (doc[DOC_INSTRUMENTED]) {

  doc[DOC_INSTRUMENTED] = true;

  doc.on('beforeTransaction', (transaction, ydoc) => {
    if (transaction.meta.has(SYNC_LOG_BEFORE_TEXTS)) return;
    const fs = require('fs');
    fs.appendFileSync('/Users/arnevgaur/projects/CodeColab/sync_debug.log', 
      `[${new Date().toISOString()}] beforeTransaction in ${docName}. Keys: ${Array.from(ydoc.share.keys()).join(', ')}\n`);
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

    const fs = require('fs');
    fs.appendFileSync('/Users/arnevgaur/projects/CodeColab/sync_debug.log', 
      `[${new Date().toISOString()}] afterTransaction in ${roomId}: ${operations.length} ops.\n`);

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
      const decodedKindsSuffix = decodedUpdate.structKinds.length > 0
        ? ` [${decodedUpdate.structKinds.join(', ')}]`
        : '';

      const trackedOperation = {
        ...operation,
        clientId: actor.clientId,
        actorKey,
        username: actor.username,
        userColor: actor.userColor,
        timestampMs: Date.now(),
        rawUpdateLength: update.length,
      };

      emitLogEntry(io, roomId, roomState, {
        type: operation.type,
        username: actor.username,
        userColor: actor.userColor,
        detail: `${detail}${decodedKindsSuffix}`,
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
