import { useState, useEffect } from 'react'
import styles from './Tile.module.css'

// Using The Guardian's open API — free, reliable, CORS-friendly, with images
const GUARDIAN_KEY = 'test' // 'test' works for low traffic; get a free key at open-platform.theguardian.com
const GUARDIAN     = 'https://content.guardianapis.com/search'

const SECTIONS = {
  '📰 Top':        'news',
  '🌍 World':      'world',
  '🔬 Science':    'science',
  '🌿 Environ.':   'environment',
  '🎨 Culture':    'culture',
  '⚽ Sport':      'sport',
  '💻 Tech':       'technology',
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function News() {
  const [section,  setSection]  = useState('📰 Top')
  const [articles, setArticles] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setArticles([])

    const params = new URLSearchParams({
      section:     SECTIONS[section],
      'show-fields': 'thumbnail,trailText,byline',
      'page-size':  15,
      'order-by':  'newest',
      'api-key':    GUARDIAN_KEY,
    })

    fetch(`${GUARDIAN}?${params}`)
      .then(r => r.json())
      .then(data => {
        if (data.response?.status === 'ok') {
          setArticles(data.response.results)
        } else {
          setError('Could not load news.')
        }
      })
      .catch(() => setError('Could not load news. Check your connection.'))
      .finally(() => setLoading(false))
  }, [section])

  return (
    <div className={styles.view}>
      <div className={styles.newsWrap}>
        <div className={styles.bigEmoji}>📰</div>
        <h2 className={styles.viewTitle}>Today's News</h2>
        <p className={styles.viewSub}>The Guardian · live headlines</p>

        <div className={styles.newsTabs}>
          {Object.keys(SECTIONS).map(s => (
            <button
              key={s}
              className={`${styles.newsTab} ${section === s ? styles.newsTabActive : ''}`}
              onClick={() => setSection(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {loading && <p className={styles.newsState}>Loading headlines… ✨</p>}
        {error   && <p className={styles.newsState} style={{ color: 'rgba(220,100,100,.7)' }}>{error}</p>}

        {!loading && !error && (
          <div className={styles.newsList}>
            {articles.map((a, i) => {
              const img  = a.fields?.thumbnail
              const desc = a.fields?.trailText?.replace(/<[^>]*>/g, '').slice(0, 110)
              return (
                <a
                  key={i}
                  href={a.webUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.newsCard}
                >
                  {img && <img src={img} alt="" className={styles.newsThumb} onError={e => e.target.style.display = 'none'} />}
                  <div className={styles.newsBody}>
                    <p className={styles.newsTitle}>{a.webTitle}</p>
                    {desc && <p className={styles.newsDesc}>{desc}…</p>}
                    <p className={styles.newsTime}>{timeAgo(a.webPublicationDate)} · The Guardian</p>
                  </div>
                  <span className={styles.newsArrow}>›</span>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
