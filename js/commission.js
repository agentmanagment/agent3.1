(function(){
  const {$,esc,icon,Data,money,boot,session,toast,store,fdate,lc,num}=AP;
  const R=PORTAL.RATES;
  const page=boot({active:'commission.html',title:'Commission',subtitle:'Your rates and earnings'}); if(!page) return;
  const u=session().username; let def=null;
  page.innerHTML=`<div class="rate-row">
    <div class="card hero-card"><div class="sub">Total earned</div><div class="big" id="tot">–</div><div class="sub" style="margin-top:10px">Paid out automatically every 24 hours once it exceeds $100.</div></div>
    <div class="card stat"><span>Withdrawal commission</span><b>${R.withdrawal*100}%</b></div>
    <div class="card stat"><span>Deposit commission</span><b>${R.deposit*100}%</b></div>
    <div class="card stat"><span>Payout account</span><div id="pay" class="stat" style="gap:4px"><b style="font-size:19px">—</b></div><a class="btn ghost sm" style="align-self:flex-start" href="banks.html">View accounts</a></div></div>
  <div class="panel"><div class="panel-head"><h2>Earnings</h2></div><div class="tw"><table><thead><tr><th>#</th><th>Type</th><th class="right">Amount</th><th class="right">Commission</th><th>Date</th></tr></thead><tbody id="rows"><tr><td colspan="5" class="empty">Loading…</td></tr></tbody></table></div></div>`;
  function mask(n){n=String(n);return n.length>6?'•••• '+n.slice(-4):n;}
  (async()=>{try{
    const bk=await Data.banks(u).catch(()=>[]); def=bk.find(b=>b.def)||bk[0]; const pa=document.getElementById('pay'); if(pa&&def) pa.innerHTML=`<b style="font-size:19px">${esc(def.bank)}</b><span class="mono">${esc(mask(def.number))}</span>`;
    const [w,d]=await Promise.all([Data.withdrawals(u),Data.deposits(u)]);
    const list=[...w,...d].filter(t=>lc(t.status)==='confirmed').map(t=>({...t,amt:num(t.amount),com:num(t.amount)*(t.kind==='Withdrawal'?R.withdrawal:R.deposit)})).sort((a,b)=>(parseInt(b.id)||0)-(parseInt(a.id)||0));
    const by={};list.forEach(t=>by[t.currency]=(by[t.currency]||0)+t.com);
    $('#tot').innerHTML=Object.keys(by).length?Object.entries(by).map(([c,v])=>`<div>${money(v,c)}</div>`).join(''):'0.00';
    $('#rows').innerHTML=list.length?list.map(t=>`<tr><td class="mono">${esc(t.id)}</td><td>${t.kind}</td><td class="right">${money(t.amt,t.currency)}</td><td class="right"><b>${money(t.com,t.currency)}</b></td><td>${fdate(t.date)}</td></tr>`).join(''):`<tr><td colspan="5"><div class="empty">${icon('pct')}<div>No earnings yet</div></div></td></tr>`;
  }catch(e){toast('Couldn’t load commission.','error');}})();
})();
