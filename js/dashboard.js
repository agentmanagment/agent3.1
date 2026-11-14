(function(){
  const {$,esc,icon,Data,badge,money,sheet,row,boot,session,fdate}=AP;
  const page=boot({active:'dashboard.html',title:'Overview',subtitle:`Welcome back, ${(session().fullName||session().username).split(' ')[0]}`}); if(!page) return;
  page.innerHTML=`<div class="grid stats">
    ${[['pending','Pending','clock'],['confirmed','Confirmed','check'],['rejected','Rejected','x']].map(([k,l,i])=>`<div class="card stat"><div class="ico ${k}">${icon(i)}</div><b id="c-${k}">–</b><span>${l} transactions</span></div>`).join('')}</div>
    <div class="panel"><div class="panel-head"><h2>Recent Activity</h2></div><div class="tw"><table><thead><tr><th>#</th><th>Type</th><th>Method</th><th>Amount</th><th>Status</th></tr></thead><tbody id="rows"><tr><td colspan="5" class="empty">Loading…</td></tr></tbody></table></div></div>`;
  async function load(){
    const u=session().username;
    try{
      const [w,d]=await Promise.all([Data.withdrawals(u),Data.deposits(u)]);
      const all=[...w,...d].sort((a,b)=>(parseInt(b.id)||0)-(parseInt(a.id)||0));
      ['pending','confirmed','rejected'].forEach(k=>$('#c-'+k).textContent=all.filter(t=>AP.lc(t.status)===k).length);
      const top=all.slice(0,5);
      $('#rows').innerHTML=top.length?top.map((t,i)=>`<tr class="click" data-i="${i}"><td class="mono">${esc(t.id)}</td><td>${t.kind}</td><td>${esc(t.method)}</td><td><b>${money(t.amount,t.currency)}</b></td><td>${badge(t.status)}</td></tr>`).join(''):`<tr><td colspan="5"><div class="empty">${icon('clock')}<div>No transactions yet</div></div></td></tr>`;
      $('#rows').onclick=e=>{const tr=e.target.closest('tr[data-i]');if(!tr)return;const t=top[tr.dataset.i];
        sheet({title:`${t.kind} #${esc(t.id)}`,bodyHTML:row('Status',badge(t.status))+row('Method',esc(t.method))+row('User ID',esc(t.userId))+row('Amount',money(t.amount,t.currency),t.amount)+(t.account?row('Account',esc(t.account),t.account):'')+(t.trxId?row('TRX ID',esc(t.trxId),t.trxId):'')+(t.reason?row('Reason',esc(t.reason)):'')+row('Date',fdate(t.date))});};
    }catch(e){AP.toast('Couldn’t load activity. Pull to retry.','error');}
  }
  load();
})();
