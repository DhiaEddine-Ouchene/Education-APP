// EduMatch game engine — 6 modes. Exposed as window.Games.
(function () {
  const SPEECH = { en:'en-US',fr:'fr-FR',es:'es-ES',de:'de-DE',it:'it-IT',pt:'pt-PT',ar:'ar-SA',nl:'nl-NL',ru:'ru-RU',zh:'zh-CN',ja:'ja-JP',ko:'ko-KR',tr:'tr-TR',hi:'hi-IN',pl:'pl-PL',sv:'sv-SE' }
  const RTL = ['ar']
  const esc = (s) => (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))
  const dir = (l) => RTL.includes(l) ? 'rtl' : 'ltr'
  const shuffle = (a) => { a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a }
  function speak(text, lang){ if(!('speechSynthesis'in window))return; try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=SPEECH[lang]||'en-US';u.rate=.9;speechSynthesis.speak(u)}catch(e){} }
  window.eduSpeak = speak

  const MODES = [
    { id:'memory', ico:'🃏', name:'Memory Match', desc:'Flip & match term to translation' },
    { id:'quiz', ico:'❓', name:'Multiple Choice', desc:'Pick the right translation' },
    { id:'flash', ico:'📚', name:'Flashcards', desc:'Flip cards & self-check' },
    { id:'type', ico:'⌨️', name:'Type It', desc:'Type the translation' },
    { id:'listen', ico:'🔊', name:'Listening', desc:'Hear it, choose the word' },
    { id:'scramble', ico:'🔀', name:'Word Scramble', desc:'Unscramble the letters' },
  ]

  // host = element, set = {name, icon, fromLang, toLang, words:[{term,answer,hint}]}
  // onFinish(resultObj)
  function play(host, set, mode, onFinish) {
    const FROM = set.fromLang, TO = set.toLang
    let G = { score:0, idx:0, total:0, right:0, t0:Date.now(), timer:null, locked:false }
    host.innerHTML = `
      <div class="hud">
        <button class="btn ghost sm" id="g-quit">← Quit</button>
        <div class="row">
          <div class="stat2"><b id="g-score">0</b><span>Score</span></div>
          <div class="stat2"><b id="g-prog">0/0</b><span>Progress</span></div>
          <div class="stat2"><b id="g-time">0:00</b><span>Time</span></div>
        </div>
      </div>
      <div class="progress"><div id="g-bar"></div></div>
      <div id="g-area"></div>`
    const $ = (id) => host.querySelector(id)
    $('#g-quit').onclick = () => { stop(); onFinish && onFinish(null) }
    G.timer = setInterval(updTime, 500)
    function updTime(){ const s=Math.floor((Date.now()-G.t0)/1000); $('#g-time').textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0') }
    function stop(){ clearInterval(G.timer); try{speechSynthesis.cancel()}catch(e){} }
    function bar(p){ $('#g-bar').style.width=(p*100)+'%' }
    function prog(a,b){ $('#g-prog').textContent=a+'/'+b; bar(b?a/b:0) }
    function addScore(n){ G.score+=n; $('#g-score').textContent=G.score }
    const spk=(t,l)=>`<button class="speaker" data-spk="${esc(t).replace(/"/g,'')}" data-lang="${l}">🔊</button>`
    host.addEventListener('click',(e)=>{const b=e.target.closest('[data-spk]');if(b){e.stopPropagation();speak(b.getAttribute('data-spk'),b.getAttribute('data-lang'))}})

    const area = $('#g-area')
    if (mode==='memory') initMemory(); else if (mode==='flash') initFlash(); else initSeq()

    function finish(detail){
      stop()
      const secs=Math.floor((Date.now()-G.t0)/1000)
      area.innerHTML=`<div class="card result center">
        <div style="font-size:40px">🎉</div><h2 style="margin:6px 0">Well done!</h2>
        <div class="score text-grad">${G.score}</div>
        <p class="muted">${detail?esc(detail)+' · ':''}Time ${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}</p>
        <div class="row" style="justify-content:center;margin-top:16px">
          <button class="btn" id="g-again">🔁 Play again</button>
          <button class="btn secondary" id="g-done">Done</button></div></div>`
      bar(1)
      area.querySelector('#g-again').onclick=()=>play(host,set,mode,onFinish)
      area.querySelector('#g-done').onclick=()=>onFinish&&onFinish(res())
      onFinish && onFinish(res(), true) // report result silently for saving
      function noop(){}
    }
    function res(){ return { setId:set.id, mode, score:G.score, total:G.total, correct:G.right, durationS:Math.floor((Date.now()-G.t0)/1000) } }

    /* MEMORY */
    function initMemory(){
      const items=shuffle(set.words).slice(0,8); const cards=[]
      items.forEach((it,i)=>{cards.push({pair:i,txt:it.term,lang:FROM});cards.push({pair:i,txt:it.answer,lang:TO})})
      const C=shuffle(cards); let first=null,matched=0; G.total=items.length
      const cols=Math.min(4,Math.ceil(Math.sqrt(C.length)))
      area.innerHTML=`<div class="mem-grid" style="grid-template-columns:repeat(${cols},1fr)">`+
        C.map((c,i)=>`<div class="mem-card" data-i="${i}"><div class="mem-inner"><div class="mem-face mem-front">?</div><div class="mem-face mem-back" dir="${dir(c.lang)}">${esc(c.txt)}</div></div></div>`).join('')+`</div>`
      prog(0,G.total)
      area.querySelectorAll('.mem-card').forEach(el=>el.onclick=()=>flip(+el.dataset.i,el))
      function flip(i,el){ if(G.locked||C[i].done||first===i)return; el.classList.add('flip'); speak(C[i].txt,C[i].lang)
        if(first===null){first=i;return}
        G.locked=true; const f=C[first], fe=area.querySelector(`.mem-card[data-i="${first}"]`)
        if(f.pair===C[i].pair){ C[i].done=f.done=true; matched++; addScore(100)
          setTimeout(()=>{fe.classList.add('matched');el.classList.add('matched');first=null;G.locked=false;prog(matched,G.total); if(matched===G.total)finish()},420)
        } else { setTimeout(()=>{el.classList.remove('flip');fe.classList.remove('flip');first=null;G.locked=false},800) } }
    }
    /* FLASH */
    function initFlash(){ const deck=shuffle(set.words); G.idx=0; G.total=deck.length
      render()
      function render(){ const it=deck[G.idx]; prog(G.idx,G.total)
        area.innerHTML=`<div class="flash" id="fl"><div class="flash-inner">
          <div class="flash-face flash-front" dir="${dir(FROM)}">${esc(it.term)} ${spk(it.term,FROM)}</div>
          <div class="flash-face flash-back" dir="${dir(TO)}">${esc(it.answer)}${it.hint?'<div style="font-size:15px;opacity:.85;margin-top:8px">'+esc(it.hint)+'</div>':''}</div></div></div>
          <p class="center muted" style="margin:14px 0">Tap to flip · did you know it?</p>
          <div class="opts"><button class="btn bad" id="fl-no">✗ Still learning</button><button class="btn good" id="fl-yes">✓ I knew it</button></div>`
        area.querySelector('#fl').onclick=()=>area.querySelector('#fl').classList.toggle('flip')
        area.querySelector('#fl-yes').onclick=()=>next(true); area.querySelector('#fl-no').onclick=()=>next(false) }
      function next(ok){ if(ok){G.right++;addScore(50)} G.idx++; if(G.idx>=G.total){finish(G.right+'/'+G.total+' known')}else render() }
    }
    /* SEQUENTIAL */
    function initSeq(){ const deck=shuffle(set.words); G.idx=0; G.total=deck.length; render()
      function render(){ if(G.idx>=G.total){finish(G.right+'/'+G.total+' correct');return} prog(G.idx,G.total); G.locked=false
        const it=deck[G.idx]
        if(mode==='quiz'||mode==='listen'){
          const wrong=shuffle(set.words.filter(x=>x.answer!==it.answer)).slice(0,3)
          const opts=shuffle([it,...wrong])
          const head = mode==='listen' ? `<button class="btn" id="sp">🔊 Play word</button><div class="sub">Listen & choose the translation</div>`
            : `<div class="big" dir="${dir(FROM)}">${esc(it.term)} ${spk(it.term,FROM)}</div><div class="sub">Choose the translation</div>`
          area.innerHTML=`<div class="prompt-box">${head}</div><div class="opts">${opts.map(o=>`<div class="opt" dir="${dir(TO)}" data-c="${o.answer===it.answer?1:0}">${esc(o.answer)}</div>`).join('')}</div><div class="feedback" id="fb"></div>`
          if(mode==='listen'){ const s=()=>speak(it.term,FROM); area.querySelector('#sp').onclick=s; setTimeout(s,250) }
          area.querySelectorAll('.opt').forEach(o=>o.onclick=()=>choose(o,o.dataset.c==='1',it))
        } else {
          const head = mode==='scramble'
            ? `<div class="sub">Translation of</div><div class="big" dir="${dir(FROM)}">${esc(it.term)} ${spk(it.term,FROM)}</div><div class="sub" style="font-size:24px;letter-spacing:6px;margin-top:12px" dir="${dir(TO)}">${esc(shuffle(it.answer.replace(/\s/g,'').split('')).join(' '))}</div>`
            : `<div class="big" dir="${dir(FROM)}">${esc(it.term)} ${spk(it.term,FROM)}</div><div class="sub">Type the translation</div>`
          area.innerHTML=`<div class="prompt-box">${head}</div><input id="ans" dir="${dir(TO)}" placeholder="Type & press Enter" autocomplete="off"/><div class="row" style="margin-top:12px"><button class="btn" id="chk" style="flex:1">Check</button><button class="btn ghost" id="skip">Skip</button></div><div class="feedback" id="fb"></div>`
          const inp=area.querySelector('#ans'); inp.focus(); inp.onkeydown=(e)=>{if(e.key==='Enter')check(false)}
          area.querySelector('#chk').onclick=()=>check(false); area.querySelector('#skip').onclick=()=>check(true)
          function check(skip){ if(G.locked)return; const ok=!skip&&inp.value.trim().toLowerCase()===it.answer.trim().toLowerCase(); done(ok,it) }
        }
        function choose(el,ok,it){ if(G.locked)return; G.locked=true
          area.querySelectorAll('.opt').forEach(o=>{o.classList.add('dim'); if(o.dataset.c==='1'){o.classList.remove('dim');o.classList.add('correct')}})
          if(!ok)el.classList.add('wrong'); done(ok,it,true) }
        function done(ok,it){ G.locked=true; const fb=area.querySelector('#fb')
          if(ok){addScore(100);G.right++; if(fb){fb.className='feedback ok';fb.textContent='Correct! +100'}}
          else if(fb){fb.className='feedback no';fb.textContent='Answer: '+it.answer}
          speak(it.answer,TO); setTimeout(()=>{G.idx++;render()},1050) }
      }
    }
  }

  window.Games = { MODES, play, speak }
})()
