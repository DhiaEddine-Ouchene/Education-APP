// EduMatch SPA — landing, auth, and 3 role interfaces (teacher/business, student, admin).
const App = (() => {
  const root = document.getElementById('app')
  let state = { token: localStorage.getItem('em_token') || null, user: null, org: null, route: 'home', data: {} }
  const LANGS = [['en','English'],['fr','French'],['es','Spanish'],['de','German'],['it','Italian'],['pt','Portuguese'],['ar','Arabic'],['nl','Dutch'],['ru','Russian'],['zh','Chinese'],['ja','Japanese'],['ko','Korean'],['tr','Turkish'],['hi','Hindi'],['pl','Polish'],['sv','Swedish']]
  const LMAP = Object.fromEntries(LANGS)
  const esc = (s) => (s==null?'':String(s)).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))
  const langOpts = (sel) => LANGS.map(([c,n])=>`<option value="${c}" ${c===sel?'selected':''}>${n}</option>`).join('')

  function toast(msg, err) { const t=document.getElementById('toast'); t.textContent=msg; t.className='toast show'+(err?' err':''); clearTimeout(t._t); t._t=setTimeout(()=>t.className='toast',2400) }

  async function api(path, { method='GET', body } = {}) {
    const headers = { 'Content-Type':'application/json' }
    if (state.token) headers['Authorization'] = 'Bearer '+state.token
    const r = await fetch('/api'+path, { method, headers, body: body?JSON.stringify(body):undefined })
    const data = await r.json().catch(()=>({}))
    if (!r.ok) throw new Error(data.error || 'Request failed')
    return data
  }

  function applyTheme(org) {
    const r = document.documentElement
    document.body.classList.toggle('light', org?.theme?.mode==='light')
    if (org?.theme?.primary) r.style.setProperty('--primary', org.theme.primary)
    if (org?.theme?.accent) r.style.setProperty('--accent', org.theme.accent)
  }
  function clearTheme(){ const r=document.documentElement; r.style.removeProperty('--primary'); r.style.removeProperty('--accent'); document.body.classList.remove('light') }

  async function boot() {
    if (state.token) {
      try { const me = await api('/me'); state.user=me.user; state.org=me.org; applyTheme(me.org); go(defaultRoute()) }
      catch { state.token=null; localStorage.removeItem('em_token'); go('home') }
    } else go('home')
  }
  function defaultRoute(){ return state.user?.role==='superadmin'?'admin': state.user?.role==='student'?'learn':'dash' }
  function logout(){ state.token=null;state.user=null;state.org=null;localStorage.removeItem('em_token');clearTheme();go('home') }

  function go(route, params) { state.route=route; state.params=params||{}; render() }

  /* ----------------------------- RENDER ----------------------------- */
  function render() {
    if (!state.user) return renderPublic()
    return renderShell()
  }

  /* ---- Public: landing + auth ---- */
  function renderPublic() {
    if (state.route==='login' || state.route==='register') return renderAuth()
    root.innerHTML = `
      <div class="row spread" style="padding:18px 26px;max-width:1100px;margin:0 auto">
        <div class="row" style="gap:10px"><div class="logo-badge grad">🎯</div><b style="font-size:20px">EduMatch</b></div>
        <div class="row"><button class="btn ghost" id="toLogin">Log in</button><button class="btn" id="toReg">Start free</button></div>
      </div>
      <section class="hero">
        <span class="badge">For language teachers &amp; schools</span>
        <h1>Turn vocabulary into <span class="text-grad">games students love</span></h1>
        <p>Create word sets in seconds (or let AI do it), brand the platform as your own, add your students, and track their progress — across 6 game modes.</p>
        <div class="row" style="justify-content:center"><button class="btn" id="toReg2">Create your free account</button><button class="btn ghost" id="toLogin2">I have an account</button></div>
        <p class="muted" style="margin-top:14px;font-size:13px">Demo logins — teacher@edumatch.app / teacher1234 · student@edumatch.app / student1234 · admin@edumatch.app / admin1234</p>
      </section>
      <section class="feature-grid grid cols-3">
        ${[['🧠','AI auto-fill','Type a topic, get a ready word set instantly.'],['🎨','Your brand','Upload a logo and pick your colors &amp; theme.'],['👥','Students &amp; classes','Add students, assign sets, watch results.'],['🎮','6 game modes','Match, quiz, flashcards, typing, listening, scramble.'],['🔊','Audio &amp; any language','Built-in pronunciation, incl. Arabic RTL.'],['💳','Subscriptions','Free, Pro &amp; School plans with usage limits.']].map(([i,t,d])=>`<div class="card feature"><div class="ic">${i}</div><h3>${t}</h3><p class="muted">${d}</p></div>`).join('')}
      </section>
      <p class="center muted" style="padding:30px 30px 50px">© ${new Date().getFullYear()} EduMatch — the joyful way to learn languages</p>`
    ;['toLogin','toLogin2'].forEach(id=>root.querySelector('#'+id).onclick=()=>go('login'))
    ;['toReg','toReg2'].forEach(id=>root.querySelector('#'+id).onclick=()=>go('register'))
  }

  function renderAuth() {
    const reg = state.route==='register'
    root.innerHTML = `<div class="auth-wrap"><div class="card auth-card">
      <div class="row" style="gap:10px;margin-bottom:6px"><div class="logo-badge grad">🎯</div><b style="font-size:20px">EduMatch</b></div>
      <h2 style="margin:10px 0 2px">${reg?'Create your account':'Welcome back'}</h2>
      <p class="muted" style="margin:0 0 18px">${reg?'Set up your teaching space in under a minute.':'Log in to your space.'}</p>
      ${reg?`<label class="fld">Organization / school name</label><input id="a-org" placeholder="e.g. Bright English Academy"/>
        <label class="fld" style="margin-top:12px">Your name</label><input id="a-name" placeholder="Your full name"/>`:''}
      <label class="fld" style="margin-top:12px">Email</label><input id="a-email" type="email" placeholder="you@email.com"/>
      <label class="fld" style="margin-top:12px">Password</label><input id="a-pass" type="password" placeholder="••••••••"/>
      <button class="btn" style="width:100%;margin-top:18px" id="a-go">${reg?'Create account':'Log in'}</button>
      <p class="center muted" style="margin-top:16px;font-size:14px">${reg?'Already have an account?':'New here?'} <a href="#" id="a-switch">${reg?'Log in':'Create one'}</a></p>
      <p class="center" style="margin-top:8px"><a href="#" id="a-back" class="muted">← Back</a></p>
    </div></div>`
    root.querySelector('#a-switch').onclick=(e)=>{e.preventDefault();go(reg?'login':'register')}
    root.querySelector('#a-back').onclick=(e)=>{e.preventDefault();go('home')}
    root.querySelector('#a-go').onclick=async()=>{
      try {
        const email=root.querySelector('#a-email').value.trim(), password=root.querySelector('#a-pass').value
        let res
        if (reg) { res=await api('/auth/register',{method:'POST',body:{orgName:root.querySelector('#a-org').value.trim(),name:root.querySelector('#a-name').value.trim(),email,password}}) }
        else { res=await api('/auth/login',{method:'POST',body:{email,password}}) }
        state.token=res.token; state.user=res.user; state.org=res.org; localStorage.setItem('em_token',res.token); applyTheme(res.org)
        toast(reg?'Account created 🎉':'Welcome back!'); go(defaultRoute())
      } catch(e){ toast(e.message,true) }
    }
  }

  /* ---- Authenticated shell with sidebar ---- */
  function navFor(role) {
    if (role==='superadmin') return [['admin','💎','Overview']]
    if (role==='student') return [['learn','🎮','Play & Learn'],['courses','📖','Lessons'],['myprogress','📈','My progress']]
    return [['dash','🏠','Dashboard'],['sets','📚','Word sets'],['courses','📖','Courses'],['students','👥','Students'],['results','📊','Results'],['branding','🎨','Branding'],['billing','💳','Subscription']]
  }
  function renderShell() {
    const o=state.org
    const logo = o?.logo ? `<img src="${esc(o.logo)}" alt=""/>` : `<div class="logo grad">${esc((o?.name||'E')[0])}</div>`
    const nav = navFor(state.user.role).map(([r,ic,label])=>`<button class="navlink ${state.route===r?'active':''}" data-r="${r}"><span class="ic">${ic}</span> ${label}</button>`).join('')
    root.innerHTML = `<div class="shell">
      <aside class="sidebar">
        <div class="org">${logo}<div><b>${esc(o?.name||'EduMatch')}</b><small>${state.user.role==='superadmin'?'Platform admin':state.user.role==='student'?'Student':(o?.plan||'free')+' plan'}</small></div></div>
        ${nav}
        <div class="spacer"></div>
        <div class="navlink" style="cursor:default"><span class="ic">👤</span> ${esc(state.user.name)}</div>
        <button class="navlink" id="nav-logout"><span class="ic">⏻</span> Log out</button>
      </aside>
      <main class="main" id="main"></main></div>`
    root.querySelectorAll('.navlink[data-r]').forEach(b=>b.onclick=()=>go(b.dataset.r))
    root.querySelector('#nav-logout').onclick=logout
    const main=root.querySelector('#main')
    const R=state.route
    if (R==='dash') viewDash(main)
    else if (R==='sets') viewSets(main)
    else if (R==='editor') viewEditor(main)
    else if (R==='students') viewStudents(main)
    else if (R==='results') viewResults(main)
    else if (R==='courses') viewCourses(main)
    else if (R==='courseedit') viewCourseEdit(main)
    else if (R==='branding') viewBranding(main)
    else if (R==='billing') viewBilling(main)
    else if (R==='learn') viewLearn(main)
    else if (R==='myprogress') viewResults(main)
    else if (R==='admin') viewAdmin(main)
    else if (R==='playset') viewPlay(main)
    else viewDash(main)
  }

  function head(title, sub, actionHtml) {
    return `<div class="page-head"><div><h1>${title}</h1>${sub?`<p>${sub}</p>`:''}</div><div class="row">${actionHtml||''}</div></div>`
  }

  /* ---- Teacher: Dashboard ---- */
  async function viewDash(main) {
    main.innerHTML = head('Dashboard', `Welcome back, ${esc(state.user.name)}`)+'<div class="empty">Loading…</div>'
    try {
      const [{sets},{students},{results}] = await Promise.all([api('/sets'),api('/students'),api('/results')])
      const games=results.length, avg=games?Math.round(results.reduce((a,r)=>a+(r.total?r.correct/r.total:0),0)/games*100):0
      main.innerHTML = head('Dashboard', `Welcome back, ${esc(state.user.name)}`,
        `<button class="btn" id="d-new">+ New word set</button>`)+
        `<div class="stat-grid" style="margin-bottom:22px">
          <div class="stat"><div class="v">${sets.length}</div><div class="l">Word sets</div></div>
          <div class="stat"><div class="v">${students.length}</div><div class="l">Students</div></div>
          <div class="stat"><div class="v">${games}</div><div class="l">Games played</div></div>
          <div class="stat"><div class="v">${avg}%</div><div class="l">Avg. accuracy</div></div>
        </div>
        <div class="grid cols-2">
          <div class="card"><div class="row spread"><b>Your word sets</b><a href="#" id="d-allsets">View all</a></div>
            ${sets.slice(0,5).map(s=>`<div class="row spread" style="padding:8px 0;border-bottom:1px solid var(--line)"><span>${esc(s.icon)} ${esc(s.name)}</span><span class="muted">${s.words.length} words</span></div>`).join('')||'<p class="muted">No sets yet.</p>'}</div>
          <div class="card"><b>Plan</b><p class="muted" style="margin:6px 0 12px">You are on the <b>${esc(state.org.plan)}</b> plan.</p>
            <p class="muted" style="font-size:13px">Limits: ${state.org.limits.maxSets} sets · ${state.org.limits.maxStudents} students · AI ${state.org.limits.ai?'✅':'❌'}</p>
            <button class="btn" id="d-upgrade">Manage subscription</button></div>
        </div>`
      main.querySelector('#d-new').onclick=()=>go('editor')
      main.querySelector('#d-allsets').onclick=(e)=>{e.preventDefault();go('sets')}
      main.querySelector('#d-upgrade').onclick=()=>go('billing')
    } catch(e){ main.innerHTML=head('Dashboard')+`<div class="empty">${esc(e.message)}</div>` }
  }

  /* ---- Teacher: Sets list ---- */
  async function viewSets(main) {
    main.innerHTML = head('Word sets','Create decks, edit words, or play.',`<button class="btn" id="s-new">+ New set</button>`)+'<div class="empty">Loading…</div>'
    main.querySelector('#s-new').onclick=()=>go('editor')
    try {
      const {sets}=await api('/sets')
      const list=main.querySelector('.empty')
      if(!sets.length){list.outerHTML='<div class="empty">No sets yet. Click <b>+ New set</b>.</div>';return}
      list.outerHTML=`<div class="grid cols-2">${sets.map(s=>`<div class="card"><div class="row" style="gap:10px"><span style="font-size:24px">${esc(s.icon)}</span><div><b>${esc(s.name)}</b><div class="muted" style="font-size:12px">${esc(LMAP[s.fromLang]||s.fromLang)} → ${esc(LMAP[s.toLang]||s.toLang)} · ${s.words.length} words</div></div></div>
        <div class="row" style="margin-top:12px"><button class="btn sm" data-play="${s.id}">▶ Play</button><button class="btn secondary sm" data-edit="${s.id}">✏️ Edit</button><button class="btn ghost sm" style="color:var(--bad)" data-del="${s.id}">🗑</button></div></div>`).join('')}</div>`
      main.querySelectorAll('[data-play]').forEach(b=>b.onclick=()=>go('playset',{id:b.dataset.play}))
      main.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>go('editor',{id:b.dataset.edit}))
      main.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this set?'))return;await api('/sets/'+b.dataset.del,{method:'DELETE'});toast('Deleted');viewSets(main)})
    } catch(e){ main.querySelector('.empty').textContent=e.message }
  }

  /* ---- Teacher: Set editor (with AI auto-fill) ---- */
  async function viewEditor(main) {
    let set={id:null,name:'',icon:'📘',fromLang:'en',toLang:'fr',words:[]}
    if (state.params.id) { const {set:s}=await api('/sets/'+state.params.id); set=s }
    else if (state.params.draft) { set={...set, ...state.params.draft} }
    main.innerHTML = head(set.id?'Edit set':'New word set','',`<button class="btn ghost" id="e-back">← Back</button><button class="btn good" id="e-save">💾 Save</button>`)+
      `<div class="card">
        <div class="grid cols-2" style="margin-bottom:12px"><div><label class="fld">Set name</label><input id="e-name" value="${esc(set.name)}" placeholder="e.g. Unit 3 – Food"/></div><div><label class="fld">Icon</label><input id="e-icon" maxlength="4" value="${esc(set.icon)}"/></div></div>
        <div class="grid cols-2" style="margin-bottom:16px"><div><label class="fld">Term language</label><select id="e-from">${langOpts(set.fromLang)}</select></div><div><label class="fld">Answer language</label><select id="e-to">${langOpts(set.toLang)}</select></div></div>
        <div class="card" style="background:var(--bg2);margin-bottom:16px">
          <div class="row spread"><b>🧠 AI auto-fill</b>${state.org.limits.ai?'<span class="badge good">Unlimited</span>':`<span class="badge warn">${state.org.limits.aiRemaining} free use${state.org.limits.aiRemaining===1?'':'s'} left</span>`}</div>
          <div class="row" style="margin-top:10px"><input id="ai-topic" placeholder="Topic e.g. kitchen, animals, travel" style="flex:2"/><input id="ai-count" type="number" value="8" min="2" max="30" style="flex:1;min-width:80px"/><button class="btn" id="ai-go">Generate</button></div>
        </div>
        <label class="fld">Words — term, translation, hint (optional)</label>
        <div id="e-items"></div>
        <button class="btn secondary sm" id="e-add">+ Add word</button>
      </div>`
    const itemsBox=main.querySelector('#e-items')
    const addRow=(w={term:'',answer:'',hint:''})=>{ const row=document.createElement('div'); row.className='item-row'
      row.innerHTML=`<input class="i-t" placeholder="term" value="${esc(w.term)}"/><input class="i-a" placeholder="translation" value="${esc(w.answer)}"/><input class="i-d def" placeholder="hint" value="${esc(w.hint||'')}"/><button class="del">×</button>`
      row.querySelector('.del').onclick=()=>row.remove(); itemsBox.appendChild(row) }
    ;(set.words.length?set.words:[{},{},{}]).forEach(addRow)
    main.querySelector('#e-add').onclick=()=>addRow()
    main.querySelector('#e-back').onclick=()=>go('sets')
    main.querySelector('#ai-go').onclick=async()=>{
      try{ const topic=main.querySelector('#ai-topic').value.trim(); if(!topic)return toast('Enter a topic',true)
        const count=+main.querySelector('#ai-count').value||8
        const res=await api('/ai/generate',{method:'POST',body:{topic,count,fromLang:main.querySelector('#e-from').value,toLang:main.querySelector('#e-to').value}})
        if(res.aiRemaining!=null)state.org.limits.aiRemaining=res.aiRemaining
        res.words.forEach(addRow); toast(`Added ${res.words.length} words (${res.source==='openai'?'AI':'sample'})`)
      }catch(e){toast(e.message,true)} }
    main.querySelector('#e-save').onclick=async()=>{
      const words=[...itemsBox.querySelectorAll('.item-row')].map(r=>({term:r.querySelector('.i-t').value.trim(),answer:r.querySelector('.i-a').value.trim(),hint:r.querySelector('.i-d').value.trim()})).filter(w=>w.term&&w.answer)
      const body={name:main.querySelector('#e-name').value.trim(),icon:main.querySelector('#e-icon').value.trim()||'📘',fromLang:main.querySelector('#e-from').value,toLang:main.querySelector('#e-to').value,words}
      if(!body.name)return toast('Add a set name',true); if(words.length<2)return toast('Add at least 2 words',true)
      try{ if(set.id)await api('/sets/'+set.id,{method:'PUT',body}); else await api('/sets',{method:'POST',body}); toast('Saved ✓'); go('sets') }catch(e){toast(e.message,true)} }
  }

  /* ---- Teacher: Students ---- */
  async function viewStudents(main) {
    main.innerHTML = head('Students','Add students to your space and assign them games.',`<button class="btn" id="st-add">+ Add student</button>`)+'<div class="empty">Loading…</div>'
    main.querySelector('#st-add').onclick=()=>showAdd()
    async function load(){ const {students}=await api('/students'); const box=main.querySelector('#st-body')||main
      const html=`<div class="card"><table><thead><tr><th>Name</th><th>Email</th><th>Added</th><th></th></tr></thead><tbody>${students.map(s=>`<tr><td>${esc(s.name)}</td><td class="muted">${esc(s.email)}</td><td class="muted">${new Date(s.created_at).toLocaleDateString()}</td><td><button class="btn ghost sm" data-del="${s.id}" style="color:var(--bad)">Remove</button></td></tr>`).join('')||'<tr><td colspan=4 class="muted">No students yet.</td></tr>'}</tbody></table></div>`
      const target=main.querySelector('.empty'); if(target)target.outerHTML=`<div id="st-body">${html}</div>`; else main.querySelector('#st-body').innerHTML=html
      main.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(!confirm('Remove student?'))return;await api('/students/'+b.dataset.del,{method:'DELETE'});toast('Removed');load()}) }
    function showAdd(){ const name=prompt('Student name'); if(!name)return; const email=prompt('Student email (their login)'); if(!email)return; const password=prompt('Temporary password (min 4 chars)','student'); if(!password)return
      api('/students',{method:'POST',body:{name,email,password}}).then(()=>{toast('Student added');load()}).catch(e=>toast(e.message,true)) }
    load()
  }

  /* ---- Results (teacher sees org, student sees own) ---- */
  async function viewResults(main) {
    const isStudent=state.user.role==='student'
    main.innerHTML = head(isStudent?'My progress':'Results',isStudent?'Your recent games.':'How your students are doing.')+'<div class="empty">Loading…</div>'
    try{ const {results}=await api('/results')
      main.querySelector('.empty').outerHTML=`<div class="card"><table><thead><tr>${isStudent?'':'<th>Student</th>'}<th>Mode</th><th>Score</th><th>Accuracy</th><th>When</th></tr></thead><tbody>${results.map(r=>`<tr>${isStudent?'':`<td>${esc(r.user_name||'')}</td>`}<td>${esc(r.mode||'')}</td><td>${r.score}</td><td>${r.total?Math.round(r.correct/r.total*100):0}%</td><td class="muted">${new Date(r.created_at).toLocaleString()}</td></tr>`).join('')||`<tr><td colspan=5 class="muted">No games played yet.</td></tr>`}</tbody></table></div>`
    }catch(e){main.querySelector('.empty').textContent=e.message} }

  /* ---- Branding (logo + theme) ---- */
  function viewBranding(main) {
    const o=state.org, COLORS=['#6c8cff','#9b6cff','#34d399','#fb7185','#fbbf24','#f97316','#22d3ee','#e879f9']
    main.innerHTML = head('Branding','Make the platform yours — logo, colors and theme.')+
      `<div class="grid cols-2"><div class="card">
        <label class="fld">Logo</label>
        <div class="logo-upload"><div class="logo-preview" id="b-prev">${o.logo?`<img src="${esc(o.logo)}" style="width:100%;height:100%;border-radius:13px;object-fit:cover"/>`:esc((o.name||'E')[0])}</div>
          <div><input type="file" id="b-file" accept="image/*"/><p class="muted" style="font-size:12px;margin:6px 0 0">PNG/JPG, stored with your org.</p></div></div>
        <label class="fld" style="margin-top:18px">Organization name</label><input id="b-name" value="${esc(o.name)}"/>
      </div>
      <div class="card">
        <label class="fld">Primary color</label><div class="row" id="b-primary">${COLORS.map(c=>`<div class="swatch ${c===o.theme.primary?'sel':''}" data-c="${c}" style="background:${c}"></div>`).join('')}</div>
        <label class="fld" style="margin-top:16px">Accent color</label><div class="row" id="b-accent">${COLORS.map(c=>`<div class="swatch ${c===o.theme.accent?'sel':''}" data-c="${c}" style="background:${c}"></div>`).join('')}</div>
        <label class="fld" style="margin-top:16px">Theme</label><select id="b-mode"><option value="dark" ${o.theme.mode==='dark'?'selected':''}>Dark</option><option value="light" ${o.theme.mode==='light'?'selected':''}>Light</option></select>
        <button class="btn good" style="margin-top:18px" id="b-save">💾 Save branding</button>
      </div></div>`
    let logoData=o.logo, primary=o.theme.primary, accent=o.theme.accent
    main.querySelector('#b-file').onchange=(e)=>{const f=e.target.files[0];if(!f)return; if(!f.type.startsWith('image/'))return toast('Please choose an image file',true)
      const rd=new FileReader(); rd.onload=()=>{ const img=new Image(); img.onload=()=>{ const S=256, cv=document.createElement('canvas'); cv.width=S; cv.height=S; const ctx=cv.getContext('2d'); const scale=Math.max(S/img.width,S/img.height), w=img.width*scale, h=img.height*scale; ctx.drawImage(img,(S-w)/2,(S-h)/2,w,h); logoData=cv.toDataURL('image/jpeg',0.85); main.querySelector('#b-prev').innerHTML=`<img src="${logoData}" style="width:100%;height:100%;border-radius:13px;object-fit:cover"/>` }; img.onerror=()=>toast('Could not read that image',true); img.src=rd.result }; rd.readAsDataURL(f) }
    main.querySelector('#b-primary').onclick=(e)=>{const s=e.target.closest('.swatch');if(!s)return;primary=s.dataset.c;document.documentElement.style.setProperty('--primary',primary);main.querySelectorAll('#b-primary .swatch').forEach(x=>x.classList.toggle('sel',x===s))}
    main.querySelector('#b-accent').onclick=(e)=>{const s=e.target.closest('.swatch');if(!s)return;accent=s.dataset.c;document.documentElement.style.setProperty('--accent',accent);main.querySelectorAll('#b-accent .swatch').forEach(x=>x.classList.toggle('sel',x===s))}
    main.querySelector('#b-mode').onchange=(e)=>document.body.classList.toggle('light',e.target.value==='light')
    main.querySelector('#b-save').onclick=async()=>{ try{
      const body={name:main.querySelector('#b-name').value.trim(),logo:logoData,theme:{primary,accent,mode:main.querySelector('#b-mode').value}}
      const {org}=await api('/org',{method:'PUT',body}); state.org=org; applyTheme(org); toast('Branding saved ✓'); render()
    }catch(e){toast(e.message,true)} }
  }

  /* ---- Billing ---- */
  async function viewBilling(main) {
    main.innerHTML = head('Subscription','Pick a plan. (Test mode activates instantly; add Stripe keys for live billing.)')+'<div class="empty">Loading…</div>'
    const {plans}=await api('/billing/plans')
    main.querySelector('.empty').outerHTML=`<div class="grid cols-3">${Object.values(plans).map(p=>`<div class="card center"><h3>${esc(p.name)}</h3><div class="v text-grad" style="font-size:34px;font-weight:800">$${p.price}<span style="font-size:14px;color:var(--muted)">/mo</span></div>
      <p class="muted" style="font-size:13px;margin:10px 0">${p.maxSets>=100000?'Unlimited':p.maxSets} sets · ${p.maxStudents>=100000?'Unlimited':p.maxStudents} students<br>AI auto-fill ${p.ai?'✅ Unlimited':(p.aiTrials?`🎁 ${p.aiTrials} free`:'❌')}</p>
      <button class="btn ${state.org.plan===p.id?'secondary':''}" data-plan="${p.id}" ${state.org.plan===p.id?'disabled':''}>${state.org.plan===p.id?'Current plan':'Choose'}</button></div>`).join('')}</div>`
    main.querySelectorAll('[data-plan]').forEach(b=>b.onclick=async()=>{ try{ const {org,result}=await api('/billing/subscribe',{method:'POST',body:{plan:b.dataset.plan}}); state.org=org; toast(result.mode==='mock'?'Plan activated (test mode) ✓':'Redirecting to checkout…'); render() }catch(e){toast(e.message,true)} })
  }

  /* ---- Student: Learn ---- */
  async function viewLearn(main) {
    main.innerHTML = head('Play & Learn','Pick a set, then a game mode.')+'<div class="empty">Loading…</div>'
    try{ const {sets}=await api('/my/assignments')
      if(!sets.length){main.querySelector('.empty').outerHTML='<div class="empty">No sets assigned yet. Ask your teacher.</div>';return}
      main.querySelector('.empty').outerHTML=`<div class="grid cols-2">${sets.map(s=>`<div class="card"><div class="row" style="gap:10px"><span style="font-size:24px">${esc(s.icon)}</span><div><b>${esc(s.name)}</b><div class="muted" style="font-size:12px">${esc(LMAP[s.fromLang]||s.fromLang)} → ${esc(LMAP[s.toLang]||s.toLang)} · ${s.words.length} words</div></div></div><button class="btn sm" style="margin-top:12px" data-play="${s.id}">▶ Play</button></div>`).join('')}</div>`
      main.querySelectorAll('[data-play]').forEach(b=>b.onclick=()=>go('playset',{id:b.dataset.play}))
    }catch(e){main.querySelector('.empty').textContent=e.message} }

  /* ---- Play a set: choose mode, then game ---- */
  async function viewPlay(main) {
    const {set}=await api('/sets/'+state.params.id)
    main.innerHTML = head(`${esc(set.icon)} ${esc(set.name)}`,'Choose a game mode.',`<button class="btn ghost" id="p-back">← Back</button>`)+
      `<div class="grid cols-3" id="p-modes">${window.Games.MODES.map(m=>`<div class="card mode-card" data-m="${m.id}"><div class="ico">${m.ico}</div><h3>${m.name}</h3><p>${m.desc}</p></div>`).join('')}</div><div id="p-game" style="margin-top:18px"></div>`
    main.querySelector('#p-back').onclick=()=>go(state.user.role==='student'?'learn':'sets')
    main.querySelectorAll('[data-m]').forEach(c=>c.onclick=()=>{
      main.querySelector('#p-modes').classList.add('hidden')
      const gameBox=main.querySelector('#p-game')
      let saved=false
      window.Games.play(gameBox, set, c.dataset.m, async (result, silent)=>{
        if (result && !saved) { saved=true; try{ await api('/results',{method:'POST',body:result}) }catch(e){} }
        if (!silent && result===null) { main.querySelector('#p-modes').classList.remove('hidden'); gameBox.innerHTML='' }
      })
    })
  }

  /* ---- Platform admin (the owner: YOU) ---- */
  async function viewAdmin(main) {
    main.innerHTML = head('Platform overview','All organizations, usage, and subscriptions.')+'<div class="empty">Loading…</div>'
    try{ const {totals,orgs,recent}=await api('/admin/overview')
      main.querySelector('.empty').outerHTML=`
        <div class="stat-grid" style="margin-bottom:22px">
          <div class="stat"><div class="v">${totals.orgs}</div><div class="l">Organizations</div></div>
          <div class="stat"><div class="v">${totals.users}</div><div class="l">Users</div></div>
          <div class="stat"><div class="v">${totals.gamesPlayed}</div><div class="l">Games played</div></div>
          <div class="stat"><div class="v">${totals.paying}</div><div class="l">Paying orgs</div></div>
          <div class="stat"><div class="v text-grad">$${totals.mrr}</div><div class="l">Est. MRR</div></div>
        </div>
        <div class="card" style="margin-bottom:20px"><b>Organizations</b><table style="margin-top:10px"><thead><tr><th>Org</th><th>Plan</th><th>Status</th><th>Students</th><th>Sets</th><th>Games</th><th>Last active</th><th>Change plan</th></tr></thead><tbody>
          ${orgs.map(o=>`<tr><td>${esc(o.name)}</td><td><span class="badge ${o.plan!=='free'?'good':''}">${esc(o.plan)}</span></td><td>${esc(o.planStatus)}</td><td>${o.counts.students}</td><td>${o.counts.sets}</td><td>${o.counts.games}</td><td class="muted">${o.lastActive?new Date(o.lastActive).toLocaleDateString():'—'}</td>
            <td><select data-org="${o.id}"><option value="">…</option><option value="free">Set Free</option><option value="pro">Set Pro</option><option value="school">Set School</option><option value="__suspend">Suspend</option></select></td></tr>`).join('')}
        </tbody></table></div>
        <div class="card"><b>Recent activity</b><table style="margin-top:10px"><thead><tr><th>Event</th><th>When</th></tr></thead><tbody>${recent.slice(0,20).map(e=>`<tr><td>${esc(e.type)}</td><td class="muted">${new Date(e.created_at).toLocaleString()}</td></tr>`).join('')}</tbody></table></div>`
      main.querySelectorAll('select[data-org]').forEach(sel=>sel.onchange=async()=>{ const v=sel.value; if(!v)return
        try{ if(v==='__suspend'){ await api('/admin/org/'+sel.dataset.org+'/plan',{method:'POST',body:{plan:'free',status:'suspended'}}) }
          else { await api('/admin/org/'+sel.dataset.org+'/plan',{method:'POST',body:{plan:v,status:'active'}}) }
          toast('Updated'); viewAdmin(main) }catch(e){toast(e.message,true)} })
    }catch(e){main.querySelector('.empty').textContent=e.message} }

  /* ---- Courses / lessons ---- */
  async function viewCourses(main) {
    const canEdit = state.user.role==='owner' || state.user.role==='teacher'
    main.innerHTML = head(canEdit?'Courses':'Lessons', canEdit?'Add your lessons, then turn them into games with AI.':'Read your lessons and practice the vocabulary.', canEdit?`<button class="btn" id="c-new">+ New course</button>`:'')+'<div class="empty">Loading…</div>'
    if(canEdit) main.querySelector('#c-new').onclick=()=>go('courseedit')
    try{
      const {courses}=await api('/courses')
      const box=main.querySelector('.empty')
      if(!courses.length){ box.outerHTML=`<div class="empty">No courses yet.${canEdit?' Click <b>+ New course</b> to add your first lesson.':''}</div>`; return }
      box.outerHTML=`<div class="grid cols-2">${courses.map(c=>`<div class="card"><div class="row" style="gap:12px"><span style="font-size:26px">${esc(c.icon||'📖')}</span><div><b>${esc(c.title)}</b><div class="muted" style="font-size:12px">${esc((LMAP[c.fromLang]||c.fromLang))} → ${esc((LMAP[c.toLang]||c.toLang))}</div></div></div>
        <p class="muted" style="font-size:13px;margin:12px 0;line-height:1.6;max-height:66px;overflow:hidden">${esc((c.content||'').slice(0,170))}${(c.content||'').length>170?'…':''}</p>
        <div class="row">${canEdit?`<button class="btn sm" data-extract="${c.id}">✨ Make game</button><button class="btn secondary sm" data-edit="${c.id}">✏️ Edit</button><button class="btn ghost sm" data-del="${c.id}">🗑</button>`:`<button class="btn sm" data-read="${c.id}">📖 Read lesson</button>`}</div></div>`).join('')}</div>`
      main.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>go('courseedit',{id:b.dataset.edit}))
      main.querySelectorAll('[data-read]').forEach(b=>b.onclick=()=>go('courseedit',{id:b.dataset.read}))
      main.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{ if(!confirm('Delete this course?'))return; await api('/courses/'+b.dataset.del,{method:'DELETE'}); toast('Course deleted'); viewCourses(main) })
      main.querySelectorAll('[data-extract]').forEach(b=>b.onclick=()=>extractCourse(b.dataset.extract,b))
    }catch(e){ const box=main.querySelector('.empty'); if(box) box.textContent=e.message }
  }
  async function extractCourse(id,btn){
    try{ if(btn){btn.disabled=true; btn.textContent='✨ Extracting…'}
      const res=await api('/courses/'+id+'/extract',{method:'POST',body:{count:10}})
      if(res.aiRemaining!=null)state.org.limits.aiRemaining=res.aiRemaining
      toast(`Found ${res.words.length} key words (${res.source==='openai'?'AI':'offline'}) — review & save`)
      go('editor',{draft:{name:res.course.title+' — vocabulary',icon:'🎮',fromLang:res.course.fromLang,toLang:res.course.toLang,words:res.words}})
    }catch(e){ toast(e.message,true); if(btn){btn.disabled=false; btn.textContent='✨ Make game'} }
  }
  async function viewCourseEdit(main){
    const readOnly = !(state.user.role==='owner'||state.user.role==='teacher')
    let course={id:null,title:'',icon:'📖',content:'',fromLang:'en',toLang:'fr'}
    if(state.params.id){ const {course:c}=await api('/courses/'+state.params.id); course=c }
    main.innerHTML = head(course.id?(readOnly?esc(course.icon||'📖')+' '+esc(course.title):'Edit course'):'New course','',`<button class="btn ghost" id="ce-back">← Back</button>${readOnly?'':'<button class="btn good" id="ce-save">💾 Save</button>'}`)+
      (readOnly
        ? `<div class="card"><div style="white-space:pre-wrap;line-height:1.8;font-size:15px">${esc(course.content||'')}</div></div>`
        : `<div class="card">
            <div class="grid cols-2" style="margin-bottom:14px"><div><label class="fld">Course title</label><input id="ce-title" value="${esc(course.title)}" placeholder="e.g. Lesson 1 – At the Café"/></div><div><label class="fld">Icon</label><input id="ce-icon" maxlength="4" value="${esc(course.icon||'📖')}"/></div></div>
            <div class="grid cols-2" style="margin-bottom:14px"><div><label class="fld">Lesson language</label><select id="ce-from">${langOpts(course.fromLang)}</select></div><div><label class="fld">Translate to</label><select id="ce-to">${langOpts(course.toLang)}</select></div></div>
            <label class="fld">Lesson content</label><textarea id="ce-content" rows="12" placeholder="Paste or write your lesson text here…">${esc(course.content||'')}</textarea>
            <div class="row" style="margin-top:16px"><button class="btn" id="ce-extract">✨ Extract key words → build game</button>${state.org.limits.ai?'':`<span class="badge warn">${state.org.limits.aiRemaining} free AI use${state.org.limits.aiRemaining===1?'':'s'} left</span>`}</div>
          </div>`)
    main.querySelector('#ce-back').onclick=()=>go('courses')
    if(readOnly)return
    main.querySelector('#ce-save').onclick=async()=>{ const body={title:main.querySelector('#ce-title').value.trim(),icon:main.querySelector('#ce-icon').value.trim()||'📖',content:main.querySelector('#ce-content').value,fromLang:main.querySelector('#ce-from').value,toLang:main.querySelector('#ce-to').value}
      if(!body.title)return toast('Add a course title',true)
      try{ if(course.id)await api('/courses/'+course.id,{method:'PUT',body}); else await api('/courses',{method:'POST',body}); toast('Course saved ✓'); go('courses') }catch(e){toast(e.message,true)} }
    main.querySelector('#ce-extract').onclick=async()=>{ const content=main.querySelector('#ce-content').value
      if(content.trim().length<10)return toast('Write some lesson text first',true)
      try{ const res=await api('/ai/extract',{method:'POST',body:{text:content,count:10,fromLang:main.querySelector('#ce-from').value,toLang:main.querySelector('#ce-to').value}})
        if(res.aiRemaining!=null)state.org.limits.aiRemaining=res.aiRemaining
        toast(`Found ${res.words.length} key words — review & save`)
        go('editor',{draft:{name:(main.querySelector('#ce-title').value.trim()||'Lesson')+' — vocabulary',icon:'🎮',fromLang:main.querySelector('#ce-from').value,toLang:main.querySelector('#ce-to').value,words:res.words}})
      }catch(e){toast(e.message,true)} }
  }

  boot()
  return { go }
})()
