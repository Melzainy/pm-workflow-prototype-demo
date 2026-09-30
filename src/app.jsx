import './globals.js'; // must be first: exposes React to the other modules
import { createRoot } from 'react-dom/client';
import * as E from './engine.js';
import * as PF from './portfolio.js';
import { Workflow } from './wf.jsx';
import { Admin } from './admin.jsx';
import { Timeline } from './timeline.jsx';
import { Timesheets } from './time.jsx';
import { Drawings } from './drawings.jsx';
import { Team } from './team.jsx';
import { Portfolio, Dashboard, MyWork, Calendar } from './dash.jsx';
import { ResourcePlanning } from './rp.jsx';
import { Scenarios } from './scenario.jsx';
import { Badge, Btn } from './ui.jsx';

const { useReducer, useState, useEffect, useRef } = React;
const KEY = 'pm-workflow-prototype-demo-v3';
const UI0 = { area: 'projects', screen: 'dashboard', phases: { PH1: true }, wps: {}, task: null, sheet: null, tlMode: 'actual', tlBase: false, tlSel: null, timeTask: null, seen: {}, rp: {} };

function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); if (s && s.v === 3 && s.projects && s.order) return { ...s, notice: null }; } } catch (e) { /* storage unavailable */ }
  return PF.initialState();
}

const TABS = [['dashboard', 'Dashboard'], ['workflow', 'Workflow'], ['mywork', 'My Work'], ['timeline', 'Timeline'], ['time', 'Timesheets'], ['drawings', 'Drawings & Permits'], ['calendar', 'Calendar'], ['team', 'Team'], ['admin', 'Admin']];

function App() {
  const [S, dispatch] = useReducer(PF.reducer, undefined, load);
  const [ui, setUi] = useState(UI0);
  const [activity, setActivity] = useState(false);
  const [guide, setGuide] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const scrollTarget = useRef(null);
  const inProject = ui.area === 'project' && S.cur && S.projects[S.cur];
  const s = inProject ? PF.projView(S, S.cur) : null;
  const dispatchP = (a) => dispatch({ ...a, _pid: S.cur });

  useEffect(() => { try { const { notice, ...rest } = S; localStorage.setItem(KEY, JSON.stringify(rest)); } catch (e) { /* ignore */ } }, [S]);
  useEffect(() => { if (!S.notice) return; const t = setTimeout(() => dispatch({ type: 'DISMISS' }), S.notice.tone === 'bad' ? 7000 : 3500); return () => clearTimeout(t); }, [S.notice && S.notice.n]);
  useEffect(() => { if (!scrollTarget.current) window.scrollTo(0, 0); }, [ui.screen, ui.area, S.cur]);
  useEffect(() => {
    if (!scrollTarget.current) return;
    const el = document.getElementById(scrollTarget.current); scrollTarget.current = null;
    if (el) el.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  // Screens visited (used by the test-scenario checklist).
  const here = inProject ? `${S.cur}:${ui.screen}${ui.screen === 'mywork' ? E.viewerPerson(s) || 'x' : ''}` : ui.area;
  useEffect(() => { setUi((u) => (u.seen[here] ? u : { ...u, seen: { ...u.seen, [here]: S.seq } })); }, [here]);

  const openTo = (V, uid) => { const t = V.tasks[uid]; const top = t.parent ? V.tasks[t.parent] : t; return { phases: { ...ui.phases, [E.phaseOfTask(V, top)]: true }, wps: { ...ui.wps, [top.wp]: true }, task: top.uid }; };
  const nav = {
    area: (area, rpPatch) => setUi((u) => ({ ...u, area, rp: rpPatch ? { ...u.rp, ...rpPatch } : u.rp })),
    project: (pid, screen = 'dashboard') => { if (pid) dispatch({ type: 'OPEN', pid }); setUi((u) => ({ ...u, area: 'project', screen, task: null, tlSel: null, timeTask: null, sheet: null })); },
    openTask: (pid, uid) => {
      const V = PF.projView(S, pid); if (!V?.tasks[uid]) return;
      dispatch({ type: 'OPEN', pid }); scrollTarget.current = `task-${uid}`;
      setUi((u) => ({ ...u, area: 'project', screen: 'workflow', ...openTo(V, uid), seen: { ...u.seen, rpOpenedTask: true } }));
    },
    inProject: (pid, screen, patch = {}) => { dispatch({ type: 'OPEN', pid }); setUi((u) => ({ ...u, area: 'project', screen, ...patch })); },
    screen: (screen, patch = {}) => setUi((u) => ({ ...u, area: 'project', screen, ...patch })),
    task: (uid) => {
      if (!uid) return setUi((u) => ({ ...u, task: null }));
      if (!s?.tasks[uid]) return;
      scrollTarget.current = `task-${uid}`;
      setUi((u) => ({ ...u, screen: 'workflow', ...openTo(s, uid) }));
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
  const viewOpts = [['admin', 'Administrator'], ['pm', 'Project Manager'], ['exec', 'Executive Management'], ...S.people.filter((p) => p.active).map((p) => [p.id, p.name + (p.note ? ` · ${p.note}` : '')])];
  const projects = PF.projectsOf(S);

  return (
    <div className="app">
      <header className="top">
        <div className="brand"><span className="mark" aria-hidden="true" /><span>Project Workflow</span><Badge tone="warn">Prototype v3</Badge></div>
        <nav className="company-nav" aria-label="Company">
          <button className={ui.area === 'projects' ? 'on' : ''} aria-current={ui.area === 'projects' ? 'page' : undefined} onClick={() => nav.area('projects')}>Projects</button>
          <button className={ui.area === 'resources' ? 'on' : ''} aria-current={ui.area === 'resources' ? 'page' : undefined} onClick={() => nav.area('resources')}>Resource Planning</button>
        </nav>
        {inProject && <nav className="crumbs" aria-label="Breadcrumb"><span className="faint">/</span>
          <select aria-label="Project" value={S.cur} onChange={(e) => nav.project(e.target.value, ui.screen)}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></nav>}
        <div className="top-r">
          <label className="viewas" htmlFor="viewas">Viewing as
            <select id="viewas" value={S.viewer} onChange={(e) => dispatch({ type: 'VIEWER', v: e.target.value })}>{viewOpts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
          <Btn size="sm" onClick={() => setGuide(!guide)}>Test scenario</Btn>
          <Btn size="sm" onClick={() => setActivity(!activity)}>Activity log</Btn>
          {confirmReset ? <span className="row"><Btn size="sm" kind="danger" onClick={() => { dispatch({ type: 'RESET' }); setConfirmReset(false); setUi(UI0); }}>Reset everything</Btn><Btn size="sm" onClick={() => setConfirmReset(false)}>Cancel</Btn></span>
            : <Btn size="sm" kind="quiet" onClick={() => setConfirmReset(true)}>Reset demo</Btn>}
        </div>
      </header>
      <div className="demo-flag" role="note">Prototype / Demonstration Data — Not Production</div>
      <div className="proto-banner" role="note">
        <b>Interactive prototype.</b> Local demonstration data only. Approvals, signatures, timesheets and releases are simulated. Staff names are the working roster; nobody has an account, and every assignment, capacity, hour and date is <b>illustrative / not verified</b>.
      </div>
      <main className="wrap">
        {ui.area === 'projects' && <Portfolio S={S} dispatch={dispatch} nav={nav} ui={ui} />}
        {ui.area === 'resources' && <ResourcePlanning S={S} dispatch={dispatch} ui={ui} setUi={setUi} nav={nav} />}
        {inProject && <>
          <div className="proj"><div><div className="lbl">Demo workspace · project</div><h1>{s.name}</h1>
            <div className="meta"><span>{s.address}</span><span>{s.method} · {s.template}</span><span>PM: {s.roles.pm ? E.person(s, s.roles.pm).name : 'TBD'}</span></div></div></div>
          <nav className="tabs" aria-label="Project views">
            {TABS.map(([k, l]) => <button key={k} className={ui.screen === k ? 'on' : ''} aria-current={ui.screen === k ? 'page' : undefined} onClick={() => nav.screen(k)}>{l}</button>)}
          </nav>
          {ui.screen === 'workflow' && <Workflow s={s} dispatch={dispatchP} ui={ui} setUi={setUi} nav={nav} />}
          {ui.screen === 'dashboard' && <Dashboard s={s} nav={nav} />}
          {ui.screen === 'mywork' && <MyWork s={s} nav={nav} dispatch={dispatchP} />}
          {ui.screen === 'timeline' && <Timeline s={s} dispatch={dispatchP} ui={ui} setUi={setUi} nav={nav} />}
          {ui.screen === 'time' && <Timesheets s={s} dispatch={dispatchP} ui={ui} setUi={setUi} nav={nav} />}
          {ui.screen === 'drawings' && <Drawings s={s} dispatch={dispatchP} ui={ui} setUi={setUi} nav={nav} />}
          {ui.screen === 'calendar' && <Calendar s={s} nav={nav} />}
          {ui.screen === 'team' && <Team s={s} dispatch={dispatchP} nav={nav} />}
          {ui.screen === 'admin' && <Admin s={s} dispatch={dispatchP} ui={ui} setUi={setUi} />}
        </>}
      </main>
      {guide && <Scenarios S={S} ui={ui} close={() => setGuide(false)} nav={nav} />}
      {activity && (
        <aside className="drawer" aria-label="Activity log">
          <header><b>Activity log</b><span className="small muted">Simulated audit trail</span><Btn size="xs" onClick={() => setActivity(false)}>Close</Btn></header>
          <ol className="plain">{S.log.map((l, i) => <li key={i}><span className="mono faint">{l.at}</span> <b>{l.who}</b> {l.proj ? <span className="muted">[{l.proj}] </span> : null}{l.text}</li>)}</ol>
        </aside>)}
      {S.notice && <div className={`toast ${S.notice.tone}`} role="status" onClick={() => dispatch({ type: 'DISMISS' })}>{S.notice.text}</div>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
