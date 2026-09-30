import * as E from './engine.js';
import * as D from './seed.js';
import { DISC_NAMES } from './seed.js';
import * as R from './resource.js';
import { projView, projectsOf } from './portfolio.js';
import { St } from './rp.jsx';
import { nextActions } from './wf.jsx';
import { Reports } from './time.jsx';
import { schedulePerformance } from './timeline.jsx';
import { Badge, Btn, Bar, Illus, TypeMark, fmt, Section, Empty, Hrs, Days, Unconf } from './ui.jsx';

const { useState, useMemo } = React;
const { code, pad, whoLabel, TODAY } = E;

export function Portfolio({ S, dispatch, nav, ui }) {
  const M = R.resourceModel(S);
  const ps = projectsOf(S);
  const [form, setForm] = useState(null);
  const admin = S.viewer === 'admin';
  const people = R.companyPeople(S);
  const w8 = people.map((p) => ({ p, s: R.personSummary(S, M, p.id, 0, 7), now: R.personSummary(S, M, p.id, 0, 0) }));
  const C = w8.reduce((a, x) => a + x.s.cap, 0); const Dm = w8.reduce((a, x) => a + x.s.demand, 0); const u = C > 0 ? Math.round((Dm / C) * 100) : 0;
  const over = w8.filter((x) => x.now.status.key === 'over');
  const planned = M.assignments.reduce((a, x) => a + x.h, 0) + M.needed.reduce((a, x) => a + (x.role || x.reason === 'No one assigned' ? x.hours : 0), 0);
  const approved = S.time.filter((e) => e.status === 'approved').reduce((a, e) => a + e.hours, 0);
  const discRows = R.DISCIPLINES.map(([d, l]) => { const rows = w8.filter((x) => R.discOf(S, x.p) === d); const c = rows.reduce((a, x) => a + x.s.cap, 0); const dm = rows.reduce((a, x) => a + x.s.demand, 0); const uu = c > 0 ? Math.round((dm / c) * 100) : dm > 0 ? 999 : 0; return { d, l, n: rows.length, c, dm, u: uu, st: R.status(S, uu, c, dm), need: M.needed.filter((x) => x.need === d).length }; });
  const projLoad = ps.map((P) => ({ P, h: M.assignments.filter((a) => a.proj === P.id).reduce((a, x) => { let h = 0; for (let i = 0; i < 4; i++) h += x.weeks[M.weeks[i]] || 0; return a + h; }, 0) })).sort((a, b) => b.h - a.h);
  return (
    <div className="page">
      <div className="page-h"><div><h1>Projects</h1><p className="muted">Company dashboard. Demonstration workspace: every project, date, assignment and hour is <Illus>illustrative / not verified</Illus>.</p></div>
        {admin ? <Btn kind="primary" onClick={() => setForm(form ? null : { name: '', start: E.addDays(TODAY, 21) })}>+ Create New Project</Btn> : <span className="small muted">Administrators create projects.</span>}</div>
      {form && <Section title="Create a new project from the template">
        <div className="form tight"><label>Project name<input id="np-pname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Demo Residence E" /></label>
          <label>Phase 01 planned start<input type="date" id="np-start" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></label>
          {[['arch', 'Architecture lead work'], ['int', 'Interior lead work'], ['civ', 'Civil lead work']].map(([k, l]) => <label key={k}>{l}<select id={`np-${k}`} value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })}><option value="">Leave TBD (resource needed)</option>{people.filter((p) => R.discOf(S, p) === k).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>)}
        </div>
        <Btn kind="primary" size="sm" disabled={!form.name.trim()} reason="Enter a name" onClick={() => { dispatch({ type: 'PROJECT_CREATE', name: form.name, start: form.start, roleMap: Object.fromEntries(['arch', 'int', 'civ'].filter((k) => form[k]).map((k) => [k, form[k]])) }); setForm(null); nav.project(); }}>Create project</Btn>
        <p className="small muted">Uses {D.PROJECT.template}. Work owned by roles that are still TBD appears immediately under Resource needed; people you pick appear in Resource Planning at once.</p>
      </Section>}
      <Section title="Portfolio resources" right={<button className="linkish small" onClick={() => nav.area('resources')}>Open Resource Planning</button>}>
        <div className="kpis k6">
          <div><div className="lbl">Company utilization</div><b>{u}%</b><div className="sub">next 8 weeks · {Math.round(Dm)} of {Math.round(C)} h</div></div>
          <div><div className="lbl">Overallocated this week</div><b>{over.length}</b><div className="sub">{['admin', 'pm', 'exec'].includes(S.viewer) ? over.map((x) => x.p.name).join(', ') || 'nobody' : 'people above 100%'}</div></div>
          <div><div className="lbl">Available capacity</div><b><Hrs v={Math.round(C - Dm)} /></b><div className="sub">unallocated, next 8 weeks</div></div>
          <div><div className="lbl">Resource needed</div><b>{M.needed.length}</b><div className="sub">tasks with unassigned effort</div></div>
          <div><div className="lbl">Planned remaining hours</div><b><Hrs v={Math.round(planned)} /></b><div className="sub">all active projects</div></div>
          <div><div className="lbl">Approved actual hours</div><b><Hrs v={Math.round(approved)} /></b><div className="sub">to date, all projects</div></div>
        </div>
        <div className="split2">
          <div><h4>Discipline utilization (next 8 weeks)</h4><table className="grid-table small num-right"><thead><tr><th>Discipline</th><th>People</th><th>Utilization</th><th>Needed</th></tr></thead><tbody>
            {discRows.map((r) => <tr key={r.d} className="clickable" onClick={() => nav.area('resources', { sel: { kind: 'disc', id: r.d } })}><td>{r.l}</td><td>{r.n}</td><td>{r.n ? <>{r.u}% <St st={r.st} compact /></> : <span className="muted">no people</span>}</td><td>{r.need || ''}</td></tr>)}</tbody></table></div>
          <div><h4>Most heavily loaded projects (next 4 weeks)</h4><ul className="plain small list">{projLoad.map(({ P, h }) => <li key={P.id}><button className="linkish" onClick={() => nav.area('resources', { f: { active: true, project: P.id }, view: 'project' })}>{P.name}</button><Hrs v={Math.round(h)} /></li>)}</ul></div>
        </div>
      </Section>
      <Section title={`Active projects (${ps.length})`}>
        <div className="scroll"><table className="grid-table small">
          <thead><tr><th>Project</th><th>Current phase</th><th>PM</th><th>Progress</th><th>Next gate</th><th>Blockers</th><th>Planned h</th><th>Approved h</th><th>Demand, 4 wk</th><th>Schedule</th><th>D&P forecast</th></tr></thead>
          <tbody>{ps.map((P) => {
            const V = projView(S, P.id); const active = E.livePhases(V).find((p) => p.state === 'active');
            const g = active && E.gateOfPhase(V, active.uid); const r = g && E.gateReadiness(V, g.uid);
            const blockers = nextActions({ ...V, viewer: 'pm' }).filter((x) => x.tone === 'bad').length;
            const sp = schedulePerformance(V); const aps = active && E.phaseSchedule(V, active.uid);
            const dv = aps?.ff && aps?.pf ? E.workBetween(aps.pf, aps.ff, V.holidays) : null;
            const est = Object.values(V.tasks).filter((t) => !t.archived).reduce((a, t) => a + t.est, 0);
            const ap = V.time.filter((e) => e.status === 'approved').reduce((a, e) => a + e.hours, 0);
            return <tr key={P.id} className="clickable" tabIndex={0} onClick={() => nav.project(P.id)} onKeyDown={(e) => e.key === 'Enter' && nav.project(P.id)}>
              <td><b>{P.name}</b> <Badge>Demo</Badge><div className="muted">{P.address}</div></td>
              <td>{active ? `${pad(E.phaseNo(V, active.uid))} · ${active.title}` : '—'}</td>
              <td>{V.roles.pm ? E.person(V, V.roles.pm)?.name : <span className="muted">TBD</span>}</td>
              <td><Bar value={E.phaseProgress(V, active?.uid)} w={60} /> <Illus>{E.phaseProgress(V, active?.uid) ?? 0}%</Illus></td>
              <td>{g ? `${E.gateName(V, g)} · ${r.approved}/${r.total - 1}` : '—'}</td>
              <td>{blockers ? <Badge tone="bad">{blockers}</Badge> : '0'}</td>
              <td><Hrs v={est} /></td><td><Hrs v={Math.round(ap)} /></td>
              <td><Hrs v={Math.round(projLoad.find((x) => x.P.id === P.id)?.h || 0)} /></td>
              <td>{aps?.uncertain ? <span className="twarn">uncertain</span> : <><Days n={dv} />{aps?.unconf && <> <Unconf why={aps.unconf} /></>}</>}</td>
              <td>{sp.uncertain ? <span className="twarn" title={sp.uncertain}>Forecast uncertain</span> : <>{fmt(sp.ff)}{sp.unconf && <div><Unconf long why={sp.unconf} /></div>}</>}</td>
            </tr>;
          })}</tbody>
        </table></div>
        <p className="small muted">Schedule = forecast finish of the active phase against its current plan. D&P forecast = Design & Permitting completion (Phase 06 is not scoped and excluded).</p>
      </Section>
    </div>
  );
}

export function Dashboard({ s, nav }) {
  const next = nextActions({ ...s, viewer: 'pm' });
  const crit = next.filter((x) => x.tone === 'bad');
  const approvals = [];
  s.gates.forEach((g) => { if (E.phase(s, g.phase)?.state !== 'active') return; g.conds.forEach((c) => { if (c.ev.type !== 'release' && c.status === 'pending' && E.evidence(s, c).ready) approvals.push({ g, c }); }); });
  const pendT = s.time.filter((e) => e.status === 'submitted');
  const sp = schedulePerformance(s);
  const jur = E.jurOpen(s);
  const over = [
    ...s.wps.filter((w) => !w.archived).map((w) => { const ts = Object.values(s.tasks).filter((t) => t.wp === w.uid && !t.archived); const est = ts.reduce((a, t) => a + t.est, 0); const used = s.time.filter((e) => e.snap?.wp === w.uid && e.status !== 'draft').reduce((a, e) => a + e.hours, 0); return { uid: w.uid, phase: w.phase, label: `WP · ${w.title}`, est, used }; }),
    ...Object.values(s.tasks).filter((t) => !t.archived).map((t) => { const h = E.hours(s, t.uid, false); return { uid: t.uid, task: t.uid, label: `${code(s, t)} ${t.title}`, est: t.est, used: h.approved + h.pending }; }),
  ].filter((o) => o.est > 0 && o.used > o.est);
  const varPh = (r) => (r.af ? E.workBetween(r.pf, r.af, s.holidays) : r.ff ? E.workBetween(r.pf, r.ff, s.holidays) : null);
  return (
    <div className="page">
      <div className="page-h"><div><h1>Project dashboard</h1><p className="muted">{s.name}. Every figure comes from the workflow, approved timesheets and the forecast rules. Click a line to open it.</p></div></div>
      <div className="dash">
        <Section title="Phases" className="span2">
          <div className="scroll"><table className="phase-table"><thead><tr><th /><th>Phase</th><th>Progress</th><th>Gate</th><th>Current plan finish</th><th>Forecast</th><th>Hours (approved / est.)</th><th /></tr></thead>
            <tbody>{E.livePhases(s).map((p) => {
              const prog = E.phaseProgress(s, p.uid); const g = E.gateOfPhase(s, p.uid); const r = g && E.gateReadiness(s, g.uid); const ps = E.phaseSchedule(s, p.uid);
              const unscoped = p.unscoped && !ps.count;
              return (
                <tr key={p.uid} className="clickable" onClick={() => nav.phase(p.uid)}>
                  <td className="mono faint">{pad(E.phaseNo(s, p.uid))}</td><td>{p.title}</td>
                  <td>{unscoped ? <span className="muted small">Not scoped</span> : <><Bar value={prog} w={90} /> <Illus>{prog}%</Illus></>}</td>
                  <td className="small">{g ? `${r.approved}/${r.total - 1}` : '—'}</td>
                  <td className="small">{unscoped ? '—' : fmt(ps.pf)}</td>
                  <td className="small">{unscoped ? '—' : ps.af ? <>Released {fmt(ps.af)}</> : ps.uncertain ? <span className="twarn" title={ps.uncertain}>Uncertain</span> : <>{fmt(ps.ff)} <Days n={varPh(ps)} />{ps.unconf && <> <Unconf why={ps.unconf} /></>}</>}</td>
                  <td className="small">{unscoped ? '—' : <><Hrs v={ps.approved} /> / <Hrs v={ps.est} /></>}</td>
                  <td>{{ active: <Badge tone="accent">Active</Badge>, released: <Badge tone="ok">Released</Badge>, locked: <Badge>{unscoped ? 'Not scoped' : 'Locked'}</Badge> }[p.state]}</td>
                </tr>);
            })}</tbody></table></div>
          <p className="small muted">Progress comes from task completion and weights. Hours never change progress or open a gate.</p>
        </Section>

        <Section title="Schedule performance" className="span2" right={<button className="linkish small" onClick={() => nav.screen('timeline', { tlMode: 'forecast' })}>Open master timeline</button>}>
          <div className="kpis">
            <div><div className="lbl">Original planned completion</div><b>{fmt(sp.bf)}</b><div className="sub">Approved baseline, Design & Permitting</div></div>
            <div><div className="lbl">Current planned completion</div><b>{fmt(sp.pf)}</b><div className="sub"><Days n={E.workBetween(sp.bf, sp.pf, s.holidays)} /> vs baseline</div></div>
            <div><div className="lbl">Forecast completion</div>{sp.uncertain ? <b className="twarn">Uncertain</b> : <b>{fmt(sp.ff)}</b>}<div className="sub">{sp.uncertain ? sp.uncertain : <><Days n={E.workBetween(sp.pf, sp.ff, s.holidays)} /> vs current plan{sp.unconf && <div><Unconf long why={sp.unconf} /></div>}</>}</div></div>
            <div><div className="lbl">Effort</div><b><Hrs v={sp.approved} /> of <Hrs v={sp.est} /></b><div className="sub"><Hrs v={sp.rem} /> remaining · <Hrs v={sp.pending} /> pending approval</div></div>
          </div>
          {sp.uncertain && <p className="note warn small">The forecast cannot be given as a date while this is unresolved. {sp.ff ? `Ignoring it, the rules would give ${fmt(sp.ff)}.` : ''} Phase 06 is not scoped and is excluded.</p>}
          <div className="split2">
            <div><h4>Driving delays</h4>{sp.drivers.length || sp.blocked.length ? <ul className="plain list small">
              {sp.blocked.map((t) => <li key={'b' + t.uid}><span className="dot bad" /><button className="linkish" onClick={() => nav.timeline(t.uid)}><span className="mono">{code(s, t)}</span> {t.title}</button><span className="twarn">{t.blocker || 'On hold'}</span></li>)}
              {sp.drivers.map(({ t, d }) => <li key={t.uid}><span className="dot warn" /><button className="linkish" onClick={() => nav.timeline(t.uid)}><span className="mono">{code(s, t)}</span> {t.title}</button><Days n={d} /></li>)}</ul> : <Empty>No task is forecast later than plan.</Empty>}</div>
            <div><h4>Estimated vs approved hours by phase</h4><table className="grid-table small num-right"><thead><tr><th>Phase</th><th>Est.</th><th>Approved</th><th>Remaining</th><th>Finish var.</th></tr></thead><tbody>
              {sp.rows.map((r) => <tr key={r.p.uid}><td>{pad(E.phaseNo(s, r.p.uid))}</td><td><Hrs v={r.est} /></td><td><Hrs v={r.approved} /></td><td><Hrs v={r.rem} /></td><td>{r.uncertain && !r.af ? <span className="var unc">uncertain</span> : <><Days n={varPh(r)} />{r.unconf && !r.af && <> <Unconf why={r.unconf} /></>}</>}</td></tr>)}</tbody></table></div>
          </div>
        </Section>

        <Section title={`Critical blockers (${crit.length})`}>
          {crit.length ? <ul className="plain list">{crit.map((c, i) => <li key={i}><span className="dot bad" /><button className="linkish" onClick={() => nav.go(c)}>{c.task && <span className="mono faint">{code(s, s.tasks[c.task])}</span>} {c.text}</button><Badge tone="bad">{c.label}</Badge></li>)}</ul> : <Empty>No critical blockers.</Empty>}
        </Section>
        <Section title={`Approvals waiting (${approvals.length + (pendT.length ? 1 : 0)})`}>
          <ul className="plain list">{approvals.map(({ g, c }) => <li key={c.uid}><span className="dot accent" /><button className="linkish" onClick={() => nav.go({ gate: g.uid })}>{c.text}</button><Badge tone="accent">Evidence ready</Badge></li>)}
            {pendT.length > 0 && <li><span className="dot accent" /><button className="linkish" onClick={() => nav.screen('time')}>{pendT.length} time entries</button><Badge tone="warn"><Hrs v={pendT.reduce((a, e) => a + e.hours, 0)} /> pending</Badge></li>}</ul>
          {!approvals.length && !pendT.length && <Empty>Nothing waiting.</Empty>}
        </Section>
        <div className="span2"><Reports s={s} nav={nav} compact /></div>
        <Section title="Hours by discipline">
          <table className="grid-table small num-right"><thead><tr><th>Discipline</th><th>Approved</th><th>Pending</th></tr></thead><tbody>
            {E.group(s.time, (e) => DISC_NAMES[e.snap.disc] || e.snap.disc).map((r) => <tr key={r.key}><td>{r.key}</td><td><Hrs v={r.approved} /></td><td className="twarn"><Hrs v={r.pending} /></td></tr>)}</tbody></table>
        </Section>
        <Section title={`Over estimate (${over.length})`}>
          {over.length ? <ul className="plain list small">{over.map((o) => <li key={o.uid}><span className="dot warn" /><button className="linkish" onClick={() => o.task ? nav.timeline(o.task) : nav.phase(o.phase)}>{o.label}</button><span className="tbad"><Hrs v={o.used} /> of <Hrs v={o.est} /></span></li>)}</ul> : <Empty>No work package or task has used more hours than estimated.</Empty>}
          <p className="small muted">Approved + pending hours compared with the estimate. Effort variance, not schedule variance.</p>
        </Section>
        <Section title={`Jurisdiction decisions (${jur.length})`} right={<button className="linkish small" onClick={() => nav.screen('drawings')}>Open register</button>}>
          {jur.length ? <ul className="plain list">{jur.map((j) => <li key={j.id}><span className="dot warn" /><span>{j.title}</span><Badge tone="warn">{j.status === 'blocked' ? 'Blocked by decision' : 'Unverified'}</Badge></li>)}</ul> : <Empty>All relevant items verified.</Empty>}
        </Section>
        <Section title="Change requests">
          {s.changeRequests.length ? <ul className="plain list small">{s.changeRequests.map((c) => <li key={c.id}><span className="mono">{c.id}</span> {c.text}<Badge tone="warn">{c.status}</Badge></li>)}</ul> : <Empty>None. Required once Design Freeze is approved.</Empty>}
        </Section>
      </div>
    </div>
  );
}

export function MyWork({ s, nav, dispatch }) {
  const vp = E.viewerPerson(s);
  const [pick, setPick] = useState('mansour');
  const me = vp || pick;
  const p = E.person(s, me);
  const f = E.forecastAll(s);
  const tasks = Object.values(s.tasks).filter((t) => !t.archived && E.involves(s, t, me) && !E.done(s, t) && E.phase(s, E.phaseOfTask(s, t))?.state !== 'released').sort((a, b) => (a.pf < b.pf ? -1 : 1));
  const sheets = s.sheets.filter((x) => [x.lead, x.owner, ...x.contrib, ...x.reviewers].some((r) => E.resolve(s, r) === me) && x.approval !== 'issued');
  const irs = s.infoReq.filter((r) => E.resolve(s, r.to) === me && r.status !== 'received');
  const acts = s.actions.filter((a) => E.resolve(s, a.owner) === me && a.status !== 'closed');
  const conds = s.gates.flatMap((g) => g.conds.filter((c) => c.ev.type !== 'release' && c.status === 'pending' && E.resolve(s, c.owner) === me && E.phase(s, g.phase)?.state === 'active').map((c) => ({ g, c })));
  const time = s.time.filter((e) => e.person === me);
  const drafts = time.filter((e) => e.status === 'draft').length; const ret = time.filter((e) => e.status === 'returned').length;
  const week = E.weekOf(TODAY); const wk = time.filter((e) => e.date >= week).reduce((a, e) => a + e.hours, 0);
  const inc = tasks.filter((t) => E.incompleteTime(s, t).includes(me));
  return (
    <div className="page">
      <div className="page-h"><div><h1>My work · {p?.name}</h1><p className="muted">Everything assigned to {p?.name}, directly or through a project role. Same records as Workflow, Timeline and Drawings.</p></div>
        {!vp && <label className="small">Show work for <select id="mw-who" value={pick} onChange={(e) => setPick(e.target.value)}>{s.people.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}</div>
      <div className="dash">
        <Section title={`Tasks & subtasks (${tasks.length})`} className="span2">
          {tasks.length ? <div className="scroll"><table className="grid-table small"><thead><tr><th>Task</th><th>Role</th><th>Planned</th><th>Forecast</th><th>Progress</th><th>Hours (approved / est.)</th></tr></thead><tbody>
            {tasks.map((t) => { const r = f[t.uid] || {}; const h = E.hours(s, t.uid, false); const locked = E.phase(s, E.phaseOfTask(s, t)).state === 'locked'; return (
              <tr key={t.uid}><td><button className="linkish" onClick={() => nav.task(t.uid)}><TypeMark type={t.type} /> <span className="mono">{code(s, t)}</span> {t.title}</button>{t.parent && <div className="muted">in {code(s, s.tasks[t.parent])} {s.tasks[t.parent].title}</div>}</td>
                <td>{E.resolve(s, t.owner) === me ? 'Accountable' : 'Contributor'}</td>
                <td>{fmt(t.ps)} – {fmt(t.pf)}{locked && <div className="muted">phase locked</div>}</td>
                <td>{r.uncertain ? <span className="twarn" title={r.uncertain}>Uncertain</span> : r.finish ? <>{fmt(r.finish)} <Days n={E.workBetween(t.pf, r.finish, s.holidays)} />{r.unconf && <> <Unconf why={r.unconf} /></>}</> : '—'}</td>
                <td>{E.pctOf(s, t)}%</td><td><Hrs v={h.approved} /> / <Hrs v={t.est} />{h.pending > 0 && <div className="twarn">+<Hrs v={h.pending} /> pending</div>}</td></tr>); })}
          </tbody></table></div> : <Empty>No open tasks.</Empty>}
        </Section>
        <Section title="Time" right={<button className="linkish small" onClick={() => nav.screen('time')}>Open timesheets</button>}>
          <p className="small">This week <Hrs v={wk} /> of {p?.cap} h · {drafts} draft · {ret} returned</p>
          {inc.length > 0 && <p className="note warn small">No time logged this week on {inc.map((t) => code(s, t)).join(', ')}.</p>}
        </Section>
        <Section title={`Drawing sheets (${sheets.length})`}>
          {sheets.length ? <ul className="plain list small">{sheets.map((x) => <li key={x.no}><button className="linkish" onClick={() => nav.sheet(x.no)}><span className="mono">{x.no}</span> {x.title}</button><span className="muted">{[E.resolve(s, x.lead) === me && 'Lead', E.resolve(s, x.owner) === me && 'Owner', x.contrib.some((r) => E.resolve(s, r) === me) && 'Contributor', x.reviewers.some((r) => E.resolve(s, r) === me) && 'Reviewer'].filter(Boolean).join(', ')}</span><span>{x.pct}%</span></li>)}</ul> : <Empty>No sheets.</Empty>}
        </Section>
        <Section title={`Information requests (${irs.length})`}>
          {irs.length ? <ul className="plain list small">{irs.map((r) => <li key={r.id}><span className="mono faint">{r.id}</span> {r.text}<span className="muted">due {fmt(r.due)}</span></li>)}</ul> : <Empty>None.</Empty>}
        </Section>
        <Section title={`Actions & approvals (${acts.length + conds.length})`}>
          {acts.length + conds.length ? <ul className="plain list small">{acts.map((a) => <li key={a.id}><span className="dot bad" /><button className="linkish" onClick={() => nav.task(a.task)}>{a.id} {a.text}</button></li>)}
            {conds.map(({ g, c }) => <li key={c.uid}><span className="dot accent" /><button className="linkish" onClick={() => nav.go({ gate: g.uid })}>{E.gateName(s, g)}: {c.text}</button><Badge tone={E.evidence(s, c).ready ? 'accent' : 'neutral'}>{E.evidence(s, c).ready ? 'Ready' : 'Waiting on evidence'}</Badge></li>)}</ul> : <Empty>None.</Empty>}
        </Section>
      </div>
    </div>
  );
}

export function Calendar({ s, nav }) {
  const [month, setMonth] = useState(new Date('2026-10-01T12:00:00'));
  const events = useMemo(() => Object.values(s.tasks).filter((t) => !t.archived && ['meeting', 'review', 'submission', 'milestone', 'signoff'].includes(t.type)), [s.tasks]);
  const y = month.getFullYear(), m = month.getMonth();
  const first = new Date(y, m, 1), startDow = (first.getDay() + 6) % 7, daysIn = new Date(y, m + 1, 0).getDate();
  const cells = []; for (let i = 0; i < startDow; i++) cells.push(null); for (let d = 1; d <= daysIn; d++) cells.push(d);
  const key = (d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const upcoming = events.filter((e) => e.pf >= TODAY && !E.done(s, e)).sort((a, b) => (a.pf < b.pf ? -1 : 1)).slice(0, 8);
  return (
    <div className="page">
      <div className="page-h"><div><h1>Calendar</h1><p className="muted">Meetings, reviews, sign-offs and submissions from the workflow, on their current planned dates.</p></div>
        <div className="row"><Btn size="sm" onClick={() => setMonth(new Date(y, m - 1, 1))}>‹ Prev</Btn><b className="monthname">{month.toLocaleString('en', { month: 'long', year: 'numeric' })}</b><Btn size="sm" onClick={() => setMonth(new Date(y, m + 1, 1))}>Next ›</Btn></div></div>
      <div className="split cal-split">
        <div className="cal">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="dow">{d}</div>)}
          {cells.map((d, i) => (
            <div key={i} className={`cell ${d && key(d) === TODAY ? 'today' : ''} ${!d ? 'blank' : ''} ${d && s.holidays.includes(key(d)) ? 'hol' : ''}`}>
              {d && <span className="dn">{d}</span>}
              {d && events.filter((e) => e.pf === key(d)).map((e) => <button key={e.uid} className={`ev ${e.type} ${E.done(s, e) ? 'done' : ''}`} onClick={() => nav.task(e.uid)} title={e.title}><span className="mono">{code(s, e)}</span> {e.title}</button>)}
            </div>))}
        </div>
        <Section title="Upcoming">
          <ul className="plain list">{upcoming.map((e) => <li key={e.uid}><span className="mono faint">{fmt(e.pf)}</span><button className="linkish" onClick={() => nav.task(e.uid)}><TypeMark type={e.type} /> {e.title}</button></li>)}</ul>
          <p className="small muted">All dates are illustrative.</p>
        </Section>
      </div>
    </div>
  );
}
