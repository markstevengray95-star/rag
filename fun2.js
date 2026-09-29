(() => {
  const FACTS = {
    Physics:[
      "Light from the Sun takes about 8 minutes 20 seconds to reach Earth.",
      "The speed of light in vacuum is exactly 299,792,458 metres per second.",
      "GPS systems must account for relativistic clock effects to remain accurate.",
      "A photon has no rest mass, but it carries energy and momentum.",
      "A rainbow involves refraction, internal reflection and dispersion inside water droplets.",
      "The Moon is slowly moving away from Earth by a few centimetres each year.",
      "A superconducting material can have zero electrical resistance below its critical temperature.",
      "The aurora is caused by charged particles interacting with atoms and molecules high in Earth's atmosphere.",
      "The area under a force-extension graph represents work done in stretching the material."
    ],
    Chemistry:[
      "Diamond and graphite contain only carbon, but different structures give them very different properties.",
      "A catalyst changes the reaction pathway but is not used up overall.",
      "The pH scale is logarithmic: one pH unit corresponds to a tenfold change in hydrogen-ion concentration.",
      "Graphene is a single layer of carbon atoms arranged in a hexagonal lattice.",
      "Chirality matters in medicines because enantiomers can interact differently with biological molecules.",
      "NMR spectroscopy can reveal different chemical environments inside an organic molecule.",
      "Buffer solutions resist large pH changes when small amounts of acid or base are added.",
      "Chromatography separates substances because they interact differently with stationary and mobile phases.",
      "Some energetically feasible reactions are still very slow because their activation energy is large."
    ],
    Maths:[
      "There are infinitely many prime numbers — Euclid proved this more than 2,000 years ago.",
      "π is irrational, so its decimal expansion never terminates or repeats.",
      "Euler's identity links five famous constants: e^(iπ) + 1 = 0.",
      "About 68% of a normal distribution lies within one standard deviation of its mean.",
      "Differentiation and integration are connected by the fundamental theorem of calculus.",
      "Proof by contradiction begins by assuming the opposite of what you want to prove.",
      "The gradient of a displacement-time graph gives velocity.",
      "The area under a velocity-time graph gives displacement.",
      "Newton's method can converge quickly to a root when the starting value is suitable."
    ]
  };

  const TIPS = {
    Physics:[
      "Draw and label the situation before choosing an equation.",
      "Write the symbolic equation first, then substitute values with units.",
      "For practicals, revise method, variables, graph shape and uncertainty together."
    ],
    Chemistry:[
      "Build organic reaction maps linking reagent, conditions, mechanism and product.",
      "For calculations, write the equation and mole ratio before doing arithmetic.",
      "For mechanisms, explain why each curly arrow moves where it does."
    ],
    Maths:[
      "Redo questions without the worked solution: recognition is easier than recall.",
      "Mix question types so you practise choosing the method as well as using it.",
      "Keep a short error log explaining why each mistake happened and how to spot it next time."
    ]
  };

  const queues = {};

  function shuffle(values){
    const a=[...values];
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }
  function nextFact(){
    const subject=currentSubject;
    if(!queues[subject] || !queues[subject].length) queues[subject]=shuffle(FACTS[subject]||FACTS.Physics);
    return queues[subject].pop();
  }
  function due(s){
    if(!s.date) return false;
    const d=new Date(`${s.date}T00:00:00`), now=new Date(); now.setHours(0,0,0,0);
    return Number.isFinite(d.getTime()) && d<=now;
  }
  function scoreTopic(t){
    const s=topicState(t.id); let n=0;
    if(s.status==="red") n+=100; else if(s.status==="amber") n+=65; else if(s.status==="none") n+=12;
    if(due(s)) n+=40;
    n+=(5-(Number(s.confidence)||3))*6;
    if(s.score!=="" && Number.isFinite(Number(s.score))) n+=Math.max(0,70-Number(s.score))*.5;
    return n;
  }
  function topicTip(t){
    const text=`${t.title} ${t.group}`.toLowerCase();
    if(currentSubject==="Physics"){
      if(t.id.startsWith("RP-") || text.includes("practical")) return "Rehearse method, variables, graph and main uncertainty.";
      if(text.includes("field") || text.includes("electric") || text.includes("magnetic")) return "Sketch the field and directions before using equations.";
      if(text.includes("wave")) return "Connect the diagram to phase, wavelength and v = fλ.";
      return "Do quick retrieval, then two exam questions without notes.";
    }
    if(currentSubject==="Chemistry"){
      if(t.id.startsWith("RP-") || text.includes("practical")) return "Recall method, observations, calculations and key safety points.";
      if(text.includes("organic") || text.includes("alk") || text.includes("amine") || text.includes("carbox")) return "Put it on a reaction map with reagents, conditions and mechanism.";
      if(text.includes("acid") || text.includes("equilibrium") || text.includes("rate")) return "Do one explanation question and one calculation from first principles.";
      return "Retrieve definitions, then answer one structured exam question.";
    }
    if(text.includes("differenti") || text.includes("integrat")) return "Do a routine, mixed and unfamiliar question in that order.";
    if(text.includes("probability") || text.includes("statistic") || text.includes("distribution")) return "State the model and assumptions before calculating.";
    if(text.includes("force") || text.includes("kinematic") || text.includes("moment")) return "Draw the diagram and define positive direction first.";
    return "Try one question from memory, mark it, then correct the exact error.";
  }
  function priorities(){
    const rows=courseRows();
    const weak=rows.filter(t=>["red","amber"].includes(topicState(t.id).status)||due(topicState(t.id)));
    const pool=weak.length?weak:rows.filter(t=>topicState(t.id).status!=="green");
    return [...pool].sort((a,b)=>scoreTopic(b)-scoreTopic(a)).slice(0,3);
  }

  function addPanels(){
    if(document.getElementById("studyFunRow")) return;
    const overview=document.querySelector(".overview"); if(!overview) return;
    const section=document.createElement("section");
    section.id="studyFunRow"; section.className="study-fun-row";
    section.innerHTML=`
      <div class="study-card">
        <div class="eyebrow dark">Revision helper</div><h2>Suggested revision</h2>
        <p class="small">Chosen from your RAG ratings, confidence, scores and review dates.</p>
        <div class="suggestions-list" id="revisionSuggestions"></div>
        <div class="tip-strip"><strong>Tip</strong><span id="revisionTip"></span></div>
      </div>
      <div class="fun-card">
        <div class="eyebrow dark">Tiny break</div><h2>Curiosity corner</h2>
        <div class="fun-actions"><button class="fact-btn" id="factBtn" type="button">Interesting fact</button><button class="dont-press" id="dontPressBtn" type="button">Don't press</button></div>
        <div class="fact-box" id="factBox">Press <strong>&nbsp;Interesting fact&nbsp;</strong> for another one whenever you like.</div>
      </div>`;
    overview.insertAdjacentElement("afterend",section);
  }

  function addDisco(){
    if(document.getElementById("dogDisco")) return;
    const o=document.createElement("div"); o.id="dogDisco"; o.className="dog-disco"; o.setAttribute("role","dialog"); o.setAttribute("aria-modal","true"); o.setAttribute("aria-label","Dog disco");
    o.innerHTML=`<div class="disco-lights" aria-hidden="true"></div><i class="disco-spark s1"></i><i class="disco-spark s2"></i><i class="disco-spark s3"></i><i class="disco-spark s4"></i>
      <div class="disco-card"><div class="dog-picture">
        <svg viewBox="0 0 400 300" role="img" aria-label="Happy dog at a disco"><rect width="400" height="300" fill="#f4eadf"/><ellipse cx="200" cy="255" rx="126" ry="25" fill="#dcc9b3" opacity=".65"/><path d="M113 92 C72 54 62 104 91 151 C104 167 128 151 137 127 Z" fill="#9b633e"/><path d="M287 92 C328 54 338 104 309 151 C296 167 272 151 263 127 Z" fill="#9b633e"/><ellipse cx="200" cy="137" rx="92" ry="83" fill="#c98b59"/><path d="M139 94 C159 64 244 59 268 99 C241 87 171 84 139 94Z" fill="#e1a875"/><ellipse cx="167" cy="133" rx="10" ry="13" fill="#2c211a"/><ellipse cx="233" cy="133" rx="10" ry="13" fill="#2c211a"/><circle cx="164" cy="129" r="3" fill="#fff"/><circle cx="230" cy="129" r="3" fill="#fff"/><ellipse cx="200" cy="166" rx="23" ry="17" fill="#2b211c"/><path d="M179 184 Q200 205 221 184" fill="none" stroke="#5c3428" stroke-width="6" stroke-linecap="round"/><path d="M185 194 Q200 216 215 194 Q203 189 185 194" fill="#e48282"/><path d="M155 222 L190 207 L200 227 L210 207 L245 222 L226 249 L200 232 L174 249 Z" fill="#334e9a"/><circle cx="200" cy="226" r="7" fill="#f7d84b"/></svg>
      </div><div class="disco-title">You pressed it. 🐶</div><div class="disco-sub">Dog disco activated. This was entirely predictable.</div><button class="exit-disco" id="exitDisco" type="button">Exit disco</button></div>`;
    document.body.appendChild(o);
  }

  function refreshSuggestions(){
    const list=document.getElementById("revisionSuggestions"), tip=document.getElementById("revisionTip"); if(!list||!tip) return;
    const rows=priorities();
    if(!rows.length) list.innerHTML=`<div class="small">Everything in ${escapeHtml(SUBJECT_LABELS[currentSubject])} is Green. Use occasional retrieval practice to keep it secure.</div>`;
    else list.innerHTML=rows.map((t,i)=>{const s=topicState(t.id); const label=s.status==="red"?"Red":s.status==="amber"?"Amber":due(s)?"Review due":"Not rated"; return `<div class="suggestion-item"><div class="suggestion-rank">${i+1}</div><div><div class="suggestion-title">${escapeHtml(t.title)}</div><div class="suggestion-tip">${escapeHtml(label)} • ${escapeHtml(topicTip(t))}</div></div><button class="suggestion-jump" type="button" data-suggest-topic="${escapeAttr(t.id)}">Open</button></div>`;}).join("");
    const tips=TIPS[currentSubject]||TIPS.Physics; const weak=courseRows().filter(t=>["red","amber"].includes(topicState(t.id).status)).length; tip.textContent=tips[weak%tips.length];
  }
  function openDisco(){document.getElementById("dogDisco")?.classList.add("open");document.body.style.overflow="hidden";document.getElementById("exitDisco")?.focus();}
  function closeDisco(){document.getElementById("dogDisco")?.classList.remove("open");document.body.style.overflow="";document.getElementById("dontPressBtn")?.focus();}

  addPanels(); addDisco(); refreshSuggestions();

  const originalRender=render;
  render=function(...args){const result=originalRender(...args); queueMicrotask(refreshSuggestions); return result;};
  const originalSetRag=setRag;
  setRag=function(...args){const result=originalSetRag(...args); queueMicrotask(refreshSuggestions); return result;};

  document.addEventListener("input",e=>{if(e.target.closest(".topic")) queueMicrotask(refreshSuggestions);});
  document.addEventListener("change",e=>{if(e.target.id==="physicsOptionSelect"||e.target.id==="studentSelect") queueMicrotask(refreshSuggestions);});
  document.addEventListener("click",e=>{
    if(e.target.closest("#factBtn")){const box=document.getElementById("factBox"); if(box) box.textContent=nextFact(); return;}
    if(e.target.closest("#dontPressBtn")){openDisco(); return;}
    if(e.target.closest("#exitDisco")){closeDisco(); return;}
    const jump=e.target.closest("[data-suggest-topic]"); if(jump){goToLesson(jump.dataset.suggestTopic); return;}
    const overlay=document.getElementById("dogDisco"); if(overlay?.classList.contains("open")&&e.target===overlay) closeDisco();
  });
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.getElementById("dogDisco")?.classList.contains("open")) closeDisco();});
})();