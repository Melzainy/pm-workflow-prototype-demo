// Resource model (Prototype v3). Derived on demand from the one company store: every project's
// tasks, assignments, allocations, remaining effort, plans, capacity, exceptions and timesheets.
// Nothing here is stored; change any input and the model is recomputed.
import * as E from './engine.js';
import { projView, projectsOf } from './portfolio.js';

const cache = new WeakMap();
export const HORIZON = 52; // weeks computed ahead of the current week
export const DISCIPLINES = [['arch', 'Architecture'], ['int', 'Interior'], ['bim', 'Technical / BIM'], ['str', 'Structural'], ['mep', 'MEP'], ['civ', 'Civil'], ['mfg', 'Manufacturing'], ['pm', 'Project Management']];
export const discName = (d) => (DISCIPLINES.find((x) => x[0] === d) || [d, d === 'consult' ? 'External consultants' : d])[1];

export function isoWeek(d) { const x = E.toD(d); x.setDate(x.getDate() + 3 - ((x.getDay() + 6) % 7)); const y = new Date(x.getFullYear(), 0, 4); return 1 + Math.round(((x - y) / 864e5 - 3 + ((y.getDay() + 6) % 7)) / 7); }
export const wkLabel = (wk) => `W${isoWeek(wk)}`;
export const capPeriod = (p, wk) => { const c = (p.caps || []).filter((x) => x.from <= E.addDays(wk, 4) && (!x.to || x.to >= wk)).pop(); return c ? c.hpw : p.cap; };

// Weekly availability = standard capacity × working days ÷ 5 − unavailable days.
export function capOf(S, p, wk) {
  const hpw = p.active ? capPeriod(p, wk) : 0; let hol = 0; let off = 0; const kinds = new Set();
  for (let i = 0; i < 5; i++) {
    const d = E.addDays(wk, i);
    if (!E.isWork(d, S.holidays)) { hol++; continue; }
    const x = S.capEx.find((q) => q.person === p.id && q.from <= d && q.to >= d);
    if (x) { off++; kinds.add(x.kind); }
  }
  return { hpw, avail: Math.round((hpw * (5 - hol - off) / 5) * 10) / 10, hol, off, kinds: [...kinds] };
}
export const companyPeople = (S, all = false) => S.people.filter((p) => !p.external && (all || p.active));

export function status(S, util, avail, demand) {
  if (avail <= 0) return demand > 0 ? { key: 'over', label: 'Overallocated', mark: '▲' } : { key: 'none', label: 'Unavailable', mark: '–' };
  if (util > S.rp.over) return { key: 'over', label: 'Overallocated', mark: '▲' };
  if (util >= S.rp.near) return { key: 'near', label: 'Near capacity', mark: '◆' };
  if (util >= S.rp.available) return { key: 'bal', label: 'Balanced', mark: '●' };
  return { key: 'avail', label: 'Available', mark: '○' };
}

export function resourceModel(S) {
  if (cache.has(S)) return cache.get(S);
  const w0 = E.weekOf(E.TODAY);
  const weeks = Array.from({ length: HORIZON }, (_, i) => E.addDays(w0, i * 7));
  const idx = Object.fromEntries(weeks.map((w, i) => [w, i]));
  const people = companyPeople(S, true);
  const cap = {}; const demand = {}; const byProj = {}; const cells = {};
  people.forEach((p) => { cap[p.id] = weeks.map((w) => capOf(S, p, w)); demand[p.id] = weeks.map(() => 0); byProj[p.id] = weeks.map(() => ({})); cells[p.id] = weeks.map(() => []); });
  const unassigned = {}; // disc -> weekly hours with no person
  const assignments = []; const needed = []; const notDefined = [];
  projectsOf(S).forEach((P) => {
    const V = projView(S, P.id);
    Object.values(V.tasks).forEach((t) => {
      if (t.archived || E.done(V, t)) return;
      const ph = E.phase(V, E.phaseOfTask(V, t)); if (!ph || ph.state === 'released') return;
      const sh = E.shares(V, t); if (sh.rem <= 0) return;
      const win = E.taskWindow(V, t); const n = win.days.length;
      const base = { proj: P.id, projName: P.name, uid: t.uid, code: E.code(V, t), title: t.title, phase: ph.uid, phaseNo: E.phaseNo(V, ph.uid), phaseTitle: ph.title, wp: E.wpOf(V, t)?.title,
        from: win.from, to: win.to, overdue: win.overdue, hold: t.hold, blocker: t.blocker, priority: t.priority, rem: sh.rem, defined: sh.defined, locked: ph.state === 'locked', disc: t.disc };
      if (!sh.units.length && sh.external) return; // external reviewer: not company capacity
      if (!sh.units.length) { needed.push({ ...base, reason: 'No one assigned', need: t.disc, hours: sh.rem }); return; }
      if (!sh.defined && sh.units.length > 1) notDefined.push(base);
      sh.units.forEach((u) => {
        const wk = {}; const per = u.h / n;
        win.days.forEach((d) => { const w = E.weekOf(d); if (idx[w] != null) wk[w] = (wk[w] || 0) + per; });
        const row = { ...base, key: u.key, pid: u.pid, name: u.name, role: u.role, udisc: u.disc, h: u.h, explicit: !!u.explicit, pct: u.pct ?? null, assumed: !!u.assumed, weeks: wk };
        assignments.push(row);
        if (u.pid && cap[u.pid]) {
          Object.entries(wk).forEach(([w, h]) => { const i = idx[w]; demand[u.pid][i] += h; byProj[u.pid][i][P.id] = (byProj[u.pid][i][P.id] || 0) + h; cells[u.pid][i].push({ row, h }); });
        } else {
          const why = u.role === 'pm' ? 'Missing Project Manager' : u.pid ? 'Assignee inactive' : `No ${E.roleLabel(u.role)} assigned`;
          needed.push({ ...base, reason: why, need: u.disc, hours: u.h, role: u.role });
          if (!unassigned[u.disc]) unassigned[u.disc] = weeks.map(() => 0);
          Object.entries(wk).forEach(([w, h]) => { unassigned[u.disc][idx[w]] += h; });
        }
      });
    });
  });
  // Actual effort from timesheets (all weeks, not only the horizon).
  const actual = {};
  S.time.forEach((e) => {
    const w = E.weekOf(e.date); const a = (actual[e.person] ||= {});
    const c = (a[w] ||= { approved: 0, pending: 0, draft: 0, proj: {} });
    const k = e.status === 'approved' ? 'approved' : e.status === 'submitted' ? 'pending' : 'draft';
    c[k] += e.hours; (c.proj[e.project] ||= { approved: 0, pending: 0, draft: 0 })[k] += e.hours;
  });
  const load = (pid, from, to) => {
    if (!cap[pid]) return { cap: 0, demand: 0, capPerWk: 0, util: null };
    let i0 = idx[E.weekOf(from)] ?? 0; let i1 = idx[E.weekOf(to)] ?? weeks.length - 1; if (i1 < i0) i1 = i0;
    let C = 0; let Dm = 0; for (let i = i0; i <= i1; i++) { C += cap[pid][i].avail; Dm += demand[pid][i]; }
    return { cap: C, demand: Dm, capPerWk: C / (i1 - i0 + 1), util: C > 0 ? Math.round((Dm / C) * 100) : null };
  };
  const m = { weeks, idx, people, cap, demand, byProj, cells, unassigned, assignments, needed, notDefined, actual, load };
  cache.set(S, m);
  return m;
}

// ── Summaries over a week range [i0, i1] ────────────────────────────────────
export function personSummary(S, M, pid, i0, i1) {
  let C = 0; let Dm = 0; let over = 0; const util = [];
  for (let i = i0; i <= i1; i++) { const c = M.cap[pid][i].avail; const d = M.demand[pid][i]; C += c; Dm += d; const u = c > 0 ? Math.round((d / c) * 100) : d > 0 ? 999 : 0; util.push(u); if (u > S.rp.over) over++; }
  const u = C > 0 ? Math.round((Dm / C) * 100) : Dm > 0 ? 999 : 0;
  return { cap: C, demand: Dm, avail: C - Dm, util: u, overWeeks: over, weekly: util, status: status(S, u, C, Dm) };
}
export function forecastFor(S, M, pid) {
  const avg = (n) => { const s = personSummary(S, M, pid, 0, n - 1); return s.util; };
  let first = null;
  for (let i = 0; i < M.weeks.length; i++) { const c = M.cap[pid][i].avail; const d = M.demand[pid][i]; if (c > 0 && c - d >= Math.max(8, c * 0.3)) { first = M.weeks[i]; break; } }
  return { now: personSummary(S, M, pid, 0, 0).util, avg4: avg(4), avg8: avg(8), overWeeks: personSummary(S, M, pid, 0, 7).overWeeks, firstAvailable: first };
}
export function discOf(S, p) { const t = S.teams.find((x) => x.id === p.teams[0]); return t ? t.disc : 'pm'; }
export function secondaryDiscs(S, p) { return p.teams.slice(1).map((id) => S.teams.find((x) => x.id === id)?.disc).filter(Boolean); }
