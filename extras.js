let practicalsOnly = false;

function todayISO(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function addDaysISO(days){
  const d = new Date();
  d.setHours(12,0,0,0);
  d.setDate(d.getDate()+days);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function isDue(date){
  return Boolean(date && date <= todayISO());
}

function installStudyTools(){
  if(document.getElementById("studyTools")) return;
  const overview = document.querySelector(".overview");
  if(!overview) return;
  const panel = document.createElement("section");
  panel.id = "studyTools";
  panel.className = "study-tools";
  panel.innerHTML = `
    <div class="priority-block">
      <div class="study-heading">
        <div>
          <div class="eyebrow dark">Revision</div>
          <h2>Top priorities</h2>
        </div>
        <span class="due-summary" id="dueSummary">No reviews due</span>
      </div>
      <div id="priorityList" class="priority-list"></div>
    </div>
    <div class="study-actions">
      <button class="quiet-action" id="randomWeakBtn" type="button">Pick a weak lesson</button>
      <button class="quiet-action" id="practicalFilterBtn" type="button">Practicals only</button>
    </div>`;
  overview.insertAdjacentElement("afterend",panel);

  document.getElementById("randomWeakBtn").addEventListener("click",pickRandomWeakLesson);
  document.getElementById("practicalFilterBtn").addEventListener("click",()=>{
    practicalsOnly = !practicalsOnly;
    applyPracticalFilter();
  });
}

function priorityRows(){
  const rows = courseRows();
  const numbers = new Map(rows.map((t,i)=>[t.id,i+1]));
  return rows.filter(t=>["red","amber"].includes(topicState(t.id).status)).sort((a,b)=>{
    const sa = topicState(a.id), sb = topicState(b.id);
    const statusRank = {red:0,amber:1};
    const dueA = isDue(sa.date) ? 0 : 1;
    const dueB = isDue(sb.date) ? 0 : 1;
    const scoreA = sa.score === "" ? 101 : Number(sa.score);
    const scoreB = sb.score === "" ? 101 : Number(sb.score);
    return statusRank[sa.status]-statusRank[sb.status] || dueA-dueB ||
      (Number(sa.confidence||3)-Number(sb.confidence||3)) || scoreA-scoreB ||
      numbers.get(a.id)-numbers.get(b.id);
  });
}

function renderPriorities(){
  const list = document.getElementById("priorityList");
  if(!list) return;
  const rows = priorityRows().slice(0,3);
  if(!rows.length){
    list.innerHTML = `<div class="priority-empty">No Red or Amber lessons yet.</div>`;
  }else{
    const all = courseRows();
    list.innerHTML = rows.map(t=>{
      const s = topicState(t.id);
      const number = all.findIndex(x=>x.id===t.id)+1;
      return `<button class="priority-row" type="button" data-priority-topic="${escapeAttr(t.id)}">
        <span class="priority-rag ${s.status}">${s.status==="red"?"R":"A"}</span>
        <span class="priority-copy"><strong>${escapeHtml(t.title)}</strong><small>Lesson ${number}${isDue(s.date)?" • review due":""}</small></span>
        <span class="priority-arrow">›</span>
      </button>`;
    }).join("");
  }

  const due = courseRows().filter(t=>isDue(topicState(t.id).date)).length;
  const dueSummary = document.getElementById("dueSummary");
  if(dueSummary) dueSummary.textContent = due ? `${due} review${due===1?"":"s"} due` : "No reviews due";

  const randomBtn = document.getElementById("randomWeakBtn");
  if(randomBtn) randomBtn.disabled = priorityRows().length === 0;
}

function applyDueBadges(){
  document.querySelectorAll(".topic").forEach(card=>{
    card.querySelector(".due-badge")?.remove();
    const meta = card.querySelector(".topic-meta");
    const s = topicState(card.dataset.topic);
    if(meta && isDue(s.date)){
      const badge = document.createElement("span");
      badge.className = "due-badge";
      badge.textContent = "Review due";
      meta.append(" ",badge);
    }
  });
}

function injectReviewShortcuts(){
  document.querySelectorAll(".topic").forEach(card=>{
    const dateInput = card.querySelector(".review-date");
    if(!dateInput || dateInput.parentElement.querySelector(".review-shortcuts")) return;
    const row = document.createElement("div");
    row.className = "review-shortcuts";
    row.innerHTML = `<span>Quick set:</span>
      <button type="button" data-review-days="3">3 days</button>
      <button type="button" data-review-days="7">1 week</button>
      <button type="button" data-review-days="14">2 weeks</button>`;
    dateInput.parentElement.appendChild(row);
  });
}

function applyPracticalFilter(){
  const button = document.getElementById("practicalFilterBtn");
  if(!button) return;
  const isMaths = currentSubject === "Maths";
  button.hidden = isMaths;
  if(isMaths) practicalsOnly = false;
  button.classList.toggle("active",practicalsOnly);
  button.textContent = practicalsOnly ? "Show all lessons" : "Practicals only";

  let visible = 0;
  document.querySelectorAll(".group").forEach(group=>{
    let groupVisible = 0;
    group.querySelectorAll(".topic").forEach(card=>{
      const title = card.querySelector(".topic-title")?.textContent.toLowerCase() || "";
      const show = !practicalsOnly || title.includes("required practical");
      card.hidden = !show;
      if(show){ visible++; groupVisible++; }
    });
    group.hidden = practicalsOnly && groupVisible===0;
    if(practicalsOnly && groupVisible) group.open = true;
  });
  if(practicalsOnly){
    const count = document.getElementById("lessonCount");
    if(count) count.textContent = `${visible} practical${visible===1?"":"s"}`;
  }
}

function pickRandomWeakLesson(){
  const rows = priorityRows();
  if(!rows.length) return;
  const reds = rows.filter(t=>topicState(t.id).status==="red");
  const pool = reds.length ? reds : rows;
  const chosen = pool[Math.floor(Math.random()*pool.length)];
  practicalsOnly = false;
  goToLesson(chosen.id);
}

function refreshStudyTools(){
  installStudyTools();
  renderPriorities();
  applyDueBadges();
  injectReviewShortcuts();
  applyPracticalFilter();
}

document.addEventListener("click",e=>{
  const priority = e.target.closest("[data-priority-topic]");
  if(priority){
    practicalsOnly = false;
    goToLesson(priority.dataset.priorityTopic);
    return;
  }
  const quick = e.target.closest("[data-review-days]");
  if(quick){
    const card = quick.closest(".topic");
    const input = card?.querySelector(".review-date");
    if(!input) return;
    input.value = addDaysISO(Number(quick.dataset.reviewDays));
    input.dispatchEvent(new Event("input",{bubbles:true}));
    setTimeout(refreshStudyTools,0);
  }
});

document.addEventListener("input",e=>{
  if(e.target.matches(".review-date,.score,.confidence")) setTimeout(refreshStudyTools,0);
});

document.addEventListener("change",e=>{
  if(e.target.id==="studentSelect" || e.target.id==="physicsOptionSelect") setTimeout(refreshStudyTools,0);
});

const topicListObserver = new MutationObserver(()=>refreshStudyTools());
const topicList = document.getElementById("topicList");
if(topicList) topicListObserver.observe(topicList,{childList:true});

refreshStudyTools();
