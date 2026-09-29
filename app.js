const SPEC = {Physics: PHYSICS_SPEC, Chemistry: CHEMISTRY_SPEC, Maths: MATHS_SPEC};
const STORAGE_KEY = "aqa_alevel_rag_tracker_v1";
let state = loadState();
let currentSubject = state.ui?.subject || "Physics";
let currentView = state.ui?.view || "all";

function blankStudent(name){
  return {name, physicsOption:"Astrophysics", topics:{}};
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if(parsed?.students?.length) return parsed;
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

function student(){ return state.students[state.current] }

function topicState(id){
  if(!student().topics[id]){
    student().topics[id] = {status:"none",confidence:3,score:"",date:"",notes:"",action:""};
  }
  const s = student().topics[id];
  if(!["red","amber","green","none"].includes(s.status)) s.status = "none";
  if(!s.confidence) s.confidence = 3;
  return s;
}

function subjectRows(){
  let rows = SPEC[currentSubject].slice();
  if(currentSubject === "Physics"){
    const opt = student().physicsOption || "Astrophysics";
    rows = rows.filter(t => opt === "ALL" || !t.option || t.option === opt);
  }
  return rows;
}

function visibleRows(){
  const query = document.getElementById("search").value.trim().toLowerCase();
  let rows = subjectRows();
  if(currentView === "focus"){
    rows = rows.filter(t => ["red","amber"].includes(topicState(t.id).status));
  } else if(currentView === "unrated"){
    rows = rows.filter(t => topicState(t.id).status === "none");
  }
  if(query){
    rows = rows.filter(t => {
      const text = `${t.title} ${t.group} ${t.id} ${(t.subs || []).join(" ")}`.toLowerCase();
      return text.includes(query);
    });
  }
  return rows;
}

function renderStudentSelect(){
  const el = document.getElementById("studentSelect");
  el.innerHTML = state.students.map((s,i) =>
    `<option value="${i}" ${i===state.current?"selected":""}>${escapeHtml(s.name)}</option>`
  ).join("");
}

function renderTabs(){
  document.getElementById("subjectTabs").innerHTML = ["Physics","Chemistry","Maths"].map(s =>
    `<button class="tab ${s===currentSubject?"active":""}" data-subject="${s}">${s}</button>`
  ).join("");
}

function renderViewButtons(){
  document.querySelectorAll("[data-view]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === currentView);
  });
  const copy = {
    all:["Lesson sequence","Work through the specification in order and choose Red, Amber or Green for each lesson."],
    focus:["Revision focus","Only lessons marked Red or Amber are shown, keeping revision targeted."],
    unrated:["Not rated","Use this view to quickly find lessons that still need a RAG judgement."]
  };
  document.getElementById("viewTitle").textContent = copy[currentView][0];
  document.getElementById("viewDescription").textContent = copy[currentView][1];
}

function render(){
  renderStudentSelect();
  renderTabs();
  renderViewButtons();

  const optionBox = document.getElementById("physicsOption");
  optionBox.style.display = currentSubject === "Physics" ? "flex" : "none";
  if(currentSubject === "Physics"){
    document.getElementById("physicsOptionSelect").value = student().physicsOption || "Astrophysics";
  }

  document.getElementById("subjectLabel").textContent = `${currentSubject} lesson sequence`;
  renderOverview();
  renderTopics();
  save();
}

function renderOverview(){
  const rows = subjectRows();
  const counts = {green:0,amber:0,red:0,none:0};
  rows.forEach(t => counts[topicState(t.id).status]++);
  const securePct = rows.length ? Math.round((counts.green / rows.length) * 100) : 0;
  const review = counts.red + counts.amber;

  document.getElementById("progressPercent").textContent = `${securePct}%`;
  document.getElementById("progressBar").style.width = `${securePct}%`;
  document.getElementById("progressMeta").textContent =
    `${counts.green} secure • ${review} to review • ${counts.none} not rated`;

  const next = rows.find(t => topicState(t.id).status === "none");
  const btn = document.getElementById("continueBtn");
  if(next){
    const number = rows.findIndex(t => t.id === next.id) + 1;
    document.getElementById("continueTitle").textContent = next.title;
    document.getElementById("continueMeta").textContent = `Lesson ${number} of ${rows.length} • ${next.group}`;
    btn.style.display = "inline-flex";
    btn.dataset.topic = next.id;
  }else{
    const weak = rows.find(t => topicState(t.id).status === "red") || rows.find(t => topicState(t.id).status === "amber");
    document.getElementById("continueTitle").textContent = weak ? "All lessons rated" : "Course sequence complete";
    document.getElementById("continueMeta").textContent = weak
      ? `${review} lesson${review===1?"":"s"} still need revision.`
      : "Everything is currently marked Green.";
    btn.style.display = weak ? "inline-flex" : "none";
    if(weak) btn.dataset.topic = weak.id;
  }
}

function renderTopics(){
  const rows = visibleRows();
  const all = subjectRows();
  const query = document.getElementById("search").value.trim();
  const target = document.getElementById("topicList");
  document.getElementById("lessonCount").textContent = `${rows.length} lesson${rows.length===1?"":"s"}`;

  if(!rows.length){
    const msg = currentView === "focus"
      ? "No Red or Amber lessons right now."
      : currentView === "unrated"
        ? "Every lesson in this subject has been rated."
        : "No lessons match your search.";
    target.innerHTML = `<div class="empty">${msg}</div>`;
    return;
  }

  const groups = [];
  rows.forEach(t => {
    let group = groups.find(g => g.name === t.group);
    if(!group){
      group = {name:t.group,items:[]};
      groups.push(group);
    }
    group.items.push(t);
  });

  const focusNote = currentView === "focus"
    ? `<div class="focus-note">Start with Red lessons, then move to Amber. Mark a lesson Green when you can answer unfamiliar questions independently.</div>`
    : "";

  target.innerHTML = focusNote + groups.map((group, groupIndex) => {
    const open = query || currentView !== "all" || groupIndex === 0 ? "open" : "";
    return `<details class="group" ${open}>
      <summary>
        <span class="group-title">${escapeHtml(group.name)}</span>
        <span class="group-count">${group.items.length} lesson${group.items.length===1?"":"s"}</span>
      </summary>
      <div class="group-body">
        ${group.items.map(t => topicCard(t, all)).join("")}
      </div>
    </details>`;
  }).join("");
}

function topicCard(t, allRows){
  const s = topicState(t.id);
  const number = allRows.findIndex(x => x.id === t.id) + 1;
  return `<article class="topic ${s.status}" data-topic="${escapeAttr(t.id)}">
    <div class="topic-main">
      <div class="lesson-number">${number}</div>
      <div>
        <div class="topic-title">${escapeHtml(t.title)}</div>
        <div class="topic-meta">${escapeHtml(t.id)}${t.option?` • ${escapeHtml(t.option)}`:""}</div>
      </div>
      <div class="controls" aria-label="RAG status">
        <button class="rag r ${s.status==="red"?"selected":""}" data-status="red" title="Red — need help">R</button>
        <button class="rag a ${s.status==="amber"?"selected":""}" data-status="amber" title="Amber — nearly there">A</button>
        <button class="rag g ${s.status==="green"?"selected":""}" data-status="green" title="Green — secure">G</button>
      </div>
    </div>
    <details class="lesson-more">
      <summary>Notes & evidence</summary>
      ${t.subs?.length ? `<div class="subs">${t.subs.map(x=>`<span class="sub">${escapeHtml(x)}</span>`).join("")}</div>` : ""}
      <div class="detail">
        <div>
          <label>Confidence <span class="confVal">${s.confidence}/5</span></label>
          <div class="range-wrap"><span>1</span><input class="confidence" type="range" min="1" max="5" value="${s.confidence}"><span>5</span></div>
        </div>
        <div>
          <label>Latest assessment score (%)</label>
          <input class="score" type="number" min="0" max="100" value="${escapeAttr(s.score)}" placeholder="Optional">
        </div>
        <div>
          <label>Review date</label>
          <input class="review-date" type="date" value="${escapeAttr(s.date)}">
        </div>
        <div>
          <label>Next action</label>
          <textarea class="action" placeholder="What will you do next?">${escapeHtml(s.action)}</textarea>
        </div>
        <div style="grid-column:1/-1">
          <label>Notes / misconception</label>
          <textarea class="notes" placeholder="Keep this short and useful.">${escapeHtml(s.notes)}</textarea>
          ${s.status !== "none" ? `<button class="clear-link" type="button">Clear RAG status</button>` : ""}
        </div>
      </div>
    </details>
  </article>`;
}

function updateTopicCard(card,id){
  const s = topicState(id);
  card.classList.remove("red","amber","green","none");
  card.classList.add(s.status);
  card.querySelectorAll(".rag").forEach(b => b.classList.toggle("selected", b.dataset.status === s.status));
  renderOverview();
  if(currentView !== "all") renderTopics();
  save();
}

function jumpToTopic(id){
  currentView = "all";
  document.getElementById("search").value = "";
  renderViewButtons();
  renderTopics();
  save();
  requestAnimationFrame(() => {
    const card = [...document.querySelectorAll(".topic")].find(el => el.dataset.topic === id);
    if(!card) return;
    const group = card.closest("details.group");
    if(group) group.open = true;
    card.scrollIntoView({behavior:"smooth",block:"center"});
    card.animate(
      [{boxShadow:"0 0 0 0 rgba(49,87,166,.0)"},{boxShadow:"0 0 0 4px rgba(49,87,166,.18)"},{boxShadow:"0 0 0 0 rgba(49,87,166,.0)"}],
      {duration:900}
    );
  });
}

document.addEventListener("click", e => {
  const subjectButton = e.target.closest("[data-subject]");
  if(subjectButton){
    currentSubject = subjectButton.dataset.subject;
    document.getElementById("search").value = "";
    render();
    return;
  }

  const viewButton = e.target.closest("[data-view]");
  if(viewButton){
    currentView = viewButton.dataset.view;
    renderViewButtons();
    renderTopics();
    save();
    return;
  }

  const card = e.target.closest(".topic");
  if(card && e.target.matches(".rag")){
    const status = e.target.dataset.status;
    const s = topicState(card.dataset.topic);
    s.status = s.status === status ? "none" : status;
    updateTopicCard(card,card.dataset.topic);
    return;
  }

  if(card && e.target.matches(".clear-link")){
    topicState(card.dataset.topic).status = "none";
    updateTopicCard(card,card.dataset.topic);
  }
});

document.addEventListener("input", e => {
  const card = e.target.closest(".topic");
  if(!card) return;
  const s = topicState(card.dataset.topic);
  if(e.target.matches(".confidence")){
    s.confidence = Number(e.target.value);
    card.querySelector(".confVal").textContent = `${s.confidence}/5`;
  }
  if(e.target.matches(".score")) s.score = e.target.value;
  if(e.target.matches(".review-date")) s.date = e.target.value;
  if(e.target.matches(".notes")) s.notes = e.target.value;
  if(e.target.matches(".action")) s.action = e.target.value;
  save();
});

document.getElementById("search").addEventListener("input", renderTopics);

document.getElementById("studentSelect").addEventListener("change", e => {
  state.current = Number(e.target.value);
  render();
});

document.getElementById("physicsOptionSelect").addEventListener("change", e => {
  student().physicsOption = e.target.value;
  render();
});

document.getElementById("continueBtn").addEventListener("click", e => {
  if(e.currentTarget.dataset.topic) jumpToTopic(e.currentTarget.dataset.topic);
});

document.getElementById("addStudent").addEventListener("click", () => {
  const name = prompt("Student name:");
  if(!name?.trim()) return;
  state.students.push(blankStudent(name.trim()));
  state.current = state.students.length - 1;
  render();
});

document.getElementById("renameStudent").addEventListener("click", () => {
  const name = prompt("Rename student:", student().name);
  if(name?.trim()){
    student().name = name.trim();
    render();
  }
});

document.getElementById("deleteStudent").addEventListener("click", () => {
  if(state.students.length === 1){
    alert("Keep at least one student profile.");
    return;
  }
  if(confirm(`Delete ${student().name} and all saved RAG data?`)){
    state.students.splice(state.current,1);
    state.current = Math.max(0,state.current-1);
    render();
  }
});

document.getElementById("importFile").addEventListener("change", async e => {
  const file = e.target.files[0];
  if(!file) return;
  try{
    const parsed = JSON.parse(await file.text());
    if(!parsed?.students?.length) throw new Error("invalid");
    state = parsed;
    currentSubject = state.ui?.subject || "Physics";
    currentView = state.ui?.view || "all";
    save();
    render();
    alert("Backup imported.");
  }catch(err){
    alert("That file is not a valid RAG tracker backup.");
  }
  e.target.value = "";
});

function resetCurrent(){
  if(confirm(`Reset every saved topic for ${student().name}?`)){
    const name = student().name;
    const option = student().physicsOption;
    state.students[state.current] = blankStudent(name);
    state.students[state.current].physicsOption = option;
    render();
  }
}

function exportJSON(){
  const blob = new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  downloadBlob(blob,`AQA_RAG_backup_${safeName(student().name)}.json`);
}

function downloadCSV(){
  const rows = [["Student","Subject","Lesson","Topic ID","Topic","Section","RAG","Confidence","Score","Review date","Notes","Next action"]];
  subjectRows().forEach((t,index) => {
    const s = topicState(t.id);
    rows.push([student().name,currentSubject,index+1,t.id,t.title,t.group,s.status,s.confidence,s.score,s.date,s.notes,s.action]);
  });
  const csv = rows.map(r => r.map(v => `"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");
  downloadBlob(new Blob([csv],{type:"text/csv"}),`${safeName(student().name)}_${currentSubject}_RAG.csv`);
}

function downloadBlob(blob,name){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href),500);
}

function safeName(value){ return String(value).replace(/[^a-z0-9_-]+/gi,"_") }

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function escapeAttr(value){ return escapeHtml(value).replace(/`/g,"&#096;") }

render();
