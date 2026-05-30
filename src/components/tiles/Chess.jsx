import { useState, useEffect, useCallback, useRef } from 'react'
import { Chess as ChessEngine } from 'chess.js'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useUser } from '../../lib/UserContext'
import styles from './Chess.module.css'

// ── Constants ──────────────────────────────────────────────────────────────────
const PIECES = {
  wK:'♔', wQ:'♕', wR:'♖', wB:'♗', wN:'♘', wP:'♙',
  bK:'♚', bQ:'♛', bR:'♜', bB:'♝', bN:'♞', bP:'♟',
}
const FILES = ['a','b','c','d','e','f','g','h']

const TENOR_KEY = import.meta.env.VITE_TENOR_KEY

// Curated reaction GIFs (stable Giphy CDN — works as fallback when no Tenor key)
const PRESET_GIFS = [
  { url:'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',          label:'🕺 Dance'    },
  { url:'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',      label:'👏 Clap'     },
  { url:'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',      label:'😂 LOL'      },
  { url:'https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif',       label:'🤯 Mind=Blown'},
  { url:'https://media.giphy.com/media/26FPy3QZQqGtDcrja/giphy.gif',       label:'🏆 GG'       },
  { url:'https://media.giphy.com/media/3oEjHGr1Fhz0kyv8Ig/giphy.gif',      label:'😏 Troll'    },
  { url:'https://media.giphy.com/media/5b5OU7aUekfdSAER5I/giphy.gif',      label:'🤔 Thinking' },
  { url:'https://media.giphy.com/media/l2Je66zG6mAAZxgqI/giphy.gif',       label:'😤 Mad'      },
  { url:'https://media.giphy.com/media/26uf2YTgF5upXUTm0/giphy.gif',       label:'😴 Bored'    },
  { url:'https://media.giphy.com/media/3o7TKo4ufXxEDpBVkI/giphy.gif',      label:'😱 Shocked'  },
  { url:'https://media.giphy.com/media/d2Z9QYzA2aidiWn6/giphy.gif',        label:'🎉 Party'    },
  { url:'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif',       label:'👑 King'     },
]

// ── Firebase helpers ───────────────────────────────────────────────────────────
const GAME_REF = () => db ? doc(db, 'chess', 'game') : null
const GIF_REF  = () => db ? doc(db, 'chess', 'gif')  : null

function saveGame(fen) {
  const ref = GAME_REF(); if (!ref) return
  setDoc(ref, { fen, updatedAt: serverTimestamp() }).catch(() => {})
}
function sendGifToFirestore(url, from) {
  const ref = GIF_REF(); if (!ref) return
  setDoc(ref, { url, from, sentAt: serverTimestamp() }).catch(() => {})
}

// ── GIF Overlay ────────────────────────────────────────────────────────────────
function GifOverlay({ gif, onClose }) {
  const user = useUser()
  const [progress, setProgress] = useState(100)
  const DURATION = 6000

  useEffect(() => {
    const start = Date.now()
    const tick = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = 100 - (elapsed / DURATION) * 100
      if (pct <= 0) { clearInterval(tick); onClose() }
      else setProgress(pct)
    }, 50)
    return () => clearInterval(tick)
  }, [onClose])

  const fromName = gif.from === 'kim' ? 'Kim 🔵' : 'Yoe 🩷'
  const isMe = gif.from === user?.id

  return (
    <div className={styles.gifOverlay} onClick={onClose}>
      <div className={styles.gifCard} onClick={e => e.stopPropagation()}>
        <p className={styles.gifSender}>{isMe ? 'You sent' : `${fromName} sent`}</p>
        <img src={gif.url} alt="gif" className={styles.gifImg} />
        <div className={styles.gifProgress}>
          <div className={styles.gifProgressFill} style={{ width: `${progress}%` }} />
        </div>
        <button className={styles.gifClose} onClick={onClose}>✕ close</button>
      </div>
    </div>
  )
}

// ── GIF Picker ─────────────────────────────────────────────────────────────────
function GifPicker({ onSend, onClose }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState(PRESET_GIFS)
  const [loading, setLoading] = useState(false)
  const debounce = useRef(null)

  const search = useCallback((q) => {
    if (!q.trim()) { setResults(PRESET_GIFS); return }
    if (!TENOR_KEY) return
    setLoading(true)
    fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=12&media_filter=gif`)
      .then(r => r.json())
      .then(d => setResults(d.results?.map(r => ({
        url:   r.media_formats.gif.url,
        label: r.title || q,
      })) ?? []))
      .catch(() => setResults(PRESET_GIFS))
      .finally(() => setLoading(false))
  }, [])

  const handleInput = (v) => {
    setQuery(v)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => search(v), 500)
  }

  return (
    <div className={styles.gifPickerOverlay} onClick={onClose}>
      <div className={styles.gifPicker} onClick={e => e.stopPropagation()}>
        <div className={styles.gifPickerHeader}>
          <span className={styles.gifPickerTitle}>Send a GIF 🎭</span>
          <button className={styles.gifClose} onClick={onClose}>✕</button>
        </div>
        <input
          className={styles.gifSearch}
          placeholder={TENOR_KEY ? 'Search GIFs…' : 'Search disabled — add VITE_TENOR_KEY'}
          value={query}
          onChange={e => handleInput(e.target.value)}
          autoFocus
        />
        {loading && <p className={styles.gifLoading}>Loading… ✨</p>}
        <div className={styles.gifGrid}>
          {results.map((g, i) => (
            <button key={i} className={styles.gifThumb} onClick={() => { onSend(g.url); onClose() }}>
              <img src={g.url} alt={g.label} loading="lazy" />
            </button>
          ))}
        </div>
        {!TENOR_KEY && (
          <p className={styles.gifHint}>
            Add <code>VITE_TENOR_KEY</code> to <code>.env.local</code> for full GIF search via Tenor
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main Chess component ───────────────────────────────────────────────────────
export default function Chess() {
  const user      = useUser()
  const myColor   = user?.id === 'yoe' ? 'b' : 'w'

  const [game,       setGame]       = useState(() => new ChessEngine())
  const [selected,   setSelected]   = useState(null)
  const [legals,     setLegals]     = useState([])
  const [lastMove,   setLastMove]   = useState(null)
  const [status,     setStatus]     = useState('')
  const [flipped,    setFlipped]    = useState(user?.id === 'yoe')
  const [showPicker, setShowPicker] = useState(false)
  const [activeGif,  setActiveGif]  = useState(null)
  const lastGifRef = useRef(null)

  // ── sync game from Firestore ───────────────────────────────────────
  useEffect(() => {
    const ref = GAME_REF(); if (!ref) return
    return onSnapshot(ref, snap => {
      if (!snap.exists()) return
      try {
        const g = new ChessEngine(snap.data().fen)
        setGame(g)
        calcStatus(g)
      } catch { /* ignore bad fen */ }
    })
  }, [])

  // ── sync GIF from Firestore ────────────────────────────────────────
  useEffect(() => {
    const ref = GIF_REF(); if (!ref) return
    return onSnapshot(ref, snap => {
      if (!snap.exists()) return
      const data = snap.data()
      // only show if it's new (sentAt within last 10s)
      const sentAt = data.sentAt?.toDate?.() ?? new Date(0)
      if (Date.now() - sentAt.getTime() < 10000) {
        const key = data.sentAt?.seconds ?? Math.random()
        if (key !== lastGifRef.current) {
          lastGifRef.current = key
          setActiveGif(data)
        }
      }
    })
  }, [])

  const calcStatus = (g) => {
    if (g.isCheckmate())      setStatus(g.turn() === 'w' ? 'yoe_wins' : 'kim_wins')
    else if (g.isStalemate()) setStatus('stalemate')
    else if (g.isDraw())      setStatus('draw')
    else if (g.isCheck())     setStatus('check')
    else                      setStatus('')
  }

  // ── click handler ──────────────────────────────────────────────────
  const onSquareClick = useCallback((sq) => {
    if (game.turn() !== myColor) return
    if (['kim_wins','yoe_wins','stalemate','draw'].includes(status)) return

    if (selected) {
      const move = game.moves({ square: selected, verbose: true }).find(m => m.to === sq)
      if (move) {
        const g = new ChessEngine(game.fen())
        g.move({ from: selected, to: sq, promotion: 'q' })
        setLastMove({ from: selected, to: sq })
        setSelected(null); setLegals([])
        setGame(g); calcStatus(g)
        saveGame(g.fen())
        return
      }
      const piece = game.get(sq)
      if (piece?.color === myColor) {
        setSelected(sq)
        setLegals(game.moves({ square: sq, verbose: true }).map(m => m.to))
        return
      }
      setSelected(null); setLegals([])
    } else {
      const piece = game.get(sq)
      if (!piece || piece.color !== myColor) return
      setSelected(sq)
      setLegals(game.moves({ square: sq, verbose: true }).map(m => m.to))
    }
  }, [game, selected, myColor, status])

  const handleSendGif = (url) => {
    sendGifToFirestore(url, user?.id ?? 'kim')
  }

  // ── render board ───────────────────────────────────────────────────
  const board  = game.board()
  const ranks  = flipped ? [...board].reverse() : board
  const files  = flipped ? [...FILES].reverse() : FILES
  const turn   = game.turn()
  const isMyTurn = turn === myColor
  const turnName = turn === 'w' ? 'Kim 🔵' : 'Yoe 🩷'

  return (
    <div className={styles.wrap}>

      {/* GIF overlay */}
      {activeGif && (
        <GifOverlay gif={activeGif} onClose={() => setActiveGif(null)} />
      )}

      {/* GIF picker */}
      {showPicker && (
        <GifPicker onSend={handleSendGif} onClose={() => setShowPicker(false)} />
      )}

      {/* status bar */}
      <div className={styles.statusBar}>
        <div className={styles.playerTag} style={{ opacity: turn === 'b' ? 1 : .35 }}>
          <span className={styles.yoeColor}>🩷 Yoe</span>
          {turn === 'b' && isMyTurn  && <span className={styles.youLabel}>← your turn</span>}
          {turn === 'b' && !isMyTurn && <span className={styles.theirLabel}>thinking…</span>}
        </div>

        <div className={styles.statusCenter}>
          {status === 'check'     && <span className={styles.checkBadge}>⚠️ Check!</span>}
          {status === 'kim_wins'  && <span className={styles.winBadge}>🔵 Kim wins!</span>}
          {status === 'yoe_wins'  && <span className={styles.winBadge}>🩷 Yoe wins!</span>}
          {status === 'stalemate' && <span className={styles.drawBadge}>🤝 Stalemate</span>}
          {status === 'draw'      && <span className={styles.drawBadge}>🤝 Draw</span>}
        </div>

        <div className={styles.playerTag} style={{ opacity: turn === 'w' ? 1 : .35 }}>
          {turn === 'w' && isMyTurn  && <span className={styles.youLabel}>your turn →</span>}
          {turn === 'w' && !isMyTurn && <span className={styles.theirLabel}>thinking…</span>}
          <span className={styles.kimColor}>Kim 🔵</span>
        </div>
      </div>

      {/* board */}
      <div className={styles.boardContainer}>
        {/* rank labels left */}
        <div className={styles.rankLabels}>
          {ranks.map((_, ri) => (
            <span key={ri}>{flipped ? ri + 1 : 8 - ri}</span>
          ))}
        </div>

        <div className={styles.board}>
          {ranks.map((row, ri) => {
            const displayRow = flipped ? [...row].reverse() : row
            return displayRow.map((sq, fi) => {
              const realRank = flipped ? ri     : 7 - ri
              const realFile = flipped ? 7 - fi : fi
              const sqName   = FILES[realFile] + (realRank + 1)
              const isLight  = (ri + fi) % 2 === 0
              const isSel    = selected === sqName
              const isLegal  = legals.includes(sqName)
              const isLast   = lastMove?.from === sqName || lastMove?.to === sqName
              const piece    = sq

              return (
                <div
                  key={sqName}
                  className={`${styles.square} ${isLight ? styles.light : styles.dark} ${isSel ? styles.selected : ''} ${isLast ? styles.lastMove : ''}`}
                  onClick={() => onSquareClick(sqName)}
                >
                  {isLegal && (
                    <span className={`${styles.legalDot} ${piece ? styles.legalCapture : ''}`} />
                  )}
                  {piece && (
                    <span className={`${styles.piece} ${piece.color === 'w' ? styles.kimPiece : styles.yoePiece}`}>
                      {PIECES[piece.color + piece.type.toUpperCase()]}
                    </span>
                  )}
                </div>
              )
            })
          })}
        </div>

        {/* rank labels right (mirror) */}
        <div className={styles.rankLabels}>
          {ranks.map((_, ri) => (
            <span key={ri}>{flipped ? ri + 1 : 8 - ri}</span>
          ))}
        </div>
      </div>

      {/* file labels */}
      <div className={styles.fileRow}>
        <div className={styles.fileSpacer} />
        <div className={styles.fileLabels}>
          {files.map(f => <span key={f}>{f}</span>)}
        </div>
        <div className={styles.fileSpacer} />
      </div>

      {/* controls */}
      <div className={styles.controls}>
        <button className={styles.gifBtn} onClick={() => setShowPicker(true)}>
          🎭 Send GIF
        </button>
        <button className={styles.btn} onClick={() => setFlipped(f => !f)}>
          🔄 Flip
        </button>
        <button className={styles.btnDanger} onClick={() => {
          if (confirm('Start a new game?')) {
            const fresh = new ChessEngine()
            setGame(fresh); setSelected(null); setLegals([])
            setLastMove(null); setStatus('')
            saveGame(fresh.fen())
          }
        }}>
          🔁 New
        </button>
      </div>

      {/* legend */}
      <div className={styles.legend}>
        <span className={styles.kimLegend}>🔵 Kim = White (bottom)</span>
        <span className={styles.yoeLegend}>🩷 Yoe = Black (top)</span>
      </div>
    </div>
  )
}
