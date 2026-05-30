import { useState, useEffect, useRef } from 'react'
import { useUser } from '../../lib/UserContext'
import {
  collection, addDoc, onSnapshot, deleteDoc,
  doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { db, isConfigured } from '../../lib/firebase'
import styles from './Tile.module.css'

const PEOPLE = {
  kim: { label: 'Kim', avatar: '👨', color: '#6b46c1' },
  yoe: { label: 'Yoe', avatar: '👩', color: '#c9a96e' },
}

function SetupPrompt() {
  return (
    <div className={styles.view}>
      <div className={styles.centerContent}>
        <div className={styles.bigEmoji}>💌</div>
        <h2 className={styles.viewTitle}>Notes for Bae</h2>
        <div className={styles.setupCard}>
          <p className={styles.setupTitle}>One-time setup needed</p>
          <ol className={styles.setupSteps}>
            <li>Go to <strong>console.firebase.google.com</strong></li>
            <li>Create a project → Add a web app</li>
            <li>Copy your config keys</li>
            <li>Create <code>.env.local</code> in the project root with your keys</li>
            <li>In Firestore → Rules, paste the open rule below</li>
            <li>Run <code>npm run build</code> and <code>git push</code></li>
          </ol>
          <div className={styles.setupCode}>
            <p className={styles.setupCodeLabel}>.env.local</p>
            <pre>{`VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...`}</pre>
          </div>
          <div className={styles.setupCode}>
            <p className={styles.setupCodeLabel}>Firestore rules</p>
            <pre>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /notes/{noteId} {
      allow read, write: if true;
    }
  }
}`}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Notes() {
  if (!isConfigured) return <SetupPrompt />

  return <NotesFeed />
}

function NotesFeed() {
  const user = useUser()
  const [person,  setPerson]  = useState(user?.id ?? 'kim')
  const [notes,   setNotes]   = useState([])
  const [text,    setText]    = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error,   setError]   = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    const q    = query(collection(db, 'notes'), orderBy('timestamp', 'asc'))
    const unsub = onSnapshot(
      q,
      snap => { setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) },
      ()   => { setError('Could not connect to database.'); setLoading(false) },
    )
    return unsub
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [notes])

  const send = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await addDoc(collection(db, 'notes'), {
        from: person,
        text: text.trim(),
        timestamp: serverTimestamp(),
      })
      setText('')
    } catch {
      setError('Failed to send note.')
    } finally {
      setSending(false)
    }
  }

  const remove = (id, from) => {
    if (from !== person) return
    deleteDoc(doc(db, 'notes', id))
  }

  const onKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className={styles.view} style={{ padding: '4rem 0 0' }}>
      <div className={styles.notesWrap}>

        {/* header */}
        <div className={styles.notesHeader}>
          <span className={styles.bigEmoji} style={{ fontSize: '2rem' }}>💌</span>
          <h2 className={styles.viewTitle} style={{ fontSize: 'clamp(1.3rem,4vw,1.8rem)' }}>Notes for Bae</h2>
        </div>

        {/* who am I */}
        <div className={styles.notesPicker}>
          {Object.entries(PEOPLE).map(([id, p]) => (
            <button
              key={id}
              className={`${styles.notesPickerBtn} ${person === id ? styles.notesPickerActive : ''}`}
              style={person === id ? { borderColor: p.color, color: p.color, background: `${p.color}22` } : {}}
              onClick={() => setPerson(id)}
            >
              {p.avatar} I'm {p.label}
            </button>
          ))}
        </div>

        {/* feed */}
        <div className={styles.notesFeed}>
          {loading && <p className={styles.notesState}>Loading… ✨</p>}
          {error   && <p className={styles.notesState} style={{ color: 'rgba(220,100,100,.7)' }}>{error}</p>}
          {!loading && !error && notes.length === 0 && (
            <p className={styles.notesState}>No notes yet — write the first one 💌</p>
          )}

          {notes.map(n => {
            const p    = PEOPLE[n.from]
            const isMe = n.from === person
            const ts   = n.timestamp?.toDate()
            return (
              <div key={n.id} className={`${styles.noteBubble} ${isMe ? styles.noteMine : styles.noteTheirs}`}>
                {!isMe && <span className={styles.noteAvatar}>{p?.avatar}</span>}
                <div
                  className={styles.noteBubbleInner}
                  style={{ background: `${p?.color}18`, borderColor: `${p?.color}40` }}
                >
                  <p className={styles.noteText}>{n.text}</p>
                  <div className={styles.noteMeta}>
                    <span style={{ color: p?.color }}>{p?.label}</span>
                    {ts && (
                      <span>
                        {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' · '}
                        {ts.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {isMe && (
                      <button className={styles.noteDelete} onClick={() => remove(n.id, n.from)}>✕</button>
                    )}
                  </div>
                </div>
                {isMe && <span className={styles.noteAvatar}>{p?.avatar}</span>}
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* input */}
        <div className={styles.notesInputRow}>
          <textarea
            className={styles.notesTextarea}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder={`Write a note as ${PEOPLE[person].label}…`}
            rows={2}
          />
          <button
            className={styles.notesSend}
            onClick={send}
            disabled={!text.trim() || sending}
            style={{ borderColor: PEOPLE[person].color, color: PEOPLE[person].color }}
          >
            {sending ? '…' : '→'}
          </button>
        </div>
        <p className={styles.notesHint}>Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
