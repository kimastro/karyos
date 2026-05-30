import { useState } from 'react'
import styles from './Cal.module.css'

const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

// Manual marks the user can add
const MANUAL_MARKS = [
  { emoji:'💕', label:'Special'   },
  { emoji:'⭐', label:'Favourite' },
  { emoji:'🎂', label:'Birthday'  },
  { emoji:'❤️', label:'Date'      },
  { emoji:'🌙', label:'Night out' },
  { emoji:'✈️', label:'Trip'      },
]

function calKey(y, m) { return `calendar-${y}-${m}` }

function loadMonth(y, m) {
  try { return JSON.parse(localStorage.getItem(calKey(y, m)) || '{}') }
  catch { return {} }
}
function saveMonth(y, m, data) {
  localStorage.setItem(calKey(y, m), JSON.stringify(data))
}

// Normalise: old format was a plain emoji string, new format is an object
function normMark(v) {
  if (!v) return null
  if (typeof v === 'string') return { emoji: v, label: '', source: 'manual' }
  return v
}

export default function CalendarBae() {
  const today = new Date()
  const [year,   setYear]   = useState(today.getFullYear())
  const [month,  setMonth]  = useState(today.getMonth())
  const [marks,  setMarks]  = useState(() => loadMonth(today.getFullYear(), today.getMonth()))
  const [selDay, setSelDay] = useState(null)
  const [selMark,setSelMark]= useState(0)

  const navigate = (delta) => {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear()); setMonth(d.getMonth())
    setMarks(loadMonth(d.getFullYear(), d.getMonth()))
    setSelDay(null)
  }

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const isToday     = d => d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  const isPast      = d => new Date(year, month, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const clickDay = (day) => {
    if (selDay === day) { setSelDay(null); return }
    setSelDay(day)
  }

  const applyMark = () => {
    if (!selDay) return
    const key  = String(selDay)
    const mark = MANUAL_MARKS[selMark]
    const next = { ...marks, [key]: { emoji: mark.emoji, label: mark.label, source: 'manual' } }
    setMarks(next); saveMonth(year, month, next)
  }

  const clearDay = (day) => {
    const next = { ...marks }; delete next[String(day)]
    setMarks(next); saveMonth(year, month, next); setSelDay(null)
  }

  const selMark_ = selDay ? normMark(marks[String(selDay)]) : null
  const selDate  = selDay ? new Date(year, month, selDay)
    .toLocaleDateString([], { weekday:'long', month:'long', day:'numeric', year:'numeric' }) : ''

  // Count events this month
  const eventCount = Object.keys(marks).length

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h2 className={styles.title}>Calendar with Bae</h2>
            <p className={styles.sub}>{eventCount > 0 ? `${eventCount} date${eventCount > 1 ? 's' : ''} this month 💕` : 'Plan your next date'}</p>
          </div>
          <div className={styles.navRow}>
            <button className={styles.navBtn} onClick={() => navigate(-1)}>‹</button>
            <div className={styles.monthLabel}>
              <span className={styles.monthName}>{MONTHS[month]}</span>
              <span className={styles.monthYear}>{year}</span>
            </div>
            <button className={styles.navBtn} onClick={() => navigate(1)}>›</button>
          </div>
        </div>
      </div>

      {/* day-of-week headers */}
      <div className={styles.weekRow}>
        {DAYS.map(d => <div key={d} className={styles.weekDay}>{d}</div>)}
      </div>

      {/* grid */}
      <div className={styles.grid}>
        {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} />)}

        {Array.from({ length: daysInMonth }, (_, i) => {
          const day  = i + 1
          const mark = normMark(marks[String(day)])
          const isTd = isToday(day)
          const isPst= isPast(day)
          const isSel= selDay === day

          return (
            <button
              key={day}
              className={[
                styles.day,
                isTd  ? styles.today   : '',
                isPst ? styles.past    : '',
                mark  ? styles.hasEvent: '',
                isSel ? styles.selected: '',
              ].join(' ')}
              onClick={() => clickDay(day)}
            >
              <span className={styles.dayNum}>{day}</span>
              {mark && (
                <span className={styles.dayEmoji}>{mark.emoji}</span>
              )}
              {mark?.label && (
                <span className={styles.dayLabel}>{mark.label}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* selected day detail */}
      {selDay && (
        <div className={styles.detail}>
          <div className={styles.detailHeader}>
            <span className={styles.detailDate}>{selDate}</span>
            <button className={styles.detailClose} onClick={() => setSelDay(null)}>✕</button>
          </div>

          {selMark_ ? (
            <div className={styles.detailEvent}>
              <span className={styles.detailEmoji}>{selMark_.emoji}</span>
              <div className={styles.detailInfo}>
                <span className={styles.detailLabel}>{selMark_.label || 'Marked'}</span>
                {selMark_.source === 'hangout' && (
                  <span className={styles.detailSource}>from Wanna Hang Out 🎉</span>
                )}
              </div>
              <button className={styles.clearBtn} onClick={() => clearDay(selDay)}>Remove</button>
            </div>
          ) : (
            <div className={styles.detailEmpty}>
              <p className={styles.detailEmptyText}>No event — pick a mark below to add one</p>
            </div>
          )}

          {/* mark selector */}
          <div className={styles.markRow}>
            {MANUAL_MARKS.map((m, i) => (
              <button
                key={m.emoji}
                className={`${styles.markBtn} ${selMark === i ? styles.markActive : ''}`}
                onClick={() => setSelMark(i)}
                title={m.label}
              >
                {m.emoji}
              </button>
            ))}
          </div>
          <button className={styles.applyBtn} onClick={applyMark}>
            Mark as {MANUAL_MARKS[selMark].emoji} {MANUAL_MARKS[selMark].label}
          </button>
        </div>
      )}

      {/* legend */}
      <div className={styles.legend}>
        <span>💕 Special</span><span>⭐ Fav</span>
        <span>☕ Coffee</span><span>🎬 Movie</span>
        <span>🌿 Walk</span><span>🍕 Food</span>
        <span>🎮 Games</span><span>🎲 Surprise</span>
      </div>
    </div>
  )
}
