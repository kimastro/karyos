import { useState } from 'react'
import { PROFILES } from '../lib/UserContext'
import styles from './Lock.module.css'

function findProfile(val) {
  return Object.values(PROFILES).find(
    p => val.toLowerCase() === p.password.toLowerCase()
  ) ?? null
}

export default function Lock({ onUnlock }) {
  const [val,    setVal]    = useState('')
  const [wrong,  setWrong]  = useState(false)
  const [fading, setFading] = useState(false)
  const [err,    setErr]    = useState('')

  const submit = e => {
    e.preventDefault()
    const profile = findProfile(val)
    if (profile) {
      setFading(true)
      setTimeout(() => onUnlock(profile), 700)
    } else {
      setWrong(true)
      setErr('try again ✨')
      setTimeout(() => { setWrong(false); setErr('') }, 1200)
      setVal('')
    }
  }

  return (
    <div className={`${styles.lock} ${fading ? styles.out : ''}`}>
      <div className={styles.moon}>🌙</div>
      <p className={styles.sub}>enter the password</p>
      <form onSubmit={submit} className={styles.form}>
        <input
          className={`${styles.input} ${wrong ? styles.wrong : ''}`}
          type="password"
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder="••••••"
          autoFocus
        />
        <p className={styles.err}>{err}</p>
        <button className={styles.btn} type="submit">Enter</button>
      </form>
    </div>
  )
}
