(function(){
  const {$,esc,icon,Data,boot,session,toast}=AP;
  const page=boot({active:'banks.html',title:'Bank Accounts',subtitle:''}); if(!page) return;
  page.innerHTML='<div class="grid banks" id="g"><div class="empty">Loading…</div></div>';
  (async()=>{
    try{
      const list=await Data.banks(session().username);
      $('#g').innerHTML=list.length?list.map(b=>`<div class="bank"><div class="bank-top"><div><b>${esc(b.bank)}</b><small>${esc(b.type)}${b.currency?' · '+esc(b.currency):''}</small></div>${b.def?`<span class="def">${icon('star')}Default</span>`:''}</div>
        <div class="num">${esc(b.number)}</div>
        <div class="bank-foot"><span>${esc(b.title)}</span><div class="acts"><button class="icon-btn" data-n="${esc(b.number)}" aria-label="Copy number">${icon('copy')}</button></div></div></div>`).join('')
        :`<div class="card empty" style="grid-column:1/-1">${icon('bank')}<div>No bank accounts have been assigned to you yet.</div></div>`;
      $('#g').onclick=e=>{const b=e.target.closest('[data-n]');if(b)AP.copy(b.dataset.n,b);};
    }catch(e){$('#g').innerHTML='';toast('Couldn’t load bank accounts.','error');}
  })();
})();
