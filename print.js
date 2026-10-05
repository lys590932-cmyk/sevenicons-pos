/* Seven Icons POS — thermal printing (80mm / 58mm) through the browser print pipeline.
   With Chrome started with --kiosk-printing the job goes straight to the default printer. */
const Printer = {
  get cfg(){ const d={width:80,auto:true,kitchen:false,copies:1,lang:'both'}; try{ return {...d,...JSON.parse(localStorage.getItem('pos_print')||'{}')}; }catch{ return d; } },
  save(c){ try{ localStorage.setItem('pos_print', JSON.stringify(c)); }catch{} },
  css(w){
    const body = w===58 ? 48 : 72;
    return `@page{size:${w}mm auto;margin:0}
      *{box-sizing:border-box}
      html,body{margin:0;padding:0;background:#fff;color:#000}
      body{width:${body}mm;margin:0 auto;padding:3mm 0 6mm;font-family:Tahoma,"Arial",sans-serif;font-size:${w===58?11:12}px;line-height:1.35}
      .c{text-align:center} .b{font-weight:700} .xl{font-size:${w===58?26:34}px;font-weight:700;line-height:1.05}
      .l{font-size:${w===58?15:18}px;font-weight:700} .s{font-size:${w===58?9.5:10.5}px}
      .row{display:flex;justify-content:space-between;gap:6px} .row>span:last-child{white-space:nowrap;text-align:end}
      .ltr{direction:ltr;unicode-bidi:isolate}
      hr{border:0;border-top:1px dashed #000;margin:5px 0}
      hr.solid{border-top:2px solid #000}
      table{width:100%;border-collapse:collapse} td{vertical-align:top;padding:2px 0}
      td.q{width:9%;font-weight:700} td.p{width:24%;text-align:end;white-space:nowrap}
      .en{font-size:${w===58?9.5:10.5}px;color:#000;direction:ltr;unicode-bidi:isolate}
      .note{font-size:${w===58?10:11}px;font-weight:700}
      .stamp{border:2px solid #000;text-align:center;font-weight:700;padding:2px;margin:4px 0;font-size:14px}
      .k td{font-size:${w===58?15:18}px;font-weight:700;padding:3px 0} .k td.q{width:14%}
      .sig{margin-top:18px;border-top:1px solid #000;padding-top:2px;font-size:10px}`;
  },
  frame(){
    let f=document.getElementById('printFrame');
    if(!f){ f=document.createElement('iframe'); f.id='printFrame'; f.setAttribute('aria-hidden','true'); document.body.appendChild(f); }
    return f;
  },
  /* print one or more HTML pages; resolves when the dialog closes (or immediately with kiosk-printing) */
  run(pages){
    const c=this.cfg;
    const html = pages.map((p,i)=>`<div style="${i?'break-before:page;':''}">${p}</div>`).join('');
    const f=this.frame();
    return new Promise(res=>{
      f.onload=()=>{ const back=document.activeElement; try{ f.contentWindow.focus(); f.contentWindow.print(); }catch(e){ console.warn(e); } window.focus(); try{ back&&back.focus&&back.focus(); }catch{} setTimeout(res,300); };
      f.srcdoc=`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${this.css(c.width)}</style></head><body>${html}</body></html>`;
    });
  }
};
const pk = f => (Math.round(f||0)/1000).toFixed(3);
const pesc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function kwTime(ts){ const d=new Date(new Date(ts).getTime()+3*3600e3); const p=n=>String(n).padStart(2,'0'); return `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`; }
const PAY_BI = {cash:['كاش','Cash'],knet:['كي نت','KNET'],card:['فيزا / ماستر','Card'],app:['مدفوع للمنصة','Paid online']};

/* bilingual label helper for receipts: lang = both | ar | en */
function bi(ar,en,lang,cls){ if(lang==='ar'||!en) return pesc(ar); if(lang==='en') return pesc(en); return `${pesc(ar)}<div class="en ${cls||''}">${pesc(en)}</div>`; }
function biInline(ar,en,lang){ if(lang==='ar'||!en) return pesc(ar); if(lang==='en') return pesc(en); return `${pesc(ar)} <span class="en">${pesc(en)}</span>`; }

function receiptHTML(o, opts={}){
  const L = Printer.cfg.lang, S = opts.settings||{};
  const head = `
    <div class="c l">${biInline(o.brand_name, o.brand_name_en, L)}</div>
    <div class="c s">${biInline('فرع '+(o.branch_name||''), o.branch_name_en?o.branch_name_en+' branch':'', L)}${o.branch_phone?` · <span class="ltr">${pesc(o.branch_phone)}</span>`:''}</div>
    ${o.receipt_note?`<div class="c s">${pesc(o.receipt_note)}</div>`:''}
    <hr class="solid">
    ${opts.reprint?`<div class="stamp">${biInline('نسخة مكررة','REPRINT',L)}</div>`:''}
    ${o.status==='void'?`<div class="stamp">${biInline('ملغي','VOID',L)}</div>`:''}
    ${o._offline?`<div class="stamp">${biInline('مؤقت — بانتظار الإرسال','TEMPORARY — not yet sent',L)}</div>`:''}
    <div class="c s">${biInline('رقم الطلب','Order No.',L)}</div>
    <div class="c xl ltr">${o._offline?'—':'#'+o.number}</div>
    <div class="c b">${biInline(o.channel_name, o.channel_name_en, L)}${o.platform_ref?` · <span class="ltr">${pesc(o.platform_ref)}</span>`:''}</div>
    <div class="row s"><span class="ltr">${kwTime(o.created_at)}</span><span>${biInline('الكاشير','Cashier',L)}: <span class="ltr">${pesc(o.cashier_name)}</span></span></div>
    <hr>`;
  const lines = `<table>${(o.items||[]).map(i=>`<tr><td class="q ltr">${i.qty}×</td><td>${bi(i.item_name+(i.variant_name?' ('+i.variant_name+')':''), i.item_name_en?(i.item_name_en+(i.variant_name_en?' ('+i.variant_name_en+')':'')):'', L)}${i.note?`<div class="note">* ${pesc(i.note)}</div>`:''}</td><td class="p ltr">${pk(i.line_total)}</td></tr>`).join('')}</table><hr>`;
  const pay = PAY_BI[o.pay_method]||[o.pay_method,o.pay_method];
  const totals = `
    <div class="row"><span>${biInline('المجموع','Subtotal',L)}</span><span class="ltr">${pk(o.subtotal)}</span></div>
    ${o.discount?`<div class="row"><span>${biInline('خصم','Discount',L)} ${o.discount_reason?'('+pesc(o.discount_reason)+')':''}</span><span class="ltr">-${pk(o.discount)}</span></div>`:''}
    <div class="row l"><span>${biInline('الإجمالي','TOTAL',L)}</span><span class="ltr">${pk(o.total)} KWD</span></div>
    <div class="row"><span>${biInline('الدفع','Payment',L)}</span><span>${biInline(pay[0],pay[1],L)}</span></div>
    ${o.tendered?`<div class="row"><span>${biInline('المستلم','Received',L)}</span><span class="ltr">${pk(o.tendered)}</span></div><div class="row b"><span>${biInline('الباقي','Change',L)}</span><span class="ltr">${pk(o.tendered-o.total)}</span></div>`:''}
    ${o.customer&&(o.customer.n||o.customer.p)?`<hr><div class="s">${biInline('العميل','Customer',L)}: ${pesc(o.customer.n||'')} <span class="ltr">${pesc(o.customer.p||'')}</span><br>${pesc(o.customer.a||'')}</div>`:''}
    ${o.status==='void'?`<div class="s">${biInline('سبب الإلغاء','Void reason',L)}: ${pesc(o.void_reason||'')} · ${pesc(o.voided_by||'')}</div>`:''}
    <hr>
    <div class="c s">${biInline(S.receipt_footer||'شكراً لزيارتكم', S.receipt_footer_en||'Thank you for visiting', L)}</div>
    <div class="c s ltr">${pesc(o.id?String(o.id).slice(0,8).toUpperCase():'')}</div>`;
  return head+lines+totals;
}

function kitchenHTML(o){
  return `
    <div class="c b">${pesc(o.brand_name)} · ${pesc(o.branch_name)}</div>
    <div class="c xl ltr">${o._offline?'—':'#'+o.number}</div>
    <div class="c l">${pesc(o.channel_name)}${o.channel_name_en?' / '+pesc(o.channel_name_en):''}${o.platform_ref?` · <span class="ltr">${pesc(o.platform_ref)}</span>`:''}</div>
    <div class="c s ltr">${kwTime(o.created_at)}</div><hr class="solid">
    <table class="k">${(o.items||[]).map(i=>`<tr><td class="q ltr">${i.qty}×</td><td>${pesc(i.item_name)}${i.variant_name?' — '+pesc(i.variant_name):''}${i.item_name_en?`<div class="en">${pesc(i.item_name_en)}${i.variant_name_en?' — '+pesc(i.variant_name_en):''}</div>`:''}${i.note?`<div class="note">* ${pesc(i.note)}</div>`:''}</td></tr>`).join('')}</table>
    <hr class="solid"><div class="c s">${(o.items||[]).reduce((a,i)=>a+i.qty,0)} pcs</div>`;
}

function zReportHTML(x){
  const L=Printer.cfg.lang, T=x.totals||{};
  const v=(x.counted||0)-(x.expected||0);
  const r=(ar,en,val)=>`<div class="row"><span>${biInline(ar,en,L)}</span><span class="ltr">${val}</span></div>`;
  return `
    <div class="c l">${biInline('تقرير إغلاق الوردية','Shift closing report',L)}</div>
    <div class="c">${pesc(x.brand_name||'')} · ${pesc(x.branch_name||'')}</div><hr class="solid">
    ${r('فتح','Opened',kwTime(x.opened_at)+' · '+pesc(x.opened_by))}
    ${r('إغلاق','Closed',kwTime(x.closed_at)+' · '+pesc(x.closed_by||''))}<hr>
    ${r('الطلبات','Orders',x.orders_count)}
    ${r('الملغاة','Voids',x.voids_count+' ('+pk(T.void_value)+')')}
    ${r('الخصومات','Discounts',pk(x.discounts))}<hr>
    ${r('كاش','Cash',pk(x.cash_sales))}
    ${r('كي نت','KNET',pk(x.knet_sales))}
    ${r('بطاقات','Cards',pk(x.card_sales))}
    ${r('مدفوع للمنصات','Paid online',pk(x.app_sales))}
    <div class="row b"><span>${biInline('صافي المبيعات','Net sales',L)}</span><span class="ltr">${pk(T.net)}</span></div><hr>
    ${r('رصيد الفتح','Opening float',pk(x.opening_float))}
    ${r('النقد المتوقع','Expected cash',pk(x.expected))}
    ${r('النقد المعدود','Counted cash',pk(x.counted))}
    <div class="row l"><span>${biInline(v<0?'عجز':v>0?'زيادة':'مطابق', v<0?'Short':v>0?'Over':'Balanced', L)}</span><span class="ltr">${v>0?'+':''}${pk(v)}</span></div>
    ${x.note?`<hr><div class="s">${pesc(x.note)}</div>`:''}
    <div class="sig">${biInline('توقيع الكاشير','Cashier signature',L)}</div>
    <div class="sig">${biInline('توقيع المدير','Manager signature',L)}</div>`;
}
function testPageHTML(){
  return `<div class="c l">Seven Icons POS</div><div class="c">طباعة تجريبية · Test print</div><hr class="solid">
  <div class="row"><span>عرض الورق · Width</span><span class="ltr">${Printer.cfg.width}mm</span></div>
  <div class="row"><span>العربية تظهر بشكل صحيح</span><span class="ltr">0.750</span></div>
  <div class="row"><span class="ltr">English line check</span><span class="ltr">12.950</span></div><hr>
  <div class="c xl ltr">#123</div><div class="c s ltr">${kwTime(Date.now())}</div>`;
}
