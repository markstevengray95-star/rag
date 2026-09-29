const SPEC = {Physics: PHYSICS_SPEC, Chemistry: CHEMISTRY_SPEC, Maths: MATHS_SPEC};
const STORAGE_KEY = "aqa_alevel_rag_tracker_v2";
const LEGACY_STORAGE_KEY = "aqa_alevel_rag_tracker_v1";
const SUBJECT_LABELS = {Physics:"Physics", Chemistry:"Chemistry", Maths:"Mathematics"};

let state = loadState();
let currentSubject = state.ui?.subject || "Physics";
let currentView = state.ui?.view || "all";

function blankStudent(name){
  return {name, physicsOption:"Astrophysics", topics:{}};
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if(Array.isArray(parsed.students) && parsed.students.length){
        parsed.current = Math.min(Math.max(Number(parsed.current)||0,0), parsed.students.length-1);
        parsed.ui = parsed.ui || {subject:"Physics", view:"all"};
        return parsed;
      }
    }
  }catch(e){}
  return {students:[blankStudent("Student 1")], current:0, ui:{subject:"Physics",view:"all"}};
}

function save(){
  state.ui = state.ui || {};
  state.ui.subject = currentSubject;
  state.ui.view = currentView;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function student(){
  if(!state.students[state.current]) state.current = 0;
  return state.students[state.current];
}

function topicState(id){
  const s = student();
  if(!s.topics) s.topics = {};
  if(!s.topics[id]){
    s.topics[id] = {status:"none",confidence:3,score:"",date:"",notes:"",action:"",updatedAt:""};
  }
  const t = s.topics[id];
  if(!t.status) t.status = "none";
  if(!t.confidence) t.confidence = 3;
  return t;
}

function physicsOptionMatch(topic){
  if(currentSubject !== "Physics") return true;
  const option = student().physicsOption || "Astrophysics";
  return option === "ALL" || !topic.option || topic.option === option;
}

function courseRows(){
  return (SPEC[currentSubject] || []).filter(physicsOptionMatch);
}

function filteredRows(){
  let rows = courseRows();
  const q = (document.getElementById("search")?.value || "").trim().toLowerCase();
  if(currentView === "focus") rows = rows.filter(t => ["red","amber"].includes(topicState(t.id).status));
  else if(currentView === "unrated") rows = rows.filter(t => topicState(t.id).status === "none");
  if(q){
    rows = rows.filter(t => [t.id,t.title,t.group,t.option,...(t.subs||[])].join(" ").toLowerCase().includes(q));
  }
  return rows;
}

function lessonNumberMap(){
  const map = new Map();
  courseRows().forEach((t,i)=>map.set(t.id,i+1));
  return map;
}

function countsFor(rows){
  const c = {green:0,amber:0,red:0,none:0};
  rows.forEach(t=>{ const status = topicState(t.id).status; c[status] = (c[status] || 0) + 1; });
  return c;
}

function renderStudentSelect(){
  const el = document.getElementById("studentSelect");
  el.innerHTML = state.students.map((s,i)=>`<option value="${i}" ${i===state.current?"selected":""}>${escapeHtml(s.name)}</option>`).join("");
}

function renderTabs(){
  document.getElementById("subjectTabs").innerHTML = ["Physics","Chemistry","Maths"].map(subject=>
    `<button class="tab ${subject===currentSubject?"active":""}" data-subject="${subject}" aria-pressed="${subject===currentSubject}">${SUBJECT_LABELS[subject]}</button>`
  ).join("");
}

function renderViewToggle(){
  document.querySelectorAll(".view-btn").forEach(btn=>{
    const active = btn.dataset.view === currentView;
    btn.classList.toggle("active",active);
    btn.setAttribute("aria-pressed", String(active));
  });
  const descriptions = {
    all:["Lesson sequence","Work through the specification in order and choose Red, Amber or Green for each lesson."],
    focus:["Revision focus","Only lessons marked Red or Amber are shown, keeping revision focused and manageable."],
    unrated:["Not rated","These lessons do not have a RAG judgement yet."]
  };
  const [title,description] = descriptions[currentView] || descriptions.all;
  document.getElementById("viewTitle").textContent = title;
  document.getElementById("viewDescription").textContent = description;
}

function renderOverview(){
  const rows = courseRows();
  const counts = countsFor(rows);
  const total = rows.length;
  const securePercent = total ? Math.round((counts.green/total)*100) : 0;
  document.getElementById("subjectLabel").textContent = `${SUBJECT_LABELS[currentSubject]} lesson sequence`;
  document.getElementById("progressPercent").textContent = `${securePercent}%`;
  document.getElementById("progressBar").style.width = `${securePercent}%`;
  document.getElementById("progressMeta").textContent = `${counts.green} secure • ${counts.amber} developing • ${counts.red} to revisit • ${counts.none} not rated`;

  const next = rows.find(t=>topicState(t.id).status==="none") || rows.find(t=>topicState(t.id).status==="red") || rows.find(t=>topicState(t.id).status==="amber") || null;
  const title = document.getElementById("continueTitle");
  const meta = document.getElementById("continueMeta");
  const btn = document.getElementById("continueBtn");
  if(!next){
    title.textContent = "Course sequence complete";
    meta.textContent = "Every lesson is currently marked Green.";
    btn.textContent = "View lesson sequence";
    btn.dataset.topic = "";
  }else{
    const number = rows.findIndex(t=>t.id===next.id)+1;
    const status = topicState(next.id).status;
    const reason = status === "none" ? "Next unrated lesson" : status === "red" ? "First Red lesson to revisit" : "First Amber lesson to strengthen";
    title.textContent = next.title;
    meta.textContent = `Lesson ${number} of ${total} • ${reason}`;
    btn.textContent = status === "none" ? "Go to next lesson" : "Go to revision lesson";
    btn.dataset.topic = next.id;
  }
}

function renderPhysicsOption(){
  const box = document.getElementById("physicsOption");
  const select = document.getElementById("physicsOptionSelect");
  box.style.display = currentSubject === "Physics" ? "flex" : "none";
  if(currentSubject === "Physics") select.value = student().physicsOption || "Astrophysics";
}

function renderTopics(){
  const rows = filteredRows();
  const numberMap = lessonNumberMap();
  const target = document.getElementById("topicList");
  document.getElementById("lessonCount").textContent = `${rows.length} ${rows.length===1?"lesson":"lessons"}`;
  if(!rows.length){
    const message = currentView === "focus" ? "No Red or Amber lessons right now." : currentView === "unrated" ? "Every lesson in this subject has been rated." : "No lessons match your search.";
    target.innerHTML = `<div class="empty">${message}</div>`;
    return;
  }

  const groups = [];
  const byGroup = new Map();
  rows.forEach(t=>{
    if(!byGroup.has(t.group)){
      const entry = {name:t.group,items:[]}; byGroup.set(t.group,entry); groups.push(entry);
    }
    byGroup.get(t.group).items.push(t);
  });
  const searchActive = Boolean((document.getElementById("search")?.value || "").trim());
  target.innerHTML = groups.map((group,index)=>{
    const groupCounts = countsFor(group.items);
    const open = searchActive || currentView !== "all" || index === 0;
    return `<details class="group" ${open?"open":""}>
      <summary><span class="group-title">${escapeHtml(group.name)}</span><span class="group-count">${groupCounts.green}/${group.items.length} secure</span></summary>
      <div class="group-body">${group.items.map(t=>lessonCard(t,numberMap.get(t.id))).join("")}</div>
    </details>`;
  }).join("");
}

function lessonCard(t,number){
  const s = topicState(t.id);
  const statusText = {red:"Red — need help",amber:"Amber — nearly there",green:"Green — secure",none:"Not rated"}[s.status];
  const hasNotes = Boolean((s.notes||"").trim() || (s.action||"").trim() || s.score !== "" || s.date);
  return `<article class="topic ${s.status}" data-topic="${escapeAttr(t.id)}" id="lesson-${safeId(t.id)}">
    <div class="topic-main">
      <div class="lesson-number" title="Lesson ${number}">${number}</div>
      <div><div class="topic-title">${escapeHtml(t.title)}</div><div class="topic-meta">${escapeHtml(t.id)} • ${escapeHtml(statusText)}${t.option?` • ${escapeHtml(t.option)}`:""}</div></div>
      <div class="controls" aria-label="RAG status for ${escapeAttr(t.title)}">
        ${ragButton("red","R",s.status,t.id,"Red — need help")}
        ${ragButton("amber","A",s.status,t.id,"Amber — nearly there")}
        ${ragButton("green","G",s.status,t.id,"Green — secure")}
      </div>
    </div>
    <details class="lesson-more">
      <summary>${hasNotes?"Notes and review":"Add notes or a score"}</summary>
      ${t.subs?.length?`<div class="subs">${t.subs.map(x=>`<span class="sub">${escapeHtml(x)}</span>`).join("")}</div>`:""}
      <div class="detail">
        <div><label>Confidence <span class="confVal">${Number(s.confidence)||3}/5</span></label><div class="range-wrap"><span>1</span><input class="confidence" type="range" min="1" max="5" value="${Number(s.confidence)||3}"><span>5</span></div></div>
        <div><label>Latest assessment score (%)</label><input class="score" type="number" min="0" max="100" inputmode="numeric" value="${escapeAttr(s.score)}" placeholder="Optional"></div>
        <div><label>Review date</label><input class="review-date" type="date" value="${escapeAttr(s.date)}"></div>
        <div><label>Next action</label><textarea class="action" placeholder="Optional — e.g. redo an exam question">${escapeHtml(s.action)}</textarea></div>
        <div style="grid-column:1/-1"><label>Notes or misconception</label><textarea class="notes" placeholder="Optional — keep this brief">${escapeHtml(s.notes)}</textarea></div>
      </div>
      <button class="clear-link" data-clear-status="true">Clear RAG status</button>
    </details>
  </article>`;
}

function ragButton(status,label,current,id,title){
  const selected = current === status;
  return `<button class="rag ${status[0]} ${selected?"selected":""}" data-status="${status}" data-topic-id="${escapeAttr(id)}" aria-pressed="${selected}" title="${escapeAttr(title)}">${label}</button>`;
}

function render(){
  renderStudentSelect(); renderTabs(); renderViewToggle(); renderPhysicsOption(); renderOverview(); renderTopics(); save();
}

function setRag(id,status){
  const s = topicState(id);
  s.status = s.status === status ? "none" : status;
  s.updatedAt = new Date().toISOString();
  renderOverview(); renderTopics(); save();
}

function goToLesson(id){
  if(!id){
    currentView = "all"; render(); document.querySelector(".lesson-panel")?.scrollIntoView({behavior:"smooth",block:"start"}); return;
  }
  currentView = "all";
  document.getElementById("search").value = "";
  render();
  requestAnimationFrame(()=>{
    const card = document.getElementById(`lesson-${safeId(id)}`);
    if(card){
      const group = card.closest("details.group"); if(group) group.open = true;
      card.scrollIntoView({behavior:"smooth",block:"center"});
      card.animate([{transform:"scale(1)"},{transform:"scale(1.01)"},{transform:"scale(1)"}],{duration:500});
    }
  });
}

document.addEventListener("click",e=>{
  const subject = e.target.closest("[data-subject]");
  if(subject){ currentSubject = subject.dataset.subject; currentView = "all"; document.getElementById("search").value = ""; render(); return; }
  const view = e.target.closest("[data-view]");
  if(view){ currentView = view.dataset.view; render(); return; }
  const rag = e.target.closest("button.rag[data-status]");
  if(rag){ setRag(rag.dataset.topicId,rag.dataset.status); return; }
  const clear = e.target.closest("[data-clear-status]");
  if(clear){ const card = clear.closest(".topic"); if(card){ topicState(card.dataset.topic).status = "none"; renderOverview(); renderTopics(); save(); } }
});

document.addEventListener("input",e=>{
  if(e.target.id === "search"){ renderTopics(); return; }
  const card = e.target.closest(".topic"); if(!card) return;
  const s = topicState(card.dataset.topic);
  if(e.target.matches(".confidence")){ s.confidence = Number(e.target.value); const val = card.querySelector(".confVal"); if(val) val.textContent = `${s.confidence}/5`; }
  if(e.target.matches(".score")) s.score = e.target.value;
  if(e.target.matches(".review-date")) s.date = e.target.value;
  if(e.target.matches(".notes")) s.notes = e.target.value;
  if(e.target.matches(".action")) s.action = e.target.value;
  s.updatedAt = new Date().toISOString(); save();
});

document.getElementById("studentSelect").addEventListener("change",e=>{ state.current = Number(e.target.value); render(); });
document.getElementById("physicsOptionSelect").addEventListener("change",e=>{ student().physicsOption = e.target.value; render(); });
document.getElementById("continueBtn").addEventListener("click",e=>goToLesson(e.currentTarget.dataset.topic || ""));

document.getElementById("addStudent").addEventListener("click",()=>{
  const name = prompt("Student name:"); if(!name?.trim()) return;
  state.students.push(blankStudent(name.trim())); state.current = state.students.length-1; currentView = "all"; render();
});

document.getElementById("renameStudent").addEventListener("click",()=>{
  const name = prompt("Rename student:",student().name); if(name?.trim()){ student().name = name.trim(); render(); }
});

document.getElementById("deleteStudent").addEventListener("click",()=>{
  if(state.students.length === 1){ alert("Keep at least one student profile."); return; }
  if(confirm(`Delete ${student().name} and all of their saved progress?`)){ state.students.splice(state.current,1); state.current = Math.min(state.current,state.students.length-1); render(); }
});

document.getElementById("importFile").addEventListener("change",async e=>{
  const file = e.target.files?.[0]; if(!file) return;
  try{
    const parsed = JSON.parse(await file.text()); if(!Array.isArray(parsed.students) || !parsed.students.length) throw new Error("Invalid backup");
    state = parsed; state.ui = state.ui || {subject:"Physics",view:"all"}; state.current = Math.min(Math.max(Number(state.current)||0,0),state.students.length-1);
    currentSubject = SPEC[state.ui.subject] ? state.ui.subject : "Physics"; currentView = ["all","focus","unrated"].includes(state.ui.view) ? state.ui.view : "all";
    save(); render(); alert("Backup imported.");
  }catch(err){ alert("That file is not a valid RAG tracker backup."); }
  e.target.value = "";
});

function resetCurrent(){
  if(confirm(`Reset all RAG ratings and notes for ${student().name}?`)){
    const name = student().name; const option = student().physicsOption || "Astrophysics";
    state.students[state.current] = blankStudent(name); state.students[state.current].physicsOption = option; render();
  }
}

function exportJSON(){
  downloadBlob(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),`AQA_RAG_backup_${safeName(student().name)}.json`);
}

function downloadCSV(){
  const rows = [["Student","Subject","Lesson","Specification code","Topic","Section","RAG","Confidence","Score","Review date","Notes","Next action"]];
  courseRows().forEach((t,index)=>{ const s = topicState(t.id); rows.push([student().name,SUBJECT_LABELS[currentSubject],index+1,t.id,t.title,t.group,s.status,s.confidence,s.score,s.date,s.notes,s.action]); });
  const csv = rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");
  downloadBlob(new Blob([csv],{type:"text/csv;charset=utf-8"}),`${safeName(student().name)}_${currentSubject}_RAG.csv`);
}

function downloadBlob(blob,name){
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),500);
}
function safeName(value){ return String(value||"student").replace(/[^a-z0-9_-]+/gi,"_"); }
function safeId(value){ return String(value).replace(/[^a-z0-9_-]+/gi,"-"); }
function escapeHtml(value){ return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch])); }
function escapeAttr(value){ return escapeHtml(value).replace(/`/g,"&#096;"); }

render();