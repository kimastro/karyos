import { useState } from 'react'
import styles from './Tile.module.css'

export const ACTIVITIES = [
  { emoji: '☕', label: 'Coffee date'    },
  { emoji: '🎬', label: 'Movie night'    },
  { emoji: '🌿', label: 'Go for a walk'  },
  { emoji: '🍕', label: 'Grab some food' },
  { emoji: '🎮', label: 'Game night'     },
  { emoji: '🎲', label: 'Surprise me!'   },
]

// Shared calendar storage key format
export function calKey(y, m) { return `calendar-${y}-${m}` }

// Save rich event object so CalendarBae can show emoji + label
export function saveToCalendar(dateStr, activity) {
  const d   = new Date(dateStr + 'T12:00:00')
  const key = calKey(d.getFullYear(), d.getMonth())
  const marks = JSON.parse(localStorage.getItem(key) || '{}')
  marks[String(d.getDate())] = { emoji: activity.emoji, label: activity.label, source: 'hangout' }
  localStorage.setItem(key, JSON.stringify(marks))
}

export default function WannaHangOut() {
  const [activity, setActivity] = useState(null)
  const [date,     setDate]     = useState('')
  const [saved,    setSaved]    = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const confirm = () => {
    if (!activity || !date) return
    saveToCalendar(date, activity)
    setSaved(true)
  }

  const reset = () => { setActivity(null); setDate(''); setSaved(false) }

  if (saved) {
    const d = new Date(date + 'T12:00:00')
    const label = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
    return (
      <div className={styles.view}>
        <div className={styles.centerContent}>
          <div className={styles.bigEmoji}>{activity.emoji}</div>
          <h2 className={styles.viewTitle}>Date saved!</h2>
          <div className={styles.noteCard}>
            <p className={styles.note}>
              {activity.emoji} <strong>{activity.label}</strong><br />📅 {label}
            </p>
          </div>
          <p className={styles.muted}>Added to your calendar 💕</p>
          <button className={styles.goldBtn} style={{ marginTop: '1rem' }} onClick={reset}>
            Plan another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.view}>
      <div className={styles.centerContent}>
        <div className={styles.bigEmoji}>🎉</div>
        <h2 className={styles.viewTitle}>Wanna Hang Out?</h2>
        <p className={styles.viewSub}>pick an activity and a date</p>

        <div className={styles.activityGrid}>
          {ACTIVITIES.map(a => (
            <button
              key={a.label}
              className={`${styles.activityBtn} ${activity?.label === a.label ? styles.activitySelected : ''}`}
              onClick={() => setActivity(a)}
            >
              <span className={styles.activityEmoji}>{a.emoji}</span>
              <span className={styles.activityLabel}>{a.label}</span>
            </button>
          ))}
        </div>

        {activity && (
          <div className={styles.hangDateWrap}>
            <label className={styles.hangDateLabel}>Pick a date</label>
            <input
              type="date"
              className={styles.hangDateInput}
              value={date}
              min={today}
              onChange={e => setDate(e.target.value)}
            />
          </div>
        )}

        {activity && date && (
          <button className={styles.goldBtn} onClick={confirm}>
            Save to calendar 📅
          </button>
        )}
      </div>
    </div>
  )
}
