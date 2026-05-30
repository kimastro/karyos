import { useState } from 'react'
import styles from './Tile.module.css'
import { useUser } from '../../lib/UserContext'

const MOODS = [
  { score: 0,  emoji: '😭', label: 'Terrible',            color: '#7f1d1d', msg: "I'm really sorry to hear that 💔 You don't have to be okay. I'm here." },
  { score: 1,  emoji: '😢', label: 'Really sad',          color: '#991b1b', msg: "Sending you the biggest virtual hug 🫂 It won't always feel this way." },
  { score: 2,  emoji: '😞', label: 'Sad',                 color: '#b45309', msg: "It's okay to have hard days. You're doing better than you think 💛" },
  { score: 3,  emoji: '😕', label: 'A bit down',          color: '#92400e', msg: "You're allowed to be off sometimes. Tomorrow can be different 🌤️" },
  { score: 4,  emoji: '😐', label: 'Meh',                 color: '#374151', msg: "Neither here nor there — that's okay too. Neutral days are valid 🌫️" },
  { score: 5,  emoji: '🙂', label: 'Okay',                color: '#1e3a5f', msg: "Okay is perfectly fine! A solid, steady day 🌿" },
  { score: 6,  emoji: '😊', label: 'Pretty good',         color: '#065f46', msg: "Love to hear it! Good vibes are coming your way ✨" },
  { score: 7,  emoji: '😄', label: 'Good',                color: '#065f46', msg: "That's what I like to see! Keep that energy going 🌟" },
  { score: 8,  emoji: '😁', label: 'Great',               color: '#1d4ed8', msg: "Absolutely glowing! You're on fire today 🔥" },
  { score: 9,  emoji: '🥰', label: 'Amazing',             color: '#6b21a8', msg: "You beautiful, amazing person! The world is lucky to have you 🌈" },
  { score: 10, emoji: '🤩', label: 'On top of the world', color: '#b45309', msg: "A perfect 10! The universe is smiling right along with you 🌟✨🎉" },
]

const PEOPLE = {
  kim: { label: 'Kim', avatar: '👨', color: '#6b46c1' },
  yoe: { label: 'Yoe', avatar: '👩', color: '#c9a96e' },
}

const TODAY = new Date().toDateString() // e.g. "Sat May 31 2025"

// ── localStorage helpers ────────────────────────────────────────────
function todayKey(person)   { return `mood-today-${person}` }
function historyKey(person) { return `mood-history-${person}` }

function loadToday(person) {
  try {
    const raw = localStorage.getItem(todayKey(person))
    if (!raw) return null
    const entry = JSON.parse(raw)
    // stale if it's from a previous day → treat as new day
    return entry.date === TODAY ? entry : null
  } catch { return null }
}

function saveToday(person, mood) {
  const entry = { date: TODAY, score: mood.score, emoji: mood.emoji, label: mood.label }
  localStorage.setItem(todayKey(person), JSON.stringify(entry))
  // append to history
  try {
    const hist = JSON.parse(localStorage.getItem(historyKey(person)) || '[]')
    const next  = [...hist.filter(h => h.date !== TODAY), entry].slice(-30)
    localStorage.setItem(historyKey(person), JSON.stringify(next))
  } catch { /* ignore */ }
}

function loadHistory(person) {
  try { return JSON.parse(localStorage.getItem(historyKey(person)) || '[]') }
  catch { return [] }
}

// ── Single person panel ─────────────────────────────────────────────
function MoodPanel({ person, highlight }) {
  const { label, avatar, color } = PEOPLE[person]

  // initialise from localStorage — persists across refreshes, resets after midnight
  const [saved,    setSaved]    = useState(() => loadToday(person))
  const [selected, setSelected] = useState(null)
  const [changing, setChanging] = useState(false)

  const history = loadHistory(person).slice(-5).reverse()

  const submit = () => {
    if (!selected) return
    saveToday(person, selected)
    setSaved({ date: TODAY, ...selected })
    setChanging(false)
  }

  const startChange = () => { setSelected(null); setChanging(true) }
  const cancelChange = () => setChanging(false)

  // ── saved / result view ──────────────────────────────────────────
  if (saved && !changing) {
    const mood = MOODS[saved.score]
    return (
      <div className={styles.moodPanel} style={highlight ? { borderColor: color, boxShadow: `0 0 0 1px ${color}55` } : {}}>
        <div className={styles.moodPanelHeader} style={{ borderColor: color }}>
          <span className={styles.moodAvatar}>{avatar}</span>
          <span className={styles.moodPanelName} style={{ color }}>{label}</span>
          {highlight && <span className={styles.youBadge}>you</span>}
        </div>
        <div className={styles.moodResultEmoji}>{mood.emoji}</div>
        <p className={styles.moodResultLabel}>{mood.label}</p>
        <div className={styles.moodScoreRow}>
          <div className={styles.scoreBar}>
            <div className={styles.scoreFill}
              style={{ width: `${mood.score * 10}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
          </div>
          <span className={styles.scoreNum}>{mood.score}/10</span>
        </div>
        <p className={styles.moodMsgSmall}>{mood.msg}</p>
        {history.length > 0 && (
          <div className={styles.historyRow} style={{ marginTop: '.5rem' }}>
            {history.map((h, i) => (
              <div key={i} className={styles.historyItem} title={h.label}>
                <span className={styles.historyEmoji}>{h.emoji}</span>
                <span className={styles.historyDate}>
                  {new Date(h.date).toLocaleDateString([], { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
        <button className={styles.resetBtn} onClick={startChange}>Change ↺</button>
      </div>
    )
  }

  // ── picker view ──────────────────────────────────────────────────
  return (
    <div className={styles.moodPanel} style={highlight ? { borderColor: color, boxShadow: `0 0 0 1px ${color}55` } : {}}>
      <div className={styles.moodPanelHeader} style={{ borderColor: color }}>
        <span className={styles.moodAvatar}>{avatar}</span>
        <span className={styles.moodPanelName} style={{ color }}>{label}</span>
        {highlight && <span className={styles.youBadge}>you</span>}
      </div>
      <p className={styles.moodPanelSub}>How are you feeling?</p>
      <div className={styles.moodGridSmall}>
        {MOODS.map(m => (
          <button
            key={m.score}
            className={`${styles.moodBtnSmall} ${selected?.score === m.score ? styles.moodActive : ''}`}
            style={selected?.score === m.score ? { borderColor: m.color, background: `${m.color}33` } : {}}
            onClick={() => setSelected(m)}
          >
            <span className={styles.moodEmoji}>{m.emoji}</span>
            <span className={styles.moodScore2}>{m.score}</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '.5rem', marginTop: '.7rem' }}>
        {selected && (
          <button className={styles.goldBtn}
            style={{ borderColor: `${color}88`, color }}
            onClick={submit}>
            Save {selected.emoji}
          </button>
        )}
        {changing && (
          <button className={styles.resetBtn} onClick={cancelChange}>Cancel</button>
        )}
      </div>
    </div>
  )
}

// ── Root ────────────────────────────────────────────────────────────
export default function TodaysMood() {
  const user = useUser()
  // scroll logged-in user's panel into view on mobile
  return (
    <div className={styles.view}>
      <div className={styles.centerContent}>
        <div className={styles.bigEmoji}>🌈</div>
        <h2 className={styles.viewTitle}>Today's Mood</h2>
        <p className={styles.viewSub}>0 = rough · 10 = on top of the world · resets at midnight</p>
        <div className={styles.moodDuo}>
          {/* show logged-in user first */}
          <MoodPanel person={user?.id === 'yoe' ? 'yoe' : 'kim'} highlight={user?.id === 'kim' || !user} />
          <MoodPanel person={user?.id === 'yoe' ? 'kim' : 'yoe'} highlight={user?.id === 'yoe'} />
        </div>
      </div>
    </div>
  )
}
