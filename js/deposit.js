(function(){
  const {$,esc,icon,Data,badge,money,sheet,row,boot,session,toast,lc}=AP;
  const page=boot({active:'deposit.html',title:'Deposits',subtitle:'Verify incoming deposit requests'}); if(!page) return;
  let all=[],filter='all';
  page.innerHTML=`<div class="panel"><div class="panel-head"><h2>Requests</h2><div class="seg" id="seg">${['all','pending','confirmed','rejected'].map(k=>`<button data-k="${k}" class="${k==='all'?'on':''}">${k[0].toUpperCase()+k.slice(1)}</button>`).join('')}</div></div>
  <div class="tw"><table><thead><tr><th>#</th><th>TRX ID</th><th>Method</th><th>User</th><th class="right">Amount</th><th>Status</th></tr></thead><tbody id="rows"></tbody></table></div></div>`;
  $('#seg').onclick=e=>{const b=e.target.closest('button');if(!b)return;filter=b.dataset.k;[...$('#seg').children].forEach(x=>x.classList.toggle('on',x===b));draw();};
  async function load(){try{all=(await Data.deposits(session().username)).sort((a,b)=>(parseInt(b.id)||0)-(parseInt(a.id)||0));draw();}catch(e){toast('Couldn’t load deposits.','error');}}
  function draw(){
    const list=all.filter(t=>filter==='all'||lc(t.status)===filter);
    $('#rows').innerHTML=list.length?list.map(t=>`<tr class="click" data-id="${esc(t.id)}"><td class="mono">${esc(t.id)}</td><td class="mono">${esc(t.trxId)}</td><td>${esc(t.method)}</td><td>${esc(t.userId)}</td><td class="right"><b>${money(t.amount,t.currency)}</b></td><td>${badge(t.status)}</td></tr>`).join(''):`<tr><td colspan="6"><div class="empty">${icon('in')}<div>No deposit requests</div></div></td></tr>`;
  }
  $('#rows').onclick=e=>{const tr=e.target.closest('tr[data-id]');if(tr)open(all.find(t=>t.id===tr.dataset.id));};
  function open(t){
    const pend=lc(t.status)==='pending';
    const s=sheet({title:`Deposit #${esc(t.id)}`,
      bodyHTML:row('Status',badge(t.status))+row('TRX ID',esc(t.trxId),t.trxId)+row('Method',esc(t.method))+row('User ID',esc(t.userId))+row('Amount',money(t.amount,t.currency),t.amount)+(t.reason?row('Reason',esc(t.reason)):'')+row('Your commission',money(AP.num(t.amount)*PORTAL.RATES.deposit,t.currency))+(pend?`<div class="field" id="rF" hidden style="margin-top:14px"><label>Reason for rejection</label><input id="rs" placeholder="Why is this rejected?" autocomplete="off"></div>`:''),
      actionsHTML:pend?`<button class="btn good" id="ok">Confirm Deposit</button><button class="btn danger" id="no">Reject</button>`:''});
    if(!pend)return;
    $('#ok',s.el).onclick=async function(){this.disabled=true;const r=await Data.save('d',t,{status:'Confirmed'});if(!r.ok){this.disabled=false;toast('Couldn’t save. Please try again.','error');return;}s.close();toast('Deposit confirmed.','success');load();};
    let step=0; $('#no',s.el).onclick=async function(){
      if(!step){step=1;$('#rF',s.el).hidden=false;$('#rs',s.el).focus();this.textContent='Submit Rejection';return;}
      const rs=$('#rs',s.el).value.trim(); if(!rs){toast('Please add a reason.','error');return;}
      this.disabled=true; const r=await Data.save('d',t,{status:'Rejected',reason:rs}); if(!r.ok){this.disabled=false;toast('Couldn’t save. Please try again.','error');return;} s.close(); toast('Deposit rejected.'); load();
    };
  }
  load();
})();
