const ORIGINS=new Set(['https://slopdelop.github.io','http://127.0.0.1:4173','http://localhost:4173']);
export async function tokenHash(token){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');}
export function validPayload(p){
  if(!p||p.version!==1||!Array.isArray(p.machines)||!Array.isArray(p.sets)||p.machines.length>500||p.sets.length>10000)return false;
  const ids=new Set(),sets=new Set();
  for(const m of p.machines){if(!m||typeof m.id!=='string'||m.id.length>160||ids.has(m.id)||typeof m.name!=='string'||!m.name.trim()||m.name.length>80||typeof m.group!=='string'||m.group.length>80||!['HOIST','Other'].includes(m.brand))return false;ids.add(m.id);}
  for(const s of p.sets){if(!s||typeof s.id!=='string'||s.id.length>160||sets.has(s.id)||!ids.has(s.machine)||!['Justin','Mabel'].includes(s.person)||!['lb','kg'].includes(s.unit)||!Number.isFinite(s.weight)||s.weight<0||s.weight>10000||(s.reps!==null&&(!Number.isInteger(s.reps)||s.reps<1||s.reps>999))||typeof s.time!=='string'||Number.isNaN(Date.parse(s.time)))return false;sets.add(s.id);}
  return true;
}
export default {async fetch(request,env){
  const origin=request.headers.get('Origin');const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  if(origin&&ORIGINS.has(origin))headers['Access-Control-Allow-Origin']=origin;
  const reply=(body,status=200)=>Response.json(body,{status,headers});
  if(origin&&!ORIGINS.has(origin))return reply({error:'Origin not allowed'},403);
  if(new URL(request.url).pathname!=='/backup')return reply({error:'Not found'},404);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, PUT, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type'}});
  if(!['GET','PUT'].includes(request.method))return reply({error:'Method not allowed'},405);
  const auth=request.headers.get('Authorization')||'';
  if(!/^Bearer [a-f0-9]{64}$/.test(auth))return reply({error:'Invalid backup code'},401);
  try{
    const hash=await tokenHash(auth.slice(7));
    const row=await env.DB.prepare('SELECT * FROM backups WHERE writer_hash = ? OR reader_hash = ?').bind(hash,hash).first();
    if(!row)return reply({error:'Invalid backup code'},401);
    if(request.method==='GET')return reply({data:row.payload?JSON.parse(row.payload):null,revision:row.revision,updatedAt:row.updated_at});
    if(hash!==row.writer_hash)return reply({error:'This code can only read backups'},403);
    if(Number(request.headers.get('Content-Length')||0)>3000000)return reply({error:'Backup is too large'},413);
    const text=await request.text();if(new TextEncoder().encode(text).length>3000000)return reply({error:'Backup is too large'},413);
    let body;try{body=JSON.parse(text);}catch{return reply({error:'Invalid JSON'},400);}
    if(!Number.isInteger(body.revision)||body.revision<0||!validPayload(body.data))return reply({error:'Invalid workout backup'},400);
    const updatedAt=new Date().toISOString();
    const result=await env.DB.prepare('UPDATE backups SET payload = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?').bind(JSON.stringify(body.data),updatedAt,row.id,body.revision).run();
    if(result.meta.changes!==1)return reply({error:'A newer backup exists. Local data was kept; reconnect before backing up.'},409);
    return reply({revision:body.revision+1,updatedAt});
  }catch{return reply({error:'Backup service unavailable. Try again later.'},503);}
}};
