// Headless check of the 12-step demonstration scenario, run through the same reducer
// the UI uses (no browser needed):  npm run check
import * as E from '../src/engine.js';

const OWNER = 'alex';   // accountable owner for the scenario subtask
const CONTRIB = 'blake';  // contributor
const name = (id) => E.person(s, id).name;

let s = E.initialState();
const d = (a) => { s = E.reducer(s, a); if (s.notice?.tone === 'bad') throw new Error(`Rejected: ${a.type} → ${s.notice.text}`); };
const results = [];
const step = (n, label, fn) => {
  let pass = false, detail = '';
  try { const r = fn(); pass = r === true || (Array.isArray(r) && r[0]); detail = Array.isArray(r) ? r[1] : ''; } catch (e) { detail = e.message; }
  results.push(pass); console.log(`${pass ? '✓' : '✗'} ${String(n).padStart(2)}. ${label}${detail ? ` — ${detail}` : ''}`);
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

const phases = E.livePhases(s).map((p) => `${E.pad(E.phaseNo(s, p.uid))} ${p.title}`);
console.log(`\nStructure: ${phases.length} phases (${phases.join(' | ')})`);
const n = results.filter(Boolean).length;
console.log(`Scenario check: ${n}/${results.length} passed`);
if (n !== results.length || phases.length !== 6) process.exitCode = 1;
