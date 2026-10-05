/* Seven Icons POS — data layer (Supabase). Every write goes through a server function. */
const CFG = window.POS_CONFIG || {};
const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
  auth:{ persistSession:true, autoRefreshToken:true, storageKey:'sipos-auth' }
});
class ApiError extends Error{ constructor(code,raw){ super(code); this.code=code; this.raw=raw; } }
function apiErr(error){
  if(!error) return null;
  const m = error.message || String(error);
  if(/Failed to fetch|NetworkError|network|fetch/i.test(m) && !error.code) return new ApiError('net', m);
  const code = m.split(':')[0].trim();
  return new ApiError(code, m);
}
function errText(e){
  if(!e) return '';
  const code=e.code||'', raw=e.raw||e.message||'';
  if(code==='net') return t('e_net');
  if(code.startsWith('ITEM_UNAVAILABLE')) return t('e_ITEM_UNAVAILABLE',{x:raw.split(':').slice(1).join(':')});
  const k='e_'+code; return I18N.ar[k] ? t(k) : t('e_generic',{x:raw});
}
const isNet = e => e && (e.code==='net' || e instanceof TypeError);

const API = {
  async login(u,p){
    const {data,error}=await sb.auth.signInWithPassword({email:`${u}@${CFG.EMAIL_DOMAIN}`,password:p});
    if(error) throw apiErr(error); return data;
  },
  async logout(){ try{ await sb.auth.signOut(); }catch{} },
  async session(){ const {data}=await sb.auth.getSession(); return data.session; },
  async me(){
    const s=await this.session(); if(!s) return null;
    const {data,error}=await sb.from('staff').select('*').eq('user_id',s.user.id).maybeSingle();
    if(error) throw apiErr(error); return data;
  },
  async catalog(){
    const q=(tb,o='sort')=>sb.from(tb).select('*').order(o);
    const [b,br,ch,it,vr,st]=await Promise.all([q('brands'),q('branches'),q('channels'),q('items'),sb.from('item_variants').select('*').order('item_id').order('sort'),sb.from('settings').select('*')]);
    for(const r of [b,br,ch,it,vr,st]) if(r.error) throw apiErr(r.error);
    const settings={}; st.data.forEach(x=>settings[x.key]=x.value);
    return {brands:b.data,branches:br.data,channels:ch.data,items:it.data,variants:vr.data,settings};
  },
  async rpc(fn,args){ const {data,error}=await sb.rpc(fn,args); if(error) throw apiErr(error); return data; },
  async ordersDay(date, branch){
    let q=sb.from('orders').select('*, items:order_items(*)').eq('biz_date',date).order('created_at',{ascending:false}).limit(1000);
    if(branch) q=q.eq('branch_id',branch);
    const {data,error}=await q; if(error) throw apiErr(error); return data;
  },
  async latest(n){
    const {data,error}=await sb.from('orders').select('id,number,branch_id,brand_id,channel,total,status,created_at').order('created_at',{ascending:false}).limit(n);
    if(error) throw apiErr(error); return data;
  },
  async shifts(branch){
    const {data,error}=await sb.from('shifts').select('*').eq('branch_id',branch).not('closed_at','is',null).order('opened_at',{ascending:false}).limit(30);
    if(error) throw apiErr(error); return data;
  },
  async priceLog(){
    const {data,error}=await sb.from('price_log').select('*').order('at',{ascending:false}).limit(60);
    if(error) throw apiErr(error); return data;
  },
  async update(table, match, values){
    let q=sb.from(table).update(values); for(const k in match) q=q.eq(k,match[k]);
    const {error}=await q.select(); if(error) throw apiErr(error);
  }
};

/* orders that could not reach the server wait here and are retried with the same client_id (never duplicated) */
const Outbox = {
  key:'pos_outbox',
  all(){ try{ return JSON.parse(localStorage.getItem(this.key)||'[]'); }catch{ return []; } },
  put(a){ try{ localStorage.setItem(this.key,JSON.stringify(a)); }catch{} },
  push(p){ const a=this.all(); a.push(p); this.put(a); },
  busy:false,
  async flush(){
    if(this.busy||!navigator.onLine) return 0; this.busy=true; let sent=0;
    try{
      for(const p of this.all()){
        try{ await API.rpc('fn_create_order',{p}); this.put(this.all().filter(x=>x.client_id!==p.client_id)); sent++; }
        catch(e){ if(isNet(e)) break; console.error('outbox drop',p.client_id,e); p._error=errText(e); this.put(this.all().map(x=>x.client_id===p.client_id?p:x)); }
      }
    } finally { this.busy=false; }
    return sent;
  }
};
