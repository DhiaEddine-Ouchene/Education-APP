import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../utils/api';
import { X, Volume2, RotateCcw, Check, ArrowRight, Trophy, Sparkles, HelpCircle } from 'lucide-react';

/*
  EduMatch — unified GamePlayer  (Word Matcher inspired UI)
  ---------------------------------------------------------------------------
  Path: frontend/src/pages/GamePlayer.jsx

  Props (passed by App.jsx):
    setId   : string
    mode    : 'matching' | 'quiz' | 'flashcards' | 'type' | 'listen' | 'scramble'
              (dashboard aliases like 'listening' / 'typein' are accepted)
    onClose : () => void

  API contract (unchanged):
    api.get('/sets/:id') -> { title, source_lang, target_lang, words:[{id,term,translation,hint}] }
    api.post('/sets/:id/progress', { gameMode, score, totalWords })  (teachers -> 403, ignored)

  Visual language borrowed from the Word Matcher game:
    - Space Grotesk, deep teal arena (#0C1518)
    - Cyan accent (respects tenant brand via --primary-color), lime success (#A3E635)
    - Translucent glowing glass panels, 3D flip cards with "?" backs
  ---------------------------------------------------------------------------
*/

const SPEECH_LANG = {
  en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', pt: 'pt-PT',
  ar: 'ar-SA', nl: 'nl-NL', ru: 'ru-RU', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR',
  tr: 'tr-TR', hi: 'hi-IN', pl: 'pl-PL', sv: 'sv-SE',
};
const RTL = new Set(['ar', 'he', 'fa', 'ur']);
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const MODE_LABELS = {
  matching: 'Memory Match', quiz: 'Multiple Choice', flashcards: 'Flashcards',
  type: 'Type the Word', listen: 'Listening', scramble: 'Word Scramble',
};
// Accept alternative mode names used by the dashboards so every button works.
const MODE_ALIASES = {
  listening: 'listen', typein: 'type', 'type-in': 'type', spelling: 'scramble',
  memory: 'matching', match: 'matching', 'multiple-choice': 'quiz', mcq: 'quiz',
  flashcard: 'flashcards', cards: 'flashcards',
};
const normalizeMode = (m) => MODE_ALIASES[m] || m;

// ---- theme tokens (color-mix respects the tenant brand colour, like Word Matcher) ----
const ACCENT = 'var(--primary-color,#25D1F4)';
const GREEN = '#A3E635';
const glass = (t) => 'color-mix(in srgb, var(--primary-color,#25D1F4), transparent ' + t + '%)';
const glow = (t) => '0 8px 30px color-mix(in srgb, var(--primary-color,#25D1F4), transparent ' + t + '%)';

function speak(text, langCode) {
  try {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = SPEECH_LANG[langCode] || 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch (e) { /* ignore */ }
}

// dynamic style helpers (plain JS objects to avoid JSX double-brace issues)
const mergeWidth = (base, pct) => Object.assign({}, base, { width: pct + '%' });
const optStyle = (base, picked, isAnswer, isPicked) => {
  const s = Object.assign({}, base);
  if (picked) {
    if (isAnswer) { s.background = 'color-mix(in srgb,' + GREEN + ', transparent 80%)'; s.borderColor = GREEN; s.color = GREEN; }
    else if (isPicked) { s.background = 'rgba(239,68,68,.16)'; s.borderColor = '#ef4444'; s.color = '#fca5a5'; }
  }
  return s;
};

export default function GamePlayer({ setId, mode = 'flashcards', onClose }) {
  const gameMode = normalizeMode(mode);
  const [set, setSet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { score, total }
  const savedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get('/sets/' + setId)
      .then((data) => { if (alive) { setSet(data); setLoading(false); } })
      .catch((e) => { if (alive) { setError((e && e.message) || 'Could not load this set'); setLoading(false); } });
    return () => { alive = false; };
  }, [setId]);

  const words = useMemo(() => (set && set.words ? shuffle(set.words).slice(0, 12) : []), [set]);
  const targetLang = (set && set.target_lang) || 'es';
  const sourceLang = (set && set.source_lang) || 'en';
  const termDir = RTL.has(targetLang) ? 'rtl' : 'ltr';

  const finish = (finalScore, total) => {
    const t = typeof total === 'number' ? total : words.length;
    setResult({ score: finalScore, total: t });
    if (!savedRef.current) {
      savedRef.current = true;
      api.post('/sets/' + setId + '/progress', { gameMode: gameMode, score: finalScore, totalWords: t })
        .catch(() => {});
    }
  };
  const restart = () => { savedRef.current = false; setResult(null); setSet((s) => Object.assign({}, s)); };

  const Shell = ({ children }) => (
    <div style={st.overlay}>
      <div style={st.glowOrb} />
      <div style={st.topbar}>
        <div style={st.topLeft}>
          <span style={st.logoDot}><Sparkles size={16} /></span>
          <strong style={st.title}>{(set && set.title) || 'Loading…'}</strong>
          <span style={st.badge}>{MODE_LABELS[gameMode] || gameMode}</span>
        </div>
        <button onClick={onClose} style={st.closeBtn} aria-label="Close game"><X size={20} /></button>
      </div>
      <div style={st.stage}>{children}</div>
    </div>
  );

  if (loading) return <Shell><div style={st.center}><div style={st.spinner} /></div></Shell>;
  if (error) return <Shell><div style={st.center}><p style={st.errText}>{error}</p></div></Shell>;
  if (!words.length) return <Shell><div style={st.center}><p style={st.muted}>This set has no words yet. Add some words first.</p></div></Shell>;
  if (result) return <Shell><Results score={result.score} total={result.total} onRestart={restart} onClose={onClose} /></Shell>;

  const common = { words, targetLang, sourceLang, termDir, onFinish: finish };
  let Game;
  switch (gameMode) {
    case 'matching': Game = <MatchingGame {...common} />; break;
    case 'quiz': Game = <QuizGame {...common} />; break;
    case 'type': Game = <TypeGame {...common} />; break;
    case 'listen': Game = <ListenGame {...common} />; break;
    case 'scramble': Game = <ScrambleGame {...common} />; break;
    case 'flashcards':
    default: Game = <FlashcardsGame {...common} />; break;
  }
  return <Shell>{Game}</Shell>;
}

/* ============================ RESULTS ============================ */
function Results({ score, total, onRestart, onClose }) {
  const pct = total ? Math.round((score / total) * 100) : 0;
  const msg = pct >= 90 ? 'Outstanding! 🌟' : pct >= 70 ? 'Great job! 🎉' : pct >= 50 ? 'Good effort! 👍' : 'Keep practising! 💪';
  return (
    <div style={st.center}>
      <div style={st.resultCard}>
        <div style={st.trophyRing}><Trophy size={40} /></div>
        <div style={st.bigPct}>{pct}%</div>
        <p style={st.resultMsg}>{msg}</p>
        <p style={st.resultSub}>You scored {score} / {total}</p>
        <div style={st.resultBtns}>
          <button style={st.btnGhost} onClick={onRestart}><RotateCcw size={16} /> Play again</button>
          <button style={st.btnPrimary} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

function Progress({ i, total }) {
  const pct = total ? (i / total) * 100 : 0;
  return (
    <div style={st.progressWrap}>
      <div style={st.progressBar}><div style={mergeWidth(st.progressFill, pct)} /></div>
      <span style={st.progressLabel}>{i} / {total}</span>
    </div>
  );
}

/* ============================ FLASHCARDS ============================ */
function FlashcardsGame({ words, targetLang, termDir, onFinish }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const w = words[i];
  const next = (gotIt) => {
    const k = known + (gotIt ? 1 : 0);
    if (i + 1 >= words.length) return onFinish(k);
    setKnown(k); setFlipped(false); setI(i + 1);
  };
  const innerStyle = flipped ? st.flashInnerFlipped : st.flashInner;
  const termSpan = termDir === 'rtl' ? st.termRtl : st.term;
  return (
    <div style={st.col}>
      <Progress i={i} total={words.length} />
      <div style={st.flashPerspective} onClick={() => setFlipped((f) => !f)}>
        <div style={innerStyle}>
          <div style={st.flashFaceFront}>
            <span dir={termDir} style={termSpan}>{w.term}</span>
            <button style={st.speakMini} onClick={(e) => { e.stopPropagation(); speak(w.term, targetLang); }}><Volume2 size={18} /></button>
            <span style={st.tapHint}>tap to flip</span>
          </div>
          <div style={st.flashFaceBack}>
            <span style={st.backText}>{w.translation}</span>
            {w.hint ? <span style={st.backHint}>{w.hint}</span> : null}
          </div>
        </div>
      </div>
      <div style={st.rowBtns}>
        <button style={st.btnGhost} onClick={() => next(false)}>Still learning</button>
        <button style={st.btnPrimary} onClick={() => next(true)}><Check size={16} /> I knew it</button>
      </div>
    </div>
  );
}

/* ============================ QUIZ ============================ */
function QuizGame({ words, targetLang, termDir, onFinish }) {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);
  const w = words[i];
  const options = useMemo(() => {
    const distractors = shuffle(words.filter((x) => x.id !== w.id)).slice(0, 3).map((x) => x.translation);
    return shuffle([w.translation].concat(distractors));
  }, [i]);
  const choose = (opt) => {
    if (picked) return;
    setPicked(opt);
    const s = score + (opt === w.translation ? 1 : 0);
    setTimeout(() => {
      if (i + 1 >= words.length) return onFinish(s);
      setScore(s); setPicked(null); setI(i + 1);
    }, 850);
  };
  const termSpan = termDir === 'rtl' ? st.termRtl : st.term;
  return (
    <div style={st.col}>
      <Progress i={i} total={words.length} />
      <div style={st.promptCard}>
        <span style={st.promptLabel}>What does this mean?</span>
        <div style={st.termRow}>
          <span dir={termDir} style={termSpan}>{w.term}</span>
          <button style={st.speakMini} onClick={() => speak(w.term, targetLang)}><Volume2 size={18} /></button>
        </div>
      </div>
      <div style={st.optsGrid}>
        {options.map((opt) => (
          <button key={opt} onClick={() => choose(opt)} style={optStyle(st.opt, picked, opt === w.translation, opt === picked)}>{opt}</button>
        ))}
      </div>
    </div>
  );
}

/* ============================ TYPE ============================ */
function TypeGame({ words, targetLang, termDir, onFinish }) {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [val, setVal] = useState('');
  const [state, setState] = useState(null);
  const w = words[i];
  const norm = (s) => s.trim().toLowerCase().replace(/^(el|la|los|las|le|les|un|una|the)\s+/i, '');
  const submit = (e) => {
    e.preventDefault();
    if (state) return;
    const correct = norm(val) === norm(w.term);
    setState(correct ? 'ok' : 'no');
    const s = score + (correct ? 1 : 0);
    setTimeout(() => {
      if (i + 1 >= words.length) return onFinish(s);
      setScore(s); setVal(''); setState(null); setI(i + 1);
    }, 1100);
  };
  return (
    <div style={st.col}>
      <Progress i={i} total={words.length} />
      <div style={st.promptCard}>
        <span style={st.promptLabel}>Type the word for</span>
        <div style={st.bigPrompt}>{w.translation}</div>
        {w.hint ? <span style={st.promptLabel}>💡 {w.hint}</span> : null}
        <form onSubmit={submit} style={st.formCol}>
          <input autoFocus dir={termDir} value={val} onChange={(e) => setVal(e.target.value)} placeholder="Your answer…" style={st.input} />
          {state === 'no' ? <p style={st.feedbackNo}>Answer: <strong dir={termDir}>{w.term}</strong></p> : null}
          {state === 'ok' ? <p style={st.feedbackOk}>Correct! ✅</p> : null}
          <button type="submit" style={st.btnPrimary}>Check <ArrowRight size={16} /></button>
        </form>
      </div>
    </div>
  );
}

/* ============================ LISTEN ============================ */
function ListenGame({ words, targetLang, onFinish }) {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);
  const w = words[i];
  const options = useMemo(() => {
    const distractors = shuffle(words.filter((x) => x.id !== w.id)).slice(0, 3).map((x) => x.translation);
    return shuffle([w.translation].concat(distractors));
  }, [i]);
  useEffect(() => { const t = setTimeout(() => speak(w.term, targetLang), 350); return () => clearTimeout(t); }, [i]);
  const choose = (opt) => {
    if (picked) return;
    setPicked(opt);
    const s = score + (opt === w.translation ? 1 : 0);
    setTimeout(() => {
      if (i + 1 >= words.length) return onFinish(s);
      setScore(s); setPicked(null); setI(i + 1);
    }, 850);
  };
  return (
    <div style={st.col}>
      <Progress i={i} total={words.length} />
      <button onClick={() => speak(w.term, targetLang)} style={st.bigSpeaker}><Volume2 size={40} /></button>
      <span style={st.listenLabel}>Listen, then choose the meaning</span>
      <div style={st.optsGrid}>
        {options.map((opt) => (
          <button key={opt} onClick={() => choose(opt)} style={optStyle(st.opt, picked, opt === w.translation, opt === picked)}>{opt}</button>
        ))}
      </div>
    </div>
  );
}

/* ============================ SCRAMBLE ============================ */
function ScrambleGame({ words, targetLang, termDir, onFinish }) {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [val, setVal] = useState('');
  const [state, setState] = useState(null);
  const w = words[i];
  const scrambled = useMemo(() => {
    const letters = w.term.replace(/\s/g, '');
    let s = letters; let guard = 0;
    while (s === letters && guard++ < 10) s = shuffle(letters.split('')).join('');
    return s.toUpperCase();
  }, [i]);
  const submit = (e) => {
    e.preventDefault();
    if (state) return;
    const correct = val.trim().toLowerCase().replace(/\s/g, '') === w.term.toLowerCase().replace(/\s/g, '');
    setState(correct ? 'ok' : 'no');
    const s = score + (correct ? 1 : 0);
    setTimeout(() => {
      if (i + 1 >= words.length) return onFinish(s);
      setScore(s); setVal(''); setState(null); setI(i + 1);
    }, 1100);
  };
  return (
    <div style={st.col}>
      <Progress i={i} total={words.length} />
      <div style={st.promptCard}>
        <span style={st.promptLabel}>Unscramble — hint: {w.translation}</span>
        <div dir={termDir} style={st.scrambleText}>{scrambled}</div>
        <form onSubmit={submit} style={st.formCol}>
          <input autoFocus dir={termDir} value={val} onChange={(e) => setVal(e.target.value)} placeholder="Type the word…" style={st.input} />
          {state === 'no' ? <p style={st.feedbackNo}>Answer: <strong dir={termDir}>{w.term}</strong></p> : null}
          <button type="submit" style={st.btnPrimary}>Check <ArrowRight size={16} /></button>
        </form>
      </div>
    </div>
  );
}

/* ============================ MEMORY MATCH (Word Matcher style) ============================ */
function MatchingGame({ words, targetLang, termDir, onFinish }) {
  const pairWords = useMemo(() => words.slice(0, 6), [words]);
  const deck = useMemo(() => {
    const cards = [];
    pairWords.forEach((w) => {
      cards.push({ key: 't' + w.id, pairId: w.id, text: w.term, kind: 'term' });
      cards.push({ key: 'x' + w.id, pairId: w.id, text: w.translation, kind: 'trans' });
    });
    return shuffle(cards);
  }, [pairWords]);

  const [flipped, setFlipped] = useState([]); // keys currently face up (not matched)
  const [matched, setMatched] = useState([]); // matched pairIds
  const [wrong, setWrong] = useState([]); // keys briefly marked wrong
  const [lock, setLock] = useState(false);
  const [moves, setMoves] = useState(0);

  const isUp = (c) => flipped.indexOf(c.key) !== -1 || matched.indexOf(c.pairId) !== -1;
  const isDone = (c) => matched.indexOf(c.pairId) !== -1;

  const flip = (c) => {
    if (lock || isUp(c)) return;
    if (c.kind === 'term') speak(c.text, targetLang);
    const nextFlipped = flipped.concat(c.key);
    setFlipped(nextFlipped);
    if (nextFlipped.length < 2) return;
    setLock(true);
    setMoves((m) => m + 1);
    const [aKey, bKey] = nextFlipped;
    const a = deck.find((d) => d.key === aKey);
    const b = deck.find((d) => d.key === bKey);
    const win = a && b && a.pairId === b.pairId && a.kind !== b.kind;
    if (win) {
      const m = matched.concat(a.pairId);
      setTimeout(() => {
        setMatched(m); setFlipped([]); setLock(false);
        if (m.length === pairWords.length) setTimeout(() => onFinish(m.length, pairWords.length), 500);
      }, 450);
    } else {
      setWrong([aKey, bKey]);
      setTimeout(() => { setWrong([]); setFlipped([]); setLock(false); }, 750);
    }
  };

  return (
    <div style={st.col}>
      <Progress i={matched.length} total={pairWords.length} />
      <div style={st.memGrid}>
        {deck.map((c) => {
          const up = isUp(c);
          const done = isDone(c);
          const bad = wrong.indexOf(c.key) !== -1;
          const inner = up ? st.memInnerUp : st.memInner;
          return (
            <div key={c.key} style={st.memCell} onClick={() => flip(c)}>
              <div style={inner}>
                <div style={st.memBack}><HelpCircle size={26} style={st.qMark} /></div>
                <div style={memFaceStyle(done, bad)} dir={c.kind === 'term' ? termDir : 'ltr'}>{c.text}</div>
              </div>
            </div>
          );
        })}
      </div>
      <span style={st.muted}>Moves: {moves}</span>
    </div>
  );
}
const memFaceStyle = (done, bad) => {
  const s = Object.assign({}, st.memFace);
  if (done) { s.background = 'color-mix(in srgb,' + GREEN + ', transparent 78%)'; s.borderColor = GREEN; s.color = GREEN; s.boxShadow = '0 0 18px color-mix(in srgb,' + GREEN + ', transparent 55%)'; }
  else if (bad) { s.background = 'rgba(239,68,68,.16)'; s.borderColor = '#ef4444'; s.color = '#fca5a5'; }
  return s;
};

/* ============================ STYLES ============================ */
const FACE = { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 22, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', padding: 24, textAlign: 'center' };
const TERM = { fontSize: 32, fontWeight: 700, letterSpacing: '-.01em' };
const FONT = "'Space Grotesk','Plus Jakarta Sans',system-ui,sans-serif";
const OPT = { padding: '16px 18px', borderRadius: 16, border: '1px solid ' + glass(78), cursor: 'pointer', fontSize: 16, fontWeight: 600, color: '#e8fbff', background: glass(90), transition: 'all .12s', fontFamily: FONT };
const st = {
  overlay: { position: 'fixed', inset: 0, zIndex: 1000, background: 'radial-gradient(120% 90% at 50% -10%, #11313b 0%, #0C1518 60%)', display: 'flex', flexDirection: 'column', fontFamily: FONT, color: '#eafcff', overflow: 'hidden' },
  glowOrb: { position: 'absolute', top: -160, left: '50%', width: 520, height: 520, transform: 'translateX(-50%)', borderRadius: '50%', background: glass(82), filter: 'blur(80px)', pointerEvents: 'none' },
  topbar: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid ' + glass(82), background: 'rgba(10,22,25,.55)', backdropFilter: 'blur(10px)' },
  topLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  logoDot: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 9, color: '#06222b', background: ACCENT, boxShadow: glow(55) },
  title: { fontSize: 16, fontWeight: 700 },
  badge: { fontSize: 12, fontWeight: 600, padding: '4px 11px', borderRadius: 999, background: glass(86), color: ACCENT, border: '1px solid ' + glass(78) },
  closeBtn: { border: '1px solid ' + glass(80), background: glass(90), cursor: 'pointer', color: '#cdeaf2', padding: 8, borderRadius: 10, display: 'inline-flex' },
  stage: { position: 'relative', flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 1 },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' },
  muted: { color: '#8fb6c0', fontSize: 13 },
  col: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 660, gap: 4 },
  errText: { color: '#fca5a5' },
  rowBtns: { display: 'flex', gap: 12, marginTop: 26 },
  progressWrap: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 560, marginBottom: 26 },
  progressBar: { flex: 1, height: 9, borderRadius: 999, background: 'rgba(50,68,97,.5)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,' + ACCENT + ',' + GREEN + ')', transition: 'width .35s ease', boxShadow: glow(55) },
  progressLabel: { fontSize: 13, color: '#9fc4ce', whiteSpace: 'nowrap', fontWeight: 600 },
  flashPerspective: { perspective: 1200, width: '100%', maxWidth: 470, cursor: 'pointer' },
  flashInner: { position: 'relative', height: 270, transition: 'transform .55s', transformStyle: 'preserve-3d' },
  flashInnerFlipped: { position: 'relative', height: 270, transition: 'transform .55s', transformStyle: 'preserve-3d', transform: 'rotateY(180deg)' },
  flashFaceFront: Object.assign({}, FACE, { background: glass(88), border: '1px solid ' + glass(78), boxShadow: glow(72) }),
  flashFaceBack: Object.assign({}, FACE, { background: 'linear-gradient(140deg,' + ACCENT + ', color-mix(in srgb,' + ACCENT + ', #0C1518 35%))', color: '#06222b', transform: 'rotateY(180deg)', boxShadow: glow(60) }),
  term: Object.assign({}, TERM, { color: '#eafcff' }),
  termRtl: Object.assign({}, TERM, { fontFamily: "'Noto Naskh Arabic','Space Grotesk',serif", fontSize: 36, color: '#eafcff' }),
  backText: { fontSize: 28, fontWeight: 800 },
  backHint: { fontSize: 14, opacity: 0.85, marginTop: 10 },
  tapHint: { position: 'absolute', bottom: 14, fontSize: 12, color: '#8fb6c0' },
  speakMini: { border: '1px solid ' + glass(78), background: glass(86), color: ACCENT, borderRadius: 12, padding: 9, cursor: 'pointer', display: 'inline-flex', marginTop: 14 },
  promptCard: { background: glass(88), border: '1px solid ' + glass(78), borderRadius: 22, padding: 28, boxShadow: glow(74), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%', maxWidth: 470, marginBottom: 22 },
  promptLabel: { fontSize: 14, color: '#9fc4ce' },
  termRow: { display: 'flex', alignItems: 'center', gap: 12 },
  bigPrompt: { fontSize: 30, fontWeight: 800, color: '#eafcff' },
  formCol: { display: 'flex', flexDirection: 'column', gap: 14, width: '100%', alignItems: 'center' },
  input: { width: '100%', padding: '14px 16px', borderRadius: 14, border: '1px solid ' + glass(76), fontSize: 18, textAlign: 'center', outline: 'none', background: 'rgba(8,20,25,.6)', color: '#eafcff', fontFamily: FONT },
  feedbackNo: { color: '#fca5a5', fontSize: 14 },
  feedbackOk: { color: GREEN, fontSize: 14 },
  optsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, width: '100%', maxWidth: 560 },
  opt: OPT,
  listenLabel: { fontSize: 15, color: '#9fc4ce', margin: '20px 0' },
  bigSpeaker: { width: 104, height: 104, borderRadius: '50%', border: 'none', cursor: 'pointer', color: '#06222b', background: 'linear-gradient(140deg,' + ACCENT + ',' + GREEN + ')', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: glow(45) },
  scrambleText: { fontSize: 34, fontWeight: 800, letterSpacing: '.35em', padding: '6px 0', color: ACCENT },
  memGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, width: '100%', maxWidth: 600 },
  memCell: { perspective: 700, height: '11ch', cursor: 'pointer' },
  memInner: { position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', transition: 'transform .4s' },
  memInnerUp: { position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', transition: 'transform .4s', transform: 'rotateY(180deg)' },
  memBack: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16, background: glass(84), border: '1px solid ' + glass(72), backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', boxShadow: glow(80) },
  qMark: { color: ACCENT, opacity: 0.8 },
  memFace: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16, background: 'rgba(8,20,25,.85)', border: '1px solid ' + glass(60), color: '#eafcff', fontWeight: 700, fontSize: 14, padding: 8, textAlign: 'center', transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' },
  resultCard: { background: glass(88), border: '1px solid ' + glass(76), borderRadius: 24, padding: 40, textAlign: 'center', maxWidth: 430, boxShadow: glow(70) },
  trophyRing: { width: 78, height: 78, borderRadius: '50%', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06222b', background: 'linear-gradient(140deg,' + ACCENT + ',' + GREEN + ')', boxShadow: glow(50) },
  bigPct: { fontSize: 60, fontWeight: 800, lineHeight: 1, background: 'linear-gradient(120deg,' + ACCENT + ',' + GREEN + ')', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' },
  resultMsg: { fontSize: 18, fontWeight: 700, margin: '12px 0 2px', color: '#eafcff' },
  resultSub: { color: '#9fc4ce', marginBottom: 24 },
  resultBtns: { display: 'flex', gap: 10, justifyContent: 'center' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 999, border: 'none', cursor: 'pointer', fontWeight: 700, color: '#06222b', fontFamily: FONT, background: 'linear-gradient(120deg,' + ACCENT + ',' + GREEN + ')', boxShadow: glow(60) },
  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 999, cursor: 'pointer', fontWeight: 700, color: '#eafcff', fontFamily: FONT, background: glass(90), border: '1px solid ' + glass(76) },
  spinner: { width: 44, height: 44, border: '4px solid ' + glass(70), borderTopColor: ACCENT, borderRadius: '50%', animation: 'spin 1s linear infinite' },
};
