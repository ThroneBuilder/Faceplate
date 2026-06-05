import type { SessionMetadata, PersistedSession, BrickHeight } from '../../types/index.js'

export const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000
const DB_NAME    = 'faceplate'
const STORE_NAME = 'sessions'
const SESSION_KEY = 'faceplate-session'

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function serialiseSession(
  cropParams: SessionMetadata['cropParams'],
  candidateKey: SessionMetadata['candidateKey'],
  distance: number,
  mosaicGrid: number[][],
  mosaicWidth: number,
  mosaicHeight: BrickHeight,
  maskRows: SessionMetadata['maskRows'],
): SessionMetadata {
  return {
    version: 1,
    savedAt: Date.now(),
    cropParams,
    candidateKey,
    distance,
    mosaicGrid,
    mosaicWidth,
    mosaicHeight,
    maskRows,
  }
}

export function isExpired(metadata: SessionMetadata): boolean {
  return Date.now() - metadata.savedAt >= SESSION_EXPIRY_MS
}

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

export async function saveSession(session: PersistedSession): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).put(session, SESSION_KEY)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

export async function loadSession(): Promise<PersistedSession | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(SESSION_KEY)
    req.onsuccess = () => {
      db.close()
      const session = req.result as PersistedSession | undefined
      if (!session) { resolve(null); return }
      if (isExpired(session.metadata)) {
        clearSession().then(() => resolve(null)).catch(() => resolve(null))
        return
      }
      resolve(session)
    }
    req.onerror = () => { db.close(); reject(req.error) }
  })
}

export async function clearSession(): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).delete(SESSION_KEY)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}
