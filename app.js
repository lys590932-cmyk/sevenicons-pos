/* Seven Icons POS — application */
/* ================= UTILS ================= */
const $ = (s,el=document)=>el.querySelector(s);
const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const K = f => (Math.round(f||0)/1000).toFixed(3);
const KG = f => (Math.round(f||0)/1000).toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:3});
const KW = f => `<span class="ltr">${KG(f)}</span> <small>${t('kwd')}</small>`;
const p2 = n => String(n).padStart(2,'0');
const nf = n => Math.round(n||0).toLocaleString('en-US');
const pct = (a,b) => b ? (a/b*100) : 0;
const KW_OFF = 3*3600e3;                       // Kuwait is UTC+3 all year
const kwd = ms => new Date(ms + KW_OFF);
const dkOf = ms => kwd(ms).toISOString().slice(0,10);
const cutoff = () => +(S.cat?.settings?.cutoff_hour ?? 4);
const bizToday = () => dkOf(Date.now() - cutoff()*3600e3);
const hm = ts => { const d=kwd(new Date(ts).getTime()); return p2(d.getUTCHours())+':'+p2(d.getUTCMinutes()); };
const addDays = (d,n) => { const x=new Date(d+'T00:00:00Z'); x.setUTCDate(x.getUTCDate()+n); return x.toISOString().slice(0,10); };
const dow = d => new Date(d+'T00:00:00Z').getUTCDay();
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2));
const LSx = { get(k,d){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch{ return d; } }, set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} } };
function toast(msg,ms=2800){ const el=document.createElement('div'); el.className='toast'; el.textContent=msg; document.body.appendChild(el); setTimeout(()=>el.remove(),ms); }
const fail = e => { console.error(e); toast(errText(e),4000); };

/* ================= STATE ================= */
const S = { me:null, cat:null, view:null, branch:null, cart:[], ch:'take', ref:'', cust:{n:'',p:'',a:''}, disc:null, catSel:null, q:'',
  today:[], shift:undefined, timers:{}, idx:{} };
function indexCatalog(){
  const c=S.cat, I={brand:{},branch:{},ch:{},item:{},vars:{}};
  c.brands.forEach(x=>I.brand[x.id]=x); c.branches.forEach(x=>I.branch[x.id]=x); c.channels.forEach(x=>I.ch[x.id]=x);
  c.items.forEach(x=>I.item[x.id]=x); c.variants.forEach(v=>(I.vars[v.item_id]||(I.vars[v.item_id]=[])).push(v));
  S.idx=I; LSx.set('pos_catalog',c);
}
const B = id => S.idx.branch[id], BRD = id => S.idx.brand[id], CHN = id => S.idx.ch[id];
const brName = id => B(id) ? nm(BRD(B(id).brand_id))+' · '+nm(B(id)) : id;
const chName = id => nm(CHN(id)) || id;
const isApp = id => CHN(id)?.kind==='app';
const payName = k => t('p_'+k);
const scopeBranches = () => { const m=S.me; if(!m) return []; const all=S.cat.branches.filter(b=>b.active); if(m.role==='admin') return all; if(m.role==='brand') return all.filter(b=>b.brand_id===m.brand_id); return all.filter(b=>b.id===m.branch_id); };
const itemsOf = brand => S.cat.items.filter(i=>i.brand_id===brand);
const catsOf = brand => [...new Map(itemsOf(brand).map(i=>[i.category,i])).values()];
function unitPrice(item,vk,ch){
  let p = vk ? (S.idx.vars[item.id]||[]).find(v=>v.key===vk)?.price : item.price;
  const mk = isApp(ch) ? +CHN(ch).markup_pct||0 : 0;
  if(mk) p = Math.round(p*(1+mk/100)/5)*5;
  return p||0;
}

const ICON = {
  pos:'<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>', orders:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  kds:'<path d="M12 3c2 3 5 4.5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 2 1.3 3 2.5 3-.5-2.5-.5-5 .5-7.5z"/>', shift:'<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>',
  dash:'<path d="M3 12h4l3-8 4 16 3-8h4"/>', reports:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', menu:'<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  out:'<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h11"/>', x:'<path d="M6 6l12 12M18 6L6 18"/>',
  note:'<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>', trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  cash:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>', card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  knet:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 6h6M9 18h6M9 10h.01M12 10h.01M15 10h.01M9 13h.01M12 13h.01M15 13h.01"/>',
  app:'<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>', bag:'<path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
  dl:'<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>', print:'<path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'
};
const ic = (n,sz) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"${sz?` style="width:${sz}px;height:${sz}px"`:''}>${ICON[n]}</svg>`;
const ROLE_VIEWS = { branch:['pos','orders','kds','shift','reports'], brand:['dash','reports','orders'], admin:['dash','reports','pos','orders','kds','shift','menu','settings'] };
const BRANCH_VIEWS = ['pos','kds','shift'];

/* ================= MODAL ================= */
function modal(html,init,wide){
  closeModal();
  const ov=document.createElement('div'); ov.className='ov'; ov.id='ov';
  ov.innerHTML=`<div class="md${wide?' wide':''}" role="dialog" aria-modal="true">${html}</div>`;
  ov.addEventListener('mousedown',e=>{ if(e.target===ov) closeModal(); });
  document.body.appendChild(ov);
  $$('[data-x]',ov).forEach(b=>b.onclick=closeModal);
  init&&init(ov);
  const f=$('input:not([type=checkbox]),button.pri',ov); f&&setTimeout(()=>f.focus(),30);
}
function closeModal(){ $('#ov')?.remove(); }
const mh = title => `<div class="md-h"><h3>${esc(title)}</h3><button class="icon-btn" data-x aria-label="${t('close')}">${ic('x')}</button></div>`;
function confirmBox(title,text,ok,fn){
  modal(`${mh(title)}<div class="md-b">${esc(text)}</div><div class="md-f"><button class="btn" data-x>${t('back')}</button><button class="btn pri" id="cok">${esc(ok)}</button></div>`, ()=>{ $('#cok').onclick=()=>{ closeModal(); fn(); }; });
}
function askPin(title,ok){
  let pin='';
  modal(`${mh(title)}<div class="md-b"><div class="muted" style="text-align:center">${t('pin_sub')}</div><div class="pindots">${'<i></i>'.repeat(4)}</div>
  <div class="pinpad">${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k=>k===''?'<span></span>':`<button data-k="${k}">${k}</button>`).join('')}</div></div>`, m=>{
    const dots=()=>$$('.pindots i',m).forEach((d,i)=>d.classList.toggle('f',i<pin.length));
    const press=k=>{ if(k==='⌫') pin=pin.slice(0,-1); else if(pin.length<4) pin+=k; dots(); if(pin.length===4){ const v=pin; closeModal(); ok(v); } };
    $$('[data-k]',m).forEach(b=>b.onclick=()=>press(b.dataset.k));
    m.addEventListener('keydown',e=>{ if(/^\d$/.test(e.key)) press(e.key); if(e.key==='Backspace') press('⌫'); });
    m.tabIndex=-1; m.focus();
  });
}
addEventListener('keydown',e=>{
  if(e.key==='Escape') closeModal();
  if(S.view==='pos' && !$('#ov')){
    if(e.key==='/' && document.activeElement?.tagName!=='INPUT'){ e.preventDefault(); $('#srch')?.focus(); }
    if((e.key==='F9'||(e.ctrlKey&&e.key==='Enter')) && S.cart.length){ e.preventDefault(); openPay(); }
  }
});

/* ================= LOGIN ================= */
function renderLogin(msg){
  document.body.className='';
  const items = S.cat ? S.cat.items.length : 112;
  $('#root').innerHTML = `
  <div id="login">
    <section class="lg-side">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div class="pill" style="background:rgba(255,255,255,.08);color:#d9a54a">Seven Icons · POS</div>
        <button class="btn ghost lang-btn" id="lgl" style="color:#eef3f1">${LANG==='ar'?'English':'العربية'}</button></div>
        <h1 style="margin-top:18px">${t('login_hero')}<br><em>${t('login_hero_em')}</em></h1>
        <p>${t('login_p')}</p>
      </div>
      <div class="lg-brands">
        <div class="lg-brand wahed"><small>6 ${t('branches_n')}</small><b>${LANG==='ar'?'واحد<br>ساندوتش':'Wahed<br>Sandwich'}</b></div>
        <div class="lg-brand shaw"><small>3 ${t('branches_n')}</small><b>${LANG==='ar'?'شاورما<br>آند جريل':'Shawarma<br>& Grill'}</b></div>
        <div class="lg-brand karak"><small>3 ${t('branches_n')}</small><b>${LANG==='ar'?'كرك<br>الشايب':'Karak<br>Alshayeb'}</b></div>
      </div>
      <div class="lg-meta"><div><b class="num">12</b>${t('branches_n')}</div><div><b class="num">${items}</b>${t('items_n')}</div><div><b class="num">7</b>${t('channels_n')}</div></div>
    </section>
    <section class="lg-form">
      <form class="lg-card" id="lgf" autocomplete="on">
        <div><h2>${t('login_title')}</h2><div class="muted" style="margin-top:4px">${t('login_sub')}</div></div>
        <label class="f">${t('username')}<input class="inp ltr" id="lu" name="username" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="wahed_rigai"></label>
        <label class="f">${t('password')}<input class="inp ltr" id="lp" name="password" type="password" autocomplete="current-password"></label>
        <div class="lg-err" id="le">${esc(msg||'')}</div>
        <button class="btn pri lg" type="submit" id="lb">${t('login_btn')}</button>
      </form>
    </section>
  </div>`;
  $('#lgl').onclick=()=>{ setLang(LANG==='ar'?'en':'ar'); renderLogin(); };
  $('#lgf').addEventListener('submit', async e=>{
    e.preventDefault(); const u=$('#lu').value.trim().toLowerCase(), p=$('#lp').value;
    if(!u||!p) return; $('#lb').disabled=true; $('#le').textContent='';
    try{ await API.login(u,p); await afterAuth(); }
    catch(err){ $('#le').textContent = err.code==='net' ? t('e_net') : t('login_bad'); $('#lb').disabled=false; }
  });
  setTimeout(()=>$('#lu')?.focus(),50);
}
async function afterAuth(){
  const me = await API.me();
  if(!me || !me.active){ await API.logout(); return renderLogin(t('login_noaccess')); }
  S.me = me;
  if(!S.timers.outbox) S.timers.outbox=setInterval(async()=>{ const n=await Outbox.flush(); if(n){ toast(t('sent_n',{n})); netState(); if(BRANCH_VIEWS.includes(S.view)) refreshToday(); } },20000);
  try{ S.cat = await API.catalog(); }catch(e){ S.cat = LSx.get('pos_catalog',null); if(!S.cat) throw e; }
  indexCatalog();
  const bs=scopeBranches();
  S.branch = me.role==='branch' ? me.branch_id : (bs.find(b=>b.id===LSx.get('pos_branch',''))?.id || bs[0]?.id);
  renderShell(); go(ROLE_VIEWS[me.role][0]);
}
async function logout(){ Object.values(S.timers).forEach(clearInterval); S.timers={}; await API.logout(); S.me=null; S.cart=[]; renderLogin(); }

/* ================= SHELL ================= */
function brandCtx(){ const m=S.me; if(m.role==='branch') return B(m.branch_id).brand_id; if(m.role==='brand') return m.brand_id; return BRANCH_VIEWS.includes(S.view)?B(S.branch)?.brand_id:null; }
function renderShell(){
  const m=S.me;
  $('#root').innerHTML = `
  <div id="app">
    <nav class="rail">
      <div class="logo">7</div>
      ${ROLE_VIEWS[m.role].map(k=>`<button data-go="${k}">${ic(k)}<span>${t('v_'+k)}</span></button>`).join('')}
      <div class="sp"></div>
      <button id="prn">${ic('print')}<span>${t('printer')}</span></button>
      <button id="lng">${ic('globe')}<span>${LANG==='ar'?'English':'العربية'}</span></button>
      <button id="thm">${ic('sun')}<span>${t('theme')}</span></button>
      <button id="lo">${ic('out')}<span>${t('logout')}</span></button>
    </nav>
    <header class="top">
      <h1 id="ttl"></h1><span id="ctx"></span><div class="grow"></div>
      <span class="pill warn" id="pend" hidden></span><span class="sync" id="sync"></span>
      <div class="who"><span class="nm">${esc(m.role==='branch'?brName(m.branch_id):(m.full_name||t('role_'+m.role)))}</span><span class="pill acc ltr">${esc(m.username)}</span></div>
    </header>
    <main class="main" id="main"></main>
  </div>`;
  $$('.rail [data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
  $('#lo').onclick=logout; $('#prn').onclick=openPrinter;
  $('#lng').onclick=()=>{ setLang(LANG==='ar'?'en':'ar'); renderShell(); go(S.view); };
  $('#thm').onclick=()=>{ const r=document.documentElement; const cur=r.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'); r.dataset.theme=cur==='dark'?'light':'dark'; LSx.set('pos_theme',r.dataset.theme); if(['reports','dash'].includes(S.view)) go(S.view); };
  netState();
}
function netState(){
  const n=Outbox.all().length, el=$('#pend'), sy=$('#sync'); if(!sy) return;
  if(el){ el.hidden=!n; el.textContent=t('pending',{n}); }
  sy.className='sync '+(navigator.onLine?'cloud':'local'); sy.innerHTML=`<i class="dot"></i> <span>${navigator.onLine?t('online'):t('offline')}</span>`;
}
addEventListener('online',async()=>{ netState(); const n=await Outbox.flush(); if(n){ toast(t('sent_n',{n})); refreshToday(); } netState(); });
addEventListener('offline',netState);
function branchPicker(){
  if(S.me.role==='branch') return `<span class="pill">${esc(brName(S.me.branch_id))}</span>`;
  return `<select class="inp" id="bpick" style="width:auto;padding:6px 10px">${scopeBranches().map(b=>`<option value="${b.id}"${b.id===S.branch?' selected':''}>${esc(brName(b.id))}</option>`).join('')}</select>`;
}
function go(view){
  S.view=view; Object.entries(S.timers).forEach(([k,v])=>{ if(k!=='outbox'){ clearInterval(v); delete S.timers[k]; } });
  const b=brandCtx(); document.body.className = b ? 'b-'+b : '';
  $$('.rail [data-go]').forEach(x=>x.classList.toggle('on',x.dataset.go===view));
  $('#ttl').textContent=t('t_'+view);
  $('#ctx').innerHTML = BRANCH_VIEWS.includes(view) ? branchPicker() : '';
  const bp=$('#bpick'); if(bp) bp.onchange=()=>{ S.branch=bp.value; LSx.set('pos_branch',S.branch); S.cart=[]; S.catSel=null; S.today=[]; S.shift=undefined; go(S.view); };
  $('#main').scrollTop=0;
  ({pos:renderPOS,orders:renderOrders,kds:renderKDS,shift:renderShift,dash:renderDash,reports:renderReports,menu:renderMenu,settings:renderSettings})[view]();
}

/* today's orders + open shift of the active branch, refreshed on a timer */
async function refreshToday(){
  try{
    const [list,shift]=await Promise.all([API.ordersDay(bizToday(),S.branch), API.rpc('fn_shift_status',{p_branch:S.branch})]);
    S.today=list; S.shift=shift;
  }catch(e){ if(!isNet(e)) console.error(e); }
  if(S.view==='kds') drawKDS(); else if(S.view==='pos') drawShiftGate();
}

/* ================= POS ================= */
function renderPOS(){
  const brand=B(S.branch).brand_id, cats=catsOf(brand).map(i=>i.category);
  if(!S.catSel||!cats.includes(S.catSel)) S.catSel=cats[0];
  $('#main').innerHTML = `
  <div class="pos">
    <aside class="cats" id="cats"></aside>
    <section class="menu">
      <div id="gate"></div>
      <div class="menu-bar">
        <input class="inp" id="srch" placeholder="${t('search')}" value="${esc(S.q)}">
        <div style="flex:1"></div>
        <button class="btn ghost" id="holdsBtn">${ic('bag',18)} ${t('held')} <span class="pill" id="hc">0</span></button>
      </div>
      <div class="grid" id="grid"></div>
    </section>
    <aside class="cart" id="cart"></aside>
    <button class="btn pri lg cart-toggle" id="ctog"><span>${t('cur_order')}</span><span class="num ltr" id="ctogt"></span></button>
  </div>`;
  drawCats(); drawGrid(); drawCart(); drawShiftGate();
  $('#srch').oninput=e=>{ S.q=e.target.value; drawGrid(); };
  $('#holdsBtn').onclick=openHolds; $('#ctog').onclick=()=>$('#cart').classList.add('open');
  updHoldCount(); refreshToday(); S.timers.today=setInterval(refreshToday,20000);
}
function shiftRequired(){ return S.cat.settings.require_shift!==false && S.shift===null; }
function drawShiftGate(){
  const g=$('#gate'); if(!g) return;
  g.innerHTML = shiftRequired() ? `<div class="banner" style="margin-bottom:10px">${t('need_shift')} <button class="btn" id="gsh" style="margin-inline-start:auto">${t('go_shift')}</button></div>` : '';
  $('#gsh')&&($('#gsh').onclick=()=>go('shift'));
  const pb=$('#payb'); if(pb && shiftRequired()) pb.disabled=true;
}
function drawCats(){
  const brand=B(S.branch).brand_id;
  $('#cats').innerHTML = catsOf(brand).map(i=>`<button data-c="${esc(i.category)}" class="${i.category===S.catSel&&!S.q?'on':''}">${esc(nm(i,'category'))} <small class="num">${itemsOf(brand).filter(x=>x.category===i.category).length}</small></button>`).join('');
  $$('#cats button').forEach(b=>b.onclick=()=>{ S.catSel=b.dataset.c; S.q=''; $('#srch').value=''; drawCats(); drawGrid(); });
}
function drawGrid(){
  const brand=B(S.branch).brand_id, q=S.q.trim().toLowerCase();
  const items = q ? itemsOf(brand).filter(i=>i.name.includes(q)||(i.name_en||'').toLowerCase().includes(q)) : itemsOf(brand).filter(i=>i.category===S.catSel);
  const inCart={}; S.cart.forEach(l=>inCart[l.id]=(inCart[l.id]||0)+l.q);
  $('#grid').innerHTML = items.length ? items.map(i=>{
    const vs=S.idx.vars[i.id]; const prices = vs ? vs.map(v=>unitPrice(i,v.key,S.ch)) : [unitPrice(i,null,S.ch)];
    const other = LANG==='ar' ? i.name_en : i.name;
    return `<button class="tile${i.available?'':' off'}" data-i="${i.id}">
      ${inCart[i.id]?`<span class="q num">${inCart[i.id]}</span>`:''}
      <span><span class="nm">${esc(nm(i))}</span>${other?`<span class="en">${esc(other)}</span>`:''}</span>
      <span class="pr">${vs?`<small>${t('from')} </small>`:''}<span class="ltr">${K(Math.min(...prices))}</span>${vs?` <small>· ${vs.length} ${t('options')}</small>`:''}</span></button>`;
  }).join('') : `<div class="empty" style="grid-column:1/-1">—</div>`;
  $$('#grid .tile').forEach(el=>el.onclick=()=>pickItem(S.idx.item[el.dataset.i]));
}
function pickItem(item){
  const vs=S.idx.vars[item.id];
  if(!vs) return addLine(item,null);
  modal(`${mh(nm(item))}<div class="md-b"><div class="vars">${vs.map(v=>`<button class="var" data-k="${esc(v.key)}"><b>${esc(nm(v))}</b><span class="num ltr">${K(unitPrice(item,v.key,S.ch))}</span></button>`).join('')}</div></div>`,
    m=>$$('.var',m).forEach(b=>b.onclick=()=>{ addLine(item,b.dataset.k); closeModal(); }));
}
function addLine(item,vk){
  const ex=S.cart.find(l=>l.id===item.id&&l.vk===vk&&!l.note);
  if(ex) ex.q++; else S.cart.push({id:item.id,vk,q:1,note:''});
  drawGrid(); drawCart();
}
function cartTotals(){
  const sub=S.cart.reduce((s,l)=>s+unitPrice(S.idx.item[l.id],l.vk,S.ch)*l.q,0);
  let disc=0; if(S.disc) disc = S.disc.type==='p' ? Math.round(sub*Math.min(S.disc.v,100)/100) : Math.min(sub,Math.round(S.disc.v*1000));
  return {sub,disc,tot:sub-disc,qty:S.cart.reduce((s,l)=>s+l.q,0)};
}
const DREASONS = ['dr_promo','dr_staff','dr_comp','dr_loyal','dr_mgmt'];
function drawCart(){
  const tt=cartTotals(), app=isApp(S.ch);
  const vName=(it,vk)=>vk?nm((S.idx.vars[it.id]||[]).find(v=>v.key===vk)):'';
  $('#cart').innerHTML = `
    <div class="cart-h">
      <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">${t('cur_order')}</b>
        <button class="icon-btn" id="cclose" hidden>${ic('x')}</button><span class="muted num" style="font-size:12px">${tt.qty} ${t('pcs')}</span></div>
      <div class="chs">${S.cat.channels.filter(c=>c.active).map(c=>`<button class="chip${S.ch===c.id?' on':''}" data-ch="${c.id}">${c.kind==='app'?`<span class="lg" style="background:${CHCOL[c.id]||'#555'}">${esc((c.name_en||c.id)[0])}</span>`:''}${esc(nm(c))}</button>`).join('')}</div>
      ${app?`<input class="inp ltr" id="ref" placeholder="${t('platform_no',{ch:chName(S.ch)})}" value="${esc(S.ref)}">`:''}
      ${S.ch==='phone'?`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><input class="inp" id="cn" placeholder="${t('cust_name')}" value="${esc(S.cust.n)}"><input class="inp ltr" id="cp" placeholder="${t('cust_phone')}" inputmode="tel" value="${esc(S.cust.p)}"><input class="inp" id="ca" placeholder="${t('cust_area')}" value="${esc(S.cust.a)}" style="grid-column:1/-1"></div>`:''}
    </div>
    <div class="cart-lines">${S.cart.length? S.cart.map((l,i)=>{ const it=S.idx.item[l.id], u=unitPrice(it,l.vk,S.ch), vn=vName(it,l.vk); return `
      <div class="line">
        <div><div class="t">${esc(nm(it))}</div><div class="v">${vn?esc(vn)+' · ':''}<span class="ltr">${K(u)}</span></div>${l.note?`<div class="n">${esc(l.note)}</div>`:''}</div>
        <div class="amt ltr">${K(u*l.q)}</div>
        <div class="qty"><button data-m="${i}">−</button><span>${l.q}</span><button data-p="${i}">+</button></div>
        <div class="acts"><button class="icon-btn" data-n="${i}">${ic('note')}</button><button class="icon-btn" data-d="${i}">${ic('trash')}</button></div>
      </div>`; }).join('') : `<div class="empty">${ic('bag')}<div>${t('cart_empty')}</div><div style="font-size:12px">${t('cart_hint')}</div></div>`}</div>
    <div class="cart-f">
      <div class="sumrow"><span>${t('subtotal')}</span><span class="num ltr">${K(tt.sub)}</span></div>
      ${tt.disc?`<div class="sumrow" style="color:var(--bad)"><span>${t('discount')} ${S.disc.type==='p'?S.disc.v+'%':''} · ${esc(t(S.disc.r))}</span><span class="num ltr">-${K(tt.disc)}</span></div>`:''}
      <div class="sumrow tot"><span>${t('total')}</span><span class="num"><span class="ltr">${K(tt.tot)}</span> <small style="font-size:13px;color:var(--fg-3)">${t('kwd')}</small></span></div>
      <div class="cart-btns">
        <button class="btn" id="hold"${S.cart.length?'':' disabled'}>${t('hold')}</button>
        <button class="btn" id="discb"${S.cart.length?'':' disabled'}>${S.disc?t('disc_edit'):t('disc_btn')}</button>
        <button class="btn pri lg" id="payb"${S.cart.length&&!shiftRequired()?'':' disabled'}>${t('pay')} · <span class="num ltr">${K(tt.tot)}</span></button>
      </div>
      ${S.cart.length?`<button class="btn ghost" id="clr" style="color:var(--bad)">${t('cancel_order')}</button>`:''}
    </div>`;
  const ct=$('#ctogt'); if(ct) ct.textContent = tt.qty ? `${tt.qty} · ${K(tt.tot)}` : '';
  if(matchMedia('(max-width:900px)').matches){ const c=$('#cclose'); c.hidden=false; c.onclick=()=>$('#cart').classList.remove('open'); }
  $$('#cart [data-ch]').forEach(b=>b.onclick=()=>{ S.ch=b.dataset.ch; if(!isApp(S.ch)) S.ref=''; drawCart(); drawGrid(); });
  $('#ref')?.addEventListener('input',e=>S.ref=e.target.value);
  [['cn','n'],['cp','p'],['ca','a']].forEach(([id,k])=>$('#'+id)?.addEventListener('input',e=>S.cust[k]=e.target.value));
  $$('#cart [data-p]').forEach(b=>b.onclick=()=>{ const l=S.cart[b.dataset.p]; if(l.q<99) l.q++; drawCart(); drawGrid(); });
  $$('#cart [data-m]').forEach(b=>b.onclick=()=>{ const l=S.cart[b.dataset.m]; if(--l.q<=0) S.cart.splice(b.dataset.m,1); drawCart(); drawGrid(); });
  $$('#cart [data-d]').forEach(b=>b.onclick=()=>{ S.cart.splice(b.dataset.d,1); drawCart(); drawGrid(); });
  $$('#cart [data-n]').forEach(b=>b.onclick=()=>noteLine(+b.dataset.n));
  $('#hold')&&($('#hold').onclick=holdOrder); $('#discb')&&($('#discb').onclick=openDiscount); $('#payb')&&($('#payb').onclick=openPay);
  $('#clr')&&($('#clr').onclick=()=>confirmBox(t('clear_q'),t('clear_t'),t('clear_ok'),resetCart));
}
const CHCOL = {keeta:'#e8b400',talabat:'#ff5a00',jahez:'#d81f3f',homey:'#5a3fc0'};
function resetCart(){ S.cart=[]; S.disc=null; S.ref=''; S.cust={n:'',p:'',a:''}; drawCart(); drawGrid(); }
const MODS = {
  wahed:[['بدون ثوم','No garlic'],['بدون مخلل','No pickles'],['زيادة صوص','Extra sauce'],['حار','Spicy'],['بدون بطاط','No fries'],['محمص زيادة','Extra toasted']],
  shaw:[['بدون ثوم','No garlic'],['بدون مخلل','No pickles'],['زيادة صوص','Extra sauce'],['سبايسي','Spicy'],['بدون بصل','No onion'],['بدون طماط','No tomato']],
  karak:[['بدون سكر','No sugar'],['سكر خفيف','Less sugar'],['سكر زيادة','Extra sugar'],['زيادة هيل','Extra cardamom'],['مقرمش','Crispy'],['بدون جبن','No cheese']]
};
function noteLine(i){
  const l=S.cart[i], it=S.idx.item[l.id], mods=(MODS[it.brand_id]||[]).map(m=>m[0]+' / '+m[1]);
  modal(`${mh(t('note_for',{n:nm(it)}))}<div class="md-b"><div class="chs">${mods.map(m=>`<button class="chip${l.note.includes(m)?' on':''}" data-mod="${esc(m)}">${esc(m)}</button>`).join('')}</div>
  <label class="f">${t('free_note')}<input class="inp" id="nt" value="${esc(l.note)}" maxlength="120"></label></div><div class="md-f"><button class="btn pri" id="ns">${t('save')}</button></div>`, m=>{
    $$('[data-mod]',m).forEach(b=>b.onclick=()=>{ b.classList.toggle('on'); const on=$$('[data-mod].on',m).map(x=>x.dataset.mod); const free=$('#nt').value.split('،').map(s=>s.trim()).filter(s=>s&&!mods.includes(s)); $('#nt').value=[...on,...free].join('، '); });
    $('#ns').onclick=()=>{ l.note=$('#nt').value.trim(); closeModal(); drawCart(); };
  });
}
const holdKey=()=>'pos_holds_'+S.branch;
function updHoldCount(){ const el=$('#hc'); if(el) el.textContent=LSx.get(holdKey(),[]).length; }
function holdOrder(){ const h=LSx.get(holdKey(),[]); h.push({t:Date.now(),cart:S.cart,ch:S.ch,ref:S.ref,cust:S.cust,disc:S.disc,tot:cartTotals().tot}); LSx.set(holdKey(),h); resetCart(); updHoldCount(); toast(t('held_ok')); }
function openHolds(){
  const h=LSx.get(holdKey(),[]);
  modal(`${mh(t('held_title'))}<div class="md-b">${h.length?h.map((x,i)=>`<div class="feed-r"><span class="pill">${esc(chName(x.ch))}</span><span class="nm">${t('items_n2',{n:x.cart.length})} · ${t('ago_min',{n:Math.round((Date.now()-x.t)/60000)})}</span><span style="display:flex;gap:6px;align-items:center"><b class="num ltr">${K(x.tot)}</b><button class="btn" data-r="${i}">${t('restore')}</button><button class="icon-btn" data-del="${i}">${ic('trash')}</button></span></div>`).join(''):`<div class="empty">${t('no_held')}</div>`}</div>`, m=>{
    $$('[data-r]',m).forEach(b=>b.onclick=()=>{ if(S.cart.length) holdOrder(); const a=LSx.get(holdKey(),[]); const x=a.splice(+b.dataset.r,1)[0]; LSx.set(holdKey(),a); Object.assign(S,{cart:x.cart,ch:x.ch,ref:x.ref||'',cust:x.cust||{n:'',p:'',a:''},disc:x.disc}); closeModal(); drawCart(); drawGrid(); updHoldCount(); });
    $$('[data-del]',m).forEach(b=>b.onclick=()=>{ const a=LSx.get(holdKey(),[]); a.splice(+b.dataset.del,1); LSx.set(holdKey(),a); closeModal(); openHolds(); updHoldCount(); });
  });
}
function openDiscount(){
  let type=S.disc?.type||'p', v=S.disc?.v??10, r=S.disc?.r||'dr_promo';
  const thr=+(S.cat.settings.discount_pin_pct??20);
  const draw=m=>{
    $('.md-b',m).innerHTML = `
      <div class="chs"><button class="chip${type==='p'?' on':''}" data-t="p">${t('pct')}</button><button class="chip${type==='a'?' on':''}" data-t="a">${t('fixed')}</button></div>
      ${type==='p'?`<div class="chs">${[5,10,15,20,25,50,100].map(x=>`<button class="chip${v==x?' on':''}" data-v="${x}">${x}%</button>`).join('')}</div>`:''}
      <label class="f">${type==='p'?t('percent'):t('amount_kwd')}<input class="inp num" id="dv" type="number" step="${type==='p'?1:0.05}" min="0" value="${v}"></label>
      <label class="f">${t('reason')}<select class="inp" id="dr">${DREASONS.map(x=>`<option value="${x}"${x===r?' selected':''}>${t(x)}</option>`).join('')}</select></label>
      ${S.me.role==='branch'?`<div class="muted" style="font-size:12px">${t('disc_pin_note',{n:thr})}</div>`:''}`;
    $$('[data-t]',m).forEach(b=>b.onclick=()=>{ type=b.dataset.t; v=type==='p'?10:0.5; draw(m); });
    $$('[data-v]',m).forEach(b=>b.onclick=()=>{ v=+b.dataset.v; draw(m); });
    $('#dv').oninput=e=>v=+e.target.value; $('#dr').onchange=e=>r=e.target.value;
  };
  modal(`${mh(t('disc_title'))}<div class="md-b"></div><div class="md-f">${S.disc?`<button class="btn danger" id="drm">${t('remove_disc')}</button>`:''}<button class="btn pri" id="dok">${t('apply')}</button></div>`, m=>{
    draw(m);
    $('#drm')&&($('#drm').onclick=()=>{ S.disc=null; closeModal(); drawCart(); });
    $('#dok').onclick=()=>{
      if(!(v>0)) return toast(t('enter_value'));
      const sub=cartTotals().sub, p = type==='p' ? v : pct(v*1000,sub);
      const apply=pin=>{ S.disc={type,v,r,pin}; closeModal(); drawCart(); };
      if(S.me.role==='branch' && p>thr) askPin(t('pin_title'), apply); else apply(null);
    };
  });
}

/* ================= PAYMENT & ORDER ================= */
function openPay(){
  if(shiftRequired()) return toast(t('e_NO_SHIFT'));
  const tt=cartTotals(), app=isApp(S.ch);
  let pay = app?'app':'cash', tend=0;
  const methods = app?['app','cash']:['cash','knet','card'];
  const quick = ()=>{ const s=new Set([tt.tot]); [0.5,1].forEach(st=>s.add(Math.ceil(tt.tot/(st*1000))*st*1000)); [1,5,10,20].forEach(x=>{ if(x*1000>=tt.tot) s.add(x*1000); }); return [...s].sort((a,b)=>a-b).slice(0,6); };
  const chg = m => { const d=tend-tt.tot, c=$('.change',m); if(!c) return; c.hidden=!tend; c.className='change'+(d<0?' neg':''); c.innerHTML=`<span>${d<0?t('short'):t('change')}</span><span class="num ltr">${K(Math.abs(d))}</span>`; $('#pok').disabled = pay==='cash' && tend>0 && tend<tt.tot; };
  const draw=m=>{
    $('.md-b',m).innerHTML = `
      <div class="big-total"><small>${t('due')} · ${esc(chName(S.ch))}${S.ref?' · #'+esc(S.ref):''}</small><b class="ltr">${K(tt.tot)}</b><small>${t('kwd_long')}</small></div>
      <div class="pays">${methods.map(k=>`<button class="pay${pay===k?' on':''}" data-pay="${k}">${ic(k)}${payName(k)}</button>`).join('')}</div>
      ${pay==='cash'?`<div class="cash-q">${quick().map(v=>`<button class="chip${tend===v?' on':''}" data-q="${v}"><span class="num ltr">${K(v)}</span></button>`).join('')}</div>
        <label class="f">${t('received')}<input class="inp num ltr" id="tend" type="number" step="0.05" min="0" value="${tend?K(tend):''}" placeholder="${K(tt.tot)}"></label>
        <div class="change" hidden></div>`:''}
      ${app&&!S.ref?`<div class="banner">${t('no_ref',{ch:esc(chName(S.ch))})}</div>`:''}`;
    $$('[data-pay]',m).forEach(b=>b.onclick=()=>{ pay=b.dataset.pay; tend=0; draw(m); });
    $$('[data-q]',m).forEach(b=>b.onclick=()=>{ tend=+b.dataset.q; draw(m); });
    const ti=$('#tend',m); if(ti) ti.oninput=e=>{ tend=Math.round((+e.target.value||0)*1000); chg(m); };
    chg(m);
  };
  modal(`${mh(t('pay_title'))}<div class="md-b"></div><div class="md-f"><button class="btn" data-x>${t('back')}</button><button class="btn pri lg" id="pok">${t('complete')}</button></div>`, m=>{
    draw(m); $('#pok').onclick=()=>{ $('#pok').disabled=true; $('#pok').textContent=t('saving'); submitOrder(pay, pay==='cash'?tend:0); };
  });
}
async function submitOrder(pay,tend){
  const p = { client_id:uid(), branch_id:S.branch, channel:S.ch, pay_method:pay,
    items:S.cart.map(l=>({item_id:l.id, variant_key:l.vk||null, qty:l.q, note:l.note||null})) };
  if(tend) p.tendered=tend;
  if(S.ref.trim()) p.platform_ref=S.ref.trim();
  if(S.ch==='phone' && (S.cust.n||S.cust.p)) p.customer={...S.cust};
  if(S.disc) p.discount={type:S.disc.type, value:S.disc.v, reason:I18N.ar[S.disc.r], pin:S.disc.pin||undefined};
  try{
    const o = await API.rpc('fn_create_order',{p});
    closeModal(); resetCart(); $('#cart')?.classList.remove('open');
    S.today.unshift(o); autoPrint(o); showReceipt(o,true); refreshToday();
  }catch(e){
    if(isNet(e)){
      p.created_at=new Date().toISOString(); Outbox.push(p); netState();
      const o=localOrder(p); closeModal(); resetCart(); autoPrint(o); showReceipt(o,true); toast(t('offline_saved'),5000);
    } else {
      closeModal(); fail(e);
      if(e.code==='PIN_INVALID'||e.code==='PIN_REQUIRED'){ if(S.disc) S.disc.pin=null; }
      if(e.code==='NO_SHIFT'){ S.shift=null; drawShiftGate(); }
      if(e.code.startsWith('ITEM_')) reloadCatalog();
    }
  }
}
/* a receipt built locally for an order waiting to be sent (prices from the cached menu) */
function localOrder(p){
  const b=B(p.branch_id), br=BRD(b.brand_id), ch=CHN(p.channel);
  const items=p.items.map(l=>{ const it=S.idx.item[l.item_id], v=l.variant_key?(S.idx.vars[it.id]||[]).find(x=>x.key===l.variant_key):null, u=unitPrice(it,l.variant_key,p.channel);
    return {item_name:it.name,item_name_en:it.name_en,variant_name:v?.name,variant_name_en:v?.name_en,qty:l.qty,unit_price:u,line_total:u*l.qty,note:l.note}; });
  const sub=items.reduce((a,i)=>a+i.line_total,0); const d=p.discount; const disc=!d?0:d.type==='p'?Math.round(sub*d.value/100):Math.min(sub,Math.round(d.value*1000));
  return {_offline:true,id:p.client_id,number:0,created_at:p.created_at,brand_name:br.name,brand_name_en:br.name_en,branch_name:b.name,branch_name_en:b.name_en,branch_phone:b.phone,receipt_note:br.receipt_note,
    channel:p.channel,channel_name:ch.name,channel_name_en:ch.name_en,platform_ref:p.platform_ref,pay_method:p.pay_method,subtotal:sub,discount:disc,discount_reason:d?.reason,total:sub-disc,tendered:p.tendered,customer:p.customer,cashier_name:S.me.username,status:'ok',items};
}
async function reloadCatalog(){ try{ S.cat=await API.catalog(); indexCatalog(); if(S.view==='pos'){ drawGrid(); drawCart(); } }catch{} }
/* turn a stored order row (from a table select) into the same shape fn_create_order returns */
function enrich(o){
  const b=B(o.branch_id), br=BRD(o.brand_id), ch=CHN(o.channel);
  return {...o, brand_name:br?.name, brand_name_en:br?.name_en, branch_name:b?.name, branch_name_en:b?.name_en, branch_phone:b?.phone, receipt_note:br?.receipt_note, channel_name:ch?.name, channel_name_en:ch?.name_en, items:(o.items||[]).slice().sort((a,c)=>a.id-c.id)};
}
function autoPrint(o){
  const c=Printer.cfg; const pages=[];
  if(c.auto) for(let i=0;i<Math.max(1,+c.copies||1);i++) pages.push(receiptHTML(o,{settings:S.cat.settings}));
  if(c.kitchen) pages.push(kitchenHTML(o));
  if(pages.length) Printer.run(pages);
}
function receiptView(o){
  const o2=enrich(o);
  return `<div class="rcpt">
    <div class="c"><b style="font-family:var(--f-display);font-size:17px">${esc(nm({name:o2.brand_name,name_en:o2.brand_name_en}))}</b><div class="muted" style="font-size:12px">${esc(nm({name:o2.branch_name,name_en:o2.branch_name_en}))} · <span class="ltr">${esc(o.biz_date||'')} ${hm(o.created_at)}</span></div></div>
    <div class="no num ltr">${o._offline?'—':'#'+o.number}</div>
    <div class="c"><span class="pill${isApp(o.channel)?' acc':''}">${esc(chName(o.channel))}${o.platform_ref?' · '+esc(o.platform_ref):''}</span> ${o.status==='void'?`<span class="pill bad">${t('st_void')}</span>`:''}${o._offline?`<span class="pill warn">${t('st_pending')}</span>`:''}</div>
    <hr>
    ${o2.items.map(i=>`<div class="row"><span><b class="num ltr">${i.qty}×</b> ${esc(nm({name:i.item_name,name_en:i.item_name_en}))}${i.variant_name?` <span class="muted">(${esc(nm({name:i.variant_name,name_en:i.variant_name_en}))})</span>`:''}${i.note?`<br><small style="color:var(--warn)">${esc(i.note)}</small>`:''}</span><span class="num ltr">${K(i.line_total)}</span></div>`).join('')}
    <hr>
    <div class="row"><span>${t('subtotal')}</span><span class="num ltr">${K(o.subtotal)}</span></div>
    ${o.discount?`<div class="row" style="color:var(--bad)"><span>${t('discount')} (${esc(o.discount_reason||'')})</span><span class="num ltr">-${K(o.discount)}</span></div>`:''}
    <div class="row" style="font-size:17px;font-weight:700"><span>${t('total')}</span><span class="num"><span class="ltr">${K(o.total)}</span> ${t('kwd')}</span></div>
    <div class="row muted"><span>${t('payment')}</span><span>${payName(o.pay_method)}</span></div>
    ${o.tendered?`<div class="row muted"><span>${t('received_change')}</span><span class="num ltr">${K(o.tendered)} / ${K(o.tendered-o.total)}</span></div>`:''}
    ${o.customer?`<div class="row muted"><span>${t('customer')}</span><span>${esc(o.customer.n||'')} <span class="ltr">${esc(o.customer.p||'')}</span> ${esc(o.customer.a||'')}</span></div>`:''}
    ${o.status==='void'?`<div class="row" style="color:var(--bad)"><span>${t('void_reason')}</span><span>${esc(o.void_reason||'')} · ${esc(o.voided_by||'')}</span></div>`:''}
    <hr><div class="c muted" style="font-size:12px">${t('cashier')}: <span class="ltr">${esc(o.cashier_name)}</span></div></div>`;
}
function showReceipt(o,fresh){
  const canVoid = !o._offline && o.status!=='void' && (S.me.role==='admin' || (S.me.role==='branch' && o.branch_id===S.me.branch_id && o.biz_date===bizToday()));
  modal(`${mh(fresh?t('saved'):t('details'))}<div class="md-b">${fresh&&o.tendered&&o.tendered>o.total?`<div class="change"><span>${t('change')}</span><span class="num ltr">${K(o.tendered-o.total)}</span></div>`:''}${receiptView(o)}
    ${!fresh&&o.kds?`<div class="muted" style="font-size:12px;text-align:center">${t('kds_state')}: ${t('kds_'+o.kds)}</div>`:''}</div>
    <div class="md-f">${canVoid?`<button class="btn danger" id="vd">${t('void_btn')}</button>`:''}<button class="btn" id="rk">${ic('print',16)} ${t('kitchen_ticket')}</button><button class="btn" id="rp">${ic('print',16)} ${fresh?t('print'):t('reprint')}</button><button class="btn pri lg" data-x>${fresh?t('new_order'):t('close')}</button></div>`, ()=>{
    const o2=enrich(o);
    $('#rp').onclick=()=>Printer.run([receiptHTML(o2,{settings:S.cat.settings,reprint:!fresh})]);
    $('#rk').onclick=()=>Printer.run([kitchenHTML(o2)]);
    $('#vd')&&($('#vd').onclick=()=>voidOrder(o));
  });
}
const VREASONS=['vr_entry','vr_cust','vr_app','vr_late','vr_item'];
function voidOrder(o){
  modal(`${mh(t('void_title',{n:o.number}))}<div class="md-b"><div class="banner">${t('void_warn')}</div>
    <label class="f">${t('reason')}<select class="inp" id="vr">${VREASONS.map(r=>`<option value="${r}">${t(r)}</option>`).join('')}</select></label></div>
    <div class="md-f"><button class="btn" data-x>${t('back')}</button><button class="btn danger" id="vok">${t('void_ok')}</button></div>`, ()=>{
    $('#vok').onclick=()=>{
      const reason=I18N.ar[$('#vr').value];
      const run=async pin=>{
        try{ const r=await API.rpc('fn_void_order',{p_id:o.id,p_reason:reason,p_pin:pin}); Object.assign(o,{status:'void',void_reason:r.void_reason,voided_by:r.voided_by}); closeModal(); toast(t('voided',{n:o.number}));
          if(S.view==='orders') drawOrdersTable(); if(BRANCH_VIEWS.includes(S.view)) refreshToday(); }
        catch(e){ fail(e); }
      };
      if(S.me.role==='branch') askPin(t('void_pin'),run); else run(null);
    };
  });
}

/* ================= PRINTER SETTINGS ================= */
function openPrinter(){
  const c=Printer.cfg;
  modal(`${mh(t('pr_title'))}<div class="md-b">
    <label class="f">${t('pr_width')}<select class="inp" id="pw"><option value="80"${c.width==80?' selected':''}>80 mm</option><option value="58"${c.width==58?' selected':''}>58 mm</option></select></label>
    <label class="f">${t('pr_lang')}<select class="inp" id="pl"><option value="both"${c.lang==='both'?' selected':''}>${t('pr_both')}</option><option value="ar"${c.lang==='ar'?' selected':''}>العربية</option><option value="en"${c.lang==='en'?' selected':''}>English</option></select></label>
    <label class="f">${t('pr_copies')}<select class="inp" id="pc">${[1,2,3].map(n=>`<option${c.copies==n?' selected':''}>${n}</option>`).join('')}</select></label>
    <div class="feed-r" style="grid-template-columns:minmax(0,1fr) auto"><span>${t('pr_auto')}</span><button class="switch${c.auto?' on':''}" id="pa"></button></div>
    <div class="feed-r" style="grid-template-columns:minmax(0,1fr) auto"><span>${t('pr_kitchen')}</span><button class="switch${c.kitchen?' on':''}" id="pk"></button></div>
    <div class="banner info" style="font-weight:500">${t('pr_tip')}</div></div>
    <div class="md-f"><button class="btn" id="pt">${ic('print',16)} ${t('pr_test')}</button><button class="btn pri" id="ps">${t('save')}</button></div>`, m=>{
    $('#pa').onclick=e=>e.currentTarget.classList.toggle('on'); $('#pk').onclick=e=>e.currentTarget.classList.toggle('on');
    const read=()=>({width:+$('#pw').value,lang:$('#pl').value,copies:+$('#pc').value,auto:$('#pa').classList.contains('on'),kitchen:$('#pk').classList.contains('on')});
    $('#pt').onclick=()=>{ Printer.save(read()); Printer.run([testPageHTML()]); };
    $('#ps').onclick=()=>{ Printer.save(read()); closeModal(); toast(t('settings_saved')); };
  });
}

/* ================= ORDERS ================= */
function renderOrders(){
  S.oDate ||= bizToday(); if(!S.oBranch) S.oBranch = S.me.role==='branch'?S.me.branch_id:'';
  const multi=S.me.role!=='branch';
  $('#main').innerHTML = `<div class="page">
    <div class="fbar">
      <label class="f">${t('day')}<input class="inp" type="date" id="od" value="${S.oDate}" max="${bizToday()}"></label>
      ${multi?`<label class="f">${t('branch')}<select class="inp" id="ob"><option value="">${t('all_branches')}</option>${scopeBranches().map(b=>`<option value="${b.id}"${b.id===S.oBranch?' selected':''}>${esc(brName(b.id))}</option>`).join('')}</select></label>`:''}
      <label class="f">${t('channel')}<select class="inp" id="oc"><option value="">${t('all')}</option>${S.cat.channels.map(c=>`<option value="${c.id}">${esc(nm(c))}</option>`).join('')}</select></label>
      <label class="f">${t('status')}<select class="inp" id="os"><option value="">${t('all')}</option><option value="ok">${t('st_ok')}</option><option value="void">${t('st_void')}</option></select></label>
      <label class="f" style="flex:1">${t('search').split('…')[0]}<input class="inp" id="oq" placeholder="${t('search_orders')}"></label>
    </div>
    <div id="osum" class="kpis"></div><div class="card"><div class="tw" id="otab"></div></div></div>`;
  $('#od').onchange=e=>{ S.oDate=e.target.value||bizToday(); loadOrders(); };
  $('#ob')&&($('#ob').onchange=e=>{ S.oBranch=e.target.value; loadOrders(); });
  ['oc','os','oq'].forEach(id=>$('#'+id).addEventListener('input',drawOrdersTable));
  loadOrders(); S.timers.orders=setInterval(()=>{ if(S.oDate===bizToday()) loadOrders(true); },30000);
}
async function loadOrders(silent){
  if(!silent){ S.oList=null; $('#otab').innerHTML=`<div class="empty">${t('loading')}</div>`; }
  try{ S.oList = await API.ordersDay(S.oDate, S.oBranch||null); }catch(e){ S.oList=S.oList||[]; if(!silent) fail(e); }
  drawOrdersTable();
}
function drawOrdersTable(){
  const el=$('#otab'); if(!el) return;
  const c=$('#oc').value, s=$('#os').value, q=$('#oq').value.trim();
  const pend = (S.oDate===bizToday()) ? Outbox.all().filter(p=>!S.oBranch||p.branch_id===S.oBranch).map(p=>({...localOrder(p),branch_id:p.branch_id,_pending:true})) : [];
  const list = [...pend, ...(S.oList||[])].filter(o=>(!c||o.channel===c)&&(!s||o.status===s)&&(!q||String(o.number)===q||(o.platform_ref||'').includes(q)||(o.customer?.p||'').includes(q)));
  const ok=list.filter(o=>o.status!=='void'&&!o._pending), net=ok.reduce((a,o)=>a+o.total,0);
  $('#osum').innerHTML = `<div class="kpi"><span class="l">${t('orders')}</span><span class="v num">${ok.length}</span></div>
    <div class="kpi"><span class="l">${t('net_sales')}</span><span class="v num">${KW(net)}</span></div>
    <div class="kpi"><span class="l">${t('avg_ticket')}</span><span class="v num">${KW(ok.length?net/ok.length:0)}</span></div>
    <div class="kpi"><span class="l">${t('voids')}</span><span class="v num">${list.filter(o=>o.status==='void').length}</span></div>`;
  const multi=!S.oBranch;
  el.innerHTML = list.length ? `<table class="t"><thead><tr><th>#</th><th>${t('time')}</th>${multi?`<th>${t('branch')}</th>`:''}<th>${t('channel')}</th><th>${t('items')}</th><th>${t('payment')}</th><th>${t('cashier')}</th><th class="n">${t('total')}</th><th>${t('status')}</th></tr></thead><tbody>
    ${list.map((o,i)=>`<tr data-i="${i}" style="cursor:pointer"><td class="num"><b>${o._pending?'—':o.number}</b></td><td class="num">${hm(o.created_at)}</td>${multi?`<td>${esc(brName(o.branch_id))}</td>`:''}<td>${esc(chName(o.channel))}${o.platform_ref?` <span class="muted ltr">${esc(o.platform_ref)}</span>`:''}</td><td class="num">${(o.items||[]).reduce((a,x)=>a+x.qty,0)}</td><td>${payName(o.pay_method)}</td><td class="ltr">${esc(o.cashier_name)}</td><td class="n">${K(o.total)}</td><td>${o._pending?`<span class="pill warn">${t('st_pending')}</span>`:o.status==='void'?`<span class="pill bad">${t('st_void')}</span>`:o.discount?`<span class="pill warn">${t('st_disc')}</span>`:`<span class="pill good">${t('st_ok')}</span>`}</td></tr>`).join('')}
    </tbody></table>` : `<div class="empty">${t('no_orders')}</div>`;
  $$('#otab tr[data-i]').forEach(tr=>tr.onclick=()=>showReceipt(list[+tr.dataset.i]));
}

/* ================= KDS ================= */
function renderKDS(){ $('#main').innerHTML=`<div class="page" id="kdsp"><div class="empty">${t('loading')}</div></div>`; refreshToday(); S.timers.kds=setInterval(refreshToday,8000); }
function drawKDS(){
  const el=$('#kdsp'); if(!el) return;
  const live=S.today.filter(o=>o.status!=='void'&&o.kds!=='out');
  const col=k=>live.filter(o=>o.kds===k).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  const nx={new:'kds_start',prep:'kds_ready',ready:'kds_done'};
  const card=o=>{ const mins=Math.floor((Date.now()-new Date(o.created_at))/60000); const cls=o.kds==='ready'?'ok':mins>=15?'l':mins>=8?'w':'';
    return `<div class="ktk ${cls}"><div class="hd"><b class="num ltr">#${o.number}</b><span class="pill${isApp(o.channel)?' acc':''}">${esc(chName(o.channel))}</span><span class="num muted">${mins}′</span></div>
    <ul>${(o.items||[]).map(i=>`<li><b class="num ltr">${i.qty}×</b><span>${esc(nm({name:i.item_name,name_en:i.item_name_en}))}${i.variant_name?` · ${esc(nm({name:i.variant_name,name_en:i.variant_name_en}))}`:''}${i.note?`<em>${esc(i.note)}</em>`:''}</span></li>`).join('')}</ul>
    <div style="display:flex;gap:8px">${o.kds!=='new'?`<button class="btn" data-k="${o.id}" data-d="-1">${t('back')}</button>`:''}<button class="btn pri" style="flex:1" data-k="${o.id}" data-d="1">${t(nx[o.kds])}</button></div></div>`; };
  el.innerHTML = `<div class="kds">${[['new','kds_new'],['prep','kds_prep'],['ready','kds_ready_col']].map(([k,n])=>`<section class="kcol"><h3>${t(n)} <span class="pill">${col(k).length}</span></h3>${col(k).map(card).join('')||`<div class="empty" style="padding:20px">${t('kds_empty')}</div>`}</section>`).join('')}</div><div class="muted" style="font-size:12px">${t('kds_note')}</div>`;
  const flow=['new','prep','ready','out'];
  $$('[data-k]',el).forEach(b=>b.onclick=async()=>{
    const o=S.today.find(x=>x.id===b.dataset.k); if(!o) return;
    const k=flow[Math.max(0,Math.min(3,flow.indexOf(o.kds)+(+b.dataset.d)))]; const old=o.kds; o.kds=k; drawKDS();
    try{ await API.rpc('fn_set_kds',{p_id:o.id,p_status:k}); }catch(e){ o.kds=old; drawKDS(); fail(e); }
  });
}

/* ================= SHIFT ================= */
async function renderShift(){
  $('#main').innerHTML=`<div class="page" id="shp"><div class="empty">${t('loading')}</div></div>`;
  let hist=[]; try{ [S.shift,hist]=await Promise.all([API.rpc('fn_shift_status',{p_branch:S.branch}),API.shifts(S.branch)]); }catch(e){ fail(e); }
  const el=$('#shp'); if(!el||S.view!=='shift') return;
  const x=S.shift; let body;
  if(!x) body=`<div class="card" style="max-width:520px"><h3>${t('shift_open_title')}</h3>
      <label class="f">${t('float')}<input class="inp num ltr" id="fl" type="number" step="0.25" min="0" value="20"></label>
      <button class="btn pri lg" id="sopen">${t('open_shift')}</button></div>`;
  else { const T=x.totals, exp=x.opening_float+T.cash;
    body=`<div class="kpis">
      <div class="kpi hero"><span class="l">${t('exp_cash')}</span><span class="v num">${KW(exp)}</span><span class="s">${t('exp_cash_s',{f:K(x.opening_float),c:K(T.cash)})}</span></div>
      <div class="kpi"><span class="l">${t('shift_orders')}</span><span class="v num">${T.orders}</span><span class="s">${t('since',{t:hm(x.opened_at),u:esc(x.opened_by)})}</span></div>
      <div class="kpi"><span class="l">${t('elec')}</span><span class="v num">${KW(T.knet+T.card)}</span></div>
      <div class="kpi"><span class="l">${t('app_sales')}</span><span class="v num">${KW(T.app)}</span></div></div>
      <div class="card" style="max-width:520px"><h3>${t('close_shift')}</h3>
      <label class="f">${t('counted')}<input class="inp num ltr" id="cnt" type="number" step="0.005" min="0"></label><div id="var"></div>
      <label class="f">${t('notes')}<input class="inp" id="snote" maxlength="200"></label>
      <button class="btn pri lg" id="sclose">${t('close_shift')}</button></div>`; }
  el.innerHTML = body + `<div class="card"><div class="card-h"><h3>${t('month_shifts')}</h3><span class="muted">${t('variance_note')}</span></div><div class="tw">${hist.length?`<table class="t"><thead><tr><th>${t('opened')}</th><th>${t('closed')}</th><th>${t('user')}</th><th class="n">${t('orders')}</th><th class="n">${t('cash')}</th><th class="n">${t('elec')}</th><th class="n">${t('expected')}</th><th class="n">${t('counted').split('(')[0]}</th><th class="n">${t('variance')}</th><th></th></tr></thead><tbody>
    ${hist.map((h,i)=>{ const v=h.counted-h.expected; return `<tr><td class="num ltr">${dkOf(new Date(h.opened_at).getTime()).slice(5)} ${hm(h.opened_at)}</td><td class="num">${hm(h.closed_at)}</td><td class="ltr">${esc(h.opened_by)}</td><td class="n">${h.orders_count}</td><td class="n">${K(h.cash_sales)}</td><td class="n">${K(h.knet_sales+h.card_sales)}</td><td class="n">${K(h.expected)}</td><td class="n">${K(h.counted)}</td><td class="n"><span class="pill ${Math.abs(v)<=250?'good':v<0?'bad':'warn'} ltr">${v>0?'+':''}${K(v)}</span></td><td><button class="icon-btn" data-z="${i}">${ic('print')}</button></td></tr>`; }).join('')}</tbody></table>`:`<div class="empty">${t('no_shifts')}</div>`}</div></div>`;
  const zprint = h => { const b=B(h.branch_id); Printer.run([zReportHTML({...h,branch_name:b.name,brand_name:BRD(b.brand_id).name,totals:h.totals||{net:(h.cash_sales||0)+(h.knet_sales||0)+(h.card_sales||0)+(h.app_sales||0)}})]); };
  $$('[data-z]').forEach(b=>b.onclick=()=>zprint(hist[+b.dataset.z]));
  $('#sopen')&&($('#sopen').onclick=async()=>{ try{ await API.rpc('fn_open_shift',{p_branch:S.branch,p_float:Math.round((+$('#fl').value||0)*1000)}); toast(t('shift_opened')); renderShift(); }catch(e){ fail(e); } });
  if(x){
    const exp=x.opening_float+x.totals.cash;
    $('#cnt').oninput=e=>{ const v=Math.round((+e.target.value||0)*1000)-exp; $('#var').innerHTML=e.target.value?`<div class="change${v<0?' neg':''}"><span>${v<0?t('under'):v>0?t('over'):t('match')}</span><span class="num ltr">${K(Math.abs(v))}</span></div>`:''; };
    $('#sclose').onclick=()=>{
      if($('#cnt').value==='') return toast(t('enter_count'));
      const c=Math.round(+$('#cnt').value*1000), note=$('#snote').value;
      confirmBox(t('close_q'),t('close_t'),t('close_shift'),async()=>{ try{ const r=await API.rpc('fn_close_shift',{p_shift:x.id,p_counted:c,p_note:note}); toast(t('shift_closed')); Printer.run([zReportHTML(r)]); renderShift(); }catch(e){ fail(e); } });
    };
  }
}
