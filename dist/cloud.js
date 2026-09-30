const CLOUD_KEY='setmate-cloud-v1';let cloudConfig=null,cloudTimer=null,cloudBusy=false,cloudInitialized=false,cloudMessage='';
try{cloudConfig=JSON.parse(localStorage.getItem(CLOUD_KEY));}catch{}
function cloudPayload(){return {version:1,machines:state.machines,sets:state.sets};}
function cloudStatus(message){cloudMessage=message;const el=document.querySelector('#cloud-status');if(el)el.textContent=message;}
function storeCloud(){localStorage.setItem(CLOUD_KEY,JSON.stringify(cloudConfig));}
async function cloudRequest(method,body){
  if(!window.SETMATE_CLOUD_URL)throw Error('Cloud service is not configured yet.');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
  try{const response=await fetch(window.SETMATE_CLOUD_URL+'/backup',{method,headers:{Authorization:'Bearer '+cloudConfig.code,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:controller.signal,cache:'no-store'});const json=await response.json();if(!response.ok){const error=Error(json.error||'Cloud backup failed');error.status=response.status;throw error;}return json;}finally{clearTimeout(timer);}
}
function scheduleCloud(){if(!cloudInitialized||!cloudConfig||cloudConfig.mode!=='writer'||cloudConfig.paused||LOCAL_PREVIEW)return;clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>backupCloud(),1500);}
async function backupCloud(){
  if(cloudBusy||!cloudConfig||cloudConfig.mode!=='writer'||cloudConfig.paused||LOCAL_PREVIEW||storageError)return;
  if(!navigator.onLine){cloudStatus('Saved locally · Backup waiting for internet');return;}
  const payload=cloudPayload(),signature=JSON.stringify(payload);if(signature===cloudConfig.lastPayload)return;
  cloudBusy=true;cloudStatus('Backing up…');
  try{const result=await cloudRequest('PUT',{revision:cloudConfig.revision,data:payload});cloudConfig.revision=result.revision;cloudConfig.updatedAt=result.updatedAt;cloudConfig.lastPayload=signature;storeCloud();cloudStatus('Backed up '+new Date(result.updatedAt).toLocaleString());}
  catch(error){if(error.status===409){cloudConfig.paused=true;storeCloud();}cloudStatus(error.name==='AbortError'?'Backup timed out. Saved locally; retry when online.':error.message);}
  finally{cloudBusy=false;if(cloudConfig&&!cloudConfig.paused&&JSON.stringify(cloudPayload())!==signature)scheduleCloud();}
}
function renderCloud(){
  const connected=!!cloudConfig;
  root.innerHTML=header()+`<button class="back" data-action="info">‹ App & data</button><div class="eyebrow">Cloudflare backup</div><h1>${LOCAL_PREVIEW?'Phone data for testing.':'Keep a cloud copy.'}</h1><div class="notice"><strong>${LOCAL_PREVIEW?'Dev preview is read-only in the cloud':'Private backup, offline first'}</strong><p>${LOCAL_PREVIEW?'Load the phone’s backup into a separate local test copy. Edits here never upload or change the phone’s backup.':'Your workouts save on this device first, then back up while the app is open and online. This is a backup of one device, not live sync between phones.'}</p></div>`+
  (connected?`<p id="cloud-status" role="status">${esc(cloudMessage|| (cloudConfig.updatedAt?'Last backup: '+new Date(cloudConfig.updatedAt).toLocaleString():'Connected · No backup yet'))}</p>${LOCAL_PREVIEW?'<button class="primary" data-action="load-cloud">Load phone data into test copy</button><button class="add" data-action="leave-sandbox">Return to original preview data</button>':`<button class="primary" data-action="backup-now" ${cloudConfig.paused?'disabled':''}>Back up now</button><button class="add" data-action="restore-cloud">Restore from cloud backup</button>`}<button class="add" data-action="disconnect-cloud">Disconnect this device</button>`:
  `<form id="cloud-connect" class="form"><label>${LOCAL_PREVIEW?'Read-only testing code':'Phone backup code'}<input name="code" type="password" required autocomplete="off" spellcheck="false" autocapitalize="none" placeholder="Paste your private code"></label><button class="primary" type="submit">${LOCAL_PREVIEW?'Connect for testing':'Enable cloud backup'}</button><button class="add" type="button" data-action="copy-cloud-code">Copy backup code</button>${LOCAL_PREVIEW?'':'<p class="hint">If you log in the Home Screen app, copy this code and connect there. Safari may have different workout data.</p>'}<p id="cloud-status" role="status">${esc(cloudMessage)}</p></form>`)+footer();
}
async function connectCloud(form){
  const code=String(new FormData(form).get('code')||'').trim().toLowerCase();if(!/^[a-f0-9]{64}$/.test(code)){cloudStatus('Paste the full 64-character backup code.');return;}
  const previous=cloudConfig;cloudConfig={code,mode:LOCAL_PREVIEW?'reader':'writer',revision:0};cloudStatus('Connecting…');
  try{const remote=await cloudRequest('GET');cloudConfig.revision=remote.revision;cloudConfig.updatedAt=remote.updatedAt;
    if(remote.data){validateImport(remote.data);cloudConfig.paused=!LOCAL_PREVIEW&&JSON.stringify(remote.data)!==JSON.stringify(cloudPayload());}
    storeCloud();cloudMessage=cloudConfig.paused?'A backup already exists. Restore it before backing up this device.':LOCAL_PREVIEW?'Connected. You can load the phone’s latest backup.':'Connected. Automatic backup enabled.';renderCloud();if(!LOCAL_PREVIEW&&!cloudConfig.paused)await backupCloud();
  }catch(error){cloudConfig=previous;cloudStatus(error.message);}
}
async function loadCloud(){
  if(cloudBusy)return;cloudBusy=true;cloudStatus('Loading cloud backup…');
  try{const remote=await cloudRequest('GET');if(!remote.data)throw Error('No phone backup yet. Enable backup on your phone first.');validateImport(remote.data);
    if(!LOCAL_PREVIEW&&!window.confirm('Restore the cloud backup? This replaces this device’s current machines and workouts. A local recovery copy will be kept.'))return;
    const restored={...structuredClone(initial),machines:remote.data.machines,sets:remote.data.sets};
    if(LOCAL_PREVIEW){localStorage.setItem('setmate-dev-v1',JSON.stringify(restored));localStorage.setItem('setmate-dev-sandbox','1');}
    else{localStorage.setItem('setmate-before-cloud-restore',JSON.stringify(state));localStorage.setItem(KEY,JSON.stringify(restored));cloudConfig.paused=false;cloudConfig.revision=remote.revision;cloudConfig.lastPayload=JSON.stringify(remote.data);cloudConfig.updatedAt=remote.updatedAt;storeCloud();}
    location.reload();
  }catch(error){cloudStatus(error.message);}finally{cloudBusy=false;}
}
function initCloud(){
  cloudInitialized=true;
  root.addEventListener('submit',e=>{if(e.target.id==='cloud-connect'){e.preventDefault();connectCloud(e.target);}});
  root.addEventListener('click',async e=>{if(e.target.closest('button')?.dataset.action==='copy-cloud-code'){const code=document.querySelector('#cloud-connect input').value.trim();if(!code){toast('Enter a backup code first');return;}try{await navigator.clipboard.writeText(code);toast('Backup code copied');}catch{toast('Press and hold the code field to copy it');}}});
  root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;switch(b.dataset.action){case 'cloud':view='cloud';renderCloud();window.scrollTo(0,0);break;case 'backup-now':backupCloud();break;case 'load-cloud':case 'restore-cloud':loadCloud();break;case 'disconnect-cloud':localStorage.removeItem(CLOUD_KEY);cloudConfig=null;clearTimeout(cloudTimer);cloudMessage='';renderCloud();break;case 'leave-sandbox':localStorage.removeItem('setmate-dev-sandbox');location.reload();break;}});
  window.addEventListener('online',scheduleCloud);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleCloud();});scheduleCloud();
  const match=location.hash.match(/^#cloud=([a-f0-9]{64})$/);if(match){history.replaceState(null,'',location.pathname+location.search);if(!cloudConfig){view='cloud';renderCloud();document.querySelector('#cloud-connect input').value=match[1];}}
}
