import { useState, useEffect } from 'react'
import styles from './Dashboard.module.css'
import { useUser, PROFILES } from '../lib/UserContext'
import { watchAllPresence, isOnline } from '../lib/presence'
import GoodMorning  from './tiles/GoodMorning'
import WannaHangOut from './tiles/WannaHangOut'
import CalendarBae  from './tiles/CalendarBae'
import QuoteOfDay   from './tiles/QuoteOfDay'
import TodaysMood   from './tiles/TodaysMood'
import News         from './tiles/News'
import Notes        from './tiles/Notes'
import Events       from './tiles/Events'
import Chess        from './tiles/Chess'

const TILES = [
  { id:'morning',  emoji:'🌅', label:'Good Morning Princess', sub:'A little note for you',    span:2 },
  { id:'hangout',  emoji:'🎉', label:'Wanna Hang Out?',       sub:'Plan a date',               span:1 },
  { id:'calendar', emoji:'📅', label:'Calendar with Bae',     sub:'Our dates & plans',         span:1 },
  { id:'chess',    emoji:'♟️', label:'Chess',                  sub:'Your move…',                span:1 },
  { id:'quote',    emoji:'💬', label:'Quote of the Day',       sub:'Daily inspiration',         span:1 },
  { id:'events',   emoji:'🎪', label:'Events',                 sub:'Morocco & the world',       span:1 },
  { id:'notes',    emoji:'💌', label:'Notes for Bae',          sub:'Leave a little message',    span:1 },
  { id:'news',     emoji:'📰', label:'News',                   sub:'Live headlines',             span:1 },
  { id:'mood',     emoji:'🌈', label:"Today's Mood",           sub:'How are you feeling?',      span:2 },
]

const VIEWS = {
  morning:  GoodMorning,
  hangout:  WannaHangOut,
  calendar: CalendarBae,
  quote:    QuoteOfDay,
  mood:     TodaysMood,
  news:     News,
  notes:    Notes,
  events:   Events,
  chess:    Chess,
}

// ── Live presence bar showing both profiles ───────────────────────────────────
function formatLastSeen(data) {
  if (!data?.lastSeen) return 'never connected'
  const ms = typeof data.lastSeen === 'number'
    ? data.lastSeen
    : (data.lastSeen.toDate?.().getTime() ?? 0)
  const d = new Date(ms)
  const now = new Date()
  const diff = Math.floor((now - d) / 60000) // minutes

  if (diff < 1)   return 'just now'
  if (diff < 60)  return `${diff}m ago`
  if (diff < 1440) {
    const h = Math.floor(diff / 60)
    const m = diff % 60
    return m ? `${h}h ${m}m ago` : `${h}h ago`
  }
  // different day — show date + time
  const isThisYear = d.getFullYear() === now.getFullYear()
  const datePart = d.toLocaleDateString([], {
    weekday: 'short', month: 'short', day: 'numeric',
    ...(!isThisYear && { year: 'numeric' }),
  })
  const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `${datePart} at ${timePart}`
}

function PresenceBar({ fixed = false }) {
  const me = useUser()
  const [presence, setPresence] = useState({})

  useEffect(() => watchAllPresence(setPresence), [])

  return (
    <div className={`${styles.presenceBar} ${fixed ? styles.presenceFixed : ''}`}>
      {Object.values(PROFILES).map(p => {
        const data   = presence[p.id]
        const online = isOnline(data)
        const isMe   = me?.id === p.id
        const lastSeen = formatLastSeen(data)
        return (
          <div key={p.id} className={`${styles.presenceCard} ${isMe ? styles.presenceMe : ''}`}>
            <div className={styles.presenceAvatar} style={{ borderColor: online ? '#22c55e' : 'rgba(255,255,255,0.15)' }}>
              <span>{p.avatar}</span>
              <span className={styles.presenceDot} style={{ background: online ? '#22c55e' : '#6b7280' }} />
            </div>
            <div className={styles.presenceInfo}>
              <span className={styles.presenceName} style={{ color: p.color }}>
                {p.name} {isMe && <span className={styles.presenceYou}>you</span>}
              </span>
              <span className={styles.presenceStatus} style={{ color: online ? '#22c55e' : '#6b7280' }}>
                {online ? '● online now' : `○ ${isMe ? 'offline' : `last seen ${lastSeen}`}`}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const [active, setActive] = useState(null)
  const ActiveView = active ? VIEWS[active] : null

  return (
    <>
      {/* bg dots */}
      <div className={styles.dots} aria-hidden>
        {Array.from({ length: 50 }, (_, i) => (
          <span key={i} className={styles.dot} style={{
            left:   `${Math.random() * 100}%`,
            top:    `${Math.random() * 100}%`,
            width:  `${Math.random() * 2 + 0.5}px`,
            height: `${Math.random() * 2 + 0.5}px`,
            animationDuration: `${Math.random() * 2 + 1.5}s`,
            animationDelay:    `${Math.random() * 3}s`,
          }} />
        ))}
      </div>

      <div className={styles.wrap}>
        <header className={styles.header}>
          <span className={styles.moon}>🌙</span>
          <h1 className={styles.title}>Karyos</h1>
          <p className={styles.sub}>your little universe</p>
          <PresenceBar />
        </header>

        <div className={styles.grid}>
          {TILES.map(t => (
            <button
              key={t.id}
              className={`${styles.tile} ${styles[`span${t.span}`]}`}
              onClick={() => setActive(t.id)}
            >
              <span className={styles.tileEmoji}>{t.emoji}</span>
              <span className={styles.tileLabel}>{t.label}</span>
              <span className={styles.tileSub}>{t.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {ActiveView && (
        <div className={styles.overlay}>
          <button className={styles.back} onClick={() => setActive(null)}>← back</button>
          <PresenceBar fixed />
          <ActiveView />
        </div>
      )}
    </>
  )
}
