/* Seven Icons POS — dashboard, reports, menu, settings, boot */
/* ================= CHARTS ================= */
function niceStep(v){ if(v<=0) return 1; const p=Math.pow(10,Math.floor(Math.log10(v))), f=v/p; return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p; }
const kShort = f => { const k=f/1000; if(k>=1000){ const x=k/1000; return (Number.isInteger(x)?x:x.toFixed(x>=10?0:1))+'k'; } return Number.isInteger(k)?String(k):k>=10?Math.round(k)+'':k.toFixed(1); };
function barChart(data,{h=220,cmp=null,every=1,yf=kShort,legend=null}={}){
  const W=800,H=h,pl=40,pr=6,pt=10,pb=24, ih=H-pt-pb;
  const raw=Math.max(1,...data.map(d=>d.v),...(cmp||[0])); const step=niceStep(raw/4); const max=Math.ceil(raw/step)*step; const nt=Math.round(max/step);
  const n=Math.max(1,data.length), bw=(W-pl-pr)/n, gap=Math.max(2,bw*.24), w=Math.max(1,bw-gap), y=v=>pt+ih*(1-v/max);
  const bar=(x,v,c,wd)=>{ const top=y(v), hh=H-pb-top; if(hh<=0) return ''; const r=Math.min(4,wd/2,hh); return `<path d="M${x},${H-pb} V${top+r} Q${x},${top} ${x+r},${top} H${x+wd-r} Q${x+wd},${top} ${x+wd},${top+r} V${H-pb} Z" style="fill:var(${c})"/>`; };
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img">`;
  for(let i=0;i<=nt;i++){ const v=step*i, yy=y(v); s+=`<line class="gl" x1="${pl}" x2="${W-pr}" y1="${yy}" y2="${yy}"/><text class="ax" x="${pl-6}" y="${yy+4}" text-anchor="end">${yf(v)}</text>`; }
  data.forEach((d,i)=>{ const x=pl+i*bw+gap/2;
    if(cmp) s+=bar(x+w*.08,cmp[i]||0,'--line-2',w*.84);
    s+=bar(cmp?x+w*.22:x,d.v,'--viz',cmp?w*.56:w);
    if(i%every===0) s+=`<text class="ax" x="${x+w/2}" y="${H-6}" text-anchor="middle">${esc(d.l)}</text>`;
    s+=`<rect x="${pl+i*bw}" y="${pt}" width="${bw}" height="${ih}" fill="transparent" data-tip="${esc(d.tip||'')}"/>`; });
  return `<div class="chart">${s}</svg></div>${legend?`<div class="legend" style="gap:14px">${legend}</div>`:''}`;
}
function hbars(rows,fmt=K){
  const max=Math.max(1,...rows.map(r=>r.v));
  return `<div class="hb">${rows.map(r=>`<div class="hb-r"><span class="lb" title="${esc(r.l)}">${r.icon||''}${esc(r.l)}</span><span class="bar"><i style="width:${(r.v/max*100).toFixed(1)}%"></i></span><span class="val num"><span class="ltr">${fmt(r.v)}</span>${r.sub?`<small> · ${r.sub}</small>`:''}</span></div>`).join('')||`<div class="muted">—</div>`}</div>`;
}
let tipEl=null;
document.addEventListener('mousemove',e=>{
  const tg=e.target.closest?.('[data-tip]'), tip=tg?.getAttribute('data-tip');
  if(!tip){ if(tipEl) tipEl.hidden=true; return; }
  if(!tipEl){ tipEl=document.createElement('div'); tipEl.className='tip'; document.body.appendChild(tipEl); }
  tipEl.hidden=false; tipEl.innerHTML=tip.split('|').map(esc).join('<br>');
  const r=tipEl.getBoundingClientRect(); let x=e.clientX+14, yy=e.clientY-r.height-10;
  if(x+r.width>innerWidth-8) x=e.clientX-r.width-14; if(yy<8) yy=e.clientY+16;
  tipEl.style.left=x+'px'; tipEl.style.top=yy+'px';
});
const delta=(a,b)=>{ if(!b) return ''; const d=(a-b)/b*100; return `<span class="delta ${d>=0?'up':'dn'} ltr">${d>=0?'▲':'▼'} ${Math.abs(d).toFixed(1)}%</span>`; };
const hourOrder = () => Array.from({length:24},(_,i)=>(i+cutoff())%24);
const chIcon = k => isApp(k)?`<span class="bdg" style="background:${CHCOL[k]||'#555'};width:16px;height:16px;border-radius:5px;font-size:9px;display:inline-grid;margin-inline-end:6px;vertical-align:-3px">${esc((CHN(k)?.name_en||k)[0])}</span>`:'';
const z = o => o || {c:0,v:0,com:0,disc:0,g:0,app:0};
const reasonName = ar => { for(const k in I18N.ar) if((k.startsWith('dr_')||k.startsWith('vr_')) && I18N.ar[k]===ar) return t(k); return ar; };
const itemLabel = x => nm({name:x.n,name_en:x.ne}) + (x.vn?' · '+nm({name:x.vn,name_en:x.vne}):'');

/* ================= DASHBOARD ================= */
async function renderDash(){
  $('#main').innerHTML=`<div class="page" id="dpage"><div class="empty">${t('loading')}</div></div>`;
  await loadDash(); S.timers.dash=setInterval(loadDash,30000);
}
async function loadDash(){
  const d=bizToday(), lw=addDays(d,-7), cut=new Date(Date.now()-7*864e5).toISOString();
  try{
    const [A,L,LA,feed]=await Promise.all([
      API.rpc('fn_report',{p_from:d,p_to:d}), API.rpc('fn_report',{p_from:lw,p_to:lw,p_cut:cut}),
      API.rpc('fn_report',{p_from:lw,p_to:lw}), API.latest(14)]);
    if(S.view==='dash') drawDash(A,L,LA,feed,lw);
  }catch(e){ if(!isNet(e)) fail(e); }
}
function drawDash(A,L,LA,feed,lw){
  const el=$('#dpage'); if(!el) return;
  const T=A.totals, P=L.totals, ho=hourOrder();
  const brands=[...new Set(scopeBranches().map(b=>b.brand_id))];
  el.innerHTML = `
    <div class="kpis">
      <div class="kpi hero"><span class="l">${t('today_net')}</span><span class="v num">${KW(T.net)}</span><span class="s">${delta(T.net,P.net)} ${t('vs_last',{d:WEEKDAYS()[dow(lw)]})}</span></div>
      <div class="kpi"><span class="l">${t('orders_count')}</span><span class="v num">${nf(T.cnt)}</span><span class="s">${delta(T.cnt,P.cnt)} · ${t('last_week')} ${nf(P.cnt)}</span></div>
      <div class="kpi"><span class="l">${t('avg_ticket')}</span><span class="v num">${KW(T.cnt?T.net/T.cnt:0)}</span><span class="s">${delta(T.cnt?T.net/T.cnt:0,P.cnt?P.net/P.cnt:0)}</span></div>
      <div class="kpi"><span class="l">${t('delivery_share')}</span><span class="v num ltr">${pct(T.app,T.net).toFixed(1)}%</span><span class="s">${K(T.app)} ${t('kwd')} · ${t('commissions')} ${K(T.com)}</span></div>
      <div class="kpi"><span class="l">${t('voids_discs')}</span><span class="v num">${T.vc} <small>${t('voided')}</small></span><span class="s">${K(T.vv)} · ${t('discounts')} ${K(T.disc)}</span></div>
    </div>
    <div class="row3">
      <div class="card"><div class="card-h"><h3>${t('by_hour')}</h3><span class="muted">${t('today_vs')}</span></div>
        ${barChart(ho.map(h=>({l:p2(h),v:A.hour[h].v,tip:`${p2(h)}:00|${t('today')}: ${K(A.hour[h].v)} · ${A.hour[h].c}|${t('last_week')}: ${K(LA.hour[h].v)}`})),{cmp:ho.map(h=>LA.hour[h].v),every:2,legend:`<span class="legend"><i style="background:var(--viz)"></i> ${t('today')}</span><span class="legend"><i style="background:var(--line-2)"></i> ${t('last_week')}</span>`})}</div>
      <div class="card"><div class="card-h"><h3>${t('by_brand')}</h3></div>
        ${hbars(brands.map(b=>({l:nm(BRD(b)),v:z(A.brand[b]).v,sub:z(A.brand[b]).c+' '+t('order_n')})))}
        <div class="card-h"><h3>${t('by_channel')}</h3></div>
        ${hbars(S.cat.channels.map(c=>({l:nm(c),icon:chIcon(c.id),v:z(A.ch[c.id]).v,sub:pct(z(A.ch[c.id]).v,T.net).toFixed(0)+'%'})).sort((a,b)=>b.v-a.v))}</div>
    </div>
    <div class="row3">
      <div class="card"><div class="card-h"><h3>${t('branches_now')}</h3><span class="muted">${t('ranked')}</span></div><div class="tw"><table class="t"><thead><tr><th>${t('branch')}</th><th class="n">${t('orders')}</th><th class="n">${t('net')}</th><th class="n">${t('avg')}</th><th>${t('vs_lw')}</th><th>${t('last_order')}</th></tr></thead><tbody>
        ${scopeBranches().map(b=>({b,a:z(A.branch[b.id]),l:z(L.branch[b.id])})).sort((x,y)=>y.a.v-x.a.v).map(({b,a,l})=>{ const m=a.last?Math.round((Date.now()-new Date(a.last))/60000):null; return `<tr><td><span class="bdg bg-${b.brand_id}" style="display:inline-grid;width:22px;height:22px;font-size:10px;margin-inline-end:8px;vertical-align:-6px">${esc(BRD(b.brand_id).short)}</span>${esc(brName(b.id))}</td><td class="n">${a.c}</td><td class="n">${K(a.v)}</td><td class="n">${K(a.c?a.v/a.c:0)}</td><td>${delta(a.v,l.v)||'<span class="muted">—</span>'}</td><td>${m===null?`<span class="pill">${t('no_orders_yet')}</span>`:`<span class="pill ${m>45?'warn':'good'}">${t('ago_min',{n:m})}</span>`}</td></tr>`; }).join('')}
      </tbody></table></div></div>
      <div class="card"><div class="card-h"><h3>${t('latest')}</h3><span class="pill good"><i class="dot"></i> ${t('live')}</span></div><div class="feed">
        ${feed.map(o=>`<div class="feed-r"><span class="bdg bg-${o.brand_id}">${esc(BRD(o.brand_id)?.short||'')}</span><span class="nm">#${o.number} · ${esc(nm(B(o.branch_id)))} · ${esc(chName(o.channel))}${o.status==='void'?` · <span style="color:var(--bad)">${t('st_void')}</span>`:''}</span><span class="num"><b class="ltr">${K(o.total)}</b> <span class="muted">${hm(o.created_at)}</span></span></div>`).join('')||`<div class="empty">${t('none_today')}</div>`}
      </div></div>
    </div>`;
}

/* ================= REPORTS ================= */
const R = {from:null,to:null,preset:'7d',brand:'',branch:'',ch:'',tab:'ov',A:null,P:null,key:null};
function presetRange(p){
  const d=bizToday();
  if(p==='today') return [d,d]; if(p==='yday'){ const y=addDays(d,-1); return [y,y]; }
  if(p==='7d') return [addDays(d,-6),d]; if(p==='30d') return [addDays(d,-29),d]; if(p==='mtd') return [d.slice(0,8)+'01',d];
  if(p==='lm'){ const e=addDays(d.slice(0,8)+'01',-1); return [e.slice(0,8)+'01',e]; }
  return [R.from,R.to];
}
function renderReports(){
  if(!R.from) [R.from,R.to]=presetRange(R.preset);
  const brands=[...new Set(scopeBranches().map(b=>b.brand_id))];
  const presets=[['today','today'],['yday','yday'],['7d','last7'],['30d','last30'],['mtd','mtd'],['lm','lm']];
  $('#main').innerHTML = `<div class="page">
    <div class="fbar">
      <div class="seg">${presets.map(([k,n])=>`<button class="chip${R.preset===k?' on':''}" data-pr="${k}">${t(n)}</button>`).join('')}</div>
      <label class="f">${t('from_d')}<input class="inp" type="date" id="rf" value="${R.from}" max="${bizToday()}"></label>
      <label class="f">${t('to')}<input class="inp" type="date" id="rt" value="${R.to}" max="${bizToday()}"></label>
      ${brands.length>1?`<label class="f">${t('brand')}<select class="inp" id="rb"><option value="">${t('all_brands')}</option>${brands.map(b=>`<option value="${b}"${R.brand===b?' selected':''}>${esc(nm(BRD(b)))}</option>`).join('')}</select></label>`:''}
      ${S.me.role!=='branch'?`<label class="f">${t('branch')}<select class="inp" id="rbr"><option value="">${t('all_branches')}</option>${scopeBranches().filter(b=>!R.brand||b.brand_id===R.brand).map(b=>`<option value="${b.id}"${R.branch===b.id?' selected':''}>${esc(brName(b.id))}</option>`).join('')}</select></label>`:''}
      <label class="f">${t('channel')}<select class="inp" id="rch"><option value="">${t('all_channels')}</option><option value="@store"${R.ch==='@store'?' selected':''}>${t('in_store')}</option><option value="@app"${R.ch==='@app'?' selected':''}>${t('all_apps')}</option>${S.cat.channels.map(c=>`<option value="${c.id}"${R.ch===c.id?' selected':''}>${esc(nm(c))}</option>`).join('')}</select></label>
      <div style="display:flex;gap:8px;margin-inline-start:auto;flex-wrap:wrap"><button class="btn" id="xo">${ic('dl',16)} ${t('csv_orders')}</button><button class="btn" id="xi">${ic('dl',16)} ${t('csv_items')}</button><button class="btn" id="xp">${ic('print',16)} ${t('print_report')}</button></div>
    </div>
    <div class="tabs" id="rtabs">${['ov','ch','br','it','ct'].map(k=>`<button data-t="${k}" class="${R.tab===k?'on':''}">${t('tab_'+k)}</button>`).join('')}</div>
    <div id="rbody" style="display:grid;gap:18px"><div class="empty">${t('loading')}</div></div></div>`;
  const reload=()=>{ R.A=null; renderReports(); };
  $$('[data-pr]').forEach(b=>b.onclick=()=>{ R.preset=b.dataset.pr; [R.from,R.to]=presetRange(R.preset); reload(); });
  $('#rf').onchange=e=>{ R.preset='custom'; R.from=e.target.value; if(R.from>R.to) R.to=R.from; reload(); };
  $('#rt').onchange=e=>{ R.preset='custom'; R.to=e.target.value; if(R.from>R.to) R.from=R.to; reload(); };
  $('#rb')&&($('#rb').onchange=e=>{ R.brand=e.target.value; R.branch=''; reload(); });
  $('#rbr')&&($('#rbr').onchange=e=>{ R.branch=e.target.value; reload(); });
  $('#rch').onchange=e=>{ R.ch=e.target.value; reload(); };
  $$('#rtabs button').forEach(b=>b.onclick=()=>{ R.tab=b.dataset.t; $$('#rtabs button').forEach(x=>x.classList.toggle('on',x===b)); drawReport(); });
  $('#xo').onclick=exportOrders; $('#xi').onclick=exportItems;
  $('#xp').onclick=()=>{ document.body.classList.add('print-report'); setTimeout(()=>{ window.print(); document.body.classList.remove('print-report'); },50); };
  const key=[R.from,R.to,R.brand,R.branch,R.ch].join('|');
  if(R.A && R.key===key) drawReport(); else loadReport(key);
}
async function loadReport(key){
  R.key=key; const days=Math.round((new Date(R.to)-new Date(R.from))/864e5)+1;
  const args={p_brand:R.brand||null,p_branch:R.branch||null,p_channel:R.ch||null};
  try{
    const [A,P]=await Promise.all([API.rpc('fn_report',{p_from:R.from,p_to:R.to,...args}), API.rpc('fn_report',{p_from:addDays(R.from,-days),p_to:addDays(R.from,-1),...args})]);
    if(R.key!==key) return; R.A=A; R.P=P; R.prevLabel=`${addDays(R.from,-days)} → ${addDays(R.from,-1)}`; drawReport();
  }catch(e){ const el=$('#rbody'); if(el) el.innerHTML=`<div class="banner">${t('load_fail')}</div>`; console.error(e); }
}
function drawReport(){
  const el=$('#rbody'); if(!el||!R.A) return;
  const A=R.A, P=R.P, T=A.totals, PT=P.totals;
  const noComm = S.cat.channels.filter(c=>c.kind==='app').every(c=>!+c.commission_pct);
  const head = noComm&&T.app ? `<div class="banner">${t('no_comm')}</div>` : '';
  const kp = `<div class="kpis">
    <div class="kpi hero"><span class="l">${t('net_sales')}</span><span class="v num">${KW(T.net)}</span><span class="s">${delta(T.net,PT.net)} ${t('vs_prev')}</span></div>
    <div class="kpi"><span class="l">${t('gross')}</span><span class="v num">${KW(T.gross)}</span><span class="s">${t('discounts')} ${K(T.disc)} (${pct(T.disc,T.gross).toFixed(1)}%)</span></div>
    <div class="kpi"><span class="l">${t('orders_count')}</span><span class="v num">${nf(T.cnt)}</span><span class="s">${delta(T.cnt,PT.cnt)} · ${nf(T.qty)} ${t('pieces')}</span></div>
    <div class="kpi"><span class="l">${t('avg_ticket')}</span><span class="v num">${KW(T.cnt?T.net/T.cnt:0)}</span><span class="s">${delta(T.cnt?T.net/T.cnt:0,PT.cnt?PT.net/PT.cnt:0)}</span></div>
    <div class="kpi"><span class="l">${t('platform_com')}</span><span class="v num">${KW(T.com)}</span><span class="s">${pct(T.com,T.app).toFixed(1)}% ${t('of_app')}</span></div>
    <div class="kpi"><span class="l">${t('net_after')}</span><span class="v num">${KW(T.net-T.com)}</span><span class="s">${delta(T.net-T.com,PT.net-PT.com)}</span></div>
    <div class="kpi"><span class="l">${t('voids')}</span><span class="v num">${T.vc}</span><span class="s">${t('worth',{v:K(T.vv)})}</span></div></div>`;
  if(!T.cnt && !T.vc){ el.innerHTML=head+kp+`<div class="empty card">${t('no_sales')}</div>`; return; }
  const brs=scopeBranches().filter(b=>(!R.brand||b.brand_id===R.brand)&&(!R.branch||b.id===R.branch));
  let body='';
  if(R.tab==='ov'){
    const days=[]; for(let d=R.from; d<=R.to; d=addDays(d,1)) days.push(d);
    const ho=hourOrder(); const heat=Array.from({length:7},()=>Array(24).fill(0)); A.heat.forEach(([w,h,v])=>heat[w][h]=v); const hmax=Math.max(1,...heat.flat());
    body=`<div class="card"><div class="card-h"><h3>${days.length>1?t('daily_net'):t('by_hour')}</h3><span class="muted">${t('hover')}</span></div>
      ${days.length>1?barChart(days.map(d=>{ const x=A.day[d]||{c:0,v:0}; return {l:d.slice(8),v:x.v,tip:`${WEEKDAYS()[dow(d)]} ${d}|${t('net')}: ${K(x.v)}|${t('orders')}: ${x.c}|${t('avg')}: ${K(x.c?x.v/x.c:0)}`}; }),{every:Math.ceil(days.length/16)})
        :barChart(ho.map(h=>({l:p2(h),v:A.hour[h].v,tip:`${p2(h)}:00|${K(A.hour[h].v)} · ${A.hour[h].c}`})),{every:2})}</div>
    <div class="row2">
      <div class="card"><div class="card-h"><h3>${t('orders_by_hour')}</h3></div>${barChart(ho.map(h=>({l:p2(h),v:A.hour[h].c*1000,tip:`${p2(h)}:00|${A.hour[h].c} ${t('order_n')}`})),{every:3,h:180,yf:v=>Math.round(v/1000)})}</div>
      <div class="card"><div class="card-h"><h3>${t('sales_by_brand')}</h3></div>${hbars(Object.entries(A.brand).map(([b,x])=>({l:nm(BRD(b)),v:x.v,sub:pct(x.v,T.net).toFixed(1)+'%'})).sort((a,b)=>b.v-a.v))}
        <div class="card-h"><h3>${t('pay_methods')}</h3></div>${hbars(Object.entries(A.pay).map(([k,x])=>({l:payName(k),v:x.v,sub:x.c+' '+t('order_n')})).sort((a,b)=>b.v-a.v))}</div></div>
    <div class="card"><div class="card-h"><h3>${t('heatmap')}</h3><span class="legend">${t('less')} <i style="background:color-mix(in srgb,var(--viz) 12%,var(--surface-3))"></i><i style="background:color-mix(in srgb,var(--viz) 45%,var(--surface-3))"></i><i style="background:var(--viz)"></i> ${t('more')}</span></div>
      <div class="tw"><div class="heat"><div class="hh"></div>${ho.map(h=>`<div class="hh num">${h%3===0?p2(h):''}</div>`).join('')}
      ${[0,1,2,3,4,5,6].map(w=>`<div class="hl">${WEEKDAYS()[w]}</div>${ho.map(h=>{ const v=heat[w][h]; return `<div data-tip="${WEEKDAYS()[w]} ${p2(h)}:00|${K(v)}" style="background:${v?`color-mix(in srgb,var(--viz) ${Math.round(10+90*v/hmax)}%,var(--surface-3))`:'var(--surface-3)'}"></div>`; }).join('')}`).join('')}</div></div></div>`;
  }
  if(R.tab==='ch'){
    const rows=S.cat.channels.map(c=>({k:c.id,...z(A.ch[c.id])}));
    const apps=S.cat.channels.filter(c=>c.kind==='app');
    body=`<div class="row2"><div class="card"><div class="card-h"><h3>${t('net_by_ch')}</h3></div>${hbars(rows.map(r=>({l:chName(r.k),icon:chIcon(r.k),v:r.v,sub:pct(r.v,T.net).toFixed(1)+'%'})).sort((a,b)=>b.v-a.v))}</div>
      <div class="card"><div class="card-h"><h3>${t('store_vs_app')}</h3></div>${hbars([{l:t('in_branch'),v:T.net-T.app,sub:pct(T.net-T.app,T.net).toFixed(1)+'%'},{l:t('apps'),v:T.app,sub:pct(T.app,T.net).toFixed(1)+'%'},{l:t('platform_com'),v:T.com,sub:pct(T.com,T.app).toFixed(1)+'%'}])}</div></div>
    <div class="card"><div class="card-h"><h3>${t('ch_detail')}</h3></div><div class="tw"><table class="t"><thead><tr><th>${t('channel')}</th><th class="n">${t('orders')}</th><th class="n">${t('gross')}</th><th class="n">${t('discounts')}</th><th class="n">${t('net')}</th><th class="n">${t('share')}</th><th class="n">${t('avg_ticket')}</th><th class="n">${t('commission')}</th><th class="n">${t('net_after_com')}</th></tr></thead><tbody>
      ${rows.filter(r=>r.c).sort((a,b)=>b.v-a.v).map(r=>`<tr><td>${chIcon(r.k)}${esc(chName(r.k))}</td><td class="n">${nf(r.c)}</td><td class="n">${K(r.g)}</td><td class="n">${K(r.disc)}</td><td class="n">${K(r.v)}</td><td class="n">${pct(r.v,T.net).toFixed(1)}%</td><td class="n">${K(r.v/r.c)}</td><td class="n">${K(r.com)}</td><td class="n"><b>${K(r.v-r.com)}</b></td></tr>`).join('')}
      </tbody><tfoot><tr><td>${t('total_row')}</td><td class="n">${nf(T.cnt)}</td><td class="n">${K(T.gross)}</td><td class="n">${K(T.disc)}</td><td class="n">${K(T.net)}</td><td class="n">100%</td><td class="n">${K(T.cnt?T.net/T.cnt:0)}</td><td class="n">${K(T.com)}</td><td class="n">${K(T.net-T.com)}</td></tr></tfoot></table></div></div>
    <div class="card"><div class="card-h"><h3>${t('recon')}</h3><span class="muted">${t('recon_s')}</span></div><div class="tw"><table class="t"><thead><tr><th>${t('branch')}</th>${apps.map(a=>`<th class="n">${esc(nm(a))}</th>`).join('')}<th class="n">${t('sum')}</th><th class="n">${t('commission')}</th></tr></thead><tbody>
      ${brs.map(b=>{ let s=0,cm=0; const cells=apps.map(a=>{ const x=A.chbr[a.id+'|'+b.id]; s+=x?.v||0; cm+=x?.com||0; return `<td class="n">${x?`${K(x.v)} <span class="muted">(${x.c})</span>`:'—'}</td>`; }).join(''); return `<tr><td>${esc(brName(b.id))}</td>${cells}<td class="n"><b>${K(s)}</b></td><td class="n">${K(cm)}</td></tr>`; }).join('')}
      </tbody></table></div></div>`;
  }
  if(R.tab==='br'){
    const rows=brs.map(b=>({b,x:z(A.branch[b.id]),p:z(P.branch[b.id])})).sort((a,b)=>b.x.v-a.x.v);
    const nd=Math.max(1,Object.keys(A.day).length);
    body=`<div class="card"><div class="card-h"><h3>${t('br_rank')}</h3><span class="muted">${t('prev_period',{p:esc(R.prevLabel)})}</span></div>${hbars(rows.map(({b,x})=>({l:brName(b.id),v:x.v,sub:pct(x.v,T.net).toFixed(1)+'%'})))}</div>
    <div class="card"><div class="card-h"><h3>${t('br_perf')}</h3></div><div class="tw"><table class="t"><thead><tr><th>#</th><th>${t('branch')}</th><th class="n">${t('orders')}</th><th class="n">${t('net')}</th><th>${t('change_col')}</th><th class="n">${t('avg_ticket')}</th><th class="n">${t('deliv_share')}</th><th class="n">${t('discounts')}</th><th class="n">${t('voids')}</th><th class="n">${t('commission')}</th><th class="n">${t('net_after_com')}</th></tr></thead><tbody>
      ${rows.map(({b,x,p},i)=>`<tr><td class="num">${i+1}</td><td>${esc(brName(b.id))}</td><td class="n">${nf(x.c)}</td><td class="n"><b>${K(x.v)}</b></td><td>${delta(x.v,p.v)||'—'}</td><td class="n">${K(x.c?x.v/x.c:0)}</td><td class="n">${pct(x.app,x.v).toFixed(0)}%</td><td class="n">${K(x.disc)}</td><td class="n">${x.vc||0}</td><td class="n">${K(x.com)}</td><td class="n">${K(x.v-x.com)}</td></tr>`).join('')}
      </tbody></table></div></div>
    <div class="card"><div class="card-h"><h3>${t('brand_sum')}</h3></div><div class="tw"><table class="t"><thead><tr><th>${t('brand')}</th><th class="n">${t('n_branches')}</th><th class="n">${t('orders')}</th><th class="n">${t('net')}</th><th>${t('change_col')}</th><th class="n">${t('avg_ticket')}</th><th class="n">${t('per_branch_day')}</th></tr></thead><tbody>
      ${Object.entries(A.brand).map(([k,x])=>{ const nb=brs.filter(b=>b.brand_id===k).length||1; return `<tr><td>${esc(nm(BRD(k)))}</td><td class="n">${nb}</td><td class="n">${nf(x.c)}</td><td class="n"><b>${K(x.v)}</b></td><td>${delta(x.v,z(P.brand[k]).v)||'—'}</td><td class="n">${K(x.v/x.c)}</td><td class="n">${K(x.v/nb/nd)}</td></tr>`; }).join('')}
      </tbody></table></div></div>`;
  }
  if(R.tab==='it'){
    const items=A.items, sold=new Set(items.map(x=>x.iid)), brandsIn=Object.keys(A.brand);
    const dead=S.cat.items.filter(i=>brandsIn.includes(i.brand_id)&&!sold.has(i.id));
    body=`<div class="row2"><div class="card"><div class="card-h"><h3>${t('top_items')}</h3><span class="muted">${t('before_disc')}</span></div>${hbars(items.slice(0,10).map(x=>({l:itemLabel(x),v:x.v,sub:nf(x.q)+' '+t('pcs')})))}</div>
      <div class="card"><div class="card-h"><h3>${t('cat_mix')}</h3></div>${hbars(A.cat.slice(0,12).map(c=>({l:(brandsIn.length>1?nm(BRD(c.br))+' · ':'')+nm({name:c.cat,name_en:c.cate}),v:c.v,sub:pct(c.v,T.gross).toFixed(1)+'%'})))}</div></div>
    <div class="card"><div class="card-h"><h3>${t('all_items')}</h3><span class="muted">${t('sold_n',{n:items.length})}</span></div><div class="tw" style="max-height:520px;overflow:auto"><table class="t"><thead><tr><th>#</th><th>${t('item')}</th><th>${t('option')}</th><th>${t('category')}</th>${brandsIn.length>1?`<th>${t('brand')}</th>`:''}<th class="n">${t('qty')}</th><th class="n">${t('value')}</th><th class="n">${t('share')}</th><th class="n">${t('in_orders')}</th></tr></thead><tbody>
      ${items.map((x,i)=>`<tr><td class="num">${i+1}</td><td>${esc(nm({name:x.n,name_en:x.ne}))}</td><td>${x.vn?esc(nm({name:x.vn,name_en:x.vne})):'—'}</td><td>${esc(nm({name:x.cat,name_en:x.cate}))}</td>${brandsIn.length>1?`<td>${esc(nm(BRD(x.br)))}</td>`:''}<td class="n">${nf(x.q)}</td><td class="n"><b>${K(x.v)}</b></td><td class="n">${pct(x.v,T.gross).toFixed(2)}%</td><td class="n">${nf(x.o)}</td></tr>`).join('')}
    </tbody></table></div></div>
    ${dead.length?`<div class="card"><div class="card-h"><h3>${t('dead')}</h3><span class="pill warn">${dead.length}</span></div><div class="chs">${dead.map(i=>`<span class="chip">${esc(nm(i))}</span>`).join('')}</div></div>`:''}`;
  }
  if(R.tab==='ct'){
    const users=Object.entries(A.users).sort((a,b)=>b[1].v-a[1].v);
    body=`<div class="row2"><div class="card"><div class="card-h"><h3>${t('disc_by_reason')}</h3><span class="muted">${t('n_disc',{n:T.dc})}</span></div>${hbars(Object.entries(A.dr).map(([k,v])=>({l:reasonName(k),v})).sort((a,b)=>b.v-a.v))}</div>
      <div class="card"><div class="card-h"><h3>${t('void_by_reason')}</h3><span class="muted">${t('n_void',{n:T.vc})}</span></div>${hbars(Object.entries(A.vr).map(([k,v])=>({l:reasonName(k),v})).sort((a,b)=>b.v-a.v))}</div></div>
    <div class="card"><div class="card-h"><h3>${t('cashier_perf')}</h3></div><div class="tw"><table class="t"><thead><tr><th>${t('user')}</th><th class="n">${t('orders')}</th><th class="n">${t('net')}</th><th class="n">${t('avg')}</th><th class="n">${t('disc_orders')}</th><th class="n">${t('disc_value')}</th><th class="n">${t('voids')}</th></tr></thead><tbody>
      ${users.map(([u,x])=>`<tr><td class="ltr">${esc(u)}</td><td class="n">${nf(x.c)}</td><td class="n">${K(x.v)}</td><td class="n">${K(x.c?x.v/x.c:0)}</td><td class="n">${x.dc} <span class="muted">(${pct(x.dc,x.c).toFixed(1)}%)</span></td><td class="n">${K(x.disc)}</td><td class="n">${x.voids?`<span class="pill ${x.voids>3?'bad':'warn'}">${x.voids}</span>`:0}</td></tr>`).join('')}
    </tbody></table></div></div>
    <div class="row2">
      <div class="card"><div class="card-h"><h3>${t('void_log')}</h3></div><div class="tw" style="max-height:420px;overflow:auto"><table class="t"><thead><tr><th>${t('day')}</th><th>${t('branch')}</th><th>#</th><th>${t('reason')}</th><th>${t('by')}</th><th class="n">${t('value')}</th></tr></thead><tbody>${A.voids.map(o=>`<tr><td class="num">${o.biz_date.slice(5)} ${hm(o.created_at)}</td><td>${esc(nm(B(o.branch_id)))}</td><td class="num">${o.number}</td><td>${esc(reasonName(o.void_reason))}</td><td class="ltr">${esc(o.voided_by||'')}</td><td class="n">${K(o.total)}</td></tr>`).join('')||`<tr><td colspan="6" class="muted">${t('none')}</td></tr>`}</tbody></table></div></div>
      <div class="card"><div class="card-h"><h3>${t('disc_log')}</h3></div><div class="tw" style="max-height:420px;overflow:auto"><table class="t"><thead><tr><th>${t('day')}</th><th>${t('branch')}</th><th>#</th><th>${t('reason')}</th><th>${t('cashier')}</th><th class="n">${t('discount')}</th></tr></thead><tbody>${A.discs.map(o=>`<tr><td class="num">${o.biz_date.slice(5)} ${hm(o.created_at)}</td><td>${esc(nm(B(o.branch_id)))}</td><td class="num">${o.number}</td><td>${esc(reasonName(o.discount_reason))}${o.discount_pin?` <span class="pill acc">${t('pin_ok')}</span>`:''}</td><td class="ltr">${esc(o.cashier_name)}</td><td class="n">${K(o.discount)} <span class="muted">(${Math.round(o.discount_pct||0)}%)</span></td></tr>`).join('')||`<tr><td colspan="6" class="muted">${t('none')}</td></tr>`}</tbody></table></div></div>
    </div>`;
  }
  el.innerHTML = head+kp+body;
}
function download(name, rows){
  const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  const blob=new Blob(['﻿'+rows.map(r=>r.map(q).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
  toast(t('file_ready'));
}
async function exportOrders(){
  const days=Math.round((new Date(R.to)-new Date(R.from))/864e5);
  if(days>92) return toast(t('export_range'));
  try{
    const rows=await API.rpc('fn_export_orders',{p_from:R.from,p_to:R.to,p_brand:R.brand||null,p_branch:R.branch||null});
    const h=LANG==='ar'?['رقم الطلب','اليوم','الوقت','العلامة','الفرع','القناة','رقم المنصة','الدفع','القطع','الإجمالي','الخصم','سبب الخصم','الصافي','العمولة','الصافي بعد العمولة','الحالة','سبب الإلغاء','الكاشير']
      :['Order','Business day','Time','Brand','Branch','Channel','Platform ref','Payment','Pieces','Gross','Discount','Discount reason','Net','Commission','Net after commission','Status','Void reason','Cashier'];
    download(`seven-icons-orders-${R.from}_${R.to}.csv`, [h, ...rows.map(o=>[o.number,o.biz_date,hm(o.created_at),o.brand,o.branch,o.channel,o.platform_ref,payName(o.pay_method),o.items,K(o.subtotal),K(o.discount),o.discount_reason,K(o.total),K(o.commission),K(o.total-o.commission),o.status==='void'?t('st_void'):t('st_ok'),o.void_reason,o.cashier])]);
  }catch(e){ fail(e); }
}
function exportItems(){
  if(!R.A) return;
  const h=[t('item'),t('option'),t('category'),t('brand'),t('qty'),t('value')];
  download(`seven-icons-items-${R.from}_${R.to}.csv`, [h, ...R.A.items.map(x=>[nm({name:x.n,name_en:x.ne}),x.vn?nm({name:x.vn,name_en:x.vne}):'',nm({name:x.cat,name_en:x.cate}),nm(BRD(x.br)),x.q,K(x.v)])]);
}

/* ================= MENU (admin) ================= */
let menuBrand=null, draft=null;
function renderMenu(){
  menuBrand ||= S.cat.brands[0].id;
  if(!draft) draft={items:{},vars:{}};
  const items=itemsOf(menuBrand); const dirty=Object.keys(draft.items).length+Object.keys(draft.vars).length;
  $('#main').innerHTML=`<div class="page">
    <div class="card-h"><div class="tabs" style="border:0">${S.cat.brands.map(b=>`<button data-mb="${b.id}" class="${b.id===menuBrand?'on':''}">${esc(nm(b))} <span class="muted num">${itemsOf(b.id).length}</span></button>`).join('')}</div>
      <div style="display:flex;gap:8px"><button class="btn" id="plog">${t('price_log')}</button><button class="btn" id="mrev"${dirty?'':' disabled'}>${t('revert')}</button><button class="btn pri" id="msave"${dirty?'':' disabled'}>${t('save_changes')}${dirty?` (${dirty})`:''}</button></div></div>
    <div class="banner info" style="font-weight:500">${t('menu_note')}</div>
    <div class="card"><div class="tw"><table class="t"><thead><tr><th>${t('item')}</th><th>${t('category')}</th><th>${t('option')}</th><th>${t('base_price')}</th><th>${t('available')}</th></tr></thead><tbody>
    ${items.map(it=>{ const vs=S.idx.vars[it.id]||[null]; return vs.map((v,i)=>{ const key=v?it.id+'|'+v.key:it.id; const cur=v?(draft.vars[key]??v.price):(draft.items[it.id]?.price??it.price); const av=draft.items[it.id]?.available??it.available; const ch=v?draft.vars[key]!=null:draft.items[it.id]?.price!=null;
      return `<tr>${i===0?`<td rowspan="${vs.length}"><b>${esc(nm(it))}</b><span class="en">${esc(LANG==='ar'?it.name_en||'':it.name)}</span></td><td rowspan="${vs.length}" class="muted">${esc(nm(it,'category'))}</td>`:''}<td>${v?esc(nm(v)):'—'}</td>
      <td><input class="inp num ltr" style="width:110px;padding:6px 8px${ch?';border-color:var(--warn)':''}" type="number" step="0.005" min="0" data-k="${esc(key)}" data-v="${v?1:0}" value="${K(cur)}"></td>
      ${i===0?`<td rowspan="${vs.length}"><button class="switch${av?' on':''}" data-av="${it.id}"></button></td>`:''}</tr>`; }).join(''); }).join('')}
    </tbody></table></div></div></div>`;
  $$('[data-mb]').forEach(b=>b.onclick=()=>{ menuBrand=b.dataset.mb; renderMenu(); });
  $$('[data-k]').forEach(inp=>inp.onchange=()=>{ const v=Math.round(+inp.value*1000); if(!(v>=0)) return; if(inp.dataset.v==='1') draft.vars[inp.dataset.k]=v; else (draft.items[inp.dataset.k] ||= {}).price=v; setTimeout(renderMenu); });
  $$('[data-av]').forEach(b=>b.onclick=()=>{ const id=b.dataset.av, it=S.idx.item[id]; const cur=draft.items[id]?.available??it.available; (draft.items[id] ||= {}).available=!cur; renderMenu(); });
  $('#mrev').onclick=()=>{ draft=null; renderMenu(); };
  $('#plog').onclick=async()=>{ try{ const rows=await API.priceLog(); modal(`${mh(t('price_log'))}<div class="md-b"><div class="tw"><table class="t"><thead><tr><th>${t('day')}</th><th>${t('user')}</th><th>${t('item')}</th><th class="n">←</th><th class="n">→</th><th>${t('available')}</th></tr></thead><tbody>${rows.map(r=>`<tr><td class="num ltr">${dkOf(new Date(r.at).getTime())} ${hm(r.at)}</td><td class="ltr">${esc(r.by_user||'')}</td><td>${esc(nm(S.idx.item[r.item_id])||r.item_id)}${r.variant_key?' · '+esc(r.variant_key):''}</td><td class="n">${r.old_price!=null?K(r.old_price):''}</td><td class="n">${r.new_price!=null?K(r.new_price):''}</td><td>${r.new_available==null?'':r.new_available?'✓':'✕'}</td></tr>`).join('')||`<tr><td colspan="6" class="muted">${t('none')}</td></tr>`}</tbody></table></div></div>`,null,true); }catch(e){ fail(e); } };
  $('#msave').onclick=async()=>{
    $('#msave').disabled=true;
    try{
      for(const [id,ch] of Object.entries(draft.items)) await API.update('items',{id},ch);
      for(const [k,p] of Object.entries(draft.vars)){ const [item_id,key]=k.split('|'); await API.update('item_variants',{item_id,key},{price:p}); }
      draft=null; S.cat=await API.catalog(); indexCatalog(); toast(t('menu_saved')); renderMenu();
    }catch(e){ fail(e); renderMenu(); }
  };
}

/* ================= SETTINGS (admin) ================= */
function renderSettings(){
  const st=S.cat.settings, apps=S.cat.channels.filter(c=>c.kind==='app');
  $('#main').innerHTML=`<div class="page">
    <div class="card"><div class="card-h"><h3>${t('s_apps')}</h3><span class="muted">${t('s_apps_s')}</span></div><div class="tw"><table class="t"><thead><tr><th>${t('platform')}</th><th>${t('comm_pct')}</th><th>${t('markup_pct')}</th></tr></thead><tbody>
      ${apps.map(a=>`<tr><td>${chIcon(a.id)}${esc(nm(a))}</td><td><input class="inp num ltr" style="width:110px" type="number" step="0.5" min="0" max="60" data-cm="${a.id}" value="${+a.commission_pct}"></td><td><input class="inp num ltr" style="width:110px" type="number" step="1" min="0" max="50" data-mk="${a.id}" value="${+a.markup_pct}"></td></tr>`).join('')}
    </tbody></table></div></div>
    <div class="set-grid">
      <div class="card"><h3>${t('s_receipt')}</h3>
        <label class="f">${t('footer_ar')}<input class="inp" id="sfa" value="${esc(st.receipt_footer||'')}"></label>
        <label class="f">${t('footer_en')}<input class="inp ltr" id="sfe" value="${esc(st.receipt_footer_en||'')}"></label>
        <label class="f">${t('cutoff')}<select class="inp" id="scut">${[0,1,2,3,4,5,6].map(h=>`<option value="${h}"${+st.cutoff_hour===h?' selected':''}>${p2(h)}:00</option>`).join('')}</select></label>
        <div class="muted" style="font-size:12px">${t('cutoff_s')}</div>
        <label class="f">${t('disc_pin_pct')}<input class="inp num ltr" id="sdp" type="number" min="0" max="100" value="${+st.discount_pin_pct}"></label>
        <div class="feed-r" style="grid-template-columns:minmax(0,1fr) auto"><span>${t('require_shift')}</span><button class="switch${st.require_shift!==false?' on':''}" id="srs"></button></div>
      </div>
      <div class="card"><h3>${t('s_pins')}</h3><div class="muted" style="font-size:12px">${t('s_pins_s')}</div>
        ${S.cat.branches.map(b=>`<div class="feed-r" style="grid-template-columns:minmax(0,1fr) auto"><span>${esc(brName(b.id))}</span><button class="btn" data-pin="${b.id}">${t('change_pin')}</button></div>`).join('')}
      </div>
      <div class="card"><h3>${t('s_users')}</h3><div class="muted" style="font-size:13px">${t('s_users_s')}</div></div>
    </div>
    <div style="display:flex;justify-content:flex-end"><button class="btn pri lg" id="ssave">${t('save')}</button></div></div>`;
  $('#srs').onclick=e=>e.currentTarget.classList.toggle('on');
  $$('[data-pin]').forEach(b=>b.onclick=()=>{
    modal(`${mh(t('new_pin',{b:brName(b.dataset.pin)}))}<div class="md-b"><label class="f">${t('pin_digits')}<input class="inp ltr num" id="np" inputmode="numeric" maxlength="4"></label></div><div class="md-f"><button class="btn pri" id="nps">${t('save')}</button></div>`, ()=>{
      $('#nps').onclick=async()=>{ const v=$('#np').value.trim(); if(!/^\d{4}$/.test(v)) return toast(t('e_PIN_FORMAT')); try{ await API.rpc('fn_set_pin',{p_branch:b.dataset.pin,p_pin:v}); closeModal(); toast(t('pin_saved')); }catch(e){ fail(e); } };
    });
  });
  $('#ssave').onclick=async()=>{
    try{
      for(const a of apps){ const cm=+$(`[data-cm="${a.id}"]`).value||0, mk=+$(`[data-mk="${a.id}"]`).value||0; if(cm!==+a.commission_pct||mk!==+a.markup_pct) await API.update('channels',{id:a.id},{commission_pct:cm,markup_pct:mk}); }
      const ns={receipt_footer:$('#sfa').value,receipt_footer_en:$('#sfe').value,cutoff_hour:+$('#scut').value,discount_pin_pct:+$('#sdp').value||0,require_shift:$('#srs').classList.contains('on')};
      for(const [k,v] of Object.entries(ns)) if(JSON.stringify(v)!==JSON.stringify(st[k])) await API.update('settings',{key:k},{value:v});
      S.cat=await API.catalog(); indexCatalog(); toast(t('settings_saved')); renderSettings();
    }catch(e){ fail(e); }
  };
}

/* ================= BOOT ================= */
(async function boot(){
  const th=LSx.get('pos_theme',null); if(th) document.documentElement.dataset.theme=th;
  if(!CFG.SUPABASE_URL || /YOUR-PROJECT/.test(CFG.SUPABASE_URL)){
    $('#root').innerHTML=`<div class="page"><div class="banner">config.js: SUPABASE_URL / SUPABASE_ANON_KEY</div></div>`; return;
  }
  if('serviceWorker' in navigator && location.protocol==='https:') navigator.serviceWorker.register('sw.js').catch(()=>{});
  $('#root').innerHTML=`<div class="empty" style="height:100%">${t('loading')}</div>`;
  try{ if(await API.session()) await afterAuth(); else renderLogin(); }
  catch(e){ console.error(e); renderLogin(errText(e)); }
})();
