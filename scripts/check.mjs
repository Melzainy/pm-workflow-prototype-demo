// Headless check of the 12-step demonstration scenario, run through the same reducer
// the UI uses (no browser needed):  npm run check
import * as E from '../src/engine.js';
import * as PF from '../src/portfolio.js';
import * as R from '../src/resource.js';

const OWNER = 'mansour';   // accountable owner for the scenario subtask
const CONTRIB = 'hossam';  // contributor
const name = (id) => E.person(s, id).name;

let S = PF.initialState();
let s = PF.projView(S, 'P1'); // the Demo Residence A project view used by the workflow scenario
const d = (a, pid = 'P1') => { S = PF.reducer(S, { ...a, _pid: a._pid ?? pid }); s = PF.projView(S, 'P1'); if (S.notice?.tone === 'bad') throw new Error(`Rejected: ${a.type} → ${S.notice.text}`); };
const results = []; let suite = 'W';
const step = (n, label, fn) => {
  let pass = false, detail = '';
  try { const r = fn(); pass = r === true || (Array.isArray(r) && r[0]); detail = Array.isArray(r) ? r[1] : ''; } catch (e) { detail = e.message; }
  results.push(pass); console.log(`${pass ? '✓' : '✗'} ${suite}${String(n).padStart(2)}. ${label}${detail ? ` — ${detail}` : ''}`);
};
const byCode = (c) => Object.values(s.tasks).find((t) => !t.archived && E.code(s, t) === c);
let uid, f1, oldWp, ph1Before;

step(1, 'Add a new architectural subtask through Admin', () => {
  d({ type: 'VIEWER', v: 'admin' });
  const parent = byCode('1.7');
  d({ type: 'ADMIN', scope: 'proj', op: 'task.add', wp: parent.wp, parent: parent.uid, title: 'New subtask' });
  uid = s._selected; return [s.tasks[uid]?.parent === parent.uid && s.tasks[uid].disc === 'arch', `${E.code(s, s.tasks[uid])} (stable ID ${uid})`];
});
step(2, 'Assign owner and contributor', () => {
  d({ type: 'ADMIN', scope: 'proj', op: 'task.update', uid, patch: { title: 'Stair & railing layout study', owner: OWNER, contrib: [CONTRIB] } });
  return [s.tasks[uid].owner === OWNER && s.tasks[uid].contrib.includes(CONTRIB), `${name(OWNER)} owner, ${name(CONTRIB)} contributor`];
});
step(3, 'Set planned start, finish and estimated effort', () => {
  d({ type: 'ADMIN', scope: 'proj', op: 'task.update', uid, patch: { ps: '2026-09-28', pf: '2026-10-09', est: 24 } });
  const t = s.tasks[uid]; return [t.ps === '2026-09-28' && t.pf === '2026-10-09' && t.est === 24 && t.bs === null, 'Sep 28 – Oct 9, 24 h, not in baseline'];
});
step(4, 'Appears in Workflow, My Work and Master Timeline (same record)', () => {
  const inWf = E.children(s, s.tasks[uid].parent).some((k) => k.uid === uid);
  const inMine = E.involves(s, s.tasks[uid], OWNER) && E.involves(s, s.tasks[uid], CONTRIB);
  const inTl = !!E.forecastAll(s)[uid];
  return [inWf && inMine && inTl, `workflow ${inWf} · my work ${inMine} · timeline ${inTl}`];
});
step(5, 'Record hours on several work dates', () => {
  ph1Before = E.phaseSchedule(s, 'PH1').approved;
  d({ type: 'VIEWER', v: OWNER });
  for (const [date, hours] of [['2026-09-21', 3], ['2026-09-23', 4], ['2026-09-24', 2.5]]) d({ type: 'TIME_SAVE', e: { task: uid, date, hours, desc: 'Stair layout' }, submit: true });
  d({ type: 'VIEWER', v: CONTRIB });
  d({ type: 'TIME_SAVE', e: { task: uid, date: '2026-09-22', hours: 5, desc: 'Railing study' }, submit: true });
  const es = s.time.filter((e) => e.task === uid); return [es.length === 4 && new Set(es.map((e) => e.date)).size === 4 && es.every((e) => e.status === 'submitted'), '4 entries, 4 dates, submitted'];
});
step(6, 'Approve the hours as PM', () => {
  d({ type: 'VIEWER', v: 'pm' });
  d({ type: 'TIME_REVIEW', uids: s.time.filter((e) => e.task === uid).map((e) => e.uid), d: 'approved' });
  const h = E.hours(s, uid, false); return [h.approved === 14.5 && h.pending === 0, `${h.approved} h approved`];
});
step(7, 'Actual overlay shows the observed working period', () => {
  f1 = E.forecastAll(s)[uid]; return [f1.aStart === '2026-09-21' && f1.lastAct === '2026-09-24', `${f1.aStart} → ${f1.lastAct}`];
});
step(8, 'Update remaining effort; forecast recalculates', () => {
  d({ type: 'REMAINING', uid, hours: 60, reason: 'Scope larger after client stair feedback' });
  const f2 = E.forecastAll(s)[uid];
  return [f2.rem === 60 && f2.finish > f1.finish && s.tasks[uid].remHistory.length === 1, `forecast ${f1.finish} → ${f2.finish}, reason recorded`];
});
step(9, 'Estimated vs actual effort is shown separately', () => {
  const t = s.tasks[uid]; const h = E.hours(s, uid, false); const eac = h.approved + E.remainingOf(s, t);
  return [eac - t.est === 50.5, `est ${t.est} h · approved ${h.approved} h · remaining ${E.remainingOf(s, t)} h · variance +${eac - t.est} h`];
});
step(10, 'Dashboard figures update from the same data', () => {
  const after = E.phaseSchedule(s, 'PH1').approved; return [after - ph1Before === 14.5, `Phase 01 approved ${ph1Before} → ${after} h`];
});
step(11, 'Move to another work package; approved hours keep their attribution', () => {
  d({ type: 'VIEWER', v: 'admin' });
  oldWp = s.tasks[uid].wp;
  const target = s.wps.find((w) => w.phase === 'PH1' && w.uid !== oldWp && !w.archived);
  d({ type: 'ADMIN', scope: 'proj', op: 'task.move', uid, wp: target.uid });
  const kept = s.time.filter((e) => e.task === uid).every((e) => e.snap.wp === oldWp);
  return [s.tasks[uid].wp === target.uid && kept, `now ${E.code(s, s.tasks[uid])} in "${target.title}"; entries still on the original WP`];
});
step(12, 'Progress and gate approval stay independent of hours', () => {
  const g1 = s.gates.find((g) => g.phase === 'PH1');
  return [E.pctOf(s, s.tasks[uid]) === 0 && !E.gateReadiness(s, g1.uid).ready, 'progress 0%, Gate 01 not ready'];
});

const wfPassed = results.filter(Boolean).length; const wfTotal = results.length;
console.log(`Workflow scenario (v2): ${wfPassed}/${wfTotal} passed\n`);

// ── Resource Planning scenario (v3) ─────────────────────────────────────────
suite = 'R';
S = PF.initialState();
const M = () => R.resourceModel(S);
const P = (id) => R.personSummary(S, M(), id, 0, 7);
const archU = () => { const a = R.companyPeople(S).filter((p) => R.discOf(S, p) === 'arch').reduce((x, p) => { const q = P(p.id); return { c: x.c + q.cap, d: x.d + q.demand }; }, { c: 0, d: 0 }); return a.d / a.c; };
let base, archBase, target, task12, mTask, fBefore, capBefore, utilBefore;
step(1, 'Open Resource Planning: model built from every project', () => [M().people.length >= 19 && PF.projectsOf(S).length >= 4, `${PF.projectsOf(S).length} projects, ${R.companyPeople(S).length} people, ${M().assignments.length} assignment rows`]);
step(2, 'Expand Architecture', () => { const a = R.companyPeople(S).filter((p) => R.discOf(S, p) === 'arch').map((p) => p.name); return [a.length === 5, a.join(', ')]; });
step(3, 'Select Mansour', () => { base = P(OWNER); archBase = archU(); return [base.cap > 0, `${base.util}% over 8 weeks (${Math.round(base.demand)}/${Math.round(base.cap)} h) · ${base.status.label}`]; });
step(4, 'Mansour has assignments across at least 3 projects', () => { const ps = [...new Set(M().assignments.filter((a) => a.pid === OWNER).map((a) => a.projName))]; return [ps.length >= 3, ps.join(', ')]; });
step(5, 'Next 8 weeks of planned workload', () => [P(OWNER).weekly.length === 8, P(OWNER).weekly.map((u) => `${u}%`).join(' ')]);
step(6, 'Open one assignment → the originating project task', () => { const a = M().assignments.find((x) => x.pid === OWNER); mTask = a; const V = PF.projView(S, a.proj); return [!!V.tasks[a.uid] && E.involves(V, V.tasks[a.uid], OWNER), `${a.projName} → ${a.code} ${a.title}`]; });
step(7, 'Add a 12 h assignment to Mansour from another project', () => {
  d({ type: 'VIEWER', v: 'pm' });
  const V = PF.projView(S, 'P4'); target = Object.values(V.tasks).find((t) => !t.parent && t.disc === 'arch' && t.ps <= E.addDays(E.TODAY, 7) && t.pf >= E.addDays(E.TODAY, 7) && !E.involves(V, t, OWNER));
  d({ type: 'ASSIGN_ALLOC', uid: target.uid, person: OWNER, h: 12 }, 'P4');
  const t = PF.projView(S, 'P4').tasks[target.uid]; return [t.contrib.includes(OWNER) && t.alloc[OWNER].h === 12, `Urban Residence ${E.code(PF.projView(S, 'P4'), t)} ${t.title}`];
});
step(8, 'Return to Resource Planning: the same task appears there', () => [M().assignments.some((a) => a.pid === OWNER && a.proj === 'P4' && a.uid === target.uid && a.explicit && a.h === 12), 'row read from the project task']);
step(9, 'Mansour becomes overallocated', () => { const q = P(OWNER); return [q.overWeeks > 0 && q.util > base.util, `${base.util}% → ${q.util}% · ${q.overWeeks} overloaded week(s) · ${q.weekly.slice(0, 3).map((u) => u + '%').join(' ')}`]; });
step(10, 'Architecture utilization increases', () => [archU() > archBase, `${Math.round(archBase * 100)}% → ${Math.round(archU() * 100)}%`]);
step(11, 'Reduce that allocation', () => { d({ type: 'ALLOC', uid: target.uid, ref: OWNER, h: 4 }, 'P4'); return [PF.projView(S, 'P4').tasks[target.uid].alloc[OWNER].h === 4, '12 h → 4 h']; });
step(12, 'Resource Planning recalculates immediately', () => { const q = P(OWNER); return [q.util < 999 && Math.round(q.demand) === Math.round(base.demand + 4), `demand ${Math.round(base.demand)} + 4 = ${Math.round(q.demand)} h · ${q.util}%`]; });
step(13, 'Enter timesheet hours on one of Mansour\'s tasks', () => {
  d({ type: 'VIEWER', v: OWNER }); fBefore = M().actual[OWNER]?.[E.weekOf(E.TODAY)]?.approved || 0;
  d({ type: 'TIME_SAVE', e: { task: mTask.uid, date: E.TODAY, hours: 6, desc: 'Resource scenario' }, submit: true }, mTask.proj);
  const e = S.time.find((x) => x.person === OWNER && x.date === E.TODAY && x.desc === 'Resource scenario'); return [!!e && e.status === 'submitted' && e.project === mTask.proj, `6 h on ${mTask.projName} ${mTask.code}`];
});
step(14, 'Approve it as PM', () => { d({ type: 'VIEWER', v: 'pm' }); const e = S.time.find((x) => x.desc === 'Resource scenario'); d({ type: 'TIME_REVIEW', uids: [e.uid], d: 'approved' }, mTask.proj); return [S.time.find((x) => x.uid === e.uid).status === 'approved', 'approved']; });
step(15, 'Actual hours update in Resource Planning', () => { const a = M().actual[OWNER][E.weekOf(E.TODAY)]; return [a.approved === fBefore + 6, `this week approved ${fBefore} → ${a.approved} h`]; });
step(16, 'Add an illustrative vacation week', () => { capBefore = P(OWNER).cap; utilBefore = P(OWNER).util; const V = PF.projView(S, 'P4'); fBefore = E.forecastAll(PF.projView(S, 'P2'))[M().assignments.find((a) => a.pid === OWNER && a.proj === 'P2').uid]?.finish;
  d({ type: 'VIEWER', v: 'admin' }); d({ type: 'CAPEX_ADD', person: OWNER, from: E.addDays(E.weekOf(E.TODAY), 7), to: E.addDays(E.weekOf(E.TODAY), 11), kind: 'Vacation' }); return [S.capEx.some((x) => x.person === OWNER && x.kind === 'Vacation'), 'Vacation next week (generic category)']; });
step(17, 'Available capacity drops', () => [P(OWNER).cap === capBefore - 40, `${capBefore} → ${P(OWNER).cap} h over 8 weeks`]);
step(18, 'Utilization increases automatically', () => [P(OWNER).util > utilBefore, `${utilBefore}% → ${P(OWNER).util}%`]);
step(19, 'Filter: overallocated only', () => { const over = R.companyPeople(S).filter((p) => P(p.id).overWeeks > 0).map((p) => p.name); return [over.includes('Mansour'), over.join(', ')]; });
step(20, 'Switch to the Discipline view', () => { const rows = R.DISCIPLINES.map(([dd, l]) => ({ l, n: R.companyPeople(S).filter((p) => R.discOf(S, p) === dd).length })); return [rows.length === 8, rows.map((r) => `${r.l} ${r.n}`).join(' · ')]; });
step(21, 'Architecture summary reflects all changes', () => [archU() > archBase, `Architecture ${Math.round(archBase * 100)}% → ${Math.round(archU() * 100)}%`]);
step(22, 'Master Timeline uses the same data', () => { const V = PF.projView(S, 'P4'); const f = E.forecastAll(V)[target.uid]; const u = f.alloc.find((x) => x.id === OWNER); return [!!u && u.h === 4, `${E.code(V, V.tasks[target.uid])}: Mansour ${u.h} h allocated, load ${u.util}% in window, ${u.hpw} h/wk`]; });
step(23, 'The forecast reacts to the reduced capacity', () => { const a = M().assignments.find((x) => x.pid === OWNER && x.proj === 'P2'); const f = E.forecastAll(PF.projView(S, 'P2'))[a.uid]; return [f.finish >= fBefore, `${a.projName} ${a.code}: forecast ${fBefore} → ${f.finish}`]; });
step(24, 'Company dashboard reads the same model', () => { const u = R.companyPeople(S).reduce((x, p) => { const q = P(p.id); return { c: x.c + q.cap, d: x.d + q.demand }; }, { c: 0, d: 0 }); return [u.c > 0, `company utilization ${Math.round((u.d / u.c) * 100)}% next 8 weeks`]; });
step(25, 'Portfolio summary matches Resource Planning', () => { const over = R.companyPeople(S).filter((p) => R.personSummary(S, M(), p.id, 0, 0).status.key === 'over').map((p) => p.name); return [true, `over this week: ${over.join(', ') || 'none'} · resource-needed items ${M().needed.length}`]; });

const rpPassed = results.length - wfTotal; const rpOk = results.slice(wfTotal).filter(Boolean).length;
console.log(`Resource Planning scenario (v3): ${rpOk}/${rpPassed} passed`);
// Data rules
const bad = [];
if (S.people.some((p) => Object.keys(p).some((k) => /mail|phone|salary|rate|address/i.test(k)))) bad.push('staff contact/HR fields present');
if (S.capEx.some((x) => !['Vacation', 'Unavailable', 'Training', 'Public Holiday'].includes(x.kind))) bad.push('non-generic availability category');
console.log(bad.length ? `✗ data rules: ${bad.join('; ')}` : '✓ data rules: no staff contact/HR fields; generic availability categories only');
const phases = E.livePhases(PF.projView(S, 'P1')).map((p) => `${E.pad(E.phaseNo(PF.projView(S, 'P1'), p.uid))} ${p.title}`);
console.log(`Structure: ${phases.length} phases (${phases.join(' | ')})`);
if (wfPassed !== wfTotal || rpOk !== rpPassed || bad.length || phases.length !== 6) { process.exitCode = 1; console.log('CHECK FAILED'); } else console.log('All checks passed');
