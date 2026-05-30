import { useMemo } from 'react'
import styles from './Tile.module.css'

const NOTES = [
  "You make every morning worth waking up for ☀️",
  "The world is a little brighter because you're in it 🌸",
  "Hope your day is as wonderful as your smile 💛",
  "Sending you warmth and good vibes for the day ahead 🌻",
  "You deserve all the good things coming your way today ✨",
  "Good things are coming your way — I just know it 🌈",
  "Today is going to be a great day. I believe in you 💫",
  "You are so loved and appreciated, every single day 🥰",
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return { label: 'Good Morning', emoji: '🌅' }
  if (h < 17) return { label: 'Good Afternoon', emoji: '☀️' }
  if (h < 21) return { label: 'Good Evening', emoji: '🌇' }
  return { label: 'Good Night', emoji: '🌙' }
}

export default function GoodMorning() {
  const { label, emoji } = getGreeting()
  const note = useMemo(() => NOTES[Math.floor(Math.random() * NOTES.length)], [])
  const now   = new Date()
  const time  = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const date  = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className={styles.view}>
      <div className={styles.centerContent}>
        <div className={styles.bigEmoji}>{emoji}</div>
        <h2 className={styles.viewTitle}>{label}, Princess</h2>
        <p className={styles.viewSub}>{date}</p>
        <div className={styles.clock}>{time}</div>
        <div className={styles.noteCard}>
          <p className={styles.note}>{note}</p>
        </div>
        <p className={styles.signed}>— with love 💕</p>
      </div>
    </div>
  )
}
