// AI auto-fill of vocabulary sets.
// If OPENAI_API_KEY is set (and the host has network access), it calls OpenAI.
// Otherwise it falls back to a built-in offline generator so the feature always works in demos.

const FALLBACK = {
  food: [['apple','pomme'],['bread','pain'],['water','eau'],['cheese','fromage'],['coffee','café'],['milk','lait'],['egg','œuf'],['fish','poisson'],['rice','riz'],['meat','viande']],
  animals: [['dog','chien'],['cat','chat'],['bird','oiseau'],['horse','cheval'],['cow','vache'],['sheep','mouton'],['fish','poisson'],['lion','lion'],['bear','ours'],['rabbit','lapin']],
  travel: [['airport','aéroport'],['ticket','billet'],['hotel','hôtel'],['passport','passeport'],['luggage','bagage'],['map','carte'],['train','train'],['beach','plage'],['city','ville'],['road','route']],
  colors: [['red','rouge'],['blue','bleu'],['green','vert'],['yellow','jaune'],['black','noir'],['white','blanc'],['orange','orange'],['purple','violet'],['pink','rose'],['brown','marron']],
  verbs: [['to eat','manger'],['to drink','boire'],['to run','courir'],['to speak','parler'],['to write','écrire'],['to read','lire'],['to sleep','dormir'],['to buy','acheter'],['to see','voir'],['to go','aller']],
  family: [['mother','mère'],['father','père'],['sister','sœur'],['brother','frère'],['son','fils'],['daughter','fille'],['grandmother','grand-mère'],['grandfather','grand-père'],['uncle','oncle'],['aunt','tante']],
}

function fallbackGenerate(topic, count) {
  const key = Object.keys(FALLBACK).find((k) => (topic || '').toLowerCase().includes(k)) || 'food'
  const list = FALLBACK[key]
  const out = []
  for (let i = 0; i < count; i++) out.push({ term: list[i % list.length][0], answer: list[i % list.length][1], hint: '' })
  return out
}

export async function generateWords({ topic, count = 8, fromLang = 'en', toLang = 'fr' }) {
  count = Math.max(2, Math.min(30, Number(count) || 8))
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    return { source: 'offline-fallback', words: fallbackGenerate(topic, count) }
  }
  try {
    const prompt = `Generate ${count} vocabulary pairs for language learners about "${topic}". ` +
      `Term language: ${fromLang}. Answer language: ${toLang}. ` +
      `Return ONLY compact JSON: {"words":[{"term":"","answer":"","hint":""}]}.`
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.5,
      }),
    })
    const data = await r.json()
    const parsed = JSON.parse(data.choices[0].message.content)
    const words = (parsed.words || []).slice(0, count).map((w) => ({
      term: String(w.term || '').trim(),
      answer: String(w.answer || '').trim(),
      hint: String(w.hint || '').trim(),
    })).filter((w) => w.term && w.answer)
    return { source: 'openai', words: words.length ? words : fallbackGenerate(topic, count) }
  } catch (e) {
    return { source: 'offline-fallback', words: fallbackGenerate(topic, count), error: String(e.message) }
  }
}

// ---- Extract key vocabulary from a lesson and build word pairs ----
const STOP = new Set('the a an and or of to in on at for with is are was were be been being this that these those it its as by from into over under out up down then than so but if not no yes you your we our they their he she his her i me my mine ours yours them him us do does did has have had will would can could should may might must shall about after before between during without within while which who whom whose what when where why how all any both each few more most other some such only own same too very just also here there'.split(' '))

function flatDict() {
  const d = {}
  for (const k in FALLBACK) for (const [en, fr] of FALLBACK[k]) d[en.toLowerCase()] = fr
  return d
}

export async function extractWords({ text, count = 10, fromLang = 'en', toLang = 'fr' }) {
  count = Math.max(2, Math.min(30, Number(count) || 10))
  const key = process.env.OPENAI_API_KEY
  if (key) {
    try {
      const prompt = `From the lesson below, pick the ${count} most important vocabulary words for a ${fromLang}->${toLang} learner. ` +
        `Return ONLY JSON {"words":[{"term":"","answer":"","hint":""}]} where term is in ${fromLang} and answer is its ${toLang} translation.\n\nLESSON:\n${String(text).slice(0, 6000)}`
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.3 }),
      })
      const data = await r.json()
      const parsed = JSON.parse(data.choices[0].message.content)
      const words = (parsed.words || []).slice(0, count).map((w) => ({ term: String(w.term || '').trim(), answer: String(w.answer || '').trim(), hint: String(w.hint || '').trim() })).filter((w) => w.term)
      if (words.length) return { source: 'openai', words }
    } catch (e) { /* fall through to offline */ }
  }
  // Offline keyword extraction: rank by frequency + length, translate known words.
  const dict = flatDict()
  const freq = {}
  ;(String(text).toLowerCase().match(/[a-zA-Z\u00C0-\u017F']+/g) || []).forEach((w) => { if (w.length > 3 && !STOP.has(w)) freq[w] = (freq[w] || 0) + 1 })
  const ranked = Object.keys(freq).sort((a, b) => (freq[b] - freq[a]) || (b.length - a.length)).slice(0, count)
  const words = ranked.map((w) => ({ term: w, answer: dict[w] || '', hint: dict[w] ? '' : 'add translation' }))
  return { source: 'offline-fallback', words }
}
