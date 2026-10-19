// Credit Card ABC — a no-login journey toward holding a credit card as a tool, not a debt.
// Content lives in /data/*.json (every user-facing string as { en, bn }); this file only interprets it.
import { figure } from "./figures.js";

const app = document.getElementById("app");
const sheet = document.getElementById("sheet");
const STORE_KEY = "ccabc:v1";
const LANG_KEY = "ccabc:lang";

let A, M, UI, G; // assessment, map, interface strings, glossary
let S = load() ?? fresh();
let LANG = loadLang();

function fresh() {
  return { answers: {}, traits: {}, flags: [], done: [], quiz: {}, reflect: {}, pledge: {}, finishedAt: null };
}
function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch { return null; }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch { /* private mode: run without memory */ }
}
function loadLang() {
  let l = null;
  try { l = localStorage.getItem(LANG_KEY); } catch {}
  return l === "bn" || l === "en" ? l : (navigator.language || "").toLowerCase().startsWith("bn") ? "bn" : "en";
}

// ——— language ———
// t(): pick the current language from a { en, bn } value (plain strings pass through).
const t = (v) => (v == null ? "" : typeof v === "string" ? v : v[LANG] ?? v.en ?? "");
// u(): interface string by key, with {var} substitution.
const u = (key, vars = {}) => t(UI[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
const num = (n, opts) => new Intl.NumberFormat(LANG === "bn" ? "bn-BD" : "en-IN", opts).format(n);
const pad2 = (n) => num(n, { minimumIntegerDigits: 2 });
const money = (n) => `${M.settings.currency}${num(Math.round(n))}`;

// ——— helpers ———
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// Inline formatter for content: **strong**, and [[term]] / [[term|shown text]] for tap-to-explain words.
const fmt = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  // Mid-sentence words use the glossary's lower-case "inline" form; at the start of a bold label, the title form.
  .replace(/(<strong>)?\[\[(\w+)(?:\|(.+?))?\]\]/g, (_, strong = "", key, shown) =>
    strong + (G[key] ? `<button type="button" class="term" data-term="${key}">${shown ?? esc(t(strong ? G[key].term : G[key].inline ?? G[key].term))}</button>` : shown ?? key));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const arrow = `<span class="arrow" aria-hidden="true">→</span>`;
const fig = (id) => (id ? figure(id, { u, money, num, esc }) : "");

// ——— condition engine ———
// { all: [...] } | { any: [...] } | { not: cond } | { flag } | { trait, lt|lte|gt|gte|eq } | { metric, ... }
function ctx() {
  return { traits: S.traits, flags: new Set(S.flags), metrics: { accuracy: accuracy(), completed: S.done.length } };
}
function test(cond, c = ctx()) {
  if (!cond) return true;
  if (cond.all) return cond.all.every((x) => test(x, c));
  if (cond.any) return cond.any.some((x) => test(x, c));
  if (cond.not) return !test(cond.not, c);
  if (cond.flag) return c.flags.has(cond.flag);
  const v = cond.trait != null ? c.traits[cond.trait] ?? 0 : cond.metric != null ? c.metrics[cond.metric] ?? 0 : null;
  if (v == null) return false;
  if ("lt" in cond && !(v < cond.lt)) return false;
  if ("lte" in cond && !(v <= cond.lte)) return false;
  if ("gt" in cond && !(v > cond.gt)) return false;
  if ("gte" in cond && !(v >= cond.gte)) return false;
  if ("eq" in cond && v !== cond.eq) return false;
  return true;
}
const first = (list) => list.find((x) => test(x.when));

function accuracy() {
  const r = Object.values(S.quiz);
  return r.length ? r.filter((x) => x.firstTry).length / r.length : 1;
}
// An answer is an option index, or an array of indices for multi-select questions.
const picks = (q) => [].concat(S.answers[q.id] ?? []);
function computeProfile() {
  const traits = Object.fromEntries(Object.keys(A.traits).map((k) => [k, 0]));
  const flags = new Set();
  for (const q of A.questions) {
    for (const i of picks(q)) {
      const opt = q.options[i];
      if (!opt) continue;
      for (const [k, v] of Object.entries(opt.add ?? {})) traits[k] = (traits[k] ?? 0) + v;
      (opt.flags ?? []).forEach((f) => flags.add(f));
    }
  }
  S.traits = traits;
  S.flags = [...flags];
}
const profiled = () => A.questions.every((q) => picks(q).length > 0);
// Visible nodes in walking order: by region, then as listed. Numbering follows this order.
const visibleNodes = () => M.regions.flatMap((r) => M.nodes.filter((n) => n.region === r.id && test(n.when)));
const lessonList = () => visibleNodes().filter((n) => !n.finale);
const nextLesson = () => lessonList().find((n) => !S.done.includes(n.id));
const reflectSteps = () => M.nodes.flatMap((n) => n.steps.filter((s) => s.type === "reflect"));

// ——— chrome ———
function applyChrome() {
  document.documentElement.lang = LANG;
  document.title = u("doc_title");
  $("#brand-name").textContent = u("brand");
  $('[data-nav="map"]').textContent = u("nav_map");
  $('[data-nav="pledge"]').textContent = u("nav_rules");
  $("#reset").textContent = u("nav_reset");
  const ls = $("#lang");
  ls.textContent = u("lang_switch");
  ls.setAttribute("aria-label", u("lang_switch_label"));
  ls.lang = LANG === "bn" ? "en" : "bn";
}

// ——— tap-to-explain words ———
const pop = document.createElement("div");
pop.className = "term-pop";
pop.setAttribute("role", "dialog");
pop.hidden = true;
document.body.append(pop);
function showTerm(key) {
  const g = G[key];
  pop.innerHTML = `<div class="term-card"><b>${esc(t(g.term))}</b><p>${esc(t(g.def))}</p><button type="button" class="btn small" id="term-ok">${esc(u("term_close"))}</button></div>`;
  pop.hidden = false;
  $("#term-ok").onclick = hideTerm;
  $("#term-ok").focus();
}
function hideTerm() { pop.hidden = true; }
document.addEventListener("click", (e) => {
  const term = e.target.closest(".term");
  if (term) { e.preventDefault(); showTerm(term.dataset.term); }
  else if (!pop.hidden && !e.target.closest(".term-card")) hideTerm();
});

// ——— router ———
const routes = { "": landing, assess, profile, map, pledge, learn };
function route() {
  closeSheet(true);
  hideTerm();
  const [, name = "", arg] = location.hash.split("/");
  const guard = ["map", "pledge", "profile", "learn"].includes(name) && !profiled();
  (guard ? assess : routes[name] ?? landing)(arg);
  $$(".bar-nav a").forEach((a) => (a.dataset.nav === name ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  window.scrollTo(0, 0);
  app.focus({ preventScroll: true });
}
const go = (h) => { location.hash = h; };

// "#/learn" always means: open the next unfinished lesson (or the rules if all are done).
function learn() {
  const nxt = nextLesson();
  if (!nxt) return go("#/pledge");
  map();
  openLesson(nxt);
}

// ——— landing ———
function landing() {
  const started = profiled();
  const nxt = started && nextLesson();
  const cta = !started
    ? `<a class="btn" href="#/assess">${esc(u("cta_start"))} ${arrow}</a>`
    : nxt
      ? `<a class="btn" href="#/learn">${esc(u("cta_resume", { n: num(lessonList().indexOf(nxt) + 1) }))} ${arrow}</a>`
      : `<a class="btn" href="#/pledge">${esc(u("cta_rules"))} ${arrow}</a>`;
  app.innerHTML = `
  <section class="hero wrap">
    <span class="label fade-in">${esc(u("hero_kicker"))}</span>
    <h1 class="fade-in">${esc(u("hero_title_a"))}<span class="hl">${esc(u("hero_title_em"))}</span>${esc(u("hero_title_b"))}</h1>
    <div class="hero-foot">
      <p>${esc(u("hero_body"))}</p>
      ${cta}
    </div>
    <div class="strip" role="img" aria-label="${esc(u("strip_aria"))}">
      <span class="label strip-title">${esc(u("strip_title"))}</span>
      <div class="strip-track">
        <div class="strip-zone cycle"></div><div class="strip-zone grace"></div><div class="strip-zone riba"></div>
        <div class="strip-mark" style="left:50%"><span class="label">📄 ${esc(u("bill_made"))}</span></div>
        <div class="strip-mark" style="left:83.3%"><span class="label">⏰ ${esc(u("last_day"))}</span></div>
        <div class="strip-dot"></div>
      </div>
      <div class="strip-legend label">
        <span><i class="sw sw-cycle"></i>${esc(u("legend_spend"))}</span>
        <span><i class="sw sw-grace"></i>${esc(u("legend_grace"))}</span>
        <span><i class="sw sw-riba"></i>${esc(u("legend_riba"))}</span>
      </div>
    </div>
  </section>
  <section class="movements">
    <div class="wrap">
      <span class="label">${esc(u("how_kicker"))}</span>
      <h2 class="section-title">${esc(u("how_title"))}</h2>
      <div class="movements-grid">
        ${[1, 2, 3].map((i) => `<div class="movement"><div class="num">${num(i)}</div><h3>${esc(u(`m${i}_t`))}</h3><p>${esc(u(`m${i}_b`))}</p></div>`).join("")}
      </div>
      <div class="movements-cta">${cta}</div>
    </div>
  </section>
  <section class="manifesto">
    <div class="wrap">
      <p class="manifesto-q">${esc(u("manifesto_a"))}<span class="hl">${esc(u("manifesto_em"))}</span>${esc(u("manifesto_b"))}</p>
      <span class="label">${esc(u("manifesto_sub"))}</span>
    </div>
  </section>
  <footer class="wrap foot">
    <span>${esc(u("foot_left"))}</span>
    <span>${esc(u("foot_right"))}</span>
  </footer>`;
}

// ——— assessment ———
let qi = 0;
function assess(arg) {
  if (arg === "intro" || (qi === 0 && !Object.keys(S.answers).length && arg !== "q")) return assessIntro();
  renderQuestion();
}
function assessIntro() {
  app.innerHTML = `
  <section class="ask wrap">
    <div class="ask-top"><span class="label">${esc(t(A.intro.kicker))}</span></div>
    <div class="ask-body fade-in">
      <h1 class="ask-q">${esc(t(A.intro.title))}</h1>
      <p class="ask-intro">${esc(t(A.intro.body))}</p>
      <div class="ask-start"><button class="btn" id="begin">${esc(u("begin"))} ${arrow}</button><span class="label">⏱ ${esc(t(A.intro.time))}</span></div>
    </div>
  </section>`;
  $("#begin").onclick = () => { qi = 0; renderQuestion(); };
}
function renderQuestion() {
  const q = A.questions[qi];
  const n = A.questions.length;
  const chosen = picks(q);
  app.innerHTML = `
  <section class="ask wrap">
    <div class="ask-top">
      <span class="label">${esc(u("q_of", { n: num(qi + 1), t: num(n) }))}</span>
      <div class="ask-progress" aria-hidden="true"><span style="transform:scaleX(${(qi + 1) / n})"></span></div>
    </div>
    <div class="ask-body fade-in">
      <h1 class="ask-q" id="qtext">${esc(t(q.q))}</h1>
      ${q.help ? `<p class="ask-hint">${esc(t(q.help))}</p>` : ""}
      <ul class="ask-opts" role="list" aria-labelledby="qtext">
        ${q.options.map((o, i) => `<li><button class="opt ${q.multi ? "multi" : ""} ${chosen.includes(i) ? "picked" : ""}" data-i="${i}" ${q.multi ? `aria-pressed="${chosen.includes(i)}"` : ""}>
          <span class="key" aria-hidden="true">${q.multi ? "" : num(i + 1)}</span><span>${esc(t(o.t))}</span><span class="go" aria-hidden="true">${q.multi ? "" : "→"}</span></button></li>`).join("")}
      </ul>
    </div>
    <div class="ask-nav">
      <button class="btn ghost" id="back" ${qi === 0 ? "disabled" : ""}><span aria-hidden="true">←</span> ${esc(u("back"))}</button>
      ${q.multi
        ? `<button class="btn" id="qnext" ${chosen.length ? "" : "disabled"}>${esc(u("continue"))} ${arrow}</button>`
        : `<span class="label hide-sm">${esc(u("press_keys", { n: num(q.options.length) }))}</span>`}
    </div>
  </section>`;
  $$(".opt").forEach((b) => (b.onclick = () => (q.multi ? toggle(+b.dataset.i) : choose(+b.dataset.i))));
  $("#back").onclick = () => { if (qi > 0) { qi--; renderQuestion(); } };
  $("#qnext")?.addEventListener("click", advance);
}
function toggle(i) {
  const q = A.questions[qi];
  const set = new Set(picks(q));
  set.has(i) ? set.delete(i) : set.add(i);
  S.answers[q.id] = [...set].sort();
  save();
  $$(".opt").forEach((b) => {
    const on = set.has(+b.dataset.i);
    b.classList.toggle("picked", on);
    b.setAttribute("aria-pressed", on);
  });
  $("#qnext").disabled = set.size === 0;
}
function choose(i) {
  S.answers[A.questions[qi].id] = i;
  $$(".opt").forEach((b) => b.classList.toggle("picked", +b.dataset.i === i));
  save();
  setTimeout(advance, 260);
}
function advance() {
  if (qi < A.questions.length - 1) { qi++; renderQuestion(); }
  else { computeProfile(); save(); qi = 0; go("#/profile"); }
}
document.addEventListener("keydown", (e) => {
  if (!sheet.hidden || e.metaKey || e.ctrlKey || e.altKey) return;
  const b = $(`.opt[data-i="${+e.key - 1}"]`);
  if (b) b.click();
});

// ——— result: what we noticed + the plan, leading straight into lesson 1 ———
function profile() {
  computeProfile();
  const p = first(A.personas);
  const notes = A.insights.filter((x) => test(x.when)).slice(0, 4);
  const lessons = lessonList();
  const minutes = lessons.reduce((a, n) => a + n.minutes, 0);
  const nxt = nextLesson();
  app.innerHTML = `
  <section class="result wrap">
    <div class="fade-in">
      <span class="label">${esc(u("result_kicker"))}</span>
      <h1>${esc(t(p.title))}</h1>
      <p class="lead">${esc(t(p.line))}</p>
      <h2 class="small-head">${esc(u("noticed"))}</h2>
      <ul class="notes">${notes.map((x) => `<li>${esc(t(x.text))}</li>`).join("")}</ul>
    </div>
    <div class="plan">
      <span class="label">${esc(u("plan_title"))}</span>
      <p class="plan-sum">${esc(u("plan_sum", { n: num(lessons.length), m: num(minutes) }))}</p>
      <ol class="plan-list">${lessons.map((n, i) => `<li class="${S.done.includes(n.id) ? "done" : ""}"><span>${num(i + 1)}</span>${esc(t(n.title))}</li>`).join("")}</ol>
      <a class="btn accent wide" href="#/learn">${esc(!nxt ? u("cta_rules") : lessons.indexOf(nxt) > 0 ? u("cta_resume", { n: num(lessons.indexOf(nxt) + 1) }) : u("start_lesson_1"))} ${arrow}</a>
      <p class="plan-hint">${esc(u("plan_hint"))}</p>
      <p class="privacy">🔒 ${esc(u("privacy"))}</p>
    </div>
  </section>`;
}

// ——— map ———
function map() {
  computeProfile();
  const nodes = visibleNodes();
  const lessons = nodes.filter((n) => !n.finale);
  const doneCount = lessons.filter((n) => S.done.includes(n.id)).length;
  const pct = lessons.length ? doneCount / lessons.length : 0;
  const nxt = nodes.find((n) => !S.done.includes(n.id));
  const C = 2 * Math.PI * 36;
  let idx = 0;

  app.innerHTML = `
  <section class="map wrap">
    <aside class="map-side">
      <h1>${esc(u("your_map"))}</h1>
      <p>${esc(u("map_desc", { n: num(lessons.length) }))}</p>
      <div class="ring">
        <svg viewBox="0 0 84 84" aria-hidden="true"><circle class="bg" cx="42" cy="42" r="36"/><circle class="fg" cx="42" cy="42" r="36" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/></svg>
        <div><b>${num(doneCount)}/${num(lessons.length)}</b><span class="label">${esc(u("walked"))}</span></div>
      </div>
      ${nxt && !nxt.finale
        ? `<a class="btn accent" href="#/learn">${esc(u("resume_x", { x: t(nxt.title) }))} ${arrow}</a>`
        : `<a class="btn accent" href="#/pledge">${esc(u("see_rules"))} ${arrow}</a>`}
    </aside>
    <div class="trail" id="trail">
      <svg class="trail-svg" aria-hidden="true"></svg>
      ${M.regions.map((r) => {
        const rn = nodes.filter((n) => n.region === r.id);
        if (!rn.length) return "";
        return `<section class="region"><div class="region-head"><h2>${esc(t(r.title))}</h2><span>${esc(t(r.sub))}</span></div>
          ${rn.map((n) => {
            const i = idx++;
            const done = S.done.includes(n.id);
            const isNext = nxt && nxt.id === n.id;
            const locked = !done && !isNext;
            const personal = n.region === "path" || (n.emphasis ? test(n.emphasis) : false);
            const x = [0, 18, 34, 18][i % 4];
            return `<button class="node ${done ? "done" : ""} ${isNext ? "next" : ""}" style="--x:${x}" data-id="${n.id}" ${locked ? `aria-disabled="true" title="${esc(u("locked"))}"` : ""}>
              <span class="dot">${done ? "✓" : n.finale ? "★" : num(i + 1)}</span>
              <span><h3>${esc(t(n.title))}</h3><span class="meta">
                <span class="tag">${esc(n.finale ? u("tag_finale") : u("tag_min", { n: num(n.minutes) }))}</span>
                ${personal && !n.finale ? `<span class="tag for-you">${esc(u("tag_for_you"))}</span>` : ""}
                ${n.region === "line" ? `<span class="tag warn">${esc(u("tag_riba"))}</span>` : ""}
              </span></span></button>`;
          }).join("")}</section>`;
      }).join("")}
    </div>
  </section>`;

  $$(".node").forEach((b) => (b.onclick = () => {
    if (b.getAttribute("aria-disabled") === "true") return;
    const n = M.nodes.find((x) => x.id === b.dataset.id);
    n.finale ? go("#/pledge") : openLesson(n);
  }));
  requestAnimationFrame(drawTrail);
}
function drawTrail() {
  const trail = $("#trail");
  if (!trail) return;
  const box = trail.getBoundingClientRect();
  const pts = $$(".node .dot", trail).map((d) => {
    const r = d.getBoundingClientRect();
    return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top, done: d.parentElement.classList.contains("done") };
  });
  let out = "";
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], my = (a.y + b.y) / 2;
    out += `<path class="${a.done ? "done" : ""}" d="M${a.x},${a.y} C${a.x},${my} ${b.x},${my} ${b.x},${b.y}"/>`;
  }
  $(".trail-svg", trail).innerHTML = out;
}
window.addEventListener("resize", () => requestAnimationFrame(drawTrail));

// ——— lesson sheet ———
let L = null; // { node, steps, i, answered, n, total, done }
function openLesson(node) {
  const lessons = lessonList();
  L = { node, steps: node.steps.filter((s) => test(s.when)), i: 0, answered: {}, n: lessons.indexOf(node) + 1, total: lessons.length, done: false };
  sheet.hidden = false;
  document.body.style.overflow = "hidden";
  renderStep();
}
function closeSheet(silent) {
  if (sheet.hidden) return;
  sheet.hidden = true;
  sheet.innerHTML = "";
  document.body.style.overflow = "";
  L = null;
  hideTerm();
  if (!silent) location.hash === "#/map" ? map() : go("#/map");
}
function sheetTop(progress) {
  return `<div class="sheet-top">
      <span class="label sheet-name">${esc(u("lesson_of", { n: num(L.n), t: num(L.total) }))} · ${esc(t(L.node.title))}</span>
      <div class="segs" aria-hidden="true">${progress}</div>
      <button class="close" aria-label="${esc(u("close_lesson"))}">×</button>
    </div>`;
}
function renderStep() {
  if (L.done) return renderDone();
  const { steps, i } = L;
  const s = steps[i];
  const gate = s.type === "quiz" && L.answered[i] == null ? "quiz_gate" : s.type === "reflect" && S.reflect[s.key] == null ? "reflect_gate" : null;
  const last = i === steps.length - 1;
  const hasTerms = /\[\[/.test(JSON.stringify(s));
  sheet.innerHTML = `
    ${sheetTop(steps.map((_, k) => `<i class="${k <= i ? "on" : ""}"></i>`).join(""))}
    <div class="sheet-body"><div class="step fade-in">${stepHTML(s)}${hasTerms ? `<p class="tip">💡 ${esc(u("tap_words"))}</p>` : ""}</div></div>
    <div class="sheet-foot">
      <button class="btn ghost" id="prev" ${i === 0 ? "disabled" : ""}><span aria-hidden="true">←</span> ${esc(u("back"))}</button>
      <span class="gate label" id="gate">${gate ? esc(u(gate)) : ""}</span>
      <button class="btn ${last ? "accent" : ""}" id="next" ${gate ? "disabled" : ""}>${esc(u(last ? "finish_lesson" : "continue"))} ${arrow}</button>
    </div>`;
  $(".close", sheet).onclick = () => closeSheet();
  $("#prev").onclick = () => { if (L.i > 0) { L.i--; renderStep(); } };
  $("#next").onclick = () => {
    if (!last) { L.i++; return renderStep(); }
    if (!S.done.includes(L.node.id)) S.done.push(L.node.id);
    save();
    L.done = true;
    renderDone();
  };
  $(".sheet-body", sheet).scrollTop = 0;
  bindStep(s, i);
  if (!gate) $("#next").focus({ preventScroll: true });
}
// Between lessons: celebrate, repeat the rule, and point straight at the next lesson.
function renderDone() {
  const rule = [...L.node.steps].reverse().find((s) => s.type === "takeaway");
  const nxt = nextLesson();
  sheet.innerHTML = `
    ${sheetTop(L.steps.map(() => `<i class="on"></i>`).join(""))}
    <div class="sheet-body"><div class="step done-step fade-in">
      <div class="done-badge" aria-hidden="true">✓</div>
      <span class="label">${esc(u("done_kicker", { n: num(L.n), t: num(L.total) }))}</span>
      <h2 id="sheet-title">${esc(u(nxt ? "done_title" : "all_done_title"))}</h2>
      ${rule ? `<div class="done-rule"><span class="label">${esc(u("done_rule"))}</span><p>${fmt(t(rule.rule))}</p></div>` : ""}
      ${nxt
        ? `<div class="up-next"><span class="label">${esc(u("up_next"))} · ${esc(u("lesson_of", { n: num(lessonList().indexOf(nxt) + 1), t: num(L.total) }))}</span>
            <b>${esc(t(nxt.title))}</b><span class="label">⏱ ${esc(u("tag_min", { n: num(nxt.minutes) }))}</span></div>`
        : `<p class="lead">${esc(u("all_done_body"))}</p>`}
    </div></div>
    <div class="sheet-foot">
      <button class="btn ghost" id="break">${esc(u("take_break"))}</button>
      <span></span>
      <button class="btn accent" id="next">${esc(u(nxt ? "next_lesson" : "see_rules"))} ${arrow}</button>
    </div>`;
  $(".close", sheet).onclick = () => closeSheet();
  $("#break").onclick = () => closeSheet();
  $("#next").onclick = () => (nxt ? openLesson(nxt) : (closeSheet(true), go("#/pledge")));
  $(".sheet-body", sheet).scrollTop = 0;
  $("#next").focus({ preventScroll: true });
}
function stepHTML(s) {
  const f = fig(s.figure);
  switch (s.type) {
    case "story":
      return `<span class="label">${esc(u("lbl_story"))}</span><h2 id="sheet-title">${esc(t(s.title))}</h2>${f}<div class="story">${s.body.map((p) => `<p>${fmt(t(p))}</p>`).join("")}</div>`;
    case "concept":
      return `<span class="label">${esc(u("lbl_concept"))}</span><h2 id="sheet-title">${esc(t(s.title))}</h2>${f}<ul class="points">${s.points.map((p, k) => `<li><span class="pn">${num(k + 1)}</span><span>${fmt(t(p))}</span></li>`).join("")}</ul>`;
    case "quiz":
      return `<span class="label">${esc(u("lbl_quiz"))}</span><p class="quiz-q" id="sheet-title">${fmt(t(s.q))}</p>
        <div class="answers">${s.options.map((o, k) => `<button class="answer" data-k="${k}"><span class="ak">${"ABCD"[k]}</span><span>${fmt(t(o.t))}</span></button>`).join("")}</div><div id="why" aria-live="polite"></div>`;
    case "reflect":
      return `<span class="label">${esc(u("lbl_reflect"))}</span><h2 id="sheet-title">${esc(t(s.q))}</h2>
        <div class="chips">${s.options.map((o, k) => `<button class="chip" data-k="${k}" aria-pressed="${S.reflect[s.key] === k}">${esc(t(o))}</button>`).join("")}</div>`;
    case "takeaway":
      return `<div class="takeaway"><span class="label">${esc(u("lbl_keep"))}</span><blockquote id="sheet-title">${fmt(t(s.rule))}</blockquote></div>`;
    case "sim":
      return SIMS[s.sim].html();
  }
  return "";
}
function unlockNext() {
  $("#next").disabled = false;
  $("#gate").textContent = "";
}
function bindStep(s, i) {
  if (s.type === "quiz") {
    const key = `${L.node.id}:${i}`;
    const prior = L.answered[i];
    const pick = (k, record) => {
      const o = s.options[k];
      const right = !!o.correct;
      if (record && !(key in S.quiz)) { S.quiz[key] = { firstTry: right }; save(); }
      $$(".answer", sheet).forEach((b) => {
        const kk = +b.dataset.k;
        b.classList.toggle("wrong", kk === k && !right);
        b.classList.toggle("right", right && !!s.options[kk].correct);
        b.classList.toggle("dim", right && !s.options[kk].correct);
        if (right) b.disabled = true;
      });
      $("#why", sheet).innerHTML = `<div class="why ${right ? "" : "bad"}"><b>${right ? "✅" : "❌"} ${esc(u(right ? "right" : "wrong"))}</b>${fmt(t(o.why))}</div>`;
      if (right) { L.answered[i] = k; unlockNext(); if (record) $("#next").focus({ preventScroll: true }); }
      $("#why", sheet).scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
    $$(".answer", sheet).forEach((b) => (b.onclick = () => pick(+b.dataset.k, true)));
    if (prior != null) pick(prior, false);
  }
  if (s.type === "reflect") {
    $$(".chip", sheet).forEach((c) => (c.onclick = () => {
      S.reflect[s.key] = +c.dataset.k; save();
      $$(".chip", sheet).forEach((x) => x.setAttribute("aria-pressed", x === c));
      unlockNext();
    }));
  }
  if (s.type === "sim") SIMS[s.sim].bind();
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !pop.hidden) return hideTerm();
  if (sheet.hidden) return;
  if (e.key === "Escape") closeSheet();
  const inRange = document.activeElement?.type === "range";
  if (e.key === "ArrowRight" && !inRange && !$("#next")?.disabled) $("#next").click();
  if (e.key === "ArrowLeft" && !inRange && $("#prev") && !$("#prev").disabled) $("#prev").click();
});

// ——— simulators ———
const segBtns = (name, opts, cur) => `<div class="seg" role="group" data-seg="${name}">${opts.map(([v, label]) => `<button data-v="${v}" aria-pressed="${v === cur}">${esc(label)}</button>`).join("")}</div>`;
function bindSeg(name, onPick) {
  $$(`[data-seg="${name}"] button`, sheet).forEach((b) => (b.onclick = () => {
    $$(`[data-seg="${name}"] button`, sheet).forEach((x) => x.setAttribute("aria-pressed", x === b));
    onPick(b.dataset.v);
  }));
}
const stat = (cls, label, value) => `<div class="stat ${cls}"><span class="label">${esc(label)}</span><b>${esc(value)}</b></div>`;

const SIMS = {
  // When you buy inside the cycle decides how long you have; how you pay decides whether interest appears.
  cycle: {
    html: () => `<div class="sim"><span class="label">🧪 ${esc(u("lbl_sim"))}</span><h3 id="sheet-title">${esc(u("cyc_title"))}</h3>
      <p>${esc(u("cyc_desc"))}</p>
      <div class="timeline" id="tl"></div>
      <div class="field"><label for="day">${esc(u("cyc_day"))} <output id="dayo"></output></label><input type="range" id="day" min="1" max="30" value="3"></div>
      <div class="field"><label for="amt">${esc(u("amount"))} <output id="amto"></output></label><input type="range" id="amt" min="1000" max="100000" step="1000" value="20000"></div>
      <div class="field"><span class="field-label">${esc(u("cyc_pay"))}</span>${segBtns("pay", [["full", u("pay_full")], ["min", u("pay_min")], ["half", u("pay_half")], ["late", u("pay_late")]], "full")}</div>
      <div class="readout" id="ro" aria-live="polite"></div><p class="verdict-line" id="vl"></p></div>`,
    bind() {
      const { cycleDays: C, graceDays: G, apr, minPct, minFloor, lateFee } = M.settings;
      const T = C + G, pct = (d) => `${(d / T) * 100}%`;
      let pay = "full";
      const draw = () => {
        const d = +$("#day").value, amt = +$("#amt").value;
        $("#dayo").textContent = u("cyc_day_n", { n: num(d) });
        $("#amto").textContent = money(amt);
        // If the free days are lost, most banks charge interest from the purchase date to the next bill.
        const daysToNext = 2 * C - d;
        const riba = pay === "full" ? 0 : (amt * apr * daysToNext) / 365;
        const paid = pay === "full" ? amt : pay === "min" ? Math.max(amt * minPct, minFloor) : pay === "half" ? amt / 2 : 0;
        $("#tl").innerHTML = `
          <div class="zone z-cycle" style="left:0;width:${pct(C)}"></div><div class="zone z-grace" style="left:${pct(C)};width:${pct(G)}"></div>
          <div class="zone z-free ${riba ? "lost" : ""}" style="left:${pct(d)};width:${pct(T - d)}"></div>
          <div class="tick" style="left:${pct(C)}"><span class="label">📄 ${esc(u("bill_made"))}</span></div><div class="tick end" style="left:100%"><span class="label">⏰ ${esc(u("last_day"))}</span></div>
          <div class="buy" style="left:${pct(d)}">🛒</div>`;
        $("#ro").innerHTML =
          (riba ? stat("bad", u("st_grace"), u("st_lost")) : stat("good", u("st_free_days"), u("st_days", { n: num(T - d) }))) +
          stat("", u("st_pay_now"), money(Math.min(paid, amt))) +
          stat(riba ? "bad" : "good", u("st_riba_next"), money(riba)) +
          (pay === "late" ? stat("bad", u("st_late_fee"), money(lateFee)) : "");
        $("#vl").innerHTML = riba
          ? `❌ ${fmt(u("cyc_bad", { d: num(daysToNext), amt: money(amt) }))}`
          : `✅ ${fmt(u("cyc_good", { d: num(T - d) }))}`;
      };
      $("#day").oninput = draw; $("#amt").oninput = draw;
      bindSeg("pay", (v) => { pay = v; draw(); });
      draw();
    },
  },

  // Months and interest of paying the minimum vs a bigger fixed share.
  minimum: {
    html: () => `<div class="sim"><span class="label">🧪 ${esc(u("lbl_sim"))}</span><h3 id="sheet-title">${esc(u("min_title"))}</h3>
      <p>${esc(u("min_desc"))}</p>
      <div class="field"><label for="bal">${esc(u("min_bal"))} <output id="balo"></output></label><input type="range" id="bal" min="5000" max="200000" step="5000" value="50000"></div>
      <div class="field"><span class="field-label">${esc(u("min_each"))}</span>${segBtns("rate", [["min", u("rate_min")], ["0.1", u("rate_10")], ["0.25", u("rate_25")], ["1", u("rate_full")]], "min")}</div>
      <div class="readout" id="ro" aria-live="polite"></div><p class="verdict-line" id="vl"></p></div>`,
    bind() {
      const { apr, minPct, minFloor } = M.settings;
      let rate = "min";
      const run = (bal) => {
        if (rate === "1") return { months: 1, riba: 0 };
        let months = 0, riba = 0;
        const fixed = rate === "min" ? null : Math.max(bal * +rate, minFloor);
        while (bal > 0.5 && months < 600) {
          const i = (bal * apr) / 12;
          riba += i; bal += i;
          bal -= Math.min(bal, fixed ?? Math.max(bal * minPct, minFloor));
          months++;
        }
        return { months, riba };
      };
      const draw = () => {
        const b = +$("#bal").value;
        $("#balo").textContent = money(b);
        const { months, riba } = run(b);
        const time = months >= 24 ? u("unit_yr", { n: num(months / 12, { maximumFractionDigits: 1 }) }) : u("unit_mo", { n: num(months) });
        $("#ro").innerHTML =
          stat(months > 12 ? "bad" : "good", u("st_time"), time) +
          stat(riba ? "bad" : "good", u("st_total_riba"), money(riba)) +
          stat("", u("st_total_paid"), money(b + riba));
        $("#vl").innerHTML = rate === "1" ? `✅ ${fmt(u("min_good"))}` : `❌ ${fmt(u("min_bad", { b: money(b), t: money(b + riba) }))}`;
      };
      $("#bal").oninput = draw;
      bindSeg("rate", (v) => { rate = v; draw(); });
      draw();
    },
  },

  // Tap purchases onto the card and compare them with money that already exists.
  mirror: {
    buys: [["🥦", "buy_groceries", 6000], ["💡", "buy_electric", 3000], ["🍽️", "buy_dinner", 2500], ["📱", "buy_phone", 28000], ["✈️", "buy_flight", 14000], ["🧥", "buy_jacket", 5500]],
    html: () => `<div class="sim"><span class="label">🧪 ${esc(u("lbl_sim"))}</span><h3 id="sheet-title">${esc(u("mir_title"))}</h3>
      <p>${esc(u("mir_desc"))}</p>
      <div class="field"><label for="own">${esc(u("mir_own"))} <output id="owno"></output></label><input type="range" id="own" min="5000" max="100000" step="1000" value="25000"></div>
      <div class="chips" id="buys">${SIMS.mirror.buys.map(([i, k, v]) => `<button class="chip" aria-pressed="false" data-v="${v}">${i} ${esc(u(k))} · ${money(v)}</button>`).join("")}</div>
      <div class="mirror-bars"><div class="mbar" id="b1"></div><div class="mbar" id="b2"></div></div>
      <p class="verdict-line" id="vl" aria-live="polite"></p></div>`,
    bind() {
      const draw = () => {
        const own = +$("#own").value;
        const spent = $$("#buys .chip[aria-pressed=true]", sheet).reduce((a, c) => a + +c.dataset.v, 0);
        const max = Math.max(own, spent) || 1;
        const over = Math.max(0, spent - own);
        $("#owno").textContent = money(own);
        $("#b1").innerHTML = `<span class="own" style="width:${(own / max) * 100}%">🏦 ${esc(u("mir_mine", { x: money(own) }))}</span>`;
        $("#b2").innerHTML = `<span class="spent" style="width:${(Math.min(spent, own) / max) * 100}%">💳 ${esc(u("mir_card", { x: money(spent) }))}</span>${over ? `<span class="over" style="right:0;width:${(over / max) * 100}%">${money(over)}</span>` : ""}`;
        $("#vl").innerHTML = over ? `<span class="bad-text">❌ ${fmt(u("mir_over", { x: money(over) }))}</span>` : spent ? `✅ ${esc(u("mir_ok"))}` : `👇 ${esc(u("mir_empty"))}`;
      };
      $$("#buys .chip", sheet).forEach((c) => (c.onclick = () => { c.setAttribute("aria-pressed", c.getAttribute("aria-pressed") !== "true"); draw(); }));
      $("#own").oninput = draw;
      draw();
    },
  },
};

// ——— rules / finale ———
function pledge() {
  computeProfile();
  const lessons = lessonList();
  const left = lessons.filter((n) => !S.done.includes(n.id)).length;
  const v = first(M.verdicts);
  const own = reflectSteps().filter((s) => S.reflect[s.key] != null).map((s) => u("next_step", { x: t(s.options[S.reflect[s.key]]) }));
  const rules = [...M.pledge.map(t), ...own];
  if (!left && !S.done.includes("pledge")) { S.done.push("pledge"); S.finishedAt ??= new Date().toISOString(); save(); }
  app.innerHTML = `
  <section class="pledge wrap">
    <span class="label">${esc(left ? (left === 1 ? u("left_1") : u("left_n", { n: num(left) })) : `🎉 ${u("map_done")}`)}</span>
    <h1>${esc(u("rules_title"))}</h1>
    <div class="verdict ${v.tone}">
      <span class="label">${esc(u("verdict_lbl"))}</span>
      <h2>${esc(t(v.title))}</h2><p>${esc(t(v.body))}</p>
    </div>
    <p class="lead">${esc(u("rules_desc"))}</p>
    <ul class="rules">
      ${rules.map((r, i) => `<li><label><input type="checkbox" data-i="${i}" ${S.pledge[i] ? "checked" : ""}><span class="${i >= M.pledge.length ? "own" : ""}">${esc(r)}</span></label></li>`).join("")}
    </ul>
    <div class="pledge-actions">
      ${left ? `<a class="btn accent" href="#/learn">${esc(u("finish_map"))} ${arrow}</a>` : ""}
      <button class="btn ${left ? "ghost" : "accent"}" id="print">🖨️ ${esc(u("print"))}</button>
      <a class="btn ghost" href="#/map">${esc(u("review"))}</a>
    </div>
    <p class="stamp label">${S.finishedAt ? esc(u("walked_on", { d: new Date(S.finishedAt).toLocaleDateString(LANG === "bn" ? "bn-BD" : "en-GB", { dateStyle: "long" }) })) : ""}</p>
  </section>`;
  $$(".rules input").forEach((c) => (c.onchange = () => { S.pledge[c.dataset.i] = c.checked; save(); }));
  $("#print").onclick = () => window.print();
}

// ——— boot ———
$("#reset").onclick = () => {
  S = fresh(); save(); qi = 0;
  location.hash === "#/assess" ? route() : go("#/assess");
};
$("#lang").onclick = () => {
  LANG = LANG === "bn" ? "en" : "bn";
  try { localStorage.setItem(LANG_KEY, LANG); } catch {}
  applyChrome();
  hideTerm();
  // Re-render in place: keep an open lesson on its step, or the current question.
  if (L) renderStep();
  else if (location.hash.startsWith("#/assess") && $(".opt")) renderQuestion();
  else route();
};
window.addEventListener("scroll", () => $(".bar").classList.toggle("scrolled", scrollY > 8), { passive: true });
window.addEventListener("hashchange", route);

Promise.all(["assessment", "map", "ui", "glossary"].map((f) => fetch(`data/${f}.json`).then((r) => r.json())))
  .then(([a, m, ui, g]) => { A = a; M = m; UI = ui; G = g; applyChrome(); route(); })
  .catch(() => {
    app.innerHTML = `<section class="wrap" style="padding-block:80px"><h1>Couldn't load the lessons. / পাঠগুলো লোড করা যায়নি।</h1>
      <p style="margin-top:16px">Open the site through a local server (for example <code>python3 -m http.server</code>), not by double-clicking the file.</p></section>`;
  });
