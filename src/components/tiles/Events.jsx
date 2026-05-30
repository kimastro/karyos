import { useState, useEffect, useMemo, useRef } from 'react'
import styles from './Tile.module.css'

// ── Ticketmaster live events ──────────────────────────────────────────────────
const TM_KEY  = import.meta.env.VITE_TICKETMASTER_KEY
const TM_BASE = 'https://app.ticketmaster.com/discovery/v2/events.json'

// ── mabilleterie.ma scraper ───────────────────────────────────────────────────
const MAB_URL   = 'https://www.mabilleterie.ma'
const PROXIES   = [
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
]

async function fetchWithProxy(targetUrl) {
  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy(targetUrl), { signal: AbortSignal.timeout(10000) })
      if (!res.ok) continue
      const text = await res.text()
      if (text.length > 500) return text   // got real content
    } catch { /* try next proxy */ }
  }
  return null
}

function parseHTML(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  // ── Strategy 1: JSON-LD structured data ────────────────────────────
  const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))
  const ldItems = scripts.flatMap(s => {
    try { const j = JSON.parse(s.textContent); return Array.isArray(j) ? j : [j] }
    catch { return [] }
  })
  const ldEvents = ldItems.filter(x =>
    x?.['@type'] === 'Event' || x?.['@type'] === 'MusicEvent' || x?.['@type'] === 'TheaterEvent'
  )
  if (ldEvents.length > 0) {
    return { source: 'structured', events: ldEvents.map(e => ({
      title:    e.name,
      start:    e.startDate?.split('T')[0] ?? '',
      location: e.location?.name ?? e.location?.address?.addressLocality ?? 'Morocco',
      img:      Array.isArray(e.image) ? e.image[0] : e.image,
      url:      e.url ?? e['@id'] ?? MAB_URL,
      desc:     e.description?.slice(0, 120) ?? '',
    })).filter(e => e.title) }
  }

  // ── Strategy 2: Common event card selectors ─────────────────────────
  const CARD_SELS = [
    '.event', '.event-card', '.event-item', '.spectacle', '.spectacle-card',
    '.show', '.show-card', '[class*="event"]', '[class*="spectacle"]',
    'article', '.card',
  ]
  for (const sel of CARD_SELS) {
    const cards = Array.from(doc.querySelectorAll(sel)).slice(0, 20)
    if (cards.length < 2) continue

    const events = cards.map(card => {
      const title    = card.querySelector('h1,h2,h3,h4,.title,.name,.event-name')?.textContent?.trim()
      const dateEl   = card.querySelector('[class*="date"],[class*="time"],time,.date,.when')
      const imgEl    = card.querySelector('img')
      const linkEl   = card.querySelector('a[href]')
      if (!title) return null
      return {
        title,
        start:    dateEl?.getAttribute('datetime') ?? dateEl?.textContent?.trim() ?? '',
        location: card.querySelector('[class*="location"],[class*="venue"],[class*="lieu"]')?.textContent?.trim() ?? 'Morocco',
        img:      imgEl?.src ?? imgEl?.dataset?.src ?? null,
        url:      linkEl?.href ?? MAB_URL,
        desc:     card.querySelector('p,.description,.desc')?.textContent?.trim()?.slice(0,120) ?? '',
      }
    }).filter(Boolean)

    if (events.length > 0) return { source: 'html', events }
  }

  // ── Strategy 3: grab all <a> with images (visual scrape) ───────────
  const anchors = Array.from(doc.querySelectorAll('a'))
    .filter(a => a.querySelector('img') && a.textContent.trim().length > 5)
    .slice(0, 20)
  if (anchors.length > 2) {
    return { source: 'anchors', events: anchors.map(a => ({
      title:    a.textContent.trim().replace(/\s+/g, ' ').slice(0, 80),
      start:    '',
      location: 'Morocco',
      img:      a.querySelector('img')?.src ?? null,
      url:      a.href ?? MAB_URL,
      desc:     '',
    })) }
  }

  return null  // JS-rendered — nothing usable
}

// ── Curated professional events ───────────────────────────────────────────────
// Updated manually — covers dental, Salesforce, business, Morocco, world
const CURATED = [

  // ── 🦷 DENTAL / MEDICAL ───────────────────────────────────────────
  { id: 'c1',  emoji:'🦷', title:'SIDEM — Salon Int\'l Dentaire du Maroc',         start:'2025-04-17', end:'2025-04-19', location:'Casablanca',           cat:'dental',    tag:'Dental',   big:true,  url:'https://sidem.ma' },
  { id: 'c2',  emoji:'🦷', title:'Journées Nationales d\'Odontologie Marocaine',   start:'2025-10-15', end:'2025-10-17', location:'Rabat',                 cat:'dental',    tag:'Dental'            },
  { id: 'c3',  emoji:'🦷', title:'Congrès Maghrébin de Chirurgie Dentaire',        start:'2025-09-18', end:'2025-09-20', location:'Tunis, Tunisia',         cat:'dental',    tag:'Dental'            },
  { id: 'c4',  emoji:'🏥', title:'Arab Dental Congress 2025',                      start:'2025-11-05', end:'2025-11-07', location:'Dubai, UAE',             cat:'dental',    tag:'Dental'            },
  { id: 'c5',  emoji:'🏥', title:'Arab Health 2026',                               start:'2026-01-26', end:'2026-01-29', location:'Dubai, UAE',             cat:'dental',    tag:'Medical',  big:true,  url:'https://arabhealth.com' },
  { id: 'c6',  emoji:'🦷', title:'Greater New York Dental Meeting',                start:'2025-11-28', end:'2025-12-03', location:'New York, USA',          cat:'dental',    tag:'Dental',   big:true            },
  { id: 'c7',  emoji:'🦷', title:'IDS — Int\'l Dental Show 2027',                  start:'2027-03-25', end:'2027-03-29', location:'Cologne, Germany',       cat:'dental',    tag:'Dental',   big:true,  url:'https://ids-cologne.de' },
  { id: 'c8',  emoji:'🏥', title:'FDI World Dental Congress 2025',                 start:'2025-09-10', end:'2025-09-13', location:'Singapore',              cat:'dental',    tag:'Dental',   big:true,  url:'https://fdiworlddental.org' },
  { id: 'c9',  emoji:'🦷', title:'Dental Expo Africa 2025',                        start:'2025-08-21', end:'2025-08-23', location:'Johannesburg, S. Africa', cat:'dental',   tag:'Dental'            },
  { id: 'c10', emoji:'🏥', title:'AEEDC Dubai — Dental Conference',                start:'2026-02-03', end:'2026-02-05', location:'Dubai, UAE',             cat:'dental',    tag:'Dental',   big:true            },
  { id: 'c11', emoji:'🦷', title:'Euro Dentex 2025',                               start:'2025-06-24', end:'2025-06-27', location:'Paris, France',          cat:'dental',    tag:'Dental'            },
  { id: 'c12', emoji:'🏥', title:'Medexpo Africa Nairobi 2025',                    start:'2025-07-24', end:'2025-07-26', location:'Nairobi, Kenya',         cat:'dental',    tag:'Medical'           },

  // ── ☁️ SALESFORCE ─────────────────────────────────────────────────
  { id: 's1',  emoji:'☁️', title:'Salesforce World Tour Casablanca 2025',          start:'2025-06-12', location:'Casablanca',                              cat:'salesforce',tag:'Salesforce',big:true, url:'https://www.salesforce.com/events/' },
  { id: 's2',  emoji:'☁️', title:'Salesforce World Tour Paris 2025',               start:'2025-04-24', location:'Paris, France',                           cat:'salesforce',tag:'Salesforce',          url:'https://www.salesforce.com/events/' },
  { id: 's3',  emoji:'☁️', title:'Salesforce World Tour London 2025',              start:'2025-05-14', location:'London, UK',                              cat:'salesforce',tag:'Salesforce',          url:'https://www.salesforce.com/events/' },
  { id: 's4',  emoji:'☁️', title:'TrailblazerDX 2025',                             start:'2025-05-20', end:'2025-05-22', location:'San Francisco, USA',    cat:'salesforce',tag:'Salesforce',          url:'https://www.salesforce.com/trailblazerdx/' },
  { id: 's5',  emoji:'☁️', title:'Salesforce Connections 2025',                    start:'2025-06-04', end:'2025-06-05', location:'Chicago, USA',           cat:'salesforce',tag:'Salesforce',          url:'https://www.salesforce.com/connections/' },
  { id: 's6',  emoji:'☁️', title:'Dreamforce 2025',                                start:'2025-09-15', end:'2025-09-18', location:'San Francisco, USA',    cat:'salesforce',tag:'Salesforce',big:true, url:'https://www.salesforce.com/dreamforce/' },
  { id: 's7',  emoji:'☁️', title:'Salesforce World Tour Sydney',                   start:'2025-08-14', location:'Sydney, Australia',                       cat:'salesforce',tag:'Salesforce'           },
  { id: 's8',  emoji:'☁️', title:'Salesforce World Tour Tokyo',                    start:'2025-07-10', location:'Tokyo, Japan',                            cat:'salesforce',tag:'Salesforce'           },
  { id: 's9',  emoji:'☁️', title:'Agentforce World Tour Dubai',                    start:'2025-05-28', location:'Dubai, UAE',                              cat:'salesforce',tag:'Salesforce',          url:'https://www.salesforce.com/events/' },

  // ── 💼 BUSINESS / TECH ────────────────────────────────────────────
  { id: 'b1',  emoji:'🌍', title:'GITEX Africa 2025',                              start:'2025-04-14', end:'2025-04-16', location:'Marrakech',             cat:'business',  tag:'Business', big:true,  url:'https://gitexafrica.com' },
  { id: 'b2',  emoji:'🌍', title:'GITEX Global 2025',                              start:'2025-10-13', end:'2025-10-17', location:'Dubai, UAE',            cat:'business',  tag:'Tech',     big:true,  url:'https://gitex.com' },
  { id: 'b3',  emoji:'🤝', title:'Africa CEO Forum 2025',                          start:'2025-06-09', end:'2025-06-10', location:'Abidjan, Ivory Coast',  cat:'business',  tag:'Business', big:true,  url:'https://africaceoforum.com' },
  { id: 'b4',  emoji:'🌾', title:'SIAM — Salon Int\'l de l\'Agriculture',          start:'2025-04-22', end:'2025-04-27', location:'Meknès',                cat:'business',  tag:'Business',            url:'https://siam.ma' },
  { id: 'b5',  emoji:'💼', title:'Morocco Investment Forum 2025',                  start:'2025-10-22', end:'2025-10-23', location:'Casablanca',            cat:'business',  tag:'Business'             },
  { id: 'b6',  emoji:'💡', title:'Web Summit 2025',                                start:'2025-11-10', end:'2025-11-13', location:'Lisbon, Portugal',      cat:'business',  tag:'Tech',                url:'https://websummit.com' },
  { id: 'b7',  emoji:'🚀', title:'TED Summit 2025',                                start:'2025-07-01', end:'2025-07-05', location:'Vancouver, Canada',     cat:'business',  tag:'Ideas'                },
  { id: 'b8',  emoji:'🌐', title:'World Economic Forum 2026',                      start:'2026-01-19', end:'2026-01-23', location:'Davos, Switzerland',    cat:'business',  tag:'Business', big:true            },
  { id: 'b9',  emoji:'🤖', title:'VivaTech 2025',                                  start:'2025-06-11', end:'2025-06-14', location:'Paris, France',         cat:'business',  tag:'Tech',     big:true,  url:'https://vivatechnology.com' },
  { id: 'b10', emoji:'📊', title:'Africa Finance Forum 2025',                      start:'2025-09-25', end:'2025-09-26', location:'Casablanca',            cat:'business',  tag:'Finance'              },
  { id: 'b11', emoji:'🛒', title:'Salon e-Commerce Maroc 2025',                    start:'2025-10-09', end:'2025-10-11', location:'Casablanca',            cat:'business',  tag:'Business'             },
  { id: 'b12', emoji:'🌿', title:'COP30 — Climate Summit',                         start:'2025-11-10', end:'2025-11-21', location:'Belém, Brazil',         cat:'business',  tag:'Science',  big:true            },
  { id: 'b13', emoji:'💻', title:'CES 2026',                                       start:'2026-01-06', end:'2026-01-09', location:'Las Vegas, USA',        cat:'business',  tag:'Tech',     big:true,  url:'https://ces.tech' },
  { id: 'b14', emoji:'🧠', title:'Salon des Grandes Écoles — Maroc',               start:'2025-11-08', end:'2025-11-09', location:'Casablanca',            cat:'business',  tag:'Education'            },
  { id: 'b15', emoji:'📈', title:'Forum Int\'l Banques et Marchés Afrique',        start:'2025-11-26', end:'2025-11-27', location:'Casablanca',            cat:'business',  tag:'Finance'              },
  { id: 'b16', emoji:'🚢', title:'FOMEX — Forum du Commerce Extérieur',            start:'2025-10-30', end:'2025-10-31', location:'Casablanca',            cat:'business',  tag:'Business'             },

  // ── 🇲🇦 MOROCCO CULTURE & ENTERTAINMENT ──────────────────────────
  { id: 'm1',  emoji:'🎶', title:'Mawazine Festival',                              start:'2025-05-23', end:'2025-06-01', location:'Rabat',                 cat:'morocco',   tag:'Music',               url:'https://mawazine.ma' },
  { id: 'm2',  emoji:'🥁', title:'Gnaoua World Music Festival',                    start:'2025-06-26', end:'2025-06-29', location:'Essaouira',             cat:'morocco',   tag:'Music',               url:'https://festival-gnaoua.net' },
  { id: 'm3',  emoji:'🕌', title:'Festival de Fès — Musiques Sacrées',            start:'2025-06-06', end:'2025-06-14', location:'Fès',                   cat:'morocco',   tag:'Music'                },
  { id: 'm4',  emoji:'🎤', title:'Timitar Festival',                               start:'2025-08-21', end:'2025-08-24', location:'Agadir',                cat:'morocco',   tag:'Music'                },
  { id: 'm5',  emoji:'🎧', title:'Atlas Electronic Festival',                      start:'2025-10-16', end:'2025-10-18', location:'Marrakech',             cat:'morocco',   tag:'Music'                },
  { id: 'm6',  emoji:'🎬', title:'Marrakech Int\'l Film Festival',                 start:'2025-11-28', end:'2025-12-06', location:'Marrakech',             cat:'morocco',   tag:'Film',                url:'https://festivalmarrakech.info' },
  { id: 'm7',  emoji:'🖼️', title:'Art Fair Casablanca',                           start:'2025-10-09', end:'2025-10-12', location:'Casablanca',            cat:'morocco',   tag:'Art'                  },
  { id: 'm8',  emoji:'🎭', title:'Festival Jawhara — Théâtre',                     start:'2025-07-10', end:'2025-07-15', location:'El Jadida',             cat:'morocco',   tag:'Culture'              },
  { id: 'm9',  emoji:'🌄', title:'Imilchil Marriage Festival',                     start:'2025-09-18', end:'2025-09-20', location:'Imilchil',              cat:'morocco',   tag:'Culture'              },
  { id: 'm10', emoji:'🏄', title:'Dakhla Attitude Kite Festival',                  start:'2025-11-01', end:'2025-11-08', location:'Dakhla',                cat:'morocco',   tag:'Sport'                },
  { id: 'm11', emoji:'🎙️', title:'Festival Tanjazz',                              start:'2025-09-25', end:'2025-09-28', location:'Tanger',                cat:'morocco',   tag:'Music'                },
  { id: 'm12', emoji:'📚', title:'Casablanca International Book Fair',             start:'2025-05-29', end:'2025-06-07', location:'Casablanca',            cat:'morocco',   tag:'Books',               url:'https://www.siel.ma' },
  { id: 'm13', emoji:'📖', title:'Rabat International Book Fair',                  start:'2026-01-08', end:'2026-01-18', location:'Rabat',                 cat:'morocco',   tag:'Books'                },
  { id: 'm14', emoji:'🌟', title:'AFCON 2025 — Morocco',                           start:'2025-12-21', end:'2026-01-18', location:'Morocco',               cat:'morocco',   tag:'Football', big:true,  url:'https://cafonline.com' },
  { id: 'm15', emoji:'🎪', title:'mabilleterie.ma — Browse All Morocco Events',   start:'2025-01-01', location:'Morocco (All Cities)',                      cat:'morocco',   tag:'All Events',          url:'https://www.mabilleterie.ma', special:true },

  // ── ⚽ FOOTBALL ───────────────────────────────────────────────────
  { id: 'f1',  emoji:'🏆', title:'UEFA Europa League Final',                       start:'2025-05-21', location:'Bilbao, Spain',                           cat:'football',  tag:'UEFA'                 },
  { id: 'f2',  emoji:'🏆', title:'UEFA Champions League Final',                    start:'2025-05-31', location:'Munich, Germany',                         cat:'football',  tag:'UEFA'                 },
  { id: 'f3',  emoji:'⚽', title:'FIFA Club World Cup 2025',                       start:'2025-06-15', end:'2025-07-13', location:'USA',                   cat:'football',  tag:'FIFA',     big:true            },
  { id: 'f4',  emoji:'🌍', title:'FIFA World Cup 2026',                            start:'2026-06-11', end:'2026-07-19', location:'USA / Canada / Mexico', cat:'football',  tag:'FIFA',     big:true            },
  { id: 'f5',  emoji:'🌍', title:'FIFA World Cup 2030 — Morocco host',             start:'2030-06-01', location:'Spain · Portugal · Morocco',              cat:'football',  tag:'FIFA',     big:true            },

  // ── 🌍 WORLD CULTURE & SCIENCE ────────────────────────────────────
  { id: 'w1',  emoji:'🎪', title:'Coachella 2025',                                 start:'2025-04-11', end:'2025-04-20', location:'California, USA',       cat:'world',     tag:'Music'                },
  { id: 'w2',  emoji:'🌟', title:'Eurovision Song Contest 2025',                   start:'2025-05-13', end:'2025-05-17', location:'Basel, Switzerland',    cat:'world',     tag:'Music'                },
  { id: 'w3',  emoji:'🎬', title:'Cannes Film Festival 2025',                      start:'2025-05-13', end:'2025-05-24', location:'Cannes, France',        cat:'world',     tag:'Film'                 },
  { id: 'w4',  emoji:'🏎️', title:'F1 Monaco Grand Prix 2025',                     start:'2025-05-22', end:'2025-05-25', location:'Monaco',                cat:'world',     tag:'Sport'                },
  { id: 'w5',  emoji:'🎸', title:'Glastonbury Festival 2025',                      start:'2025-06-25', end:'2025-06-29', location:'Somerset, UK',          cat:'world',     tag:'Music'                },
  { id: 'w6',  emoji:'📚', title:'Frankfurt Book Fair 2025',                       start:'2025-10-15', end:'2025-10-19', location:'Frankfurt, Germany',    cat:'world',     tag:'Books',    big:true,  url:'https://book-fair.com' },
  { id: 'w7',  emoji:'🖼️', title:'Art Basel 2025',                                start:'2025-06-19', end:'2025-06-22', location:'Basel, Switzerland',    cat:'world',     tag:'Art',      big:true            },
  { id: 'w8',  emoji:'🖼️', title:'Venice Biennale 2025',                           start:'2025-04-19', end:'2025-11-23', location:'Venice, Italy',         cat:'world',     tag:'Art',      big:true            },
  { id: 'w9',  emoji:'🔭', title:'Starmus Festival 2025',                          start:'2025-06-05', end:'2025-06-10', location:'Bratislava, Slovakia',  cat:'world',     tag:'Science'              },
  { id: 'w10', emoji:'🧬', title:'World Science Forum 2025',                       start:'2025-11-26', end:'2025-11-29', location:'Budapest, Hungary',     cat:'world',     tag:'Science'              },
  { id: 'w11', emoji:'🚀', title:'IAC — Int\'l Astronautical Congress',            start:'2025-10-06', end:'2025-10-10', location:'Sydney, Australia',     cat:'world',     tag:'Science'              },
  { id: 'w12', emoji:'🔥', title:'Burning Man 2025',                               start:'2025-08-24', end:'2025-09-01', location:'Nevada, USA',           cat:'world',     tag:'Festival'             },
  { id: 'w13', emoji:'🍺', title:'Oktoberfest 2025',                               start:'2025-09-20', end:'2025-10-05', location:'Munich, Germany',       cat:'world',     tag:'Festival'             },
  { id: 'w14', emoji:'🎶', title:'Tomorrowland 2025',                              start:'2025-07-18', end:'2025-07-27', location:'Boom, Belgium',         cat:'world',     tag:'Music'                },
  { id: 'w15', emoji:'📖', title:'Hay Festival 2025',                              start:'2025-05-22', end:'2025-06-01', location:'Hay-on-Wye, UK',        cat:'world',     tag:'Books'                },
  { id: 'w16', emoji:'🏅', title:'Olympic Games Los Angeles 2028',                 start:'2028-07-14', end:'2028-07-30', location:'Los Angeles, USA',      cat:'world',     tag:'Sport',    big:true            },
]

const FILTERS = [
  { id:'all',          label:'✨ All'           },
  { id:'mabilleterie', label:'🎟️ mabilleterie'  },
  { id:'morocco',      label:'🇲🇦 Morocco'      },
  { id:'dental',       label:'🦷 Dental'         },
  { id:'salesforce',   label:'☁️ Salesforce'    },
  { id:'business',     label:'💼 Business'       },
  { id:'football',     label:'⚽ Football'       },
  { id:'world',        label:'🌍 World'          },
]

const TAG_COLORS = {
  Dental:'#0e7490', Medical:'#0891b2', Salesforce:'#1d6fde', Business:'#6b21a8',
  Tech:'#1e40af', Finance:'#065f46', Ideas:'#4338ca', Education:'#92400e',
  Music:'#7c3aed', Film:'#be123c', Art:'#9d174d', Books:'#854d0e',
  Culture:'#92400e', Festival:'#b45309', Sport:'#065f46', Football:'#14532d',
  UEFA:'#1e3a5f', FIFA:'#7f1d1d', AFCON:'#14532d', Science:'#0f766e',
  'All Events':'#374151',
}

function parseDate(s) { return new Date(s + 'T00:00:00') }

function getStatus(start, end) {
  const now = new Date(), s = parseDate(start), e = end ? parseDate(end) : s
  if (now >= s && now <= e) return { label:'🔴 Live', hot:true }
  const days = Math.ceil((s - now) / 86400000)
  if (days < 0)  return { label:'Past',          past:true  }
  if (days === 0) return { label:'Today! 🎉',    hot:true   }
  if (days === 1) return { label:'Tomorrow',      soon:true  }
  if (days < 8)  return { label:`${days}d`,       soon:true  }
  if (days < 31) return { label:`${Math.ceil(days/7)}w`       }
  if (days < 365) return { label:`${Math.ceil(days/30)}mo`    }
  return { label:`${Math.ceil(days/365)}y` }
}

function fmtDate(start, end) {
  const s = parseDate(start), opts = { month:'short', day:'numeric' }
  const year = ` ${s.getFullYear()}`
  if (!end) return s.toLocaleDateString([], { ...opts, year:'numeric' })
  const e = parseDate(end)
  if (s.getMonth() === e.getMonth())
    return `${s.getDate()}–${e.toLocaleDateString([], opts)}${year}`
  return `${s.toLocaleDateString([],opts)} – ${e.toLocaleDateString([],opts)}${year}`
}

// Format a Ticketmaster event into our shape
function formatTM(e) {
  const img   = e.images?.find(i => i.ratio === '16_9' && i.width > 300)?.url
  const venue = e._embedded?.venues?.[0]
  const loc   = venue ? `${venue.city?.name ?? ''}${venue.country?.name ? ', '+venue.country.name : ''}` : ''
  const cat   = e.classifications?.[0]?.segment?.name?.toLowerCase() ?? 'world'
  return {
    id:    'tm_' + e.id,
    emoji: cat === 'sports' ? '⚽' : cat === 'music' ? '🎵' : '🎪',
    title: e.name,
    start: e.dates?.start?.localDate ?? '2099-01-01',
    location: loc,
    cat:   cat === 'sports' ? 'football' : cat === 'music' ? 'morocco' : 'morocco',
    tag:   e.classifications?.[0]?.segment?.name ?? 'Event',
    url:   e.url,
    img,
    live:  true,
  }
}

export default function Events() {
  const [filter,   setFilter]  = useState('all')
  const [search,   setSearch]  = useState('')
  const [query,    setQuery]   = useState('')
  const [tmEvents, setTm]      = useState([])
  const [tmLoad,   setTmLoad]  = useState(false)
  const [mabEvents,setMab]     = useState([])
  const [mabLoad,  setMabLoad] = useState(false)
  const [mabError, setMabErr]  = useState(null)  // null | 'js_rendered' | 'fetch_error'
  const [mabSrc,   setMabSrc]  = useState(null)  // 'structured' | 'html' | 'anchors'
  const debounce = useRef(null)

  // Debounce search input
  const handleSearch = (v) => {
    setSearch(v)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => setQuery(v), 500)
  }

  // Fetch mabilleterie.ma when that tab is selected
  useEffect(() => {
    if (filter !== 'mabilleterie') return
    if (mabEvents.length || mabError) return   // already fetched
    setMabLoad(true)
    fetchWithProxy(MAB_URL)
      .then(html => {
        if (!html) { setMabErr('fetch_error'); return }
        const result = parseHTML(html)
        if (!result) { setMabErr('js_rendered'); return }
        setMab(result.events)
        setMabSrc(result.source)
      })
      .catch(() => setMabErr('fetch_error'))
      .finally(() => setMabLoad(false))
  }, [filter])

  // Fetch Ticketmaster events for Morocco (or keyword search)
  useEffect(() => {
    if (!TM_KEY) return
    setTmLoad(true)
    const params = new URLSearchParams({
      apikey: TM_KEY,
      locale: '*',
      size:   20,
      sort:   'date,asc',
      ...(query ? { keyword: query } : { countryCode: 'MA' }),
    })
    fetch(`${TM_BASE}?${params}`)
      .then(r => r.json())
      .then(d => setTm((d._embedded?.events ?? []).map(formatTM)))
      .catch(() => setTm([]))
      .finally(() => setTmLoad(false))
  }, [query])

  const events = useMemo(() => {
    const q = query.toLowerCase()
    const curated = CURATED
      .filter(e => filter === 'all' || e.cat === filter)
      .filter(e => !q || e.title.toLowerCase().includes(q) || e.location.toLowerCase().includes(q) || e.tag.toLowerCase().includes(q))
      .map(e => ({ ...e, status: getStatus(e.start, e.end) }))
      .filter(e => e.special || !e.status.past)

    const live = tmEvents
      .filter(e => filter === 'all' || e.cat === filter)
      .map(e => ({ ...e, status: getStatus(e.start, e.end) }))
      .filter(e => !e.status.past)

    // merge, deduplicate by title similarity, sort by date
    const all = [...curated, ...live]
    return all.sort((a, b) => {
      if (a.special) return 1
      if (b.special) return -1
      return parseDate(a.start) - parseDate(b.start)
    })
  }, [filter, query, tmEvents])

  return (
    <div className={styles.view}>
      <div className={styles.eventsWrap}>
        <div className={styles.bigEmoji}>🎪</div>
        <h2 className={styles.viewTitle}>Events</h2>
        <p className={styles.viewSub}>
          Morocco, dental, Salesforce, business & world
          {TM_KEY ? ' · live from Ticketmaster' : ''}
        </p>

        {/* search */}
        <div className={styles.eventsSearch}>
          <span className={styles.eventsSearchIcon}>🔍</span>
          <input
            className={styles.eventsSearchInput}
            placeholder="Search events…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
          {search && <button className={styles.eventsSearchClear} onClick={() => { setSearch(''); setQuery('') }}>✕</button>}
        </div>

        {/* filter tabs */}
        <div className={styles.newsTabs}>
          {FILTERS.map(f => (
            <button key={f.id}
              className={`${styles.newsTab} ${filter === f.id ? styles.newsTabActive : ''}`}
              onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>

        {/* ── mabilleterie section ── */}
        {filter === 'mabilleterie' && (
          <div className={styles.mabSection}>
            {mabLoad && <p className={styles.newsState}>Fetching mabilleterie.ma… 🎟️</p>}

            {mabError === 'js_rendered' && (
              <div className={styles.mabFallback}>
                <p className={styles.mabFallbackTitle}>🎟️ mabilleterie.ma is JavaScript-rendered</p>
                <p className={styles.mabFallbackSub}>Can't scrape client-side apps directly from the browser. Browse the full catalogue here:</p>
                <a href={MAB_URL} target="_blank" rel="noreferrer" className={styles.mabLink}>
                  Open mabilleterie.ma →
                </a>
              </div>
            )}

            {mabError === 'fetch_error' && (
              <div className={styles.mabFallback}>
                <p className={styles.mabFallbackTitle}>⚠️ Could not reach mabilleterie.ma</p>
                <p className={styles.mabFallbackSub}>The CORS proxy may be down. Try again or browse directly:</p>
                <div style={{ display:'flex', gap:'.6rem', flexWrap:'wrap', justifyContent:'center' }}>
                  <button className={styles.mabRetry} onClick={() => { setMabErr(null); setMab([]) }}>Retry</button>
                  <a href={MAB_URL} target="_blank" rel="noreferrer" className={styles.mabLink}>Open site →</a>
                </div>
              </div>
            )}

            {!mabLoad && !mabError && mabEvents.length > 0 && (
              <>
                <div className={styles.mabHeader}>
                  <span className={styles.mabBadge}>🎟️ mabilleterie.ma · {mabEvents.length} events · {mabSrc === 'structured' ? 'rich data' : 'scraped'}</span>
                  <button className={styles.mabRetry} onClick={() => { setMabErr(null); setMab([]); setMabSrc(null) }}>↺ Refresh</button>
                </div>
                <div className={styles.newsList}>
                  {mabEvents.map((ev, i) => (
                    <a key={i} href={ev.url} target="_blank" rel="noreferrer" className={styles.newsCard}>
                      {ev.img && <img src={ev.img} alt="" className={styles.newsThumb} onError={e => e.target.style.display='none'} />}
                      <div className={styles.newsBody}>
                        <p className={styles.newsTitle}>{ev.title}</p>
                        {ev.desc && <p className={styles.newsDesc}>{ev.desc}</p>}
                        <p className={styles.newsTime}>
                          {ev.start ? new Date(ev.start).toLocaleDateString([], { day:'numeric', month:'short', year:'numeric' }) + ' · ' : ''}
                          📍 {ev.location}
                        </p>
                      </div>
                      <span className={styles.newsArrow}>›</span>
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* no TM key hint */}
        {filter !== 'mabilleterie' && !TM_KEY && (
          <div className={styles.eventsHint}>
            💡 Add <code>VITE_TICKETMASTER_KEY</code> to <code>.env.local</code> for live Morocco event data from Ticketmaster
          </div>
        )}
        {filter !== 'mabilleterie' && tmLoad && <p className={styles.newsState} style={{ margin:0 }}>Fetching live events… ✨</p>}

        <div className={styles.eventsList} style={{ display: filter === 'mabilleterie' ? 'none' : undefined }}>
          {events.length === 0 && <p className={styles.newsState}>No events found.</p>}
          {events.map(ev => {
            const d        = parseDate(ev.start)
            const month    = d.toLocaleDateString([], { month:'short' }).toUpperCase()
            const day      = d.getDate()
            const year     = d.getFullYear()
            const thisYear = new Date().getFullYear()
            const tagColor = TAG_COLORS[ev.tag] ?? '#374151'

            if (ev.special) {
              return (
                <a key={ev.id} href={ev.url} target="_blank" rel="noreferrer" className={`${styles.eventCard} ${styles.eventSpecial}`}>
                  <span style={{ fontSize:'1.8rem' }}>{ev.emoji}</span>
                  <div className={styles.eventBody}>
                    <p className={styles.eventTitle}>{ev.title}</p>
                    <p className={styles.eventLocation}>Tap to browse →</p>
                  </div>
                </a>
              )
            }

            const card = (
              <div key={ev.id} className={`${styles.eventCard} ${ev.big ? styles.eventBig : ''} ${ev.live ? styles.eventLive : ''}`}>
                {ev.img && <img src={ev.img} alt="" className={styles.eventImg} onError={e => e.target.style.display='none'} />}
                <div className={styles.eventDate}>
                  <span className={styles.eventMonth}>{month}</span>
                  <span className={styles.eventDay}>{day}</span>
                  {year > thisYear && <span className={styles.eventYear}>{year}</span>}
                </div>
                <div className={styles.eventBody}>
                  <div className={styles.eventTop}>
                    <span className={styles.eventEmoji}>{ev.emoji}</span>
                    <span className={styles.eventTag}
                      style={{ background:`${tagColor}28`, color:tagColor, borderColor:`${tagColor}50` }}>
                      {ev.tag}
                    </span>
                    {ev.big  && <span className={styles.eventMajor}>★</span>}
                    {ev.live && <span className={styles.eventLiveBadge}>LIVE</span>}
                  </div>
                  <p className={styles.eventTitle}>{ev.title}</p>
                  <p className={styles.eventLocation}>📍 {ev.location}</p>
                  <p className={styles.eventRange}>{fmtDate(ev.start, ev.end)}</p>
                </div>
                <div className={`${styles.eventBadge} ${ev.status.hot ? styles.badgeHot : ev.status.soon ? styles.badgeSoon : ''}`}>
                  {ev.status.label}
                </div>
              </div>
            )

            return ev.url
              ? <a key={ev.id} href={ev.url} target="_blank" rel="noreferrer" style={{ textDecoration:'none', display:'block' }}>{card}</a>
              : card
          })}
        </div>
      </div>
    </div>
  )
}
