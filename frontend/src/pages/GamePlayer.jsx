import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../utils/api';
import { X, Volume2, RotateCcw, Check, ArrowRight, Trophy, Sparkles } from 'lucide-react';

/*
  EduMatch — unified GamePlayer
  ---------------------------------------------------------------------------
  Drop this file in: frontend/src/pages/GamePlayer.jsx  (replaces the old one)

  Props (already passed by your App.jsx):
    setId   : string  -> the word_set id to play
    mode    : 'matching' | 'quiz' | 'flashcards' | 'type' | 'listen' | 'scramble'
    onClose : () => void

  Uses your existing API contract:
    api.get('/sets/:id')                              -> { ...set, words:[{id,term,translation,hint}], source_lang, target_lang, title }
    api.post('/sets/:id/progress', {gameMode,score,totalWords})   (teachers get 403 -> ignored)
  And your theme CSS vars: --primary-color, --secondary-color, --text-main, --text-muted, --border-color
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

// dynamic style helpers (kept as plain JS objects to avoid JSX double-brace issues)
const mergeWidth = (base, pct) => Object.assign({}, base, { width: pct + '%' });
const optStyle = (base, picked, isAnswer, isPicked) => {
  const s = Object.assign({}, base);
  if (picked) {
    if (isAnswer) { s.background = 'rgba(34,197,94,.15)'; s.borderColor = '#22c55e'; }
    else if (isPicked) { s.background = 'rgba(239,68,68,.15)'; s.borderColor = '#ef4444'; }
  }
  return s;
};
const cellStyle = (base, isMatched, isSel, isWrong) => {
  const s = Object.assign({}, base);
  if (isMatched) { s.opacity = 0.35; s.cursor = 'default'; s.borderColor = '#22c55e'; }
  else if (isWrong) { s.background = 'rgba(239,68,68,.15)'; s.borderColor = '#ef4444'; }
  else if (isSel) { s.background = 'var(--primary-glow,rgba(79,70,229,.14))'; s.borderColor = 'var(--primary-color,#4F46E5)'; }
  s.cursor = isMatched ? 'default' : 'pointer';
  return s;
};

export default function GamePlayer({ setId, mode = 'flashcards', onClose }) {
  const [set, setSet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
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

  const finish = (finalScore) => {
    setScore(finalScore);
    setFinished(true);
    if (!savedRef.current) {
      savedRef.current = true;
      api.post('/sets/' + setId + '/progress', { gameMode: mode, score: finalScore, totalWords: words.length })
        .catch(() => {});
    }
  };
  const restart = () => { savedRef.current = false; setFinished(false); setScore(0); setSet((s) => Object.assign({}, s)); };

  const Shell = ({ children }) => (
    <div style={st.overlay}>
      <div style={st.topbar}>
        <div style={st.topLeft}>
          <Sparkles size={18} style={st.sparkle} />
          <strong style={st.title}>{(set && set.title) || 'Loading…'}</strong>
          <span style={st.badge}>{MODE_LABELS[mode] || mode}</span>
        </div>
        <button onClick={onClose} style={st.closeBtn} aria-label="Close game"><X size={20} /></button>
      </div>
      <div style={st.stage}>{children}</div>
    </div>
  );

  if (loading) return <Shell><div style={st.center}><div style={st.spinner} /></div></Shell>;
  if (error) return <Shell><div style={st.center}><p style={st.errText}>{error}</p></div></Shell>;
  if (!words.length) return <Shell><div style={st.center}><p>This set has no words yet. Add some words first.</p></div></Shell>;
  if (finished) return <Shell><Results score={score} total={words.length} onRestart={restart} onClose={onClose} /></Shell>;

  const common = { words, targetLang, sourceLang, termDir, onFinish: finish };
  let Game;
  switch (mode) {
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
  const pct = Math.round((score / total) * 100);
  const msg = pct >= 90 ? 'Outstanding! 🌟' : pct >= 70 ? 'Great job! 🎉' : pct >= 50 ? 'Good effort! 👍' : 'Keep practising! 💪';
  return (
    <div style={st.center}>
      <div style={st.resultCard}>
        <Trophy size={56} style={st.trophy} />
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
  const pct = (i / total) * 100;
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

/* ============================ MATCHING ============================ */
function MatchingGame({ words, targetLang, termDir, onFinish }) {
  const pairWords = useMemo(() => words.slice(0, 6), [words]);
  const [terms] = useState(() => shuffle(pairWords.map((w) => ({ id: w.id, text: w.term, side: 'term' }))));
  const [trans] = useState(() => shuffle(pairWords.map((w) => ({ id: w.id, text: w.translation, side: 'trans' }))));
  const [sel, setSel] = useState(null);
  const [matched, setMatched] = useState([]);
  const [wrong, setWrong] = useState(null);

  const pick = (item) => {
    if (matched.indexOf(item.id) !== -1) return;
    if (item.side === 'term') speak(item.text, targetLang);
    if (!sel) { setSel(item); return; }
    if (sel.side === item.side) { setSel(item); return; }
    if (sel.id === item.id) {
      const m = matched.concat(item.id);
      setMatched(m); setSel(null);
      if (m.length === pairWords.length) setTimeout(() => onFinish(m.length), 400);
    } else {
      setWrong(item.id);
      setTimeout(() => { setWrong(null); setSel(null); }, 600);
    }
  };

  const renderCell = (item, col) => {
    const isMatched = matched.indexOf(item.id) !== -1;
    const isSel = sel && sel.side === col && sel.id === item.id && !isMatched;
    const isWrong = wrong === item.id && sel && sel.side !== col;
    return (
      <button key={col + item.id} onClick={() => pick(item)} disabled={isMatched}
        dir={col === 'term' ? termDir : 'ltr'} style={cellStyle(st.matchCell, isMatched, isSel, isWrong)}>
        {item.text}
      </button>
    );
  };
  return (
    <div style={st.col}>
      <Progress i={matched.length} total={pairWords.length} />
      <div style={st.matchGrid}>
        <div style={st.matchCol}>{terms.map((t) => renderCell(t, 'term'))}</div>
        <div style={st.matchCol}>{trans.map((t) => renderCell(t, 'trans'))}</div>
      </div>
    </div>
  );
}

/* ============================ STYLES ============================ */
const FACE = { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 20, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', padding: 24, textAlign: 'center' };
const TERM = { fontSize: 32, fontWeight: 800, letterSpacing: '-.01em' };
const OPT = { padding: '16px 18px', borderRadius: 14, border: '1px solid var(--border-color,#e2e8f0)', cursor: 'pointer', fontSize: 16, fontWeight: 600, color: 'inherit', background: 'var(--card-bg,#fff)', transition: 'transform .08s' };
const st = {
  overlay: { position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg-main,#f8fafc)', display: 'flex', flexDirection: 'column', fontFamily: "'Plus Jakarta Sans','Outfit',system-ui,sans-serif", color: 'var(--text-main,#0f172a)' },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-color,#e2e8f0)', background: 'var(--card-bg,#fff)' },
  topLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  sparkle: { color: 'var(--primary-color,#4F46E5)' },
  title: { fontSize: 16 },
  badge: { fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: 'var(--primary-glow,rgba(79,70,229,.12))', color: 'var(--primary-color,#4F46E5)' },
  closeBtn: { border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted,#64748b)', padding: 6, borderRadius: 8 },
  stage: { flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' },
  col: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 640 },
  errText: { color: '#ef4444' },
  rowBtns: { display: 'flex', gap: 12, marginTop: 26 },
  progressWrap: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 560, marginBottom: 24 },
  progressBar: { flex: 1, height: 8, borderRadius: 999, background: 'var(--border-color,#e2e8f0)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,var(--primary-color,#4F46E5),var(--secondary-color,#818CF8))', transition: 'width .3s' },
  progressLabel: { fontSize: 13, color: 'var(--text-muted,#64748b)', whiteSpace: 'nowrap' },
  flashPerspective: { perspective: 1200, width: '100%', maxWidth: 460, cursor: 'pointer' },
  flashInner: { position: 'relative', height: 260, transition: 'transform .5s', transformStyle: 'preserve-3d' },
  flashInnerFlipped: { position: 'relative', height: 260, transition: 'transform .5s', transformStyle: 'preserve-3d', transform: 'rotateY(180deg)' },
  flashFaceFront: Object.assign({}, FACE, { background: 'var(--card-bg,#fff)', border: '1px solid var(--border-color,#e2e8f0)', boxShadow: '0 10px 40px -16px rgba(0,0,0,.2)' }),
  flashFaceBack: Object.assign({}, FACE, { background: 'linear-gradient(135deg,var(--primary-color,#4F46E5),var(--secondary-color,#818CF8))', color: '#fff', transform: 'rotateY(180deg)' }),
  term: TERM,
  termRtl: Object.assign({}, TERM, { fontFamily: "'Noto Naskh Arabic','Plus Jakarta Sans',serif", fontSize: 36 }),
  backText: { fontSize: 28, fontWeight: 800 },
  backHint: { fontSize: 14, opacity: 0.85, marginTop: 10 },
  tapHint: { position: 'absolute', bottom: 12, fontSize: 12, opacity: 0.5 },
  speakMini: { border: 'none', background: 'var(--primary-glow,rgba(79,70,229,.12))', color: 'var(--primary-color,#4F46E5)', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'inline-flex' },
  promptCard: { background: 'var(--card-bg,#fff)', border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 18, padding: 26, boxShadow: '0 10px 40px -16px rgba(0,0,0,.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%', maxWidth: 460, marginBottom: 20 },
  promptLabel: { fontSize: 14, color: 'var(--text-muted,#64748b)' },
  termRow: { display: 'flex', alignItems: 'center', gap: 12 },
  bigPrompt: { fontSize: 30, fontWeight: 800 },
  formCol: { display: 'flex', flexDirection: 'column', gap: 14, width: '100%', alignItems: 'center' },
  input: { width: '100%', padding: '13px 15px', borderRadius: 12, border: '1px solid var(--border-color,#e2e8f0)', fontSize: 18, textAlign: 'center', outline: 'none', background: 'var(--bg-main,#f8fafc)', color: 'inherit' },
  feedbackNo: { color: '#ef4444', fontSize: 14 },
  feedbackOk: { color: '#22c55e', fontSize: 14 },
  optsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, width: '100%', maxWidth: 560 },
  opt: OPT,
  listenLabel: { fontSize: 15, color: 'var(--text-muted,#64748b)', margin: '18px 0' },
  bigSpeaker: { width: 96, height: 96, borderRadius: '50%', border: 'none', cursor: 'pointer', color: '#fff', background: 'linear-gradient(135deg,var(--primary-color,#4F46E5),var(--secondary-color,#818CF8))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 30px -10px var(--primary-color,#4F46E5)' },
  scrambleText: { fontSize: 34, fontWeight: 800, letterSpacing: '.35em', padding: '6px 0' },
  matchGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, width: '100%', maxWidth: 560 },
  matchCol: { display: 'flex', flexDirection: 'column', gap: 10 },
  matchCell: { padding: '15px 12px', borderRadius: 12, border: '1px solid var(--border-color,#e2e8f0)', background: 'var(--card-bg,#fff)', color: 'inherit', fontSize: 15, fontWeight: 600, transition: 'all .12s' },
  resultCard: { background: 'var(--card-bg,#fff)', border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 20, padding: 36, textAlign: 'center', maxWidth: 420, boxShadow: '0 10px 40px -16px rgba(0,0,0,.2)' },
  trophy: { color: 'var(--primary-color,#4F46E5)', margin: '0 auto 8px', display: 'block' },
  bigPct: { fontSize: 56, fontWeight: 800, lineHeight: 1, background: 'linear-gradient(120deg,var(--primary-color,#4F46E5),var(--secondary-color,#818CF8))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' },
  resultMsg: { fontSize: 18, fontWeight: 600, margin: '10px 0 2px' },
  resultSub: { color: 'var(--text-muted,#64748b)', marginBottom: 22 },
  resultBtns: { display: 'flex', gap: 10, justifyContent: 'center' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 999, border: 'none', cursor: 'pointer', fontWeight: 700, color: '#fff', background: 'linear-gradient(120deg,var(--primary-color,#4F46E5),var(--secondary-color,#818CF8))' },
  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 999, cursor: 'pointer', fontWeight: 700, color: 'var(--text-main,#0f172a)', background: 'transparent', border: '1px solid var(--border-color,#e2e8f0)' },
  spinner: { width: 40, height: 40, border: '4px solid var(--border-color,#e2e8f0)', borderTopColor: 'var(--primary-color,#4F46E5)', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};
