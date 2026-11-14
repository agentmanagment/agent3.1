(function(){
  const {$,Data,store,session,lc}=AP;
  const e=$('#e'), b=$('#go');
  const m=sessionStorage.getItem('ap.msg'); if(m){e.textContent=m;sessionStorage.removeItem('ap.msg');}
  if(session()) location.replace('dashboard.html');
  $('#f').addEventListener('submit',async ev=>{
    ev.preventDefault(); e.textContent=''; b.disabled=true; b.textContent='Signing in…';
    try{
      const u=$('#u').value.trim(), p=$('#p').value;
      const users=await Data.users();
      const me=users.find(x=>lc(x.username)===lc(u)&&x.password===p);
      if(!users.length) e.textContent='No accounts are available yet. Please contact your administrator.';
      else if(!me) e.textContent='Incorrect username or password.';
      else if(lc(me.status)!=='active') e.textContent=me.message||`Your account is ${me.status}.`;
      else { store.set('ap.session',{username:me.username,fullName:me.fullName,logo:me.logo,agentType:me.agentType}); location.replace('dashboard.html'); return; }
    }catch(x){ console.error('login:',x.message); e.textContent=x.message==='NOT_SHARED'?'Service is not available right now. Please contact your administrator.':'Can’t connect right now. Check your internet and try again.'; }
    b.disabled=false; b.textContent='Sign In';
  });
})();
