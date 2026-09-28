import './globals.js'; // must be first: exposes React to the other modules
import { createRoot } from 'react-dom/client';
import { PROJECT } from './seed.js';
import * as E from './engine.js';
import { Workflow } from './wf.jsx';
import { Admin } from './admin.jsx';
import { Timeline } from './timeline.jsx';
import { Timesheets } from './time.jsx';
import { Drawings } from './drawings.jsx';
import { Team } from './team.jsx';
import { Portfolio, Dashboard, MyWork, Calendar } from './dash.jsx';
import { Badge, Btn } from './ui.jsx';

const { useReducer, useState, useEffect, useRef } = React;
const KEY = 'pm-workflow-prototype-demo-v2';
const UI0 = { screen: 'workflow', phases: { PH1: true }, wps: {}, task: null, sheet: null, tlMode: 'actual', tlBase: false, tlSel: null, timeTask: null, seen: {} };

function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); if (s && s.tasks && s.gates && s.v === 2) return { ...s, notice: null }; } } catch (e) { /* storage unavailable */ }
  return { ...E.initialState(), v: 2 };
}
const reducer2 = (s, a) => { const n = E.reducer(s, a); return n.v ? n : { ...n, v: 2 }; };

const TABS = [['dashboard', 'Dashboard'], ['workflow', 'Workflow'], ['mywork', 'My Work'], ['timeline', 'Timeline'], ['time', 'Timesheets'], ['drawings', 'Drawings & Permits'], ['calendar', 'Calendar'], ['team', 'Team'], ['admin', 'Admin']];

function App() {
  const [s, dispatch] = useReducer(reducer2, undefined, load);
  const [ui, setUi] = useState(UI0);
  const [activity, setActivity] = useState(false);
  const [guide, setGuide] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const scrollTarget = useRef(null);

  useEffect(() => { try { const { notice, ...rest } = s; localStorage.setItem(KEY, JSON.stringify(rest)); } catch (e) { /* ignore */ } }, [s]);
  useEffect(() => { if (!s.notice) return; const t = setTimeout(() => dispatch({ type: 'DISMISS' }), s.notice.tone === 'bad' ? 7000 : 3500); return () => clearTimeout(t); }, [s.notice && s.notice.n]);
  useEffect(() => { if (!scrollTarget.current) window.scrollTo(0, 0); }, [ui.screen]);
  useEffect(() => {
    if (!scrollTarget.current) return;
    const el = document.getElementById(scrollTarget.current); scrollTarget.current = null;
    if (el) el.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  // Record which views have shown the scenario subtask (for the checklist).
  const sub = scenarioTask(s);
  useEffect(() => { if (sub) setUi((u) => (u.seen[u.screen + (u.screen === 'mywork' ? E.viewerPerson(s) || 'x' : '')] ? u : { ...u, seen: { ...u.seen, [u.screen + (u.screen === 'mywork' ? E.viewerPerson(s) || 'x' : '')]: { at: s.seq, mode: u.tlMode, sel: u.tlSel } } })); }, [ui.screen, sub?.uid, s.viewer]);

  const openTo = (uid) => { const t = s.tasks[uid]; const top = t.parent ? s.tasks[t.parent] : t; return { phases: { ...ui.phases, [E.phaseOfTask(s, top)]: true }, wps: { ...ui.wps, [top.wp]: true }, task: top.uid }; };
  const nav = {
    screen: (screen, patch = {}) => setUi((u) => ({ ...u, screen, ...patch })),
    task: (uid) => {
      if (!uid) return setUi((u) => ({ ...u, task: null }));
      if (!s.tasks[uid]) return;
      scrollTarget.current = `task-${uid}`;
      setUi((u) => ({ ...u, screen: 'workflow', ...openTo(uid) }));
    },
    phase: (puid) => { scrollTarget.current = `phase-${puid}`; setUi((u) => ({ ...u, screen: 'workflow', phases: { ...u.phases, [puid]: true } })); },
    sheet: (no) => setUi((u) => ({ ...u, screen: 'drawings', sheet: no })),
    timeline: (uid) => setUi((u) => ({ ...u, screen: 'timeline', tlSel: uid })),
    time: (uid) => setUi((u) => ({ ...u, screen: 'time', timeTask: uid })),
    go: (n) => {
      if (n.screen) return nav.screen(n.screen);
      if (n.gate) { const g = s.gates.find((x) => x.uid === n.gate); scrollTarget.current = `gate-${n.gate}`; return setUi((u) => ({ ...u, screen: 'workflow', phases: { ...u.phases, [g.phase]: true } })); }
      if (n.task) return nav.task(n.task);
    },
  };
  const viewOpts = [['admin', 'Administrator'], ['pm', `Project Manager${s.roles.pm ? ` (${E.person(s, s.roles.pm).name})` : ''}`], ['exec', 'Executive Management'], ...s.people.filter((p) => p.active).map((p) => [p.id, p.name + (p.note ? ` · ${p.note}` : '')])];

  return (
    <div className="app">
      <header className="top">
        <div className="brand"><span className="mark" aria-hidden="true" /><span>Project Workflow</span><Badge tone="warn">Prototype v2</Badge></div>
        <nav className="crumbs" aria-label="Breadcrumb">
          <button className={`linkish ${ui.screen === 'portfolio' ? 'cur' : ''}`} onClick={() => nav.screen('portfolio')}>Projects</button>
          {ui.screen !== 'portfolio' && <><span className="faint">/</span><span>{PROJECT.name}</span></>}
        </nav>
        <div className="top-r">
          <label className="viewas" htmlFor="viewas">Viewing as
            <select id="viewas" value={s.viewer} onChange={(e) => dispatch({ type: 'VIEWER', v: e.target.value })}>{viewOpts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
          <Btn size="sm" onClick={() => setGuide(!guide)}>Test scenario</Btn>
          <Btn size="sm" onClick={() => setActivity(!activity)}>Activity log</Btn>
          {confirmReset ? <span className="row"><Btn size="sm" kind="danger" onClick={() => { dispatch({ type: 'RESET' }); setConfirmReset(false); setUi(UI0); }}>Reset everything</Btn><Btn size="sm" onClick={() => setConfirmReset(false)}>Cancel</Btn></span>
            : <Btn size="sm" kind="quiet" onClick={() => setConfirmReset(true)}>Reset demo</Btn>}
        </div>
      </header>
      <div className="demo-flag" role="note">Prototype / Demonstration Data — Not Production</div>
      <div className="proto-banner" role="note">
        <b>Interactive prototype.</b> Local demonstration data only. Approvals, signatures, timesheets and releases here are simulated. All names, places and figures are fictional sample data.
      </div>
      <main className="wrap">
        {ui.screen === 'portfolio' ? <Portfolio s={s} nav={nav} /> : <>
          <div className="proj"><div><div className="lbl">Demo workspace</div><h1>{PROJECT.name}</h1>
            <div className="meta"><span>{PROJECT.address}</span><span>{PROJECT.method} · {PROJECT.template}</span><span>PM: {s.roles.pm ? E.person(s, s.roles.pm).name : 'TBD'}</span></div></div></div>
          <nav className="tabs" aria-label="Project views">
            {TABS.map(([k, l]) => <button key={k} className={ui.screen === k ? 'on' : ''} aria-current={ui.screen === k ? 'page' : undefined} onClick={() => nav.screen(k)}>{l}</button>)}
          </nav>
          {ui.screen === 'workflow' && <Workflow s={s} dispatch={dispatch} ui={ui} setUi={setUi} nav={nav} />}
          {ui.screen === 'dashboard' && <Dashboard s={s} nav={nav} />}
          {ui.screen === 'mywork' && <MyWork s={s} nav={nav} dispatch={dispatch} />}
          {ui.screen === 'timeline' && <Timeline s={s} dispatch={dispatch} ui={ui} setUi={setUi} nav={nav} />}
          {ui.screen === 'time' && <Timesheets s={s} dispatch={dispatch} ui={ui} setUi={setUi} nav={nav} />}
          {ui.screen === 'drawings' && <Drawings s={s} dispatch={dispatch} ui={ui} setUi={setUi} nav={nav} />}
          {ui.screen === 'calendar' && <Calendar s={s} nav={nav} />}
          {ui.screen === 'team' && <Team s={s} dispatch={dispatch} nav={nav} />}
          {ui.screen === 'admin' && <Admin s={s} dispatch={dispatch} ui={ui} setUi={setUi} />}
        </>}
      </main>
      {guide && <Scenario s={s} ui={ui} close={() => setGuide(false)} nav={nav} dispatch={dispatch} />}
      {activity && (
        <aside className="drawer" aria-label="Activity log">
          <header><b>Activity log</b><span className="small muted">Simulated audit trail</span><Btn size="xs" onClick={() => setActivity(false)}>Close</Btn></header>
          <ol className="plain">{s.log.map((l, i) => <li key={i}><span className="mono faint">{l.at}</span> <b>{l.who}</b> {l.text}</li>)}</ol>
        </aside>)}
      {s.notice && <div className={`toast ${s.notice.tone}`} role="status" onClick={() => dispatch({ type: 'DISMISS' })}>{s.notice.text}</div>}
    </div>
  );
}

// The scenario subtask: the newest architectural subtask added through Admin.
function scenarioTask(s) {
  const c = Object.values(s.tasks).filter((t) => t.uid.startsWith('T-N') && !t.archived && (t.parent || (t.codeHistory || []).length)).sort((a, b) => Number(a.uid.slice(3)) - Number(b.uid.slice(3)));
  return c[c.length - 1] || null;
}

function Scenario({ s, ui, close, nav, dispatch }) {
  const [min, setMin] = useState(false);
  const t = scenarioTask(s);
  const es = t ? s.time.filter((e) => e.task === t.uid) : [];
  const appr = es.filter((e) => e.status === 'approved');
  const seen = (k) => !!ui.seen[k];
  const moved = t && (t.codeHistory || []).length > 0;
  const steps = [
    ['Admin → select a Phase 01 architectural task (e.g. 1.7) → "+ Add subtask"', !!t, () => nav.screen('admin')],
    ['Make Alex the accountable owner and add Blake R as contributor, then Save', t && t.owner === 'alex' && t.contrib.includes('blake')],
    ['Set planned start, planned finish and estimated effort, then Save', t && t.est > 0],
    ['Check it in Workflow, My Work (view as Alex) and Timeline', seen('workflow') && (seen('myworkalex') || seen('myworkblake')) && seen('timeline')],
    ['View as Alex or Blake R → Timesheets → log hours on two or more dates and submit', t && new Set(es.filter((e) => e.status !== 'draft').map((e) => e.date)).size >= 2, () => nav.screen('time')],
    ['View as Project Manager → Timesheets → PM approval → approve', appr.length > 0],
    ['Timeline → "Planned + Actual" overlay shows the approved hours', appr.length > 0 && ui.screen === 'timeline' && ui.tlMode !== 'plan' || !!ui.seen.__actual],
    ['Select the subtask on the Timeline → update remaining effort with a reason', t && t.remaining != null, () => t && nav.timeline(t.uid)],
    ['Switch to "Planned + Actual + Forecast"; compare estimated vs actual hours in the panel', t && t.remaining != null && ui.tlMode === 'forecast' && ui.tlSel === t.uid || !!ui.seen.__fc],
    ['Dashboard → Project Hours and Schedule Performance reflect it', appr.length > 0 && ui.screen === 'dashboard' || !!ui.seen.__dash],
    ['Admin → move the subtask to a different work package ("Review move…")', moved, () => t && nav.screen('admin')],
    ['Timesheets → Reports: approved hours keep their original work package; progress and gates are unchanged', moved && appr.length > 0 && appr.some((e) => e.snap.wp !== s.tasks[e.task].wp)],
  ];
  // Latch steps 7 and 9 once reached so they stay ticked.
  if (steps[6][1] && !ui.seen.__actual) ui.seen.__actual = true;
  if (steps[8][1] && !ui.seen.__fc) ui.seen.__fc = true;
  if (steps[9][1] && !ui.seen.__dash) ui.seen.__dash = true;
  const n = steps.filter((x) => x[1]).length;
  return (
    <aside className={`scenario ${min ? 'min' : ''}`} aria-label="Test scenario">
      <header><b>Test scenario</b><span className="small muted">{n} / {steps.length}</span><span className="row"><button className="linkish small" aria-expanded={!min} onClick={() => setMin(!min)}>{min ? 'Show' : 'Minimise'}</button><button className="linkish" onClick={close} aria-label="Close scenario">✕</button></span></header>
      {!min && <><ol className="plain">{steps.map(([txt, done, go], i) => <li key={i} className={done ? 'done' : ''}><span className={`ck ${done ? 'y' : ''}`} aria-label={done ? 'done' : 'not done'} /><span>{txt}{go && !done && <> <button className="linkish small" onClick={go}>Go</button></>}</span></li>)}</ol>
      {t && <p className="small muted">Scenario subtask: <span className="mono">{E.code(s, t)}</span> {t.title} · progress {E.pctOf(s, t)}% · {appr.reduce((a, e) => a + e.hours, 0)} h approved. Hours never change progress.</p>}</>}
    </aside>
  );
}

createRoot(document.getElementById('root')).render(<App />);
