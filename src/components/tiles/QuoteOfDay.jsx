import { useState, useEffect } from 'react'
import styles from './Tile.module.css'

const QUOTES = [
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "You are enough. You have always been enough.", author: "Atticus" },
  { text: "She is clothed in strength and dignity, and she laughs without fear of the future.", author: "Proverbs 31:25" },
  { text: "You yourself, as much as anybody in the entire universe, deserve your love and affection.", author: "Sharon Salzberg" },
  { text: "Happiness is not something ready-made. It comes from your own actions.", author: "Dalai Lama" },
  { text: "The most courageous act is still to think for yourself. Aloud.", author: "Coco Chanel" },
  { text: "Wherever life plants you, bloom with grace.", author: "French Proverb" },
  { text: "Be the energy you want to attract.", author: "Unknown" },
  { text: "You are never too old to set another goal or dream a new dream.", author: "C.S. Lewis" },
  { text: "A flower does not think of competing with the flower next to it. It just blooms.", author: "Zen Shin" },
  { text: "The world is full of nice people. If you can't find one, be one.", author: "Nishan Panwar" },
  { text: "Life is not measured by the number of breaths we take, but by the moments that take our breath away.", author: "Maya Angelou" },
  { text: "She remembered who she was and the game changed.", author: "Lalah Delia" },
  { text: "With the new day comes new strength and new thoughts.", author: "Eleanor Roosevelt" },
  { text: "One day or day one. You decide.", author: "Unknown" },
  { text: "Start each day with a grateful heart.", author: "Unknown" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Your only limit is you.", author: "Unknown" },
  { text: "Dream big, work hard, stay focused.", author: "Unknown" },
  { text: "You are braver than you believe, stronger than you seem, and smarter than you think.", author: "A.A. Milne" },
  { text: "Be a girl with a mind, a woman with attitude, and a lady with class.", author: "Unknown" },
  { text: "Darling, you are a work of art.", author: "Unknown" },
  { text: "Be the reason someone smiles today.", author: "Unknown" },
  { text: "Good things come to those who hustle.", author: "Abraham Lincoln" },
  { text: "The best is yet to come.", author: "Frank Sinatra" },
  { text: "In a world where you can be anything, be kind.", author: "Unknown" },
  { text: "Your vibe attracts your tribe.", author: "Unknown" },
  { text: "Make today so awesome, yesterday gets jealous.", author: "Unknown" },
  { text: "She believed she could, so she did.", author: "R.S. Grey" },
  { text: "Difficult roads often lead to beautiful destinations.", author: "Zig Ziglar" },
]

function getDailyQuote() {
  const today = new Date().toDateString()
  const stored = localStorage.getItem('quote-cache')
  if (stored) {
    const { date, index } = JSON.parse(stored)
    if (date === today) return QUOTES[index]
  }
  const index = Math.floor(Math.random() * QUOTES.length)
  localStorage.setItem('quote-cache', JSON.stringify({ date: today, index }))
  return QUOTES[index]
}

export default function QuoteOfDay() {
  const [quote, setQuote] = useState(() => getDailyQuote())
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(`"${quote.text}" — ${quote.author}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const refresh = () => {
    const index = Math.floor(Math.random() * QUOTES.length)
    const today = new Date().toDateString()
    localStorage.setItem('quote-cache', JSON.stringify({ date: today, index }))
    setQuote(QUOTES[index])
  }

  return (
    <div className={styles.view}>
      <div className={styles.centerContent}>
        <div className={styles.bigEmoji}>💬</div>
        <h2 className={styles.viewTitle}>Quote of the Day</h2>

        <div className={styles.quoteCard}>
          <p className={styles.quoteText}>"{quote.text}"</p>
          <p className={styles.quoteAuthor}>— {quote.author}</p>
        </div>

        <div className={styles.quoteActions}>
          <button className={styles.goldBtn} onClick={copy}>
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
          <button className={styles.ghostBtn} onClick={refresh}>
            🔀 New quote
          </button>
        </div>
      </div>
    </div>
  )
}
