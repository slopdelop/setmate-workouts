function workoutStats(){
  const sets=state.sets.filter(s=>s.person===state.person);
  const machines=new Map(state.machines.map(m=>[m.id,m]));
  const days=new Map(),muscles=new Map(),byMachine=new Map();
  for(const s of sets){
    const day=localDay(s.time);days.set(day,(days.get(day)||0)+1);
    const m=machines.get(s.machine);if(!m)continue;
    const target=muscleGroup(m);const bucket=muscles.get(target)||{name:target,count:0,last:0,machine:m};
    bucket.count++;bucket.last=Math.max(bucket.last,Date.parse(s.time));muscles.set(target,bucket);
    const values=byMachine.get(m.id)||new Map();
    const value=s.weight*(s.unit===state.unit?1:state.unit==='kg'?0.45359237:2.20462262);
    values.set(day,Math.max(values.get(day)||0,value));byMachine.set(m.id,values);
  }
  const progress=[];
  for(const [id,values] of byMachine){
    const points=[...values].sort((a,b)=>statsDayTime(a[0])-statsDayTime(b[0]));if(points.length<2)continue;
    const first=points[0][1],last=points.at(-1)[1];
    progress.push({machine:machines.get(id),points,first,last,delta:last-first});
  }
  progress.sort((a,b)=>b.delta-a.delta||a.machine.name.localeCompare(b.machine.name));
  return {sets,days,machineCount:byMachine.size,muscles:[...muscles.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)),progress};
}
function weightSparkline(points){
  const values=points.map(p=>p[1]),min=Math.min(...values),max=Math.max(...values);
  const coords=values.map((v,i)=>`${4+i*112/(values.length-1)},${max===min?18:32-(v-min)*28/(max-min)}`).join(' ');
  return `<svg class="weight-spark" viewBox="0 0 120 36" aria-hidden="true"><polyline points="${coords}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function statsDayTime(day){const [year,month,date]=day.split('-').map(Number);return new Date(year,month,date,12).getTime();}
function statsDayLabel(day){return dateLabel(statsDayTime(day));}
function renderStats(){
  const data=workoutStats();const max=Math.max(1,...data.muscles.map(m=>m.count));
  const calendar=Array.from({length:28},(_,i)=>{const date=new Date();date.setHours(12,0,0,0);date.setDate(date.getDate()-27+i);const day=localDay(date);return {date,day,count:data.days.get(day)||0};});
  const round=v=>Math.round(v*10)/10;
  root.innerHTML=header()+`<button class="back" data-action="back">‹ All machines</button><div class="eyebrow">Your saved history</div><h1>A little progress.</h1>`+people()+`
    <div class="stats-totals"><div><strong>${data.days.size}</strong><span>workout days</span></div><div><strong>${data.sets.length}</strong><span>sets logged</span></div><div><strong>${data.machineCount}</strong><span>machines used</span></div></div>
    <section class="stats-card"><div class="section-row"><h2>Showing up</h2><span class="count">Last 28 days</span></div><div class="activity-grid" role="list" aria-label="Daily workout activity">${calendar.map(d=>`<div role="listitem" class="activity-day ${d.count?'trained':''} ${isToday(d.date)?'is-today':''}" aria-label="${esc(d.date.toLocaleDateString(undefined,{month:'long',day:'numeric'}))}: ${d.count} sets" title="${esc(d.date.toLocaleDateString(undefined,{month:'short',day:'numeric'}))} · ${d.count} sets"><span>${d.date.getDate()}</span></div>`).join('')}</div><p class="hint">${calendar.filter(d=>d.count).length} workout days in the last 28 days · Lime means you trained.</p></section>
    <section class="stats-card"><h2>What you’ve worked</h2><p class="hint">Sets by muscle group · All saved workouts</p><div class="muscle-stats">${data.muscles.map(m=>`<div class="muscle-stat"><span class="stats-muscle-icon" aria-hidden="true">${muscleIcon(m.machine)}</span><div><div class="muscle-stat-label"><strong>${esc(m.name)}</strong><span>${m.count} sets</span></div><div class="stats-bar"><span style="width:${m.count/max*100}%"></span></div><small>Last trained ${esc(dateLabel(m.last))}</small></div></div>`).join('')||'<p class="sub">Log a set to start your muscle map.</p>'}</div></section>
    <section class="stats-card"><h2>Your weight progress</h2><p class="hint">Heaviest logged set on your first and latest days for each machine. Tap a machine to see its history.</p><div class="progress-list">${data.progress.slice(0,8).map(p=>`<button class="progress-machine" data-machine="${esc(p.machine.id)}"><div class="progress-title"><strong>${esc(p.machine.name)}${p.machine.brand==='HOIST'?' <img class="hoist-logo" src="hoist-logo.png?v=9" alt="HOIST">':''}</strong><span class="progress-delta ${p.delta>0?'positive':''}">${p.delta>0?'+':''}${round(p.delta)} ${state.unit}</span></div><div class="progress-values"><span>${round(p.first)} → ${round(p.last)} ${state.unit}</span>${weightSparkline(p.points)}</div><small>${esc(statsDayLabel(p.points[0][0]))} → ${esc(statsDayLabel(p.points.at(-1)[0]))}</small></button>`).join('')||'<p class="sub">Use a machine on two different days to see its progress here.</p>'}</div></section>`+footer();
}
