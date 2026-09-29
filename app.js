const SPEC = {Physics: PHYSICS_SPEC, Chemistry: CHEMISTRY_SPEC, Maths: MATHS_SPEC};
const STORAGE_KEY = "aqa_alevel_rag_tracker_v1";
let state = loadState();
let currentSubject = state.ui?.subject || "Physics";
let collapsed = new Set();

function blankStudent(name){
  return {name, physicsOption:"Astrophysics", topics:{}};
}
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return {students:[blankStudent("Student 1")], current:0, ui:{subject:"Physics"}};
}
function save(){
  state.ui = state.ui || {}; state.ui.subject = currentSubject;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function student(){ return state.students[state.current] }
function topicState(id){
  if(!student().topics[id]) student().topics[id]={status:"none",confidence:3,score:"",date:"",notes:"",action:""};
  return student().topics[id];
}
function physicsOptionMatch(t){
  if(currentSubject!=="Physics") return true;
  const opt=student().physicsOption || "Astrophysics";
  return opt==="ALL" || !t.option || t.option===opt;
}
function visibleSpec(){
  let rows = SPEC[currentSubject].slice().filter(physicsOptionMatch);
  const q=document.getElementById("search").value.trim().toLowerCase();
  const sf=document.getElementById("statusFilter").value;
  rows=rows.filter(t=>{
    const ts=topicState(t.id);
    const text=(t.title+" "+t.group+" "+(t.subs||[]).join(" ")).toLowerCase();
    return (!q || text.includes(q)) && (sf==="all" || ts.status===sf);
  });
  const sort=document.getElementById("sortMode").value;
  if(sort==="weak"){
    const rank={red:0,amber:1,none:2,green:3};
    rows.sort((a,b)=> (rank[topicState(a.id).status]-rank[topicState(b.id).status]) ||
      (Number(topicState(a.id).confidence||3)-Number(topicState(b.id).confidence||3)));
  } else if(sort==="score"){
    rows.sort((a,b)=>{
      const av=topicState(a.id).score===""?999:Number(topicState(a.id).score);
      const bv=topicState(b.id).score===""?999:Number(topicState(b.id).score);
      return av-bv;
    });
  }
  return rows;
}
function renderStudentSelect(){
  const el=document.getElementById("studentSelect");
  el.innerHTML=state.students.map((s,i)=>`<option value="${i}" ${i===state.current?"selected":""}>${escapeHtml(s.name)}</option>`).join("");
}
function renderTabs(){
  document.getElementById("subjectTabs").innerHTML=["Physics","Chemistry","Maths"].map(s=>
    `<button class="tab ${s===currentSubject?"active":""}" data-subject="${s}">${s}</button>`).join("");
}
function render(){
  renderStudentSelect(); renderTabs();
  document.getElementById("physicsOption").style.display=currentSubject==="Physics"?"block":"none";
  if(currentSubject==="Physics") document.getElementById("physicsOptionSelect").value=student().physicsOption||"Astrophysics";
  renderDashboard(); renderTopics(); renderQueue();
  save();
}
function renderDashboard(){
  let rows=SPEC[currentSubject].slice().filter(physicsOptionMatch);
  let c={green:0,amber:0,red:0,none:0}, points=0, scores=[];
  rows.forEach(t=>{
    const s=topicState(t.id); c[s.status]=(c[s.status]||0)+1;
    points += s.status==="green"?1:s.status==="amber"?.5:0;
    if(s.score!=="" && !isNaN(Number(s.score))) scores.push(Number(s.score));
  });
  const mastery=rows.length?Math.round(points/rows.length*100):0;
  document.getElementById("mastery").textContent=mastery+"%";
  document.getElementById("masteryBar").style.width=mastery+"%";
  ["green","amber","red","none"].forEach(k=>document.getElementById(k+"Count").textContent=c[k]||0);
  document.getElementById("avgScore").textContent=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length)+"%":"—";
}
function renderTopics(){
  const rows=visibleSpec();
  const groups={};
  rows.forEach(t=>(groups[t.group]??=[]).push(t));
  const target=document.getElementById("topicList");
  if(!rows.length){target.innerHTML='<div class="empty">No topics match the current filters.</div>'; return;}
  target.innerHTML=Object.entries(groups).map(([g,items])=>{
    const isCollapsed=collapsed.has(currentSubject+"|"+g);
    return `<div class="group">
      <div class="group-head" data-group="${escapeAttr(g)}"><h3>${escapeHtml(g)}</h3><span class="group-count">${items.length} lessons ${isCollapsed?"▸":"▾"}</span></div>
      <div class="group-body" style="${isCollapsed?"display:none":""}">
        ${items.map(topicCard).join("")}
      </div>
    </div>`;
  }).join("");
}
function topicCard(t){
  const s=topicState(t.id);
  return `<div class="topic ${s.status}" data-topic="${t.id}">
    <div>
      <div class="topic-title">${escapeHtml(t.title)}</div>
      <div class="topic-id">${escapeHtml(t.id)} ${t.option?`• Optional: ${escapeHtml(t.option)}`:""}</div>
      ${t.subs?.length?`<div class="subs">${t.subs.map(x=>`<span class="sub">${escapeHtml(x)}</span>`).join("")}</div>`:""}
    </div>
    <div class="controls">
      <button class="rag r ${s.status==="red"?"selected":"off"}" title="Red" data-status="red">R</button>
      <button class="rag a ${s.status==="amber"?"selected":"off"}" title="Amber" data-status="amber">A</button>
      <button class="rag g ${s.status==="green"?"selected":"off"}" title="Green" data-status="green">G</button>
      <button class="btn clear-rag" title="Clear RAG">×</button>
    </div>
    <div class="detail">
      <div><label>Confidence: <span class="confVal">${s.confidence}/5</span></label>
        <div class="range-wrap"><span>1</span><input class="confidence" type="range" min="1" max="5" value="${s.confidence}"><span>5</span></div>
      </div>
      <div><label>Latest score (%)</label><input class="score" type="number" min="0" max="100" value="${escapeAttr(s.score)}" placeholder="e.g. 72"></div>
      <div><label>Review date</label><input class="review-date" type="date" value="${escapeAttr(s.date)}"></div>
      <div><label>Notes / misconception</label><textarea class="notes" placeholder="What needs attention?">${escapeHtml(s.notes)}</textarea></div>
      <div><label>Next action</label><textarea class="action" placeholder="e.g. redo Q4–8, watch recap, complete past-paper set">${escapeHtml(s.action)}</textarea></div>
      <div><label>Quick status guide</label><div class="small">Red: cannot yet answer independently.<br>Amber: partly secure / needs prompts.<br>Green: can answer unfamiliar exam questions reliably.</div></div>
    </div>
  </div>`;
}
function renderQueue(){
  let rows=SPEC[currentSubject].filter(physicsOptionMatch).filter(t=>["red","amber"].includes(topicState(t.id).status));
  const rank={red:0,amber:1};
  rows.sort((a,b)=>{
    const sa=topicState(a.id), sb=topicState(b.id);
    return (rank[sa.status]-rank[sb.status]) ||
      (Number(sa.confidence||3)-Number(sb.confidence||3)) ||
      ((sa.score===""?999:Number(sa.score))-(sb.score===""?999:Number(sb.score)));
  });
  const el=document.getElementById("revisionQueue");
  if(!rows.length){el.innerHTML='<div class="empty" style="padding:16px 0">No Red or Amber topics yet.</div>';return;}
  el.innerHTML=rows.slice(0,10).map(t=>{
    const s=topicState(t.id);
    return `<div class="queue-item"><div><span class="badge ${s.status}">${s.status.toUpperCase()}</span> <b>${escapeHtml(t.title.replace(/^\S+\s/,""))}</b></div>
      <div class="small">Confidence ${s.confidence}/5${s.score!==""?` • Score ${s.score}%`:""}${s.date?` • Review ${escapeHtml(s.date)}`:""}</div>
      ${s.action?`<div class="small" style="margin-top:3px">Next: ${escapeHtml(s.action)}</div>`:""}</div>`;
  }).join("");
}
function updateTopicCard(card,id){
  const s=topicState(id);
  card.classList.remove("red","amber","green","none"); card.classList.add(s.status);
  card.querySelectorAll(".rag").forEach(b=>{b.classList.remove("selected","off"); b.classList.add(b.dataset.status===s.status?"selected":"off")});
  renderDashboard(); renderQueue(); save();
}
document.addEventListener("click",e=>{
  const tab=e.target.closest("[data-subject]");
  if(tab){currentSubject=tab.dataset.subject; render(); return}
  const gh=e.target.closest(".group-head");
  if(gh){const key=currentSubject+"|"+gh.dataset.group; collapsed.has(key)?collapsed.delete(key):collapsed.add(key); renderTopics(); return}
  const card=e.target.closest(".topic");
  if(card && e.target.matches(".rag")){topicState(card.dataset.topic).status=e.target.dataset.status; updateTopicCard(card,card.dataset.topic); return}
  if(card && e.target.matches(".clear-rag")){topicState(card.dataset.topic).status="none"; updateTopicCard(card,card.dataset.topic); return}
});
document.addEventListener("input",e=>{
  const card=e.target.closest(".topic");
  if(!card) return;
  const s=topicState(card.dataset.topic);
  if(e.target.matches(".confidence")){s.confidence=Number(e.target.value); card.querySelector(".confVal").textContent=s.confidence+"/5"}
  if(e.target.matches(".score")) s.score=e.target.value;
  if(e.target.matches(".review-date")) s.date=e.target.value;
  if(e.target.matches(".notes")) s.notes=e.target.value;
  if(e.target.matches(".action")) s.action=e.target.value;
  renderDashboard(); renderQueue(); save();
});
["search","statusFilter","sortMode"].forEach(id=>document.getElementById(id).addEventListener(id==="search"?"input":"change",()=>{renderTopics()}));
document.getElementById("studentSelect").addEventListener("change",e=>{state.current=Number(e.target.value);render()});
document.getElementById("physicsOptionSelect").addEventListener("change",e=>{student().physicsOption=e.target.value;render()});
document.getElementById("addStudent").addEventListener("click",()=>{
  const name=prompt("Student name:");
  if(!name?.trim()) return;
  state.students.push(blankStudent(name.trim())); state.current=state.students.length-1; render();
});
document.getElementById("renameStudent").addEventListener("click",()=>{
  const name=prompt("Rename student:",student().name);
  if(name?.trim()){student().name=name.trim();render()}
});
document.getElementById("deleteStudent").addEventListener("click",()=>{
  if(state.students.length===1){alert("Keep at least one student profile.");return}
  if(confirm(`Delete ${student().name} and all saved RAG data?`)){state.students.splice(state.current,1);state.current=Math.max(0,state.current-1);render()}
});
document.getElementById("expandAll").addEventListener("click",()=>{collapsed.clear();renderTopics()});
document.getElementById("collapseAll").addEventListener("click",()=>{Object.keys(groupRows()).forEach(g=>collapsed.add(currentSubject+"|"+g));renderTopics()});
document.getElementById("clearFilters").addEventListener("click",()=>{document.getElementById("search").value="";document.getElementById("statusFilter").value="all";document.getElementById("sortMode").value="spec";renderTopics()});
document.getElementById("importFile").addEventListener("change",async e=>{
  const f=e.target.files[0]; if(!f)return;
  try{const parsed=JSON.parse(await f.text()); if(!parsed.students)throw new Error(); state=parsed;currentSubject=state.ui?.subject||"Physics";save();render();alert("Backup imported.");}
  catch(err){alert("That file is not a valid RAG tracker backup.");}
  e.target.value="";
});
function groupRows(){const g={};visibleSpec().forEach(t=>(g[t.group]??=[]).push(t));return g}
function setVisibleStatus(status){
  const rows=visibleSpec(); if(!rows.length)return;
  if(!confirm(`Mark all ${rows.length} currently visible topics ${status.toUpperCase()}?`)) return;
  rows.forEach(t=>topicState(t.id).status=status);render();
}
function resetCurrent(){
  if(confirm(`Reset every saved topic for ${student().name}?`)){const name=student().name,opt=student().physicsOption;state.students[state.current]=blankStudent(name);state.students[state.current].physicsOption=opt;render()}
}
function exportJSON(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  downloadBlob(blob,`AQA_RAG_backup_${safeName(student().name)}.json`);
}
function downloadCSV(){
  const rows=[["Student","Subject","Topic ID","Topic","Group","RAG","Confidence","Score","Review date","Notes","Next action"]];
  SPEC[currentSubject].filter(physicsOptionMatch).forEach(t=>{
    const s=topicState(t.id);
    rows.push([student().name,currentSubject,t.id,t.title,t.group,s.status,s.confidence,s.score,s.date,s.notes,s.action]);
  });
  const csv=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");
  downloadBlob(new Blob([csv],{type:"text/csv"}),`${safeName(student().name)}_${currentSubject}_RAG.csv`);
}
function downloadBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function safeName(s){return String(s).replace(/[^a-z0-9_-]+/gi,"_")}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function escapeAttr(v){return escapeHtml(v).replace(/`/g,"&#096;")}
render();
