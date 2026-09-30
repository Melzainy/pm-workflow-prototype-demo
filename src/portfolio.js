// Portfolio layer (Prototype v3): one company store holding every project, the team, capacity
// and all timesheets. Project screens work on a *view* of one project; resource planning reads
// every project through the same views. Nothing is copied into a second planning store.
import * as D from './seed.js';
import * as E from './engine.js';
import { resourceModel } from './resource.js';

const clone = (x) => JSON.parse(JSON.stringify(x));
const { TODAY } = E;
// Keys that belong to the company, not to one project.
const COMPANY = new Set(['v', 'viewer', 'scope', 'tpl', 'people', 'teams', 'holidays', 'capEx', 'rp', 'log', 'seq', 'notice', '_selected', 'cur', 'order', 'projects', 'time', '_pid', '_S', '_RM']);

// ── Demo project generation ─────────────────────────────────────────────────
let h32 = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };
const shift = (d, n) => (d ? E.addDays(d, n) : d);

function remapRef(cfg, ref, code) {
  if (!ref) return ref;
  if (ref.startsWith('role:')) { const k = ref.slice(5); if (cfg.keepRole?.includes(code)) return ref; return cfg.roleMap[k] || ref; }
  return cfg.personMap[ref] || ref;
}

function makeDemoProject(cfg, template) {
  const P = clone(template);
  const hol = P.holidays || D.HOLIDAYS;
  const o = cfg.offset;
  // 1. Shift the calendar.
  Object.values(P.tasks).forEach((t) => { t.ps = shift(t.ps, o); t.pf = shift(t.pf, o); t.bs = shift(t.bs, o); t.bf = shift(t.bf, o); t.as = null; t.af = null; t.pct = 0; t.blocker = null; t.minutes = false; t.evidence = null; t.outcome = null; t.choice = null; });
  P.sheets.forEach((x) => { x.ps = shift(x.ps, o); x.pf = shift(x.pf, o); x.as = shift(x.as, o); x.af = shift(x.af, o); x.revs = x.revs.map((r) => ({ ...r, date: shift(r.date, o) })); });
  P.infoReq.forEach((r) => { r.due = shift(r.due, o); });
  P.actions.forEach((a) => { a.due = shift(a.due, o); });
  // 2. Staff it (explicit maps; roles such as PM, BIM Manager and Manufacturing Lead stay TBD).
  Object.values(P.tasks).forEach((t) => {
    const c = E.code(P, t.parent ? P.tasks[t.parent] : t);
    t.owner = remapRef(cfg, t.owner, c);
    t.contrib = cfg.keepRole?.includes(c) ? [] : [...new Set(t.contrib.map((r) => remapRef(cfg, r, c)))].filter((r) => r !== t.owner);
    if (!t.parent && cfg.extraContrib?.[c]) t.contrib = [...new Set([...t.contrib, ...cfg.extraContrib[c]])].filter((r) => r !== t.owner);
    if (!t.parent && cfg.alloc?.[c]) t.alloc = clone(cfg.alloc[c]);
  });
  P.sheets.forEach((x) => { x.lead = remapRef(cfg, x.lead); x.owner = remapRef(cfg, x.owner); x.contrib = x.contrib.map((r) => remapRef(cfg, r)); x.reviewers = x.reviewers.map((r) => remapRef(cfg, r)); });
  P.infoReq.forEach((r) => { r.to = remapRef(cfg, r.to); });
  // 3. Progress state: phases before `active` are released, the active phase is partly done.
  const phases = E.livePhases(P);
  phases.forEach((ph, i) => {
    const n = i + 1;
    ph.state = n < cfg.active ? 'released' : n === cfg.active ? 'active' : 'locked';
    E.allRecordsOfPhase(P, ph.uid).forEach((t) => {
      const r = h32(cfg.id + t.uid);
      let pct = 0;
      if (n < cfg.active) pct = 100;
      else if (n === cfg.active) {
        if (t.pf < TODAY) pct = r < 0.15 ? 60 : 100;
        else if (t.ps < TODAY) pct = Math.max(10, Math.min(90, Math.round(((E.workBetween(t.ps, TODAY, hol)) / Math.max(1, E.workBetween(t.ps, t.pf, hol) + 1)) * 80 / 10) * 10));
      }
      if (E.children(P, t.uid).length) pct = 0; // parents derive from subtasks
      t.pct = pct;
      if (pct > 0) t.as = t.ps;
    });
    E.allRecordsOfPhase(P, ph.uid).forEach((t) => { // parents: start/finish follow their subtasks
      const r = h32(cfg.id + t.uid); const pc = E.pctOf(P, t);
      if (E.children(P, t.uid).length && pc > 0) { t.as = t.ps; if (pc >= 100) t.af = E.addWork(t.pf, Math.floor(r * 4) - 1, hol); }
      const pct = pc;
      if (pct >= 100) {
        t.af = t.af || E.addWork(t.pf, Math.floor(r * 4) - 1, hol);
        if (t.af > E.addDays(TODAY, -1)) t.af = E.addDays(TODAY, -3);
        if (t.type === 'meeting') t.minutes = true;
        if (t.type === 'review') t.outcome = 'approved';
        if (t.type === 'decision') t.choice = t.options?.[0] || 'Recorded (demo)';
        if (t.type === 'signoff') t.evidence = { file: t.doc || 'Signed_document.pdf', signer: 'Client (demo)', date: t.af, method: 'E-signature platform' };
      }
    });
    const g = E.gateOfPhase(P, ph.uid);
    if (g && n < cfg.active) {
      const last = E.allRecordsOfPhase(P, ph.uid).reduce((a, t) => (t.af && t.af > a ? t.af : a), '0000');
      g.conds.forEach((c) => { c.status = 'approved'; c.history = [{ at: '—', who: 'Project Manager (demo)', d: 'approved', comment: '' }]; if (c.ev.type === 'upload') c.upload = { file: c.ev.label, by: 'Project Manager (demo)', at: last }; });
      P.releases[g.uid] = { by: 'Project Manager (demo)', co: null, at: '—', date: E.nextWork(E.addDays(last, 1), hol) };
    }
  });
  if (cfg.active > 1) { P.infoReq.forEach((r) => { r.status = 'received'; }); P.actions.forEach((a) => { a.status = 'closed'; }); }
  P.vendors.forEach((v) => { v.status = cfg.active > 2 ? 'received' : v.status; });
  P.jur = clone(D.DEMO_JURISDICTION);
  if (cfg.active >= 4) P.jur.forEach((j) => { if (j.status === 'potential') Object.assign(j, { status: 'verified', source: 'example.org (sample source)', verifiedOn: E.addDays(TODAY, -20) }); });
  P.roles = clone(D.ROLE_ASSIGN);
  Object.assign(P, { id: cfg.id, name: cfg.name, address: cfg.address, method: 'Modular', template: D.PROJECT.template, status: 'active' });
  return P;
}

// Illustrative timesheets for generated projects: work already done, spread over its dates.
function demoTime(P, people) {
  const out = []; const hol = D.HOLIDAYS; const lastWeek = E.addDays(E.weekOf(TODAY), -7);
  let i = 0;
  Object.values(P.tasks).forEach((t) => {
    if (!t.as || t.est <= 0) return;
    const who = [...new Set([t.owner, ...t.contrib].map((r) => (r.startsWith('role:') ? null : r)).filter((pid) => { const p = people.find((x) => x.id === pid); return p && !p.external; }))];
    if (!who.length) return;
    const factor = 0.8 + h32(P.id + t.uid + 'f') * 0.5;
    const total = t.est * (E.pctOf(P, t) / 100) * factor;
    const end = t.af || E.addDays(TODAY, -1);
    const days = []; for (let d = t.as; d <= end; d = E.addDays(d, 1)) if (E.isWork(d, hol)) days.push(d);
    if (!days.length) return;
    who.forEach((pid) => {
      const h = total / who.length; const n = Math.max(1, Math.min(days.length, Math.ceil(h / 6)));
      const per = Math.round((h / n) * 2) / 2; if (per <= 0) return;
      for (let k = 0; k < n; k++) {
        const date = days[Math.floor((k * days.length) / n)];
        out.push({ uid: `TE-${P.id}-${++i}`, project: P.id, person: pid, task: t.uid, date, hours: Math.min(8, per), desc: 'Illustrative entry', status: date >= lastWeek ? 'submitted' : 'approved', note: '', approvedBy: date >= lastWeek ? null : 'Project Manager (demo)', snap: E.snapOf(P, t.uid) });
      }
    });
  });
  return out;
}

export function initialState() {
  const main = E.buildMainProject();
  const company = { v: 3, viewer: 'pm', scope: 'proj', tpl: main.tpl, people: main.people, teams: main.teams, holidays: main.holidays, capEx: clone(D.CAP_EXCEPTIONS), rp: clone(D.RP_DEFAULTS), seq: 1, notice: null, cur: null };
  const P1 = {};
  Object.keys(main).forEach((k) => { if (!COMPANY.has(k)) P1[k] = main[k]; });
  Object.assign(P1, { id: 'P1', name: D.PROJECT.name, address: D.PROJECT.address, method: D.PROJECT.method, template: D.PROJECT.template, status: 'active' });
  const template = { ...P1, holidays: main.holidays };
  const projects = { P1 };
  let time = main.time.map((e) => ({ ...e, project: 'P1' }));
  D.DEMO_PROJECTS.forEach((cfg) => { const P = makeDemoProject(cfg, template); delete P.holidays; projects[cfg.id] = P; time = time.concat(demoTime({ ...P, holidays: main.holidays }, main.people)); });
  return { ...company, projects, order: ['P1', ...D.DEMO_PROJECTS.map((c) => c.id)], time,
    log: [{ at: stampNow(), who: 'System', text: `Portfolio loaded: ${1 + D.DEMO_PROJECTS.length} projects with illustrative data` }] };
}
const stampNow = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// ── Views ───────────────────────────────────────────────────────────────────
const views = new WeakMap();
export function projView(S, pid) {
  if (!pid || !S.projects[pid]) return null;
  let m = views.get(S); if (!m) { m = {}; views.set(S, m); }
  if (m[pid]) return m[pid];
  const P = S.projects[pid];
  const v = { ...P, v: S.v, viewer: S.viewer, scope: S.scope, tpl: S.tpl, people: S.people, teams: S.teams, holidays: S.holidays, capEx: S.capEx, rp: S.rp,
    log: S.log, seq: S.seq, notice: S.notice, _selected: S._selected, time: S.time.filter((e) => e.project === pid), _pid: pid, _S: S, _RM: () => resourceModel(S) };
  m[pid] = v; return v;
}
function writeBack(S, pid, view, n) {
  if (n === view) return S;
  const P = {}; Object.keys(n).forEach((k) => { if (!COMPANY.has(k)) P[k] = n[k]; });
  const time = n.time === view.time ? S.time : [...S.time.filter((e) => e.project !== pid), ...n.time.map((e) => (e.project ? e : { ...e, project: pid }))];
  const old = new Set(view.log); const log = n.log.map((l) => (old.has(l) || l.pid ? l : { ...l, pid, proj: S.projects[pid].name }));
  return { ...S, projects: { ...S.projects, [pid]: P }, time, people: n.people, teams: n.teams, tpl: n.tpl, scope: n.scope, viewer: n.viewer, holidays: n.holidays, log, seq: n.seq, notice: n.notice, _selected: n._selected };
}
export const projectsOf = (S, all = false) => S.order.map((id) => S.projects[id]).filter((p) => all || p.status !== 'archived');

// ── Company-level helpers ───────────────────────────────────────────────────
const cOk = (S, text, patch = {}, pid) => ({ ...S, ...patch, log: [{ at: stampNow(), who: E.viewerLabel({ ...S, roles: {} }), text, pid }, ...S.log].slice(0, 300), notice: { tone: 'ok', text: `${text} (simulated)`, n: S.seq }, seq: S.seq + 1 });
const cNo = (S, text) => ({ ...S, notice: { tone: 'bad', text, n: S.seq }, seq: S.seq + 1 });
const isAdminS = (S) => S.viewer === 'admin';
const isPMS = (S) => S.viewer === 'pm';
const pname = (S, id) => S.people.find((p) => p.id === id)?.name || id;

function createProject(S, a) {
  if (!isAdminS(S)) return cNo(S, 'Only an administrator creates projects.');
  if (!(a.name || '').trim()) return cNo(S, 'Enter a project name.');
  const start = a.start && a.start >= '2026-01-01' ? a.start : E.addDays(TODAY, 14);
  const offset = Math.round((E.toD(E.nextWork(start, S.holidays)) - E.toD('2026-09-14')) / 864e5);
  const id = `P${S.order.length + 1}-${S.seq}`;
  const cfg = { id, name: a.name.trim(), address: 'Sample site (demonstration)', offset, active: 1, roleMap: a.roleMap || {}, personMap: {} };
  // Template tasks that name a specific person become role-owned in a new project.
  const base = projView(S, S.order[0]);
  const tpl = clone({ ...S.projects[S.order[0]], holidays: S.holidays });
  Object.values(tpl.tasks).forEach((t) => {
    const toRole = (r) => { if (!r || r.startsWith('role:')) return r; const p = S.people.find((x) => x.id === r); if (!p) return r; if (p.external) return 'role:ext'; const d = E.primaryDisc(base, p); return `role:${d === 'bim' ? 'bim' : d}`; };
    t.owner = toRole(t.owner); t.contrib = [...new Set(t.contrib.map(toRole))];
  });
  const P = makeDemoProject(cfg, tpl);
  // New project: nothing started, standard information requests open, no demo gates released.
  P.infoReq.forEach((r) => { r.status = 'open'; }); P.actions = []; P.jur = clone(D.DEMO_JURISDICTION);
  Object.values(P.tasks).forEach((t) => { t.pct = 0; t.as = null; t.af = null; });
  delete P.holidays;
  return cOk(S, `Project "${cfg.name}" created from ${P.template}; Phase 01 planned from ${E.nextWork(start, S.holidays)}`, { projects: { ...S.projects, [id]: P }, order: [...S.order, id], cur: id }, id);
}

export function reducer(S, a) {
  switch (a.type) {
    case 'DISMISS': return { ...S, notice: null };
    case 'RESET': return { ...initialState(), notice: { tone: 'accent', text: 'Demo reset to its starting state', n: 1 } };
    case 'OPEN': return { ...S, cur: a.pid || null };
    case 'PROJECT_CREATE': return createProject(S, a);
    case 'CAP_SET': { // new capacity period from an effective date
      if (!isAdminS(S)) return cNo(S, 'Only an administrator changes capacity.');
      const p = S.people.find((x) => x.id === a.person);
      if (!(a.hpw >= 0 && a.hpw <= 60)) return cNo(S, 'Weekly capacity must be between 0 and 60 h.');
      const from = a.from || TODAY; const to = a.to || null;
      const caps = [...(p.caps || [])].map((c) => (c.to == null && c.from < from ? { ...c, to: E.addDays(from, -1) } : c)).filter((c) => !(c.from >= from && (!to || c.from <= to)));
      caps.push({ hpw: a.hpw, from, to }); caps.sort((x, y) => (x.from < y.from ? -1 : 1));
      const people = S.people.map((x) => (x.id === a.person ? { ...x, caps, cap: to ? x.cap : a.hpw, capVerified: !!a.verified } : x));
      return cOk(S, `${p.name}: ${a.hpw} h/week from ${from}${to ? ` to ${to}` : ''}${a.verified ? ' (verified)' : ' (illustrative)'}`, { people });
    }
    case 'CAPEX_ADD': {
      if (!isAdminS(S) && !isPMS(S)) return cNo(S, 'Only an administrator or PM records availability exceptions.');
      if (!['Vacation', 'Unavailable', 'Training', 'Public Holiday'].includes(a.kind)) return cNo(S, 'Use a generic category.');
      if (!a.from || !a.to || a.to < a.from) return cNo(S, 'Enter a valid date range.');
      const x = { id: `X${S.seq}`, person: a.person, from: a.from, to: a.to, kind: a.kind };
      return cOk(S, `${pname(S, a.person)}: ${a.kind} ${a.from} – ${a.to} (illustrative)`, { capEx: [...S.capEx, x] });
    }
    case 'CAPEX_REMOVE': {
      if (!isAdminS(S) && !isPMS(S)) return cNo(S, 'Only an administrator or PM records availability exceptions.');
      const x = S.capEx.find((q) => q.id === a.id);
      return cOk(S, `${pname(S, x.person)}: ${x.kind} ${x.from} – ${x.to} removed`, { capEx: S.capEx.filter((q) => q.id !== a.id) });
    }
    case 'HOLIDAY_ADD': if (!isAdminS(S)) return cNo(S, 'Only an administrator manages holidays.'); if (!a.date || S.holidays.includes(a.date)) return cNo(S, 'Pick a new date.'); return cOk(S, `Company holiday ${a.date} added`, { holidays: [...S.holidays, a.date].sort() });
    case 'HOLIDAY_REMOVE': if (!isAdminS(S)) return cNo(S, 'Only an administrator manages holidays.'); return cOk(S, `Company holiday ${a.date} removed`, { holidays: S.holidays.filter((d) => d !== a.date) });
    case 'RP_SET': if (!isAdminS(S)) return cNo(S, 'Only an administrator changes Resource Planning defaults.'); return cOk(S, 'Resource Planning defaults updated', { rp: { ...S.rp, ...a.patch } });
    case 'ASSIGN_ALLOC': { // from Resource Planning: add a person to a task on a project and set their hours
      const V = projView(S, a._pid); const t = V.tasks[a.uid];
      if (!t) return cNo(S, 'Pick a task.');
      let n = V;
      if (!E.involves(V, t, a.person)) n = E.reducer(n, { type: 'ASSIGN', uid: a.uid, patch: { contrib: [...t.contrib, a.person] } });
      if (n.notice?.tone === 'bad' && n !== V) return writeBack(S, a._pid, V, n);
      n = E.reducer(n, { type: 'ALLOC', uid: a.uid, ref: a.person, h: a.h, reason: a.reason || 'Assigned from Resource Planning' });
      return writeBack(S, a._pid, V, n);
    }
    default: {
      const pid = a._pid || S.cur || S.order[0];
      const V = projView(S, pid);
      return writeBack(S, pid, V, E.reducer(V, a));
    }
  }
}
