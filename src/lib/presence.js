import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'

const PING_INTERVAL = 20_000          // ping every 20s
const OFFLINE_AFTER = 50_000          // offline if no ping for 50s

// Use plain Date.now() — serverTimestamp() returns null during pending writes
// which makes isOnline() always return false until Firestore confirms the write.
function ts() { return Date.now() }

export function isOnline(data) {
  if (!data?.lastSeen) return false
  // handle both number (new) and Firestore Timestamp (legacy)
  const ms = typeof data.lastSeen === 'number'
    ? data.lastSeen
    : (data.lastSeen.toDate?.().getTime() ?? 0)
  return Date.now() - ms < OFFLINE_AFTER
}

export function startPresence(userId) {
  if (!db) return () => {}
  const ref = doc(db, 'presence', userId)

  const ping = () =>
    setDoc(ref, { online: true, lastSeen: ts() }).catch(() => {})

  ping()
  const interval = setInterval(ping, PING_INTERVAL)

  const onVisibility = () => {
    if (document.hidden) {
      setDoc(ref, { online: false, lastSeen: ts() }).catch(() => {})
    } else {
      ping()
    }
  }
  document.addEventListener('visibilitychange', onVisibility)

  window.addEventListener('beforeunload', () =>
    setDoc(ref, { online: false, lastSeen: ts() }).catch(() => {}))

  return () => {
    clearInterval(interval)
    document.removeEventListener('visibilitychange', onVisibility)
    setDoc(ref, { online: false, lastSeen: ts() }).catch(() => {})
  }
}

export function watchAllPresence(callback) {
  if (!db) return () => {}
  const state = {}
  const unsubs = ['kim', 'yoe'].map(id =>
    onSnapshot(doc(db, 'presence', id), snap => {
      state[id] = snap.exists() ? snap.data() : null
      callback({ ...state })
    })
  )
  return () => unsubs.forEach(u => u())
}
