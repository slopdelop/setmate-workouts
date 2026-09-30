const CLOUD_KEY='setmate-cloud-v1';let cloudConfig=null,cloudTimer=null,cloudBusy=false,cloudInitialized=false,cloudMessage='',cloudRetryDelay=30000;
try{cloudConfig=JSON.parse(localStorage.getItem(CLOUD_KEY));}catch{}
function cloudPayload(){return {version:1,machines:state.machines,sets:state.sets};}
function cloudStatus(message){cloudMessage=message;const el=document.querySelector('#cloud-status');if(el)el.textContent=message;}
function storeCloud(){localStorage.setItem(CLOUD_KEY,JSON.stringify(cloudConfig));}
async function cloudRequest(method,body){
  if(!window.SETMATE_CLOUD_URL)throw Error('Cloud service is not configured yet.');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
  try{const response=await fetch(window.SETMATE_CLOUD_URL+'/backup',{method,headers:{Authorization:'Bearer '+cloudConfig.code,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:controller.signal,cache:'no-store'});const json=await response.json();if(!response.ok){const error=Error(json.error||'Cloud backup failed');error.status=response.status;throw error;}return json;}finally{clearTimeout(timer);}
}
function scheduleCloud(delay=1500){if(!cloudInitialized||!cloudConfig||cloudConfig.mode!=='writer'||cloudConfig.paused||LOCAL_PREVIEW)return;clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>backupCloud(),typeof delay==='number'?delay:1500);}
async function backupCloud(){
  if(cloudBusy||!cloudConfig||cloudConfig.mode!=='writer'||cloudConfig.paused||LOCAL_PREVIEW||storageError)return;
  if(!navigator.onLine){cloudStatus('Saved locally · Backup waiting for internet');return;}
  const payload=cloudPayload(),signature=JSON.stringify(payload);if(signature===cloudConfig.lastPayload)return;
  const connection=cloudConfig;let retry=false;cloudBusy=true;cloudStatus('Backing up…');
  try{const result=await cloudRequest('PUT',{revision:connection.revision,data:payload});if(cloudConfig!==connection)return;connection.revision=result.revision;connection.updatedAt=result.updatedAt;connection.lastPayload=signature;storeCloud();cloudRetryDelay=30000;cloudStatus('Backed up '+new Date(result.updatedAt).toLocaleString());}
  catch(error){
    if(cloudConfig!==connection)return;
    if(error.status===409){
      let acknowledged=false;try{const remote=await cloudRequest('GET');if(JSON.stringify(remote.data)===signature){connection.revision=remote.revision;connection.updatedAt=remote.updatedAt;connection.lastPayload=signature;storeCloud();acknowledged=true;cloudRetryDelay=30000;cloudStatus('Cloud backup is up to date');}}catch{}
      if(!acknowledged){connection.paused=true;storeCloud();cloudStatus('A different cloud backup exists. Uploads paused; local workouts are unchanged.');}
    }else if(error.status===401||error.status===403){connection.paused=true;storeCloud();cloudStatus('Backup access needs reconnecting. Local workouts are unchanged.');}
    else{retry=true;cloudStatus('Saved locally · Cloud backup will retry automatically');}
  }
  finally{cloudBusy=false;if(cloudConfig&&!cloudConfig.paused){if(retry){scheduleCloud(cloudRetryDelay);cloudRetryDelay=Math.min(cloudRetryDelay*2,300000);}else if(JSON.stringify(cloudPayload())!==signature)scheduleCloud();}}
}
function renderCloud(){
  const connected=!!cloudConfig;
  root.innerHTML=header()+`<button class="back" data-action="info">‹ App & data</button><div class="eyebrow">Cloudflare backup</div><h1>${LOCAL_PREVIEW?'Phone data for testing.':'Keep a cloud copy.'}</h1><div class="notice"><strong>${LOCAL_PREVIEW?'Dev preview is read-only in the cloud':'Private backup, offline first'}</strong><p>${LOCAL_PREVIEW?'Load the phone’s backup into a separate local test copy. Edits here never upload or change the phone’s backup.':'Your workouts save on this device first, then back up while the app is open and online. Cloud data never replaces workouts on this device. This backs up one device; it does not live-sync phones.'}</p></div>`+
  (connected?`<p id="cloud-status" role="status">${esc(cloudMessage|| (cloudConfig.updatedAt?'Last backup: '+new Date(cloudConfig.updatedAt).toLocaleString():'Connected · No backup yet'))}</p>${LOCAL_PREVIEW?'<button class="primary" data-action="load-cloud">Load phone data into test copy</button><button class="add" data-action="leave-sandbox">Return to original preview data</button>':`<p class="hint">Backup only: cloud data never replaces your local workouts.</p><button class="primary" data-action="backup-now" ${cloudConfig.paused?'disabled':''}>Back up now</button>`}<button class="add" data-action="disconnect-cloud">Disconnect this device</button>`:
  `<form id="cloud-connect" class="form"><label>${LOCAL_PREVIEW?'Read-only testing code':'Phone backup code'}<input name="code" type="password" required autocomplete="off" spellcheck="false" autocapitalize="none" placeholder="Paste your private code"></label><button class="primary" type="submit">${LOCAL_PREVIEW?'Connect for testing':'Enable cloud backup'}</button><button class="add" type="button" data-action="copy-cloud-code">Copy backup code</button>${LOCAL_PREVIEW?'':'<p class="hint">If you log in the Home Screen app, copy this code and connect there. Safari may have different workout data.</p>'}<p id="cloud-status" role="status">${esc(cloudMessage)}</p></form>`)+footer();
}
async function connectCloud(form){
  const code=String(new FormData(form).get('code')||'').trim().toLowerCase();if(!/^[a-f0-9]{64}$/.test(code)){cloudStatus('Paste the full 64-character backup code.');return;}
  const previous=cloudConfig;cloudConfig={code,mode:LOCAL_PREVIEW?'reader':'writer',revision:0};cloudStatus('Connecting…');
  try{const remote=await cloudRequest('GET');cloudConfig.revision=remote.revision;cloudConfig.updatedAt=remote.updatedAt;
    if(remote.data){validateImport(remote.data);cloudConfig.paused=!LOCAL_PREVIEW&&JSON.stringify(remote.data)!==JSON.stringify(cloudPayload());}
    storeCloud();cloudMessage=cloudConfig.paused?'A different cloud backup exists. Uploads paused; your local workouts are unchanged.':LOCAL_PREVIEW?'Connected. You can load the phone’s latest backup.':'Connected. Automatic backup enabled.';renderCloud();if(!LOCAL_PREVIEW&&!cloudConfig.paused)await backupCloud();
  }catch(error){cloudConfig=previous;cloudStatus(error.message);}
}
async function loadCloud(){
  if(!LOCAL_PREVIEW){cloudStatus('Cloud downloads are disabled on this device. Local workouts are unchanged.');return;}
  if(cloudBusy)return;cloudBusy=true;cloudStatus('Loading cloud backup…');
  try{const remote=await cloudRequest('GET');if(!remote.data)throw Error('No phone backup yet. Enable backup on your phone first.');validateImport(remote.data);
    const restored={...structuredClone(initial),machines:remote.data.machines,sets:remote.data.sets};
    localStorage.setItem('setmate-dev-v1',JSON.stringify(restored));localStorage.setItem('setmate-dev-sandbox','1');
    location.reload();
  }catch(error){cloudStatus(error.message);}finally{cloudBusy=false;}
}
function initCloud(){
  cloudInitialized=true;
  root.addEventListener('submit',e=>{if(e.target.id==='cloud-connect'){e.preventDefault();connectCloud(e.target);}});
  root.addEventListener('click',async e=>{if(e.target.closest('button')?.dataset.action==='copy-cloud-code'){const code=document.querySelector('#cloud-connect input').value.trim();if(!code){toast('Enter a backup code first');return;}try{await navigator.clipboard.writeText(code);toast('Backup code copied');}catch{toast('Press and hold the code field to copy it');}}});
  root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;switch(b.dataset.action){case 'cloud':view='cloud';renderCloud();window.scrollTo(0,0);break;case 'backup-now':backupCloud();break;case 'load-cloud':loadCloud();break;case 'disconnect-cloud':localStorage.removeItem(CLOUD_KEY);cloudConfig=null;clearTimeout(cloudTimer);cloudMessage='';renderCloud();break;case 'leave-sandbox':if(LOCAL_PREVIEW){localStorage.removeItem('setmate-dev-sandbox');location.reload();}break;}});
  window.addEventListener('online',scheduleCloud);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleCloud();});scheduleCloud();
  const match=location.hash.match(/^#cloud=([a-f0-9]{64})$/);if(match){history.replaceState(null,'',location.pathname+location.search);if(!cloudConfig){view='cloud';renderCloud();document.querySelector('#cloud-connect input').value=match[1];}}
}
