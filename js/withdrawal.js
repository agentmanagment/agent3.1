(function(){
  const {$,esc,icon,Data,badge,money,sheet,row,boot,session,toast,fdate,lc}=AP;
  const page=boot({active:'withdrawal.html',title:'Withdrawals',subtitle:'Review and process payout requests'}); if(!page) return;
  let all=[],filter='all';
  page.innerHTML=`<div class="panel"><div class="panel-head"><h2>Requests</h2><div class="seg" id="seg">${['all','pending','confirmed','rejected'].map(k=>`<button data-k="${k}" class="${k==='all'?'on':''}">${k[0].toUpperCase()+k.slice(1)}</button>`).join('')}</div></div>
  <div class="tw"><table><thead><tr><th>#</th><th>Method</th><th>Account</th><th>User</th><th class="right">Amount</th><th>Status</th></tr></thead><tbody id="rows"></tbody></table></div></div>`;
  $('#seg').onclick=e=>{const b=e.target.closest('button');if(!b)return;filter=b.dataset.k;[...$('#seg').children].forEach(x=>x.classList.toggle('on',x===b));draw();};
  async function load(){try{all=(await Data.withdrawals(session().username)).sort((a,b)=>(parseInt(b.id)||0)-(parseInt(a.id)||0));draw();}catch(e){toast('Couldn’t load withdrawals.','error');}}
  function draw(){
    const list=all.filter(t=>filter==='all'||lc(t.status)===filter);
    $('#rows').innerHTML=list.length?list.map(t=>`<tr class="click" data-id="${esc(t.id)}"><td class="mono">${esc(t.id)}</td><td>${esc(t.method)}</td><td class="mono">${esc(t.account)}</td><td>${esc(t.userId)}</td><td class="right"><b>${money(t.amount,t.currency)}</b></td><td>${badge(t.status)}</td></tr>`).join(''):`<tr><td colspan="6"><div class="empty">${icon('out')}<div>No withdrawal requests</div></div></td></tr>`;
  }
  $('#rows').onclick=e=>{const tr=e.target.closest('tr[data-id]');if(tr)open(all.find(t=>t.id===tr.dataset.id));};
  function open(t){
    const pend=lc(t.status)==='pending';
    const s=sheet({title:`Withdrawal #${esc(t.id)}`,
      bodyHTML:row('Status',badge(t.status))+row('Method',esc(t.method))+row('Account',esc(t.account),t.account)+row('User ID',esc(t.userId))+row('Amount',money(t.amount,t.currency),t.amount)+(t.trxId?row('TRX ID',esc(t.trxId),t.trxId):'')+row('Your commission',money(AP.num(t.amount)*PORTAL.RATES.withdrawal,t.currency))+(pend?`<div class="field" id="trxF" hidden style="margin-top:14px"><label>Transaction ID</label><input id="trx" placeholder="Enter TRX ID" autocomplete="off"></div>`:''),
      actionsHTML:pend?`<button class="btn primary" id="ok">Confirm Payment</button><button class="btn danger" id="no">Reject</button>`:''});
    if(!pend)return; let step=0;
    $('#ok',s.el).onclick=async function(){
      if(!step){step=1;$('#trxF',s.el).hidden=false;$('#trx',s.el).focus();this.textContent='Submit';return;}
      const trx=$('#trx',s.el).value.trim(); if(!trx){toast('Enter the TRX ID first.','error');return;}
      this.disabled=true; const r=await Data.save('w',t,{status:'Confirmed',trxId:trx}); if(!r.ok){this.disabled=false;toast('Couldn’t save. Please try again.','error');return;} s.close(); toast('Payment confirmed.','success'); load();
    };
    $('#no',s.el).onclick=async function(){
      if(this.dataset.s!=='1'){this.dataset.s='1';this.textContent='Tap again to reject';return;}
      this.disabled=true; const r=await Data.save('w',t,{status:'Rejected'}); if(!r.ok){this.disabled=false;toast('Couldn’t save. Please try again.','error');return;} s.close(); toast('Request rejected.'); load();
    };
  }
  load();
})();
