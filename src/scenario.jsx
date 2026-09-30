// Test-scenario checklists. They only observe the shared store and the UI; they never change data.
import * as E from './engine.js';
import * as R from './resource.js';
import * as PF from './portfolio.js';

const { useState } = React;
const latch = {}; // steps stay ticked once reached (per page load)
let base = null;
function baseline() {
  if (base) return base;
  const S0 = PF.initialState(); const M0 = R.resourceModel(S0);
  const arch = R.companyPeople(S0).filter((p) => R.discOf(S0, p) === 'arch');
  const a = arch.reduce((x, p) => { const s = R.personSummary(S0, M0, p.id, 0, 7); return { c: x.c + s.cap, d: x.d + s.demand }; }, { c: 0, d: 0 });
  const m = R.personSummary(S0, M0, 'mansour', 0, 7);
  base = { arch: a.d / a.c, mCap: m.cap, mUtil: m.util, entries: new Set(S0.time.map((e) => e.uid)) };
  return base;
}
const L = (k, v) => (latch[k] = latch[k] || !!v);

function resourceSteps(S, ui, nav) {
  const b = baseline(); const M = R.resourceModel(S); const rp = ui.rp || {};
  const mans = R.personSummary(S, M, 'mansour', 0, 7);
  const arch = R.companyPeople(S).filter((p) => R.discOf(S, p) === 'arch').reduce((x, p) => { const s = R.personSummary(S, M, p.id, 0, 7); return { c: x.c + s.cap, d: x.d + s.demand }; }, { c: 0, d: 0 });
  const archU = arch.d / arch.c;
  const mProjects = new Set(M.assignments.filter((a) => a.pid === 'mansour').map((a) => a.proj));
  let added = latch.added;
  if (!added) PF.projectsOf(S).forEach((P) => Object.values(P.tasks).forEach((t) => { const x = t.alloc?.mansour; if (x && x.h === 12 && !added) added = { pid: P.id, uid: t.uid }; }));
  if (added) latch.added = added;
  const addedNow = added && S.projects[added.pid]?.tasks[added.uid]?.alloc?.mansour?.h;
  const entry = S.time.find((e) => e.person === 'mansour' && !b.entries.has(e.uid) && e.status !== 'draft');
  const approved = S.time.find((e) => e.person === 'mansour' && !b.entries.has(e.uid) && e.status === 'approved');
  const vac = S.capEx.find((x) => x.person === 'mansour' && x.kind === 'Vacation');
  const onRP = ui.area === 'resources';
  const tlTask = ui.area === 'project' && ui.screen === 'timeline' && ui.tlSel && S.cur && (() => { const V = PF.projView(S, S.cur); const t = V.tasks[ui.tlSel]; return t && E.involves(V, t, 'mansour'); })();
  const st = [
    ['Open Resource Planning', L('r1', onRP), () => nav.area('resources')],
    ['Expand Architecture', L('r2', rp.open?.arch)],
    ['Select Mansour', L('r3', rp.sel?.kind === 'person' && rp.sel.id === 'mansour')],
    [`See Mansour's assignments across at least 3 projects (${mProjects.size})`, L('r4', latch.r3 && mProjects.size >= 3)],
    ['Show his next 8 weeks of planned workload', L('r5', latch.r3 && (rp.range ?? 8) === 8)],
    ['Open one assignment and go to the originating project task', L('r6', ui.seen.rpOpenedTask)],
    ['Add another 12 h assignment to Mansour from another project (person panel → Add an assignment)', L('r7', added)],
    ['Return to Resource Planning', L('r8', latch.r7 && onRP)],
    ['Verify Mansour becomes overallocated', L('r9', latch.r7 && mans.overWeeks > 0)],
    ['Verify Architecture utilization increases', L('r10', latch.r7 && archU > b.arch + 0.001)],
    ['Reduce that allocation (edit the hours in his panel)', L('r11', added && addedNow != null && addedNow < 12)],
    ['Verify Resource Planning recalculates immediately', L('r12', latch.r11 && onRP)],
    ["View as Mansour → one of his projects → Timesheets → submit hours", L('r13', entry)],
    ['View as Project Manager → approve them', L('r14', approved)],
    ['Verify actual hours update in Resource Planning', L('r15', latch.r14 && onRP)],
    ['Add an illustrative vacation week for Mansour', L('r16', vac)],
    ['Verify available capacity drops', L('r17', vac && mans.cap < b.mCap)],
    ['Verify utilization increases automatically', L('r18', vac && latch.r17)],
    ['Filter: Overallocated only', L('r19', rp.f?.onlyOver)],
    ['Switch from Person to Discipline view', L('r20', latch.r19 && rp.view === 'disc')],
    ['Verify the Architecture summary reflects all changes', L('r21', latch.r20)],
    ['Open the Master Timeline of that project', L('r22', latch.r16 && ui.area === 'project' && ui.screen === 'timeline'), () => added && nav.inProject(added.pid, 'timeline', { tlSel: added.uid, tlMode: 'forecast' })],
    ["Select one of Mansour's tasks: its forecast uses his reduced capacity", L('r23', latch.r22 && tlTask)],
    ['Return to the company dashboard (Projects)', L('r24', latch.r22 && ui.area === 'projects'), () => nav.area('projects')],
    ['Verify the Portfolio resource summary shows the same figures', L('r25', latch.r24)],
  ];
  return { st, note: `Mansour, next 8 weeks: ${mans.util}% (${Math.round(mans.demand)} of ${Math.round(mans.cap)} h) · Architecture ${Math.round(archU * 100)}% · start ${b.mUtil}% / ${Math.round(b.arch * 100)}%` };
}

function workflowSteps(S, ui, nav) {
  const s = PF.projView(S, 'P1');
  const c = Object.values(s.tasks).filter((t) => t.uid.startsWith('T-N') && !t.archived && (t.parent || (t.codeHistory || []).length)).sort((a, b) => Number(a.uid.slice(3)) - Number(b.uid.slice(3)));
  const t = c[c.length - 1] || null;
  const es = t ? s.time.filter((e) => e.task === t.uid) : [];
  const appr = es.filter((e) => e.status === 'approved');
  const seen = (k) => !!ui.seen[`P1:${k}`];
  const inP1 = ui.area === 'project' && S.cur === 'P1';
  const moved = t && (t.codeHistory || []).length > 0;
  const st = [
    ['Admin → select 1.7 → "+ Add subtask"', !!t, () => nav.inProject('P1', 'admin')],
    ['Make Mansour the owner and add Hossam B as contributor, then Save', t && t.owner === 'mansour' && t.contrib.includes('hossam')],
    ['Set planned start, finish and estimated effort, then Save', t && t.est > 0],
    ['Check it in Workflow, My Work (view as Mansour) and Timeline', seen('workflow') && (seen('myworkmansour') || seen('myworkhossam')) && seen('timeline')],
    ['View as Mansour or Hossam B → Timesheets → log hours on two or more dates and submit', t && new Set(es.filter((e) => e.status !== 'draft').map((e) => e.date)).size >= 2, () => nav.inProject('P1', 'time')],
    ['View as Project Manager → Timesheets → PM approval → approve', appr.length > 0],
    ['Timeline → "Planned + Actual" shows the approved hours', L('w7', appr.length > 0 && inP1 && ui.screen === 'timeline' && ui.tlMode !== 'plan')],
    ['Select the subtask on the Timeline → update remaining effort with a reason', t && t.remaining != null, () => t && nav.inProject('P1', 'timeline', { tlSel: t.uid })],
    ['Switch to "Planned + Actual + Forecast"; compare estimated vs actual hours', L('w9', t && t.remaining != null && ui.tlMode === 'forecast' && ui.tlSel === t.uid)],
    ['Dashboard → Project Hours and Schedule Performance reflect it', L('w10', appr.length > 0 && inP1 && ui.screen === 'dashboard')],
    ['Admin → move the subtask to a different work package', moved, () => nav.inProject('P1', 'admin')],
    ['Timesheets → Reports: approved hours keep their original work package; progress and gates unchanged', moved && appr.length > 0 && appr.some((e) => e.snap.wp !== s.tasks[e.task].wp)],
  ];
  return { st, note: t ? `Scenario subtask ${E.code(s, t)} ${t.title} · progress ${E.pctOf(s, t)}% · ${appr.reduce((a, e) => a + e.hours, 0)} h approved` : null };
}

export function Scenarios({ S, ui, close, nav }) {
  const [min, setMin] = useState(false);
  const [tab, setTab] = useState('rp');
  const rpS = resourceSteps(S, ui, nav); const wfS = workflowSteps(S, ui, nav); // both evaluated so latches never miss a step
  const { st, note } = tab === 'rp' ? rpS : wfS;
  const n = st.filter((x) => x[1]).length;
  return (
    <aside className={`scenario ${min ? 'min' : ''}`} aria-label="Test scenario">
      <header><b>Test scenario</b><span className="small muted">{n} / {st.length}</span><span className="row"><button className="linkish small" aria-expanded={!min} onClick={() => setMin(!min)}>{min ? 'Show' : 'Minimise'}</button><button className="linkish" onClick={close} aria-label="Close scenario">✕</button></span></header>
      {!min && <>
        <div className="seg small-seg sc-tabs" role="group" aria-label="Scenario"><button className={tab === 'rp' ? 'on' : ''} onClick={() => setTab('rp')}>v3 Resource planning</button><button className={tab === 'wf' ? 'on' : ''} onClick={() => setTab('wf')}>v2 Workflow (Demo Residence A)</button></div>
        <ol className="plain">{st.map(([txt, done, go], i) => <li key={i} className={done ? 'done' : ''}><span className={`ck ${done ? 'y' : ''}`} aria-label={done ? 'done' : 'not done'} /><span>{i + 1}. {txt}{go && !done && <> <button className="linkish small" onClick={go}>Go</button></>}</span></li>)}</ol>
        {note && <p className="small muted">{note}</p>}
      </>}
    </aside>
  );
}
