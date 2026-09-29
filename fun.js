(() => {
  const FACTS = {
    Physics: [
      "Light from the Sun takes about 8 minutes 20 seconds to reach Earth.",
      "A neutron star can pack more mass than the Sun into a sphere only tens of kilometres across.",
      "The speed of light in vacuum is exactly 299,792,458 metres per second.",
      "A rainbow forms because light is refracted, internally reflected and dispersed inside water droplets.",
      "The Moon is slowly moving away from Earth by a few centimetres each year.",
      "GPS has to account for relativistic clock effects to stay accurate.",
      "A photon has no rest mass, but it carries energy and momentum.",
      "The same wave equation, v = fλ, works for many kinds of waves.",
      "A superconducting material can have zero electrical resistance below its critical temperature.",
      "The aurora is produced when charged particles interact with atoms and molecules high in Earth's atmosphere.",
      "A geostationary satellite orbits once every 24 hours above the equator.",
      "The energy stored in a stretched spring is linked to the area under its force-extension graph."
    ],
    Chemistry: [
      "Diamond and graphite are both made only from carbon, but their different structures give them very different properties.",
      "The characteristic colours of many transition-metal compounds are linked to electronic transitions.",
      "Water expands when it freezes, which is why ice is less dense than liquid water.",
      "A catalyst changes the reaction pathway but is not used up overall.",
      "The pH scale is logarithmic, so a change of one pH unit represents a tenfold change in hydrogen-ion concentration.",
      "Graphene is a single layer of carbon atoms arranged in a hexagonal lattice.",
      "Some reactions that are energetically feasible can still be extremely slow because of a large activation energy.",
      "Chirality matters in medicines because two enantiomers can interact differently with biological molecules.",
      "NMR spectroscopy can reveal different chemical environments inside an organic molecule.",
      "The Haber process uses a compromise temperature because temperature affects both rate and equilibrium yield.",
      "Buffer solutions resist large pH changes when small amounts of acid or base are added.",
      "Chromatography separates substances because they interact differently with stationary and mobile phases."
    ],
    Maths: [
      "There are infinitely many prime numbers — Euclid proved this more than 2,000 years ago.",
      "The number π is irrational, so its decimal expansion never terminates or repeats.",
      "Euler's identity links five famous constants: e^(iπ) + 1 = 0.",
      "A normal distribution has about 68% of its values within one standard deviation of the mean.",
      "Differentiation and integration are connected by the fundamental theorem of calculus.",
      "The Fibonacci sequence appears in many mathematical models of growth and pattern formation.",
      "A proof by contradiction starts by assuming the opposite of what you want to prove.",
      "The gradient of a displacement-time graph gives velocity.",
      "The area under a velocity-time graph gives displacement.",
      "The binomial distribution models a fixed number of independent trials with two possible outcomes.",
      "A vector has both magnitude and direction, unlike a scalar.",
      "Newton's method can converge very quickly to a root when the starting value is suitable."
    ]
  };

  const GENERAL_TIPS = {
    Physics: [
      "Draw the situation first, then write the equation. A labelled diagram often reveals the physics.",
      "For calculation practice, write the symbolic equation before substituting numbers and units.",
      "For practicals, revise the method, variables, graph shape and uncertainty together rather than separately."
    ],
    Chemistry: [
      "For organic chemistry, build a reaction map and practise moving between reagents, conditions and products.",
      "For calculations, write the chemical equation and mole ratio before doing the arithmetic.",
      "For mechanisms, practise the reason for each curly arrow rather than memorising the picture alone."
    ],
    Maths: [
      "Redo a question without looking at the worked solution; recognition is easier than recall.",
      "Mix question types once a method feels secure so you practise choosing the method, not just carrying it out.",
      "Keep an error log: write the smallest useful note about why a mistake happened and how to spot it next time."
    ]
  };

  let factQueues = {};

  function shuffle(values){
    const a = [...values];
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  function nextFact(subject){
    if(!factQueues[subject] || !factQueues[subject].length){
      factQueues[subject] = shuffle(FACTS[subject] || FACTS.Physics);
    }
    return factQueues[subject].pop();
  }

  function isDue(state){
    if(!state.date) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(`${state.date}T00:00:00`);
    return Number.isFinite(due.getTime()) && due <= today;
  }

  function priorityScore(topic){
    const s = topicState(topic.id);
    let score = 0;
    if(s.status === "red") score += 100;
    else if(s.status === "amber") score += 65;
    else if(s.status === "none") score += 15;
    if(isDue(s)) score += 45;
    score += (5 - (Number(s.confidence)||3)) * 6;
    if(s.score !== "" && Number.isFinite(Number(s.score))) score += Math.max(0,70-Number(s.score)) * .55;
    return score;
  }

  function tipFor(topic){
    const title = `${topic.title} ${topic.group}`.toLowerCase();
    if(currentSubject === "Physics"){
      if(title.includes("required practical") || topic.id.startsWith("RP-")) return "Rehearse the method, variables, graph and main uncertainty.";
      if(title.includes("field") || title.includes("electric") || title.includes("magnetic")) return "Sketch the field and mark directions before using equations.";
      if(title.includes("wave")) return "Link the diagram to phase, wavelength and the wave equation.";
      if(title.includes("nuclear") || title.includes("radioactive")) return "Practise linking the physical process to the decay or energy equation.";
      return "Do one short recall task, then two exam questions without notes.";
    }
    if(currentSubject === "Chemistry"){
      if(title.includes("organic") || title.includes("alk") || title.includes("amine") || title.includes("carbox")) return "Add this to a reaction map: reagent, conditions, product and mechanism.";
      if(title.includes("equilibrium") || title.includes("acid") || title.includes("base") || title.includes("rate")) return "Practise one explanation question and one calculation from first principles.";
      if(title.includes("required practical") || topic.id.startsWith("RP-")) return "Recall the method, observations, calculations and key safety points.";
      return "Retrieve key definitions first, then answer a structured exam question.";
    }
    if(title.includes("differenti") || title.includes("integrat")) return "Do three questions: routine, mixed, then unfamiliar context.";
    if(title.includes("probability") || title.includes("statistic") || title.includes("distribution")) return "State the model and assumptions before calculating or interpreting.";
    if(title.includes("mechanic") || title.includes("kinematic") || title.includes("force") || title.includes("moment")) return "Draw a clean diagram and define positive direction before forming equations.";
    return "Try one question from memory, mark it, then immediately correct the exact error.";
  }

  function revisionRows(){
    const rows = courseRows();
    const weak = rows.filter(t => ["red","amber"].includes(topicState(t.id).status) || isDue(topicState(t.id)));
    const pool = weak.length ? weak : rows.filter(t => topicState(t.id).status !== "green");
    return [...pool].sort((a,b)=>priorityScore(b)-priorityScore(a)).slice(0,3);
  }

  function injectStudyArea(){
    if(document.getElementById("studyFunRow")) return;
    const overview = document.querySelector(".overview");
    if(!overview) return;
    const row = document.createElement("section");
    row.id = "studyFunRow";
    row.className = "study-fun-row";
    row.innerHTML = `
      <div class="study-card">
        <div class="eyebrow dark">Revision helper</div>
        <h2>Suggested revision</h2>
        <p class="small">A short list based on your RAG ratings, confidence, scores and review dates.</p>
        <div class="suggestions-list" id="revisionSuggestions"></div>
        <div class="tip-strip"><strong>Tip</strong><span id="revisionTip"></span></div>
      </div>
      <div class="fun-card">
        <div class="eyebrow dark">Tiny break</div>
        <h2>Curiosity corner</h2>
        <div class="fun-actions">
          <button class="fact-btn" id="factBtn" type="button">Interesting fact</button>
          <button class="dont-press" id="dontPressBtn" type="button">Don't press</button>
        </div>
        <div class="fact-box" id="factBox">Press <strong>&nbsp;Interesting fact&nbsp;</strong> whenever you want one. It never runs out.</div>
      </div>`;
    overview.insertAdjacentElement("afterend",row);
  }

  function injectDisco(){
    if(document.getElementById("dogDisco")) return;
    const overlay = document.createElement("div");
    overlay.id = "dogDisco";
    overlay.className = "dog-disco";
    overlay.setAttribute("role","dialog");
    overlay.setAttribute("aria-modal","true");
    overlay.setAttribute("aria-label","Dog disco");
    overlay.innerHTML = `
      <div class="disco-lights" aria-hidden="true"></div>
      <i class="disco-spark s1" aria-hidden="true"></i><i class="disco-spark s2" aria-hidden="true"></i><i class="disco-spark s3" aria-hidden="true"></i><i class="disco-spark s4" aria-hidden="true"></i>
      <div class="disco-card">
        <div class="dog-picture" aria-label="Happy dog illustration">
          <svg viewBox="0 0 400 300" role="img" aria-labelledby="dogTitle dogDesc">
            <title id="dogTitle">Happy dog at a disco</title><desc id="dogDesc">A friendly cartoon dog wearing a bow tie.</desc>
            <rect width="400" height="300" fill="#f4eadf"/>
            <ellipse cx="200" cy="255" rx="126" ry="25" fill="#dcc9b3" opacity=".65"/>
            <path d="M113 92 C72 54 62 104 91 151 C104 167 128 151 137 127 Z" fill="#9b633e"/>
            <path d="M287 92 C328 54 338 104 309 151 C296 167 272 151 263 127 Z" fill="#9b633e"/>
            <ellipse cx="200" cy="137" rx="92" ry="83" fill="#c98b59"/>
            <path d="M139 94 C159 64 244 59 268 99 C241 87 171 84 139 94Z" fill="#e1a875" opacity=".9"/>
            <ellipse cx="167" cy="133" rx="10" ry="13" fill="#2c211a"/><ellipse cx="233" cy="133" rx="10" ry="13" fill="#2c211a"/>
            <circle cx="164" cy="129" r="3" fill="#fff"/><circle cx="230" cy="129" r="3" fill="#fff"/>
            <ellipse cx="200" cy="166" rx="23" ry="17" fill="#2b211c"/>
            <path d="M179 184 Q200 205 221 184" fill="none" stroke="#5c3428" stroke-width="6" stroke-linecap="round"/>
            <path d="M185 194 Q200 216 215 194 Q203 189 185 194" fill="#e48282"/>
            <path d="M155 222 L190 207 L200 227 L210 207 L245 222 L226 249 L200 232 L174 249 Z" fill="#334e9a"/>
            <circle cx="200" cy="226" r="7" fill="#f7d84b"/>
          </svg>
        </div>
        <div class="disco-title">You pressed it. 🐶</div>
        <div class="disco-sub">Dog disco activated. This was entirely predictable.</div>
        <button class="exit-disco" id="exitDisco" type="button">Exit disco</button>
      </div>`;
    document.body.appendChild(overlay);
  }

  function renderStudySuggestions(){
    const list = document.getElementById("revisionSuggestions");
    const tip = document.getElementById("revisionTip");
    if(!list || !tip) return;
    const rows = revisionRows();
    if(!rows.length){
      list.innerHTML = `<div class="small">Everything in ${escapeHtml(SUBJECT_LABELS[currentSubject])} is currently Green. Use occasional retrieval practice to keep it secure.</div>`;
    }else{
      list.innerHTML = rows.map((t,i)=>{
        const s = topicState(t.id);
        const label = s.status === "red" ? "Red" : s.status === "amber" ? "Amber" : isDue(s) ? "Review due" : "Not rated";
        return `<div class="suggestion-item">
          <div class="suggestion-rank">${i+1}</div>
          <div><div class="suggestion-title">${escapeHtml(t.title)}</div><div class="suggestion-tip">${escapeHtml(label)} • ${escapeHtml(tipFor(t))}</div></div>
          <button class="suggestion-jump" type="button" data-suggest-topic="${escapeAttr(t.id)}">Open</button>
        </div>`;
      }).join("");
    }
    const tips = GENERAL_TIPS[currentSubject] || GENERAL_TIPS.Physics;
    const weakCount = courseRows().filter(t=>["red","amber"].includes(topicState(t.id).status)).length;
    tip.textContent = weakCount ? tips[weakCount % tips.length] : tips[0];
  }

  function openDisco(){
    const overlay = document.getElementById("dogDisco");
    if(!overlay) return;
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
    document.getElementById("exitDisco")?.focus();
  }

  function closeDisco(){
    const overlay = document.getElementById("dogDisco");
    if(!overlay) return;
    overlay.classList.remove("open");
    document.body.style.overflow = "";
    document.getElementById("dontPressBtn")?.focus();
  }

  injectStudyArea();
  injectDisco();
  renderStudySuggestions();

  document.addEventListener("click", e => {
    if(e.target.closest("#factBtn")){
      const fact = nextFact(currentSubject);
      const box = document.getElementById("factBox");
      if(box) box.textContent = fact;
      return;
    }
    if(e.target.closest("#dontPressBtn")){ openDisco(); return; }
    if(e.target.closest("#exitDisco")){ closeDisco(); return; }
    const jump = e.target.closest("[data-suggest-topic]");
    if(jump){ goToLesson(jump.dataset.suggestTopic); return; }
    const overlay = document.getElementById("dogDisco");
    if(overlay?.classList.contains("open") && e.target === overlay) closeDisco();
  });

  document.addEventListener("keydown", e => {
    if(e.key === "Escape" && document.getElementById("dogDisco")?.classList.contains("open")) closeDisco();
  });

  const observerTarget = document.querySelector("main");
  if(observerTarget){
    let scheduled = false;
    const observer = new MutationObserver(()=>{
      if(scheduled) return;
      scheduled = true;
      requestAnimationFrame(()=>{ scheduled = false; renderStudySuggestions(); });
    });
    observer.observe(observerTarget,{subtree:true,childList:true,characterData:true});
  }
})();