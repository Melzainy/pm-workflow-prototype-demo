import * as D from './seed.js';

export const TODAY = D.DEMO_TODAY;
const clone = (x) => JSON.parse(JSON.stringify(x));

// ── Dates (working days skip weekends + configured holidays) ────────────────
export const toD = (d) => new Date(d + 'T12:00:00');
export const iso = (x) => x.toISOString().slice(0, 10);
export const isWork = (d, hol) => { const x = toD(d); const w = x.getDay(); return w !== 0 && w !== 6 && !hol.includes(d); };
export function addDays(d, n) { const x = toD(d); x.setDate(x.getDate() + n); return iso(x); }
export function nextWork(d, hol) { let x = d; while (!isWork(x, hol)) x = addDays(x, 1); return x; }
export function addWork(d, n, hol) { // n working days after d (n=0 → d itself if working)
  let x = nextWork(d, hol); let k = n;
  while (k > 0) { x = addDays(x, 1); if (isWork(x, hol)) k--; }
  return x;
}
export function workBetween(a, b, hol) { // signed working days from a to b
  if (!a || !b || a === b) return 0;
  const sgn = a < b ? 1 : -1; let [x, y] = sgn > 0 ? [a, b] : [b, a]; let n = 0;
  while (x < y) { x = addDays(x, 1); if (isWork(x, hol)) n++; }
  return n * sgn;
}
const maxD = (...ds) => ds.filter(Boolean).reduce((a, b) => (b > a ? b : a), '0000-00-00');

// ── Build initial state ────────────────────────────────────────────────────
let _uid = 1000;
const nid = (p) => `${p}${++_uid}`;

function buildStructure(withRuntime) {
  const phases = [], wps = [], tasks = {}, gates = [];
  const codeToUid = {};
  D.STRUCTURE.forEach((ph, pi) => {
    const puid = `PH${pi + 1}`;
    const legacy = pi >= 3 ? String(pi).padStart(2, '0') : pi === 2 ? null : String(pi + 1).padStart(2, '0');
    phases.push({ uid: puid, order: pi, title: ph.title, state: pi === 0 ? 'active' : 'locked', unscoped: !!ph.unscoped, legacy, archived: false, gateTitle: ph.gate });
    ph.wps.forEach(([wtitle, list], wi) => {
      const wuid = `W${pi + 1}${String(wi + 1).padStart(2, '0')}`;
      wps.push({ uid: wuid, phase: puid, order: wi, title: wtitle, archived: false });
      list.forEach((t, ti) => {
        const uid = `T-${pi + 1}${String(wi + 1).padStart(2, '0')}${String(ti + 1).padStart(2, '0')}`;
        const code = `${pi + 1}.${t.local}`;
        codeToUid[code] = uid;
        tasks[uid] = mkTask(uid, wuid, null, ti, t, withRuntime);
        tasks[uid]._depCodes = t.deps || [];
        (t.sub || []).forEach((sg, gi) => {
          const items = typeof sg === 'object' && sg.g ? sg.items.map((it) => ({ ...(typeof it === 'string' ? { t: it } : it), group: sg.g })) : [typeof sg === 'string' ? { t: sg } : sg];
          items.forEach((it) => {
            const n = Object.values(tasks).filter((x) => x.parent === uid).length;
            const suid = `${uid}-${String(n + 1).padStart(2, '0')}`;
            tasks[suid] = mkTask(suid, wuid, uid, n, { type: 'task', title: it.t, owner: it.owner || t.owner, contrib: it.contrib || [], disc: t.disc, req: it.req, group: it.group, pct: it.done ? 100 : 0, w: 0, est: 0, ps: t.ps, pf: t.pf }, withRuntime);
          });
        });
      });
    });
  });
  Object.values(tasks).forEach((t) => { t.deps = (t._depCodes || []).map((c) => codeToUid[c]).filter(Boolean); delete t._depCodes; });
  D.GATE_CONDS.forEach((conds, gi) => {
    gates.push({
      uid: `GT${gi + 1}`, phase: `PH${gi + 1}`,
      conds: conds.map(([text, owner, ev], ci) => ({
        uid: `GC${gi + 1}-${ci + 1}`, text, owner, status: 'pending', history: [], upload: null,
        legal: !!(ev && ev.legal),
        ev: ev === 'release' ? { type: 'release' } : Array.isArray(ev) ? { type: 'items', items: ev.map((c) => codeToUid[c]) }
          : ev.upload ? { type: 'upload', label: ev.upload, requires: (ev.requires || []).map((c) => codeToUid[c]) }
            : { type: 'computed', key: ev.computed, items: (ev.items || []).map((c) => codeToUid[c]) },
      })),
    });
  });
  return { phases, wps, tasks, gates, codeToUid };
}

function mkTask(uid, wp, parent, order, t, rt) {
  return {
    uid, wp, parent, order, local: parent ? null : t.local, type: t.type || 'task', title: t.title, owner: t.owner, contrib: t.contrib || [], disc: t.disc || 'pm',
    req: t.req || 'required', priority: 'normal', w: t.w ?? 0, est: t.est ?? 0, ps: t.ps, pf: t.pf, bs: t.bs || t.ps, bf: t.bf || t.pf,
    pct: rt ? (t.pct ?? 0) : 0, as: rt ? (t.as || (t.pct ? t.ps : null)) : null, af: rt ? (t.af || null) : null, deps: [], outputs: t.outputs || [], criteria: t.criteria || '',
    sheets: t.sheets || [], archived: false, legacy: t.legacy || null, blocker: t.blocker || null, hold: false, minutes: rt ? !!t.minutes : false,
    options: t.options || null, choice: null, jur: t.jur || null, doc: t.doc || null, evidence: null, outcome: null, remaining: null, remHistory: [], alloc: {},
    note: t.note || '', group: t.group || null, vendors: !!t.vendors, codeHistory: [],
  };
}

export function initialState() {
  const st = buildStructure(true);
  const tpl = buildStructure(false);
  const time = D.TIME.map(([person, code, date, hours, status, desc], i) => ({ uid: `TE-${i + 1}`, person, task: st.codeToUid[code], date, hours, desc, status, note: '', approvedBy: status === 'approved' ? 'Project Manager' : null, snap: null }));
  const s = {
    viewer: 'pm', scope: 'proj',
    phases: st.phases, wps: st.wps, tasks: st.tasks, gates: st.gates,
    tpl: { phases: tpl.phases, wps: tpl.wps, tasks: tpl.tasks, gates: tpl.gates, version: 'v1.1 (draft)', published: false },
    people: clone(D.PEOPLE), teams: clone(D.TEAMS).map((t) => ({ ...t, archived: false })), roles: clone(D.ROLE_ASSIGN),
    time, actions: D.ACTIONS.map((a) => ({ ...a, task: st.codeToUid[a.task], gate: 'GT1' })),
    infoReq: clone(D.INFO_REQUESTS), vendors: clone(D.VENDORS).map((v) => ({ ...v, tasks: v.tasks.map((c) => st.codeToUid[c]) })),
    jur: clone(D.JURISDICTION), sheets: clone(D.SHEETS).map((x) => ({ ...x, task: x.task ? st.codeToUid[x.task] : null })), reqs: clone(D.REQUIREMENTS),
    sheetDiscs: clone(D.SHEET_DISCIPLINES), holidays: [...D.HOLIDAYS],
    gateSettings: {}, releases: {}, pendingRelease: {}, changeRequests: [],
    log: [{ at: stamp(), who: 'System', text: 'Demo project loaded with illustrative data (six-phase template v1.0)' }],
    seq: 1, notice: null,
  };
  // Snapshot attribution for existing entries.
  s.time = s.time.map((e) => ({ ...e, snap: snapOf(s, e.task) }));
  // Link sheets to tasks from task.sheets.
  Object.values(s.tasks).forEach((t) => t.sheets.forEach((no) => { const sh = s.sheets.find((x) => x.no === no); if (sh && !sh.task) sh.task = t.uid; }));
  return s;
}
function stamp() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

// ── Structure selectors (work on project state or template) ────────────────
export const livePhases = (st) => st.phases.filter((p) => !p.archived).sort((a, b) => a.order - b.order);
export const phaseNo = (st, puid) => livePhases(st).findIndex((p) => p.uid === puid) + 1;
export const pad = (n) => String(n).padStart(2, '0');
export const wpsOf = (st, puid, all = false) => st.wps.filter((w) => w.phase === puid && (all || !w.archived)).sort((a, b) => a.order - b.order);
export const topTasks = (st, wuid, all = false) => Object.values(st.tasks).filter((t) => t.wp === wuid && !t.parent && (all || !t.archived)).sort((a, b) => a.order - b.order);
export const children = (st, uid, all = false) => Object.values(st.tasks).filter((t) => t.parent === uid && (all || !t.archived)).sort((a, b) => a.order - b.order);
export const wpOf = (st, t) => st.wps.find((w) => w.uid === t.wp);
export const phaseOfTask = (st, t) => wpOf(st, t)?.phase;
export function code(st, t) {
  if (!t) return '';
  if (t.parent) { const p = st.tasks[t.parent]; const idx = children(st, t.parent).findIndex((c) => c.uid === t.uid) + 1; return `${code(st, p)}.${idx || '–'}`; }
  return `${phaseNo(st, phaseOfTask(st, t))}.${t.local}`;
}
export const tasksOfPhase = (st, puid, all = false) => wpsOf(st, puid).flatMap((w) => topTasks(st, w.uid, all));
export const allRecordsOfPhase = (st, puid) => Object.values(st.tasks).filter((t) => !t.archived && phaseOfTask(st, t) === puid);
export const gateOfPhase = (st, puid) => st.gates.find((g) => g.phase === puid);
export const gateName = (st, g) => `Gate ${pad(phaseNo(st, g.phase))}`;

// ── Progress (never derived from hours) ────────────────────────────────────
export function pctOf(st, t) {
  const kids = children(st, t.uid);
  if (kids.length) return Math.round(kids.reduce((a, k) => a + pctOf(st, k), 0) / kids.length);
  return t.pct;
}
export const done = (st, t) => pctOf(st, t) >= 100;
export function phaseProgress(st, puid) {
  const ts = tasksOfPhase(st, puid).filter((t) => t.w > 0);
  const W = ts.reduce((a, t) => a + t.w, 0);
  return W ? Math.round(ts.reduce((a, t) => a + t.w * pctOf(st, t), 0) / W) : null;
}
export const phase = (s, puid) => s.phases.find((p) => p.uid === puid);
export const locked = (s, t) => phase(s, phaseOfTask(s, t))?.state === 'locked';
export const openDeps = (s, t) => t.deps.filter((d) => s.tasks[d] && !s.tasks[d].archived && !done(s, s.tasks[d]));

export function status(s, t) {
  if (t.archived) return { key: 'archived', label: 'Archived', tone: 'neutral' };
  if (locked(s, t)) return { key: 'locked', label: 'Locked', tone: 'neutral' };
  if (done(s, t)) return { key: 'done', label: { meeting: 'Minutes issued', signoff: 'Signed', review: 'Approved', decision: 'Decided', milestone: 'Reached', submission: 'Submitted' }[t.type] || 'Complete', tone: 'ok' };
  if (t.hold) return { key: 'hold', label: 'On hold', tone: 'warn' };
  if (t.blocker) return { key: 'blocked', label: 'Blocked', tone: 'bad' };
  if (t.pf < TODAY) return { key: 'overdue', label: 'Overdue', tone: 'bad' };
  const od = openDeps(s, t);
  if (pctOf(s, t) === 0 && od.length) return { key: 'waiting', label: `Waiting on ${code(s, s.tasks[od[0]])}`, tone: 'warn' };
  if (pctOf(s, t) > 0) return { key: 'progress', label: 'In progress', tone: 'accent' };
  return { key: 'todo', label: t.type === 'meeting' ? 'Not held' : 'Not started', tone: 'neutral' };
}

// ── People, roles, permissions ─────────────────────────────────────────────
export const roleLabel = (key) => (D.ROLE_DEFS.find(([k]) => k === key) || [key, key])[1];
export const person = (s, id) => s.people.find((p) => p.id === id);
export function resolve(s, who) { // → person id or null
  if (!who) return null;
  if (who.startsWith('role:')) return s.roles[who.slice(5)] || null;
  return who;
}
export function whoLabel(s, who) {
  if (!who) return '—';
  if (who.startsWith('role:')) { const k = who.slice(5); const p = s.roles[k] && person(s, s.roles[k]); return p ? (p.name === roleLabel(k) ? p.name : `${p.name} (${roleLabel(k)})`) : `${roleLabel(k)} (TBD)`; }
  const p = person(s, who); return p ? p.name + (p.active ? '' : ' (inactive)') : who;
}
export const viewerPerson = (s) => (s.viewer === 'pm' ? s.roles.pm : s.viewer === 'admin' || s.viewer === 'exec' ? null : s.viewer);
export const isAdmin = (s) => s.viewer === 'admin';
export const isPM = (s) => s.viewer === 'pm' || (s.roles.pm && s.viewer === s.roles.pm);
export const isExec = (s) => s.viewer === 'exec' || (s.roles.exec && s.viewer === s.roles.exec);
export function viewerLabel(s) {
  if (s.viewer === 'admin') return 'Administrator';
  if (s.viewer === 'pm') return 'Project Manager';
  if (s.viewer === 'exec') return 'Executive Management';
  return person(s, s.viewer)?.name || s.viewer;
}
export const PLACEHOLDER_CAP = 32; // planning assumption for roles not yet assigned to a person
export function capUnits(s, t) { // who supplies capacity to this task
  const out = [];
  [t.owner, ...t.contrib].forEach((ref) => {
    const pid = resolve(s, ref);
    if (pid) { const p = person(s, pid); if (p && p.active && p.cap > 0 && !out.some((o) => o.key === pid)) out.push({ key: pid, name: p.name, cap: p.cap }); }
    else if (ref && ref.startsWith('role:') && !['client', 'ext'].includes(ref.slice(5)) && !out.some((o) => o.key === ref)) out.push({ key: ref, name: `${roleLabel(ref.slice(5))} (TBD)`, cap: PLACEHOLDER_CAP, placeholder: true });
  });
  return out;
}
export const assignees = (s, t) => [...new Set([t.owner, ...t.contrib].map((w) => resolve(s, w)).filter(Boolean))];
export function involves(s, t, pid) { if (!pid) return false; return assignees(s, t).includes(pid); }
export function canEditTask(s, t) {
  if (isPM(s) || isAdmin(s)) return true;
  const me = viewerPerson(s); return !!me && involves(s, t, me);
}
export function holdsRole(s, ownerRef) {
  if (isPM(s)) return true;
  const me = viewerPerson(s); if (!me) return false;
  return resolve(s, ownerRef) === me;
}

// ── Effort ─────────────────────────────────────────────────────────────────
export const entriesOf = (s, uid) => s.time.filter((e) => e.task === uid);
export function hours(s, uid, rollup = true) {
  const uids = rollup ? [uid, ...Object.values(s.tasks).filter((t) => t.parent === uid).map((t) => t.uid)] : [uid];
  const es = s.time.filter((e) => uids.includes(e.task));
  const sum = (st) => es.filter((e) => st.includes(e.status)).reduce((a, e) => a + e.hours, 0);
  return { approved: sum(['approved']), pending: sum(['submitted']), draft: sum(['draft']), entries: es };
}
export function estRollup(s, t) { return t.est + children(s, t.uid).reduce((a, k) => a + k.est, 0); }
export function remainingOf(s, t) { // PM override, else default rule from progress
  if (t.remaining != null) return t.remaining;
  if (done(s, t)) return 0;
  return Math.round(t.est * (1 - pctOf(s, t) / 100));
}
export function snapOf(s, uid) {
  const t = s.tasks[uid]; if (!t) return null;
  const ph = phaseOfTask(s, t);
  return { phase: ph, phaseNo: phaseNo(s, ph), wp: t.wp, wpTitle: wpOf(s, t)?.title, code: code(s, t), title: t.title, disc: t.disc };
}

// ── Forecast (rule-based, transparent) ─────────────────────────────────────
const cache = new WeakMap();
export function forecastAll(s) {
  if (cache.has(s)) return cache.get(s);
  const hol = s.holidays;
  const res = {};
  const today = nextWork(TODAY, hol);
  const loadCache = {};
  // Capacity is shared only with tasks whose planned windows overlap (simultaneous work).
  const load = (key, t) => {
    const k = key + t.uid; if (loadCache[k] != null) return loadCache[k];
    const n = Object.values(s.tasks).filter((x) => !x.archived && x.est > 0 && !done(s, x) && x.ps <= t.pf && x.pf >= t.ps && capUnits(s, x).some((u) => u.key === key)).length;
    return (loadCache[k] = Math.max(1, n));
  };
  const phaseRelease = {}; // puid -> {date, cond}
  const phasesSorted = livePhases(s);
  const visit = (uid, stack = []) => {
    if (res[uid]) return res[uid];
    const t = s.tasks[uid];
    if (!t || t.archived || stack.includes(uid)) return { finish: null, uncertain: 'Circular dependency' };
    const puid = phaseOfTask(s, t);
    const ph = phase(s, puid);
    const h = hours(s, uid, false);
    const approvedDates = h.entries.filter((e) => e.status === 'approved').map((e) => e.date).sort();
    const pendingDates = h.entries.filter((e) => e.status === 'submitted').map((e) => e.date).sort();
    const aStart = t.as && (pctOf(s, t) > 0 || h.approved) ? minD(t.as, approvedDates[0]) : approvedDates[0] || null;
    const lastAct = approvedDates[approvedDates.length - 1] || null;
    const r = { uid, aStart, lastAct, firstPending: pendingDates[0] || null, lastPending: pendingDates[pendingDates.length - 1] || null };
    if (done(s, t)) { Object.assign(r, { kind: 'actual', start: aStart || t.ps, finish: t.af || t.pf, rem: 0 }); return (res[uid] = r); }
    let earliest = today; let uncertain = null; const conditions = [];
    // Parent/child: children forecast feed the parent
    for (const d of t.deps) {
      const f = visit(d, [...stack, uid]);
      if (f.uncertain) uncertain = uncertain || `Depends on ${code(s, s.tasks[d])} (uncertain)`;
      if (f.finish) earliest = maxD(earliest, addWork(f.finish, 1, hol));
      if (f.cond) conditions.push(...f.cond);
    }
    if (ph.state === 'locked') {
      const idx = phasesSorted.findIndex((p) => p.uid === puid);
      const prev = phasesSorted[idx - 1];
      if (prev) {
        const rel = phaseRelease[prev.uid] || (phaseRelease[prev.uid] = phaseForecast(s, prev.uid, visit));
        if (rel.finish) earliest = maxD(earliest, addWork(rel.finish, 1, hol));
        if (rel.uncertain) uncertain = uncertain || `Starts after ${gateName(s, gateOfPhase(s, prev.uid))} (uncertain)`;
        conditions.push(`${gateName(s, gateOfPhase(s, prev.uid))} release`);
      }
    }
    const started = pctOf(s, t) > 0 || h.approved > 0 || h.pending > 0;
    let start = started ? today : maxD(earliest, nextWork(t.ps, hol));
    if (started) start = maxD(today, earliest > today && openDeps(s, t).length ? earliest : today);
    const rem = remainingOf(s, t);
    const alloc = capUnits(s, t).map((u) => ({ id: u.key, name: u.name, placeholder: !!u.placeholder, cap: u.cap, load: load(u.key, t),
      hpw: t.alloc[u.key] != null ? t.alloc[u.key] : Math.round((u.cap / load(u.key, t)) * 10) / 10, explicit: t.alloc[u.key] != null }));
    const rate = alloc.reduce((a, x) => a + x.hpw, 0);
    if (t.blocker) uncertain = `Blocked: ${t.blocker}`;
    if (t.hold) uncertain = 'On hold';
    let finish;
    const kids = children(s, uid).map((k) => visit(k.uid, [...stack, uid]));
    if (rem > 0 && rate <= 0) { uncertain = uncertain || 'No one with capacity is assigned'; finish = null; }
    else if (rem <= 0) finish = start;
    else { const days = Math.ceil(rem / (rate / 5)); finish = addWork(start, Math.max(0, days - 1), hol); }
    kids.forEach((k) => { if (k.finish && finish) finish = maxD(finish, k.finish); if (k.uncertain && !uncertain && k.rem > 0) uncertain = `Subtask uncertain: ${k.uncertain}`; });
    Object.assign(r, { kind: 'forecast', start, finish, rem, rate, alloc, assumed: alloc.some((x) => x.placeholder), uncertain, cond: [...new Set(conditions)], days: rate > 0 ? Math.ceil(rem / (rate / 5)) : null });
    return (res[uid] = r);
  };
  Object.keys(s.tasks).forEach((uid) => visit(uid));
  res._phase = {};
  phasesSorted.forEach((p) => { res._phase[p.uid] = phaseRelease[p.uid] || phaseForecast(s, p.uid, visit); });
  cache.set(s, res);
  return res;
}
const minD = (a, b) => (!a ? b : !b ? a : a < b ? a : b);

function phaseForecast(s, puid, visit) {
  const recs = allRecordsOfPhase(s, puid);
  const ph = phase(s, puid);
  const g = gateOfPhase(s, puid);
  if (!recs.length) return { finish: null, uncertain: ph.unscoped ? 'Not scoped' : 'No tasks', start: null };
  const fs = recs.map((t) => visit(t.uid));
  const finish = fs.reduce((a, f) => maxD(a, f.finish), '0000-00-00');
  const uncertainTask = fs.find((f) => f.uncertain);
  const r = gateReadiness(s, g?.uid);
  const pendingGate = g && !s.releases[g.uid] ? r.total - r.approved - 1 : 0;
  return {
    start: fs.reduce((a, f) => minD(a, f.aStart || f.start), null),
    finish: finish === '0000-00-00' ? null : finish,
    uncertain: uncertainTask ? `${code(s, s.tasks[uncertainTask.uid])}: ${uncertainTask.uncertain}` : null,
    gatePending: ph.state === 'released' ? 0 : pendingGate,
    released: ph.state === 'released',
  };
}

export function phaseSchedule(s, puid) {
  const recs = allRecordsOfPhase(s, puid);
  const f = forecastAll(s);
  const pf = f._phase[puid] || {};
  const top = tasksOfPhase(s, puid);
  const est = recs.reduce((a, t) => a + t.est, 0);
  const approved = s.time.filter((e) => e.status === 'approved' && e.snap?.phase === puid).reduce((a, e) => a + e.hours, 0);
  const pending = s.time.filter((e) => e.status === 'submitted' && e.snap?.phase === puid).reduce((a, e) => a + e.hours, 0);
  const rem = recs.reduce((a, t) => a + (done(s, t) ? 0 : remainingOf(s, t)), 0);
  const bs = recs.reduce((a, t) => minD(a, t.bs), null), bf = recs.reduce((a, t) => maxD(a, t.bf), null);
  const ps = recs.reduce((a, t) => minD(a, t.ps), null), pf2 = recs.reduce((a, t) => maxD(a, t.pf), null);
  const aStarts = recs.map((t) => f[t.uid]?.aStart).filter(Boolean).sort();
  return { bs, bf: bf === '0000-00-00' ? null : bf, ps, pf: pf2 === '0000-00-00' ? null : pf2, as: aStarts[0] || null, af: phase(s, puid).state === 'released' ? s.releases[gateOfPhase(s, puid)?.uid]?.date : null,
    ff: pf.finish, uncertain: pf.uncertain, gatePending: pf.gatePending, est, approved, pending, rem, count: top.length };
}

export function incompleteTime(s, t) { // assignees with no entries on this task in the last 5 working days
  if (done(s, t) || pctOf(s, t) === 0) return [];
  const from = addWork(addDays(TODAY, -7), 0, s.holidays);
  return assignees(s, t).filter((pid) => person(s, pid)?.cap > 0 && !s.time.some((e) => e.person === pid && e.task === t.uid && e.date >= from));
}

// ── Gates ───────────────────────────────────────────────────────────────────
export function evidence(s, c) {
  const ev = c.ev;
  if (ev.type === 'release') return { ready: true };
  if (ev.type === 'items') { const open = ev.items.filter((u) => s.tasks[u] && !done(s, s.tasks[u])); return { ready: !open.length, missing: open.length ? `Waiting on ${open.map((u) => code(s, s.tasks[u])).join(', ')}` : '' }; }
  if (ev.type === 'upload') {
    const open = ev.requires.filter((u) => s.tasks[u] && !done(s, s.tasks[u]));
    if (open.length) return { ready: false, missing: `Waiting on ${open.map((u) => code(s, s.tasks[u])).join(', ')}` };
    return c.upload ? { ready: true } : { ready: false, missing: 'Signed document not recorded', needsUpload: true };
  }
  if (ev.key === 'conditionals') { const n = s.reqs.filter((r) => r.applicability === 'conditional').length; return { ready: !n, missing: n ? `${n} conditional requirements unresolved` : '' }; }
  if (ev.key === 'jurisdiction') {
    const n = s.jur.filter((j) => ['potential', 'blocked', 'stale'].includes(j.status)).length;
    const open = ev.items.filter((u) => s.tasks[u] && !done(s, s.tasks[u]));
    return { ready: !n && !open.length, missing: n ? `${n} jurisdiction items unverified` : open.length ? `Waiting on ${open.map((u) => code(s, s.tasks[u])).join(', ')}` : '' };
  }
  return { ready: false, missing: '?' };
}
export function gateReadiness(s, guid) {
  const g = s.gates.find((x) => x.uid === guid);
  if (!g) return { approved: 0, total: 0, ready: false, missing: [], crit: [] };
  const conds = g.conds.filter((c) => c.ev.type !== 'release');
  const approved = conds.filter((c) => c.status === 'approved' || c.status === 'na').length;
  const missing = conds.filter((c) => !(c.status === 'approved' || c.status === 'na')).map((c) => c.text);
  const crit = s.actions.filter((a) => a.gate === guid && a.critical && a.status !== 'closed');
  crit.forEach((a) => missing.push(`Critical action ${a.id} open`));
  return { approved, total: g.conds.length, ready: !missing.length, missing, crit };
}
export const jurOpen = (s) => s.jur.filter((j) => ['potential', 'blocked', 'stale'].includes(j.status));

// ── Impact analysis for structural changes ─────────────────────────────────
export function impact(s, st, op) {
  const out = { blocking: [], warnings: [], changes: [] };
  const inProj = st === s;
  const frozen = inProj && s.phases.find((p) => p.uid === 'PH2')?.state === 'released';
  const protectedPhase = (puid) => inProj && (phase(s, puid)?.state === 'released' || (frozen && ['PH1', 'PH2'].includes(puid)));
  const gateRefs = (uid) => (st.gates || []).flatMap((g) => g.conds.filter((c) => (c.ev.items || []).includes(uid) || (c.ev.requires || []).includes(uid)).map((c) => `${gateName(st, g)} · ${c.text}`));
  const dependents = (uid) => Object.values(st.tasks).filter((t) => !t.archived && t.deps.includes(uid));
  if (op.kind === 'moveTask') {
    const t = st.tasks[op.uid]; const from = phaseOfTask(st, t); const toWp = st.wps.find((w) => w.uid === op.wp); const to = toWp.phase;
    if (inProj && done(s, t)) out.blocking.push(`${code(st, t)} is complete. Completed history cannot be moved; reopen it through the PM first.`);
    if (protectedPhase(from) || protectedPhase(to)) out.blocking.push(frozen ? 'Design Freeze is approved. Changes to Phase 01–02 need a change request.' : 'That phase is released. Its history is protected.');
    if (t.parent) out.changes.push(`Leaves ${code(st, st.tasks[t.parent])} and becomes a top-level task in "${toWp.title}" with code ${phaseNo(st, to)}.${nextLocal(st, to)} (stable ID ${t.uid} unchanged). The parent's progress is recalculated without it.`);
    if (t.parent) { /* handled above */ } else if (from !== to) {
      const newLocal = nextLocal(st, to);
      out.changes.push(`Display code ${code(st, t)} → ${phaseNo(st, to)}.${newLocal} (stable ID ${t.uid} unchanged)`);
      const later = t.deps.filter((d) => phaseNo(st, phaseOfTask(st, st.tasks[d])) > phaseNo(st, to));
      later.forEach((d) => out.warnings.push(`It would depend on ${code(st, st.tasks[d])}, which sits in a later phase.`));
      dependents(t.uid).filter((x) => phaseNo(st, phaseOfTask(st, x)) < phaseNo(st, to)).forEach((x) => out.warnings.push(`${code(st, x)} (earlier phase) depends on it.`));
      gateRefs(t.uid).forEach((g) => out.warnings.push(`Gate evidence: ${g}. The condition keeps pointing at this task in its new phase.`));
    } else out.changes.push(`Moves to work package "${toWp.title}" in the same phase. Code stays ${code(st, t)}.`);
    const subs = children(st, t.uid).length; if (subs) out.changes.push(`${subs} subtasks move with it.`);
    if (inProj) { const h = hours(s, t.uid); if (h.approved) out.changes.push(`${h.approved} approved hours keep their original phase and work-package attribution. Future entries use the new location.`); }
  }
  if (op.kind === 'archiveTask') {
    const t = st.tasks[op.uid];
    if (inProj && done(s, t)) out.blocking.push(`${code(st, t)} is complete and cannot be archived.`);
    if (inProj && hours(s, t.uid).approved) out.warnings.push('Approved hours stay in reports under the original attribution.');
    if (protectedPhase(phaseOfTask(st, t))) out.blocking.push(frozen ? 'Design Freeze is approved. Changes to Phase 01–02 need a change request.' : 'That phase is released.');
    gateRefs(t.uid).forEach((g) => out.blocking.push(`Used as gate evidence: ${g}. Remove it from the condition first.`));
    dependents(t.uid).forEach((x) => out.warnings.push(`${code(st, x)} depends on it. The dependency will be removed.`));
  }
  if (op.kind === 'addPhase') {
    const ps = livePhases(st); const idx = ps.findIndex((p) => p.uid === op.after);
    out.changes.push(`New phase becomes ${pad(idx + 2)}.`);
    ps.slice(idx + 1).forEach((p, i) => out.changes.push(`Phase ${pad(idx + 2 + i)} → ${pad(idx + 3 + i)} (${p.title}); its task codes and gate number shift with it.`));
    out.changes.push('Dependencies, timesheets and approvals are stored by stable ID and are unaffected. A new gate with a PM release condition is created.');
    if (inProj && ps.slice(idx + 1).some((p) => p.state !== 'locked')) out.blocking.push('A phase after the insertion point is already active or released.');
  }
  if (op.kind === 'archivePhase') {
    const p = st.phases.find((x) => x.uid === op.uid);
    if (inProj && p.state !== 'locked') out.blocking.push('Only a locked, unstarted phase can be archived.');
    const n = Object.values(st.tasks).filter((t) => !t.archived && phaseOfTask(st, t) === p.uid).length;
    if (n) out.blocking.push(`It still contains ${n} tasks. Move or archive them first.`);
    out.changes.push('Later phases renumber.');
  }
  return out;
}
export function nextLocal(st, puid) {
  const locals = Object.values(st.tasks).filter((t) => !t.parent && phaseOfTask(st, t) === puid).map((t) => parseInt(t.local, 10)).filter((n) => !isNaN(n));
  return String((locals.length ? Math.max(...locals) : 0) + 1);
}

// ── Reducer ─────────────────────────────────────────────────────────────────
function ok(s, text, patch = {}) {
  return { ...s, ...patch, log: [{ at: stamp(), who: viewerLabel(s), text }, ...s.log].slice(0, 300), notice: { tone: 'ok', text: `${text} (simulated)`, n: s.seq }, seq: s.seq + 1 };
}
const no = (s, text) => ({ ...s, notice: { tone: 'bad', text, n: s.seq }, seq: s.seq + 1 });
const setTask = (s, uid, patch) => ({ ...s, tasks: { ...s.tasks, [uid]: { ...s.tasks[uid], ...patch } } });
function setScope(s, scope, st) { return scope === 'tpl' ? { ...s, tpl: { ...s.tpl, ...st } } : { ...s, ...st }; }
const stOf = (s, scope) => (scope === 'tpl' ? s.tpl : s);

function refreshSnaps(s) { // non-approved entries follow the task's current location
  return { ...s, time: s.time.map((e) => (e.status === 'approved' ? e : { ...e, snap: snapOf(s, e.task) })) };
}

function progressGuard(s, t, target) {
  if (locked(s, t)) return `${code(s, t)} is in a locked phase. Owners and dates can be planned, but progress cannot change until the previous gate is released.`;
  if (!canEditTask(s, t)) return `Only people assigned to ${code(s, t)} or the PM can update it.`;
  if (target >= 100) { const od = openDeps(s, t); if (od.length) return `${code(s, t)} cannot be completed while ${od.map((d) => code(s, s.tasks[d])).join(', ')} ${od.length > 1 ? 'are' : 'is'} open.`; }
  return null;
}
function completePatch(s, t, pct) {
  const p = { pct };
  if (pct > 0 && !t.as) p.as = TODAY;
  if (pct >= 100) p.af = TODAY; else p.af = null;
  return p;
}

export function reducer(s, a) {
  switch (a.type) {
    case 'VIEWER': return { ...s, viewer: a.v, notice: { tone: 'accent', text: `Now viewing as ${viewerLabel({ ...s, viewer: a.v })}`, n: s.seq }, seq: s.seq + 1 };
    case 'DISMISS': return { ...s, notice: null };
    case 'RESET': return { ...initialState(), notice: { tone: 'accent', text: 'Demo reset to its starting state', n: 1 } };

    // Workflow
    case 'PCT': {
      const t = s.tasks[a.uid]; const err = progressGuard(s, t, a.pct); if (err) return no(s, err);
      if (children(s, t.uid).length) return no(s, `${code(s, t)} progress comes from its subtasks.`);
      return ok(setTask(s, a.uid, completePatch(s, t, a.pct)), `${code(s, t)} progress set to ${a.pct}%`);
    }
    case 'SUB_TOGGLE': {
      const t = s.tasks[a.uid]; const err = progressGuard(s, t, t.pct >= 100 ? 0 : 100); if (err) return no(s, err);
      const pct = t.pct >= 100 ? 0 : 100;
      return ok(setTask(s, a.uid, completePatch(s, t, pct)), `Subtask ${code(s, t)} ${pct ? 'completed' : 'reopened'}`);
    }
    case 'MINUTES': {
      const t = s.tasks[a.uid]; const err = progressGuard(s, t, 100); if (err) return no(s, err);
      const n = s.actions.filter((x) => x.task === a.uid && x.status !== 'closed').length;
      return ok(setTask(s, a.uid, { ...completePatch(s, t, 100), minutes: true }), `${code(s, t)} minutes issued${n ? ` (${n} action${n > 1 ? 's' : ''} stay open)` : ''}`);
    }
    case 'EVIDENCE': {
      const t = s.tasks[a.uid]; const err = progressGuard(s, t, 100); if (err) return no(s, err);
      return ok(setTask(s, a.uid, { ...completePatch(s, t, 100), evidence: a.evidence }), `${code(s, t)} signed document recorded`);
    }
    case 'OUTCOME': {
      const t = s.tasks[a.uid]; const pct = a.outcome === 'approved' ? 100 : 50; const err = progressGuard(s, t, pct); if (err) return no(s, err);
      return ok(setTask(s, a.uid, { ...completePatch(s, t, pct), outcome: a.outcome }), `${code(s, t)} review: ${a.outcome === 'approved' ? 'approved' : 'revision requested'}`);
    }
    case 'DECIDE': {
      const t = s.tasks[a.uid]; const err = progressGuard(s, t, 100); if (err) return no(s, err);
      let n = setTask(s, a.uid, { ...completePatch(s, t, 100), choice: a.option });
      if (t.jur) n = { ...n, jur: n.jur.map((j) => (j.id === t.jur ? { ...j, status: a.option === 'Not applicable' ? 'na' : 'verified', verifiedOn: TODAY, source: a.source || `Decision ${code(s, t)}` } : j)) };
      return ok(n, `${code(s, t)} decision: ${a.option}`);
    }
    case 'ACTION_STATUS': {
      const x = s.actions.find((q) => q.id === a.id);
      if (!isPM(s) && !holdsRole(s, x.owner)) return no(s, `Only the action owner or the PM can change ${x.id}.`);
      return ok({ ...s, actions: s.actions.map((q) => (q.id === a.id ? { ...q, status: a.status } : q)) }, `Action ${a.id} ${a.status}`);
    }
    case 'IR_STATUS': {
      if (!isPM(s) && !holdsRole(s, s.infoReq.find((r) => r.id === a.id).to)) return no(s, 'Only the assignee or the PM can update this request.');
      return ok({ ...s, infoReq: s.infoReq.map((r) => (r.id === a.id ? { ...r, status: a.status } : r)) }, `${a.id} marked ${a.status}`);
    }
    case 'IR_ASSIGN': {
      if (!isPM(s)) return no(s, 'Only the PM assigns information requests.');
      return ok({ ...s, infoReq: s.infoReq.map((r) => (r.id === a.id ? { ...r, to: a.to } : r)) }, `${a.id} assigned to ${whoLabel(s, a.to)}`);
    }
    case 'IR_ADD': {
      if (!isPM(s)) return no(s, 'Only the PM adds information requests.');
      const id = `IR-${String(s.infoReq.length + 1).padStart(2, '0')}`;
      return ok({ ...s, infoReq: [...s.infoReq, { id, text: a.text, to: a.to, status: 'open', due: addDays(TODAY, 7) }] }, `${id} added to the missing-information register`);
    }

    // Gates
    case 'COND_UPLOAD': {
      if (!isPM(s)) return no(s, 'In the MVP the PM records signed client documents.');
      const g = s.gates.find((x) => x.uid === a.g); const c = g.conds.find((x) => x.uid === a.c);
      return ok({ ...s, gates: s.gates.map((x) => (x.uid !== a.g ? x : { ...x, conds: x.conds.map((q) => (q.uid === a.c ? { ...q, upload: { file: c.ev.label, date: TODAY } } : q)) })) }, `${c.text}: signed document recorded`);
    }
    case 'COND': {
      const g = s.gates.find((x) => x.uid === a.g); const c = g.conds.find((x) => x.uid === a.c);
      if (phase(s, g.phase).state !== 'active') return no(s, 'This gate belongs to a phase that is not active.');
      if (!holdsRole(s, c.owner) && !isPM(s)) return no(s, `Only the PM or ${whoLabel(s, c.owner)} can decide this condition.`);
      if (a.d === 'approved' && !evidence(s, c).ready) return no(s, `Cannot approve: ${evidence(s, c).missing}.`);
      if (['na', 'rejected', 'resubmission'].includes(a.d) && !(a.comment || '').trim()) return no(s, 'A written reason is required.');
      const patch = { status: a.d, comment: a.comment || '', history: [...c.history, { at: stamp(), who: viewerLabel(s), d: a.d, comment: a.comment || '' }] };
      if (a.d === 'resubmission' && c.ev.type === 'upload') patch.upload = null;
      return ok({ ...s, gates: s.gates.map((x) => (x.uid !== a.g ? x : { ...x, conds: x.conds.map((q) => (q.uid === a.c ? { ...q, ...patch } : q)) })) }, `${gateName(s, g)} · ${c.text}: ${a.d}`);
    }
    case 'COAPPROVAL': {
      if (!isPM(s)) return no(s, 'Only the PM or an administrator changes the release policy.');
      return ok({ ...s, gateSettings: { ...s.gateSettings, [a.g]: { co: a.on } }, pendingRelease: { ...s.pendingRelease, [a.g]: null } }, `Executive co-approval ${a.on ? 'required' : 'not required'}`);
    }
    case 'RELEASE': case 'CO_APPROVE': {
      const g = s.gates.find((x) => x.uid === a.g);
      if (a.type === 'RELEASE' && !isPM(s)) return no(s, 'Only the Project Manager releases a gate.');
      if (a.type === 'CO_APPROVE' && !isExec(s)) return no(s, 'Only Executive Management co-approves.');
      const r = gateReadiness(s, a.g); if (!r.ready) return no(s, `Not ready: ${r.missing[0]}`);
      if (a.type === 'RELEASE' && s.gateSettings[a.g]?.co) return ok({ ...s, pendingRelease: { ...s.pendingRelease, [a.g]: { by: viewerLabel(s) } } }, `${gateName(s, g)} authorised by PM, waiting for executive co-approval`);
      const ps = livePhases(s); const idx = ps.findIndex((p) => p.uid === g.phase); const nxt = ps[idx + 1];
      const n = { ...s,
        phases: s.phases.map((p) => (p.uid === g.phase ? { ...p, state: 'released' } : nxt && p.uid === nxt.uid ? { ...p, state: p.unscoped ? 'locked' : 'active' } : p)),
        gates: s.gates.map((x) => (x.uid !== a.g ? x : { ...x, conds: x.conds.map((q) => (q.ev.type === 'release' ? { ...q, status: 'approved' } : q)) })),
        releases: { ...s.releases, [a.g]: { by: s.pendingRelease[a.g]?.by || viewerLabel(s), co: a.type === 'CO_APPROVE' ? viewerLabel(s) : null, at: stamp(), date: TODAY } },
        pendingRelease: { ...s.pendingRelease, [a.g]: null } };
      return ok(n, `${gateName(s, g)} released. Phase ${pad(idx + 2)} unlocked`);
    }
    case 'DEMO_PHASE': {
      if (!isPM(s)) return no(s, 'Switch to Project Manager to use this shortcut.');
      const p = phase(s, a.p); if (p.state !== 'active') return no(s, 'That phase is not active.');
      const tasks = { ...s.tasks };
      allRecordsOfPhase(s, a.p).forEach((t) => { tasks[t.uid] = { ...t, pct: 100, as: t.as || t.ps, af: t.af || TODAY, minutes: t.type === 'meeting' ? true : t.minutes, outcome: t.type === 'review' ? 'approved' : t.outcome, choice: t.type === 'decision' ? (t.choice || t.options?.[0]) : t.choice, evidence: t.type === 'signoff' ? (t.evidence || { file: t.doc, signer: 'Client (demo)', date: TODAY, method: 'E-signature platform' }) : t.evidence }; });
      return ok({ ...s, tasks }, `Demo shortcut: every Phase ${pad(phaseNo(s, a.p))} task completed. Gate approvals stay manual`);
    }

    // Planning & forecast inputs
    case 'REMAINING': {
      if (!isPM(s)) return no(s, 'Only the PM adjusts remaining-effort estimates.');
      if (!(a.reason || '').trim()) return no(s, 'Record a reason for the change.');
      const t = s.tasks[a.uid];
      return ok(setTask(s, a.uid, { remaining: a.hours, remHistory: [...t.remHistory, { date: TODAY, at: stamp(), from: remainingOf(s, t), to: a.hours, reason: a.reason, by: viewerLabel(s) }] }), `${code(s, t)} remaining effort set to ${a.hours} h`);
    }
    case 'ALLOC': {
      if (!isPM(s)) return no(s, 'Only the PM adjusts resource allocation.');
      const nm = a.person.startsWith('role:') ? `${roleLabel(a.person.slice(5))} (TBD)` : person(s, a.person).name;
      if (!(a.reason || '').trim()) return no(s, 'Record a reason for the change.');
      const t = s.tasks[a.uid];
      return ok(setTask(s, a.uid, { alloc: { ...t.alloc, [a.person]: a.hpw }, remHistory: [...t.remHistory, { date: TODAY, at: stamp(), alloc: `${nm} → ${a.hpw} h/wk`, reason: a.reason, by: viewerLabel(s) }] }), `${code(s, t)} allocation: ${nm} ${a.hpw} h/wk`);
    }
    case 'SHIFT': {
      const t = s.tasks[a.uid]; if (!isPM(s) && !isAdmin(s)) return no(s, 'Only the PM or an administrator moves planned dates.');
      return ok(setTask(s, a.uid, { ps: addDays(t.ps, a.days), pf: addDays(t.pf, a.days) }), `${code(s, t)} current plan moved ${a.days > 0 ? '+' : ''}${a.days} d (baseline unchanged)`);
    }
    case 'ASSIGN': {
      if (!isPM(s) && !isAdmin(s)) return no(s, 'Only the PM or an administrator assigns responsibilities.');
      const t = s.tasks[a.uid];
      return ok(setTask(s, a.uid, a.patch), `${code(s, t)} ${a.patch.owner ? `owner → ${whoLabel(s, a.patch.owner)}` : `contributors → ${(a.patch.contrib || []).map((c) => whoLabel(s, c)).join(', ') || 'none'}`}`);
    }
    case 'BLOCKER': {
      if (!isPM(s)) return no(s, 'Only the PM clears or raises blockers.');
      const t = s.tasks[a.uid]; return ok(setTask(s, a.uid, { blocker: a.text || null }), `${code(s, t)} blocker ${a.text ? 'raised' : 'cleared'}`);
    }
    case 'HOLD': {
      if (!isPM(s)) return no(s, 'Only the PM places work on hold.');
      const t = s.tasks[a.uid]; return ok(setTask(s, a.uid, { hold: a.on }), `${code(s, t)} ${a.on ? 'placed on hold' : 'released from hold'}`);
    }

    // Timesheets
    case 'TIME_SAVE': {
      const me = viewerPerson(s);
      if (!me) return no(s, 'Choose a team member in "Viewing as" to log time.');
      const t = s.tasks[a.e.task]; if (!t) return no(s, 'Pick a task.');
      if (!(a.e.hours > 0 && a.e.hours <= 16)) return no(s, 'Hours must be between 0.25 and 16 per entry.');
      if (a.e.uid) {
        const old = s.time.find((x) => x.uid === a.e.uid);
        if (old.person !== me) return no(s, 'You can only edit your own entries.');
        if (old.status === 'approved') return no(s, 'Approved entries are locked. Ask the PM for a correction.');
        return ok({ ...s, time: s.time.map((x) => (x.uid === a.e.uid ? { ...x, ...a.e, status: a.submit ? 'submitted' : x.status === 'returned' ? 'draft' : x.status, snap: snapOf(s, a.e.task) } : x)) }, `Time entry updated${a.submit ? ' and submitted' : ''}`);
      }
      const uid = `TE-${s.time.length + 1}-${s.seq}`;
      return ok({ ...s, time: [...s.time, { uid, person: me, task: a.e.task, date: a.e.date, hours: a.e.hours, desc: a.e.desc || '', status: a.submit ? 'submitted' : 'draft', note: '', approvedBy: null, snap: snapOf(s, a.e.task) }] },
        `${a.e.hours} h on ${code(s, t)} ${a.submit ? 'submitted' : 'saved as draft'} for ${a.e.date}`);
    }
    case 'TIME_SUBMIT_ALL': {
      const me = viewerPerson(s); const n = s.time.filter((x) => x.person === me && x.status === 'draft').length;
      if (!n) return no(s, 'No draft entries to submit.');
      return ok({ ...s, time: s.time.map((x) => (x.person === me && x.status === 'draft' ? { ...x, status: 'submitted', snap: snapOf(s, x.task) } : x)) }, `${n} entr${n > 1 ? 'ies' : 'y'} submitted for approval`);
    }
    case 'TIME_DELETE': {
      const x = s.time.find((q) => q.uid === a.uid);
      if (x.person !== viewerPerson(s) || x.status === 'approved') return no(s, 'Only your own unapproved entries can be deleted.');
      return ok({ ...s, time: s.time.filter((q) => q.uid !== a.uid) }, 'Draft entry deleted');
    }
    case 'TIME_REVIEW': {
      if (!isPM(s)) return no(s, 'Only the Project Manager approves timesheets.');
      if (a.d === 'returned' && !(a.note || '').trim()) return no(s, 'Add a note explaining the correction needed.');
      const ids = a.uids;
      return ok({ ...s, time: s.time.map((x) => (ids.includes(x.uid) && x.status === 'submitted' ? { ...x, status: a.d, note: a.note || '', approvedBy: a.d === 'approved' ? viewerLabel(s) : null, snap: a.d === 'approved' ? snapOf(s, x.task) : x.snap } : x)) },
        `${ids.length} time entr${ids.length > 1 ? 'ies' : 'y'} ${a.d === 'approved' ? 'approved' : 'returned for correction'}`);
    }

    // Team
    case 'PERSON_ADD': {
      if (!isAdmin(s)) return no(s, 'Only an administrator edits the team directory.');
      const id = a.name.toLowerCase().replace(/[^a-z0-9]+/g, '') + s.seq;
      return ok({ ...s, people: [...s.people, { id, name: a.name, teams: a.teams, note: a.note || '', cap: 32, active: true, kind: 'person' }] }, `${a.name} added to the directory`);
    }
    case 'PERSON_UPDATE': {
      if (!isAdmin(s)) return no(s, 'Only an administrator edits the team directory.');
      const p = person(s, a.id);
      return ok({ ...s, people: s.people.map((x) => (x.id === a.id ? { ...x, ...a.patch } : x)) }, `${p.name} updated${a.patch.active === false ? ' (deactivated; history kept)' : ''}`);
    }
    case 'TEAM_ADD': { if (!isAdmin(s)) return no(s, 'Only an administrator manages teams.'); return ok({ ...s, teams: [...s.teams, { id: `team${s.seq}`, name: a.name, disc: a.disc || 'pm', archived: false }] }, `Team "${a.name}" created`); }
    case 'TEAM_UPDATE': { if (!isAdmin(s)) return no(s, 'Only an administrator manages teams.'); return ok({ ...s, teams: s.teams.map((t) => (t.id === a.id ? { ...t, ...a.patch } : t)) }, 'Team updated'); }
    case 'ROLE_ASSIGN': {
      if (!isAdmin(s) && !isPM(s)) return no(s, 'Only an administrator or the PM assigns roles.');
      return ok({ ...s, roles: { ...s.roles, [a.role]: a.person || null } }, `${roleLabel(a.role)} → ${a.person ? person(s, a.person).name : 'TBD'}`);
    }

    // Drawings
    case 'SHEET_UPDATE': {
      if (!isPM(s) && !isAdmin(s)) return no(s, 'Only the PM or an administrator changes drawing responsibilities.');
      return ok({ ...s, sheets: s.sheets.map((x) => (x.no === a.no ? { ...x, ...a.patch } : x)) }, `${a.no} updated`);
    }
    case 'SHEET_ADD': {
      if (!isAdmin(s)) return no(s, 'Only an administrator adds sheets to the register.');
      if (s.sheets.some((x) => x.no === a.sheet.no)) return no(s, `${a.sheet.no} already exists. Issued numbers are never reused.`);
      let n = { ...s, sheets: [...s.sheets, { contrib: [], reviewers: [], pct: 0, approval: 'not_started', revs: [], ps: null, pf: null, as: null, af: null, ...a.sheet }] };
      if (a.sheet.task) n = setTask(n, a.sheet.task, { sheets: [...n.tasks[a.sheet.task].sheets, a.sheet.no] });
      return ok(n, `Sheet ${a.sheet.no} added to the register`);
    }
    case 'SHEET_DISC_ADD': { if (!isAdmin(s)) return no(s, 'Only an administrator adds disciplines.'); return ok({ ...s, sheetDiscs: [...s.sheetDiscs, [a.letter, a.name]] }, `Discipline ${a.letter} · ${a.name} added`); }
    case 'REQ_STATUS': return ok({ ...s, reqs: s.reqs.map((r) => (r.code === a.code ? { ...r, status: a.status } : r)) }, `BCC-${a.code} marked ${a.status === 'met' ? 'met' : 'not met'}`);
    case 'REQ_APPLY': {
      const reviewer = D.CONDITIONAL_REVIEWER(a.code); const me = viewerPerson(s);
      if (!me || resolve(s, reviewer) !== me) return no(s, `Only the accountable reviewer (${whoLabel(s, reviewer)}) decides this. Assign the role in Team, then view as that person.`);
      if (!(a.reason || '').trim()) return no(s, 'A reason is required.');
      return ok({ ...s, reqs: s.reqs.map((r) => (r.code === a.code ? { ...r, applicability: a.app, reason: a.reason } : r)) }, `BCC-${a.code}: ${a.app === 'na' ? 'not applicable' : 'applies'}`);
    }
    case 'JUR_RESOLVE': {
      const j = s.jur.find((x) => x.id === a.id);
      const me = viewerPerson(s);
      if (!me || resolve(s, j.reviewer) !== me) return no(s, `Only the accountable reviewer (${whoLabel(s, j.reviewer)}) can resolve this. Assign the role in Team, then view as that person.`);
      if (!(a.source || '').trim()) return no(s, 'An official source or written authority confirmation is required.');
      return ok({ ...s, jur: s.jur.map((x) => (x.id === a.id ? { ...x, status: a.outcome, source: a.source, verifiedOn: TODAY } : x)) }, `${j.title}: verified`);
    }

    // Admin: structure editing (scope = 'proj' | 'tpl')
    case 'SCOPE': return { ...s, scope: a.scope };
    case 'TPL_PUBLISH': { if (!isAdmin(s)) return no(s, 'Only an administrator publishes templates.'); return ok({ ...s, tpl: { ...s.tpl, version: 'v1.1', published: true } }, 'Template Standard Residential Modular v1.1 published. Existing projects keep v1.0 until their PM accepts an upgrade'); }
    case 'ADMIN': return adminOp(s, a);
    case 'CR_RAISE': return ok({ ...s, changeRequests: [...s.changeRequests, { id: `CR-${String(s.changeRequests.length + 1).padStart(3, '0')}`, text: a.text, status: 'pending', at: TODAY }] }, `Change request raised: ${a.text}`);
    default: return s;
  }
}

function adminOp(s, a) {
  if (!isAdmin(s)) return no(s, 'Only an administrator edits the workflow structure.');
  const scope = a.scope || s.scope; const st = stOf(s, scope); const inProj = scope === 'proj';
  const put = (patch, text) => { let n = setScope(s, scope, patch); if (inProj) n = refreshSnaps(n); return ok(n, `${inProj ? '' : '[Template] '}${text}`); };
  const tasks = { ...st.tasks };
  const frozen = inProj && s.phases.find((p) => p.uid === 'PH2')?.state === 'released';
  const guardPhase = (puid) => {
    if (!inProj) return null;
    if (phase(s, puid)?.state === 'released') return 'That phase is released. Its history is protected.';
    if (frozen && ['PH1', 'PH2'].includes(puid)) return 'Design Freeze is approved. Changes to Phase 01–02 need a change request.';
    return null;
  };
  switch (a.op) {
    case 'task.update': {
      const t = st.tasks[a.uid];
      const g = guardPhase(phaseOfTask(st, t)); if (g) return no(s, g);
      if (inProj && done(s, t) && Object.keys(a.patch).some((k) => ['title', 'outputs', 'est', 'type'].includes(k))) return no(s, `${code(st, t)} is complete. Its approved content is protected.`);
      const patch = { ...a.patch };
      if (patch.deps) patch.deps = patch.deps.filter((d) => d !== t.uid);
      tasks[a.uid] = { ...t, ...patch };
      return put({ tasks }, `${code(st, t)} updated (${Object.keys(a.patch).join(', ')})`);
    }
    case 'task.add': {
      const wp = st.wps.find((w) => w.uid === a.wp); const g = guardPhase(wp.phase); if (g) return no(s, g);
      const parent = a.parent ? st.tasks[a.parent] : null;
      const uid = `T-N${s.seq}`;
      const siblings = parent ? children(st, parent.uid, true) : topTasks(st, a.wp, true);
      const base = parent || {};
      tasks[uid] = mkTask(uid, a.wp, parent?.uid || null, siblings.length, { local: parent ? null : nextLocal(st, wp.phase), type: a.ttype || 'task', title: a.title || (parent ? 'New subtask' : 'New task'), owner: base.owner || 'role:pm', disc: base.disc || 'arch', w: 0, est: 0, ps: base.ps || TODAY, pf: base.pf || addDays(TODAY, 7) }, true);
      tasks[uid].pct = 0; tasks[uid].as = null; if (inProj) { tasks[uid].bs = null; tasks[uid].bf = null; }
      return { ...put({ tasks }, `${parent ? 'Subtask' : 'Task'} added: ${tasks[uid].title}`), _selected: uid };
    }
    case 'task.duplicate': {
      const t = st.tasks[a.uid]; const g = guardPhase(phaseOfTask(st, t)); if (g) return no(s, g);
      const uid = `T-N${s.seq}`;
      tasks[uid] = { ...clone(t), uid, local: t.parent ? null : nextLocal(st, phaseOfTask(st, t)), order: t.order + 0.5, title: `${t.title} (copy)`, bs: inProj ? null : t.bs, bf: inProj ? null : t.bf, pct: 0, as: null, af: null, remaining: null, remHistory: [], minutes: false, evidence: null, outcome: null, choice: null, codeHistory: [] };
      return put({ tasks: renumberOrder(tasks, t.parent, t.wp) }, `Duplicated ${code(st, t)} (no progress or hours copied)`);
    }
    case 'task.move': {
      const t = st.tasks[a.uid]; const imp = impact(s, st, { kind: 'moveTask', uid: a.uid, wp: a.wp });
      if (imp.blocking.length) return no(s, imp.blocking[0]);
      const toWp = st.wps.find((w) => w.uid === a.wp); const fromPh = phaseOfTask(st, t);
      const oldCode = code(st, t);
      const moved = { ...t, wp: a.wp, parent: null, order: a.before ? st.tasks[a.before].order - 0.5 : 9999 };
      if (toWp.phase !== fromPh || t.parent) { moved.local = nextLocal(st, toWp.phase); }
      moved.codeHistory = [...(t.codeHistory || []), { code: oldCode, until: TODAY }];
      tasks[a.uid] = moved;
      Object.values(tasks).filter((x) => x.parent === a.uid).forEach((k) => { tasks[k.uid] = { ...k, wp: a.wp }; });
      const n2 = renumberOrder(renumberOrder(tasks, null, a.wp), null, t.wp);
      return put({ tasks: n2 }, `${oldCode} moved to "${toWp.title}" (now ${code({ ...st, tasks: n2 }, n2[a.uid])})`);
    }
    case 'task.reorder': {
      const t = st.tasks[a.uid]; const g = guardPhase(phaseOfTask(st, t)); if (g) return no(s, g);
      const sib = t.parent ? children(st, t.parent) : topTasks(st, t.wp);
      const i = sib.findIndex((x) => x.uid === a.uid); const j = i + a.dir; if (j < 0 || j >= sib.length) return s;
      tasks[sib[i].uid] = { ...sib[i], order: sib[j].order }; tasks[sib[j].uid] = { ...sib[j], order: sib[i].order };
      return put({ tasks }, `${code(st, t)} moved ${a.dir < 0 ? 'up' : 'down'}`);
    }
    case 'task.archive': {
      const t = st.tasks[a.uid];
      if (a.restore) { tasks[a.uid] = { ...t, archived: false }; return put({ tasks }, `${t.title} restored`); }
      const imp = impact(s, st, { kind: 'archiveTask', uid: a.uid }); if (imp.blocking.length) return no(s, imp.blocking[0]);
      tasks[a.uid] = { ...t, archived: true };
      Object.values(tasks).forEach((x) => { if (x.deps.includes(a.uid)) tasks[x.uid] = { ...x, deps: x.deps.filter((d) => d !== a.uid) }; });
      return put({ tasks }, `${code(st, t)} archived (restorable; hours and history kept)`);
    }
    case 'wp.add': {
      const g = guardPhase(a.phase); if (g) return no(s, g);
      const uid = `W-N${s.seq}`;
      return { ...put({ wps: [...st.wps, { uid, phase: a.phase, order: wpsOf(st, a.phase, true).length, title: a.title || 'New work package', archived: false }] }, 'Work package added'), _selected: uid };
    }
    case 'wp.update': { const w = st.wps.find((x) => x.uid === a.uid); const g = guardPhase(w.phase); if (g && a.patch.phase) return no(s, g);
      return put({ wps: st.wps.map((x) => (x.uid === a.uid ? { ...x, ...a.patch } : x)) }, `Work package "${w.title}" updated`); }
    case 'wp.reorder': {
      const w = st.wps.find((x) => x.uid === a.uid); const sib = wpsOf(st, w.phase); const i = sib.findIndex((x) => x.uid === a.uid); const j = i + a.dir;
      if (j < 0 || j >= sib.length) return s;
      const oi = sib[i].order, oj = sib[j].order;
      return put({ wps: st.wps.map((x) => (x.uid === sib[i].uid ? { ...x, order: oj } : x.uid === sib[j].uid ? { ...x, order: oi } : x)) }, `Work package moved ${a.dir < 0 ? 'up' : 'down'}`);
    }
    case 'wp.archive': {
      const w = st.wps.find((x) => x.uid === a.uid);
      if (!a.restore && topTasks(st, a.uid).length) return no(s, 'Move or archive its tasks first.');
      return put({ wps: st.wps.map((x) => (x.uid === a.uid ? { ...x, archived: !a.restore } : x)) }, `Work package "${w.title}" ${a.restore ? 'restored' : 'archived'}`);
    }
    case 'phase.add': {
      const imp = impact(s, st, { kind: 'addPhase', after: a.after }); if (imp.blocking.length) return no(s, imp.blocking[0]);
      const ps = livePhases(st); const idx = ps.findIndex((p) => p.uid === a.after);
      const uid = `PH-N${s.seq}`;
      const phases = st.phases.map((p) => (p.order > ps[idx].order ? { ...p, order: p.order + 1 } : p));
      phases.push({ uid, order: ps[idx].order + 1, title: a.title || 'New phase', state: 'locked', unscoped: false, legacy: null, archived: false, gateTitle: 'New gate' });
      const gates = [...st.gates, { uid: `GT-N${s.seq}`, phase: uid, conds: [{ uid: `GC-N${s.seq}`, text: 'Project Manager releases the next phase', owner: 'role:pm', status: 'pending', history: [], upload: null, legal: false, ev: { type: 'release' } }] }];
      const wps = [...st.wps, { uid: `W-N${s.seq}`, phase: uid, order: 0, title: 'New work package', archived: false }];
      return { ...put({ phases, gates, wps }, `Phase inserted as ${pad(idx + 2)}; later phases renumbered`), _selected: uid };
    }
    case 'phase.update': return put({ phases: st.phases.map((p) => (p.uid === a.uid ? { ...p, ...a.patch } : p)) }, 'Phase updated');
    case 'phase.archive': {
      const imp = impact(s, st, { kind: 'archivePhase', uid: a.uid }); if (!a.restore && imp.blocking.length) return no(s, imp.blocking[0]);
      return put({ phases: st.phases.map((p) => (p.uid === a.uid ? { ...p, archived: !a.restore } : p)) }, `Phase ${a.restore ? 'restored' : 'archived'}; numbering updated`);
    }
    case 'cond.add': {
      const g = st.gates.find((x) => x.uid === a.g);
      if (inProj && s.releases[a.g]) return no(s, 'This gate is released.');
      const conds = [...g.conds]; const rel = conds.findIndex((c) => c.ev.type === 'release');
      conds.splice(rel < 0 ? conds.length : rel, 0, { uid: `GC-N${s.seq}`, text: a.text, owner: a.owner, status: 'pending', history: [], upload: null, legal: false, ev: a.items?.length ? { type: 'items', items: a.items } : { type: 'upload', label: 'Evidence.pdf', requires: [] } });
      return put({ gates: st.gates.map((x) => (x.uid === a.g ? { ...x, conds } : x)) }, `${gateName(st, g)}: condition added`);
    }
    case 'cond.remove': {
      const g = st.gates.find((x) => x.uid === a.g); const c = g.conds.find((q) => q.uid === a.c);
      if (c.ev.type === 'release') return no(s, 'The release condition cannot be removed.');
      if (c.legal) return no(s, 'Legally required permit conditions cannot be removed.');
      if (inProj && c.status === 'approved') return no(s, 'Approved conditions are part of the record and cannot be removed.');
      return put({ gates: st.gates.map((x) => (x.uid === a.g ? { ...x, conds: x.conds.filter((q) => q.uid !== a.c) } : x)) }, `${gateName(st, g)}: condition removed`);
    }
    default: return s;
  }
}
function renumberOrder(tasks, parent, wp) {
  const sib = Object.values(tasks).filter((t) => (parent ? t.parent === parent : !t.parent && t.wp === wp)).sort((a, b) => a.order - b.order);
  const n = { ...tasks }; sib.forEach((t, i) => { n[t.uid] = { ...t, order: i }; }); return n;
}

// ── Reports ───────────────────────────────────────────────────────────────
export function filterEntries(s, f = {}) {
  return s.time.filter((e) => (!f.from || e.date >= f.from) && (!f.to || e.date <= f.to) && (!f.phase || e.snap?.phase === f.phase) && (!f.disc || e.snap?.disc === f.disc) && (!f.person || e.person === f.person));
}
export function group(entries, keyFn) {
  const m = {};
  entries.forEach((e) => { const k = keyFn(e); if (!m[k]) m[k] = { key: k, approved: 0, pending: 0, draft: 0 }; if (e.status === 'approved') m[k].approved += e.hours; else if (e.status === 'submitted') m[k].pending += e.hours; else m[k].draft += e.hours; });
  return Object.values(m).sort((a, b) => b.approved + b.pending - (a.approved + a.pending));
}
export function weekOf(d) { const x = toD(d); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); return iso(x); }
