import * as E from './engine.js';
import { Badge, Btn, fmt, Section, Hrs, Days } from './ui.jsx';

const { useState, useMemo, useEffect } = React;
const { code, pad, TODAY } = E;

const MODES = [['plan', 'Planned only'], ['actual', 'Planned + Actual'], ['forecast', 'Planned + Actual + Forecast']];
const START = '2026-08-31', END = '2027-12-31';

export function Timeline({ s, dispatch, ui, setUi, nav }) {
  const mode = ui.tlMode || 'actual';
  const base = !!ui.tlBase;
  const zoom = ui.tlZoom || 3.5; // px per day
  const sel = ui.tlSel || null;
  const [open, setOpen] = useState(() => ({ PH1: true, PH2: true }));
  const set = (patch) => setUi((u) => ({ ...u, ...patch }));
  const f = E.forecastAll(s);
  const days = (a, b) => Math.round((E.toD(b) - E.toD(a)) / 864e5);
  const x = (d) => Math.max(0, days(START, d)) * zoom;
  const width = days(START, END) * zoom;
  const months = useMemo(() => { const out = []; let d = START; while (d < END) { out.push(d); const t = E.toD(d); t.setMonth(t.getMonth() + 1); d = E.iso(t).slice(0, 8) + '01'; } return out; }, []);

  useEffect(() => { // reveal a task opened from elsewhere
    if (!sel || !s.tasks[sel]) return;
    const t = s.tasks[sel]; const ph = E.phaseOfTask(s, t);
    setOpen((o) => ({ ...o, [ph]: true, [t.wp]: true, ...(t.parent ? { [t.parent]: true } : {}) }));
    setTimeout(() => document.getElementById(`tl-${sel}`)?.scrollIntoView({ block: 'center' }), 30);
  }, [sel]);

  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const rows = [];
  E.livePhases(s).forEach((p) => {
    rows.push({ kind: 'phase', p });
    if (!open[p.uid]) return;
    E.wpsOf(s, p.uid).forEach((w) => {
      rows.push({ kind: 'wp', w, p });
      if (!open[w.uid]) return;
      E.topTasks(s, w.uid).forEach((t) => {
        rows.push({ kind: 'task', t });
        if (open[t.uid]) E.children(s, t.uid).forEach((k) => rows.push({ kind: 'sub', t: k }));
      });
    });
  });

  const Bars = ({ plan, baseline, actual, pending, fc, uncertain, done, milestone }) => (
    <div className="lanes">
      <div className="lane">
        {base && baseline?.[0] && <span className="b-base" style={{ left: x(baseline[0]), width: Math.max(2, x(baseline[1]) - x(baseline[0]) + zoom) }} title={`Baseline ${fmt(baseline[0])} – ${fmt(baseline[1])}`} />}
        {plan?.[0] && <span className={`b-plan ${milestone ? 'ms' : ''}`} style={{ left: x(plan[0]), width: Math.max(3, x(plan[1]) - x(plan[0]) + zoom) }} title={`Current plan ${fmt(plan[0])} – ${fmt(plan[1])}`} />}
      </div>
      {mode !== 'plan' && <div className="lane">
        {actual?.[0] && <span className={`b-act ${done ? 'done' : ''}`} style={{ left: x(actual[0]), width: Math.max(3, x(actual[1]) - x(actual[0]) + zoom) }} title={`Actual ${fmt(actual[0])} – ${done ? fmt(actual[1]) : `last approved work ${fmt(actual[1])}`}`} />}
        {pending?.[0] && <span className="b-pend" style={{ left: x(pending[0]), width: Math.max(3, x(pending[1]) - x(pending[0]) + zoom) }} title="Submitted hours awaiting PM approval (not counted as actual)" />}
        {mode === 'forecast' && fc?.[0] && <span className={`b-fc ${uncertain ? 'unc' : ''}`} style={{ left: x(fc[0]), width: Math.max(3, x(fc[1]) - x(fc[0]) + zoom) }} title={uncertain ? `Forecast uncertain: ${uncertain}` : `Forecast ${fmt(fc[0])} – ${fmt(fc[1])}`}>{uncertain ? <i>?</i> : null}</span>}
        {mode === 'forecast' && uncertain && !fc?.[0] && <span className="b-unc" style={{ left: x(TODAY) + 4 }}>Forecast uncertain</span>}
      </div>}
    </div>
  );

  const taskBars = (t) => {
    const r = f[t.uid] || {};
    const d = E.done(s, t);
    const actEnd = d ? t.af : r.lastAct;
    return <Bars plan={[t.ps, t.pf]} baseline={[t.bs, t.bf]} done={d} milestone={t.type === 'milestone' || t.type === 'signoff'}
      actual={r.aStart ? [r.aStart, actEnd || r.aStart] : null}
      pending={r.firstPending ? [r.lastAct && r.lastAct > r.firstPending ? r.lastAct : r.firstPending, r.lastPending] : null}
      fc={!d && r.finish ? [r.start, r.finish] : null} uncertain={!d && r.uncertain} />;
  };
  const variance = (t) => {
    const r = f[t.uid] || {};
    if (E.done(s, t)) return <Days n={E.workBetween(t.pf, t.af, s.holidays)} />;
    if (mode === 'forecast') return r.uncertain ? <span className="var unc" title={r.uncertain}>uncertain</span> : r.finish ? <Days n={E.workBetween(t.pf, r.finish, s.holidays)} /> : null;
    if (mode === 'actual' && r.aStart) return <Days n={E.workBetween(t.ps, r.aStart, s.holidays)} />;
    return null;
  };

  const tf = sel && s.tasks[sel];
  return (
    <div className="page">
      <div className="page-h"><div><h1>Master timeline</h1><p className="muted">Demo Residence · one schedule, driven by the workflow, approved hours and the forecast rules below.</p></div></div>
      <div className="toolbar wrap">
        <div className="seg" role="group" aria-label="Overlay">{MODES.map(([k, l]) => <button key={k} className={mode === k ? 'on' : ''} aria-pressed={mode === k} onClick={() => set({ tlMode: k })}>{l}</button>)}</div>
        <label className="check small"><input type="checkbox" id="tl-base" checked={base} onChange={(e) => set({ tlBase: e.target.checked })} /> Compare with approved baseline</label>
        <div className="seg small-seg" role="group" aria-label="Zoom"><button className={zoom < 2 ? 'on' : ''} onClick={() => set({ tlZoom: 1.4 })}>Year</button><button className={zoom >= 2 && zoom < 6 ? 'on' : ''} onClick={() => set({ tlZoom: 3.5 })}>Quarter</button><button className={zoom >= 6 ? 'on' : ''} onClick={() => set({ tlZoom: 9 })}>Month</button></div>
        <button className="linkish small" onClick={() => setOpen(Object.fromEntries([...s.phases.map((p) => [p.uid, true]), ...s.wps.map((w) => [w.uid, true]), ...Object.values(s.tasks).filter((t) => t.parent).map((t) => [t.parent, true])]))}>Expand all</button>
        <button className="linkish small" onClick={() => setOpen({})}>Collapse all</button>
      </div>
      <div className="legend tl-legend" aria-label="Legend">
        {base && <span><i className="lg-base" /> Baseline (approved)</span>}
        <span><i className="lg-plan" /> Current plan</span>
        {mode !== 'plan' && <><span><i className="lg-act" /> Actual (approved hours)</span><span><i className="lg-pend" /> Submitted, not yet approved</span></>}
        {mode === 'forecast' && <span><i className="lg-fc" /> Forecast (not actual)</span>}
        <span><span className="var warn">+3d</span> / <span className="var bad">+8d</span> late vs plan · <span className="var ok">on plan</span></span>
        <span className="tl-today-l">│ Today {fmt(TODAY)}</span>
      </div>
      <div className={`tl-wrap ${tf ? 'with-detail' : ''}`}>
        <div className="tl" role="table" aria-label="Master timeline">
          <div className="tl-row tl-head" role="row">
            <div className="tl-label" role="columnheader">Phase / work package / task</div>
            <div className="tl-var" role="columnheader">Var.</div>
            <div className="tl-track" style={{ width }}>{months.map((m) => <span key={m} className="tl-m" style={{ left: x(m) }}>{E.toD(m).toLocaleString('en-US', { month: 'short' })}{m.slice(5, 7) === '01' || m === START ? ` ${m.slice(2, 4)}` : ''}</span>)}</div>
          </div>
          {rows.map((r) => {
            if (r.kind === 'phase') {
              const p = r.p; const ps = E.phaseSchedule(s, p.uid); const g = E.gateOfPhase(s, p.uid);
              const unscoped = p.unscoped && !ps.count;
              return (
                <div key={p.uid} className="tl-row tl-phase" role="row">
                  <div className="tl-label"><button className="tw" aria-expanded={!!open[p.uid]} onClick={() => toggle(p.uid)}>{open[p.uid] ? '▾' : '▸'}</button><span className="mono">{pad(E.phaseNo(s, p.uid))}</span> <b>{p.title}</b>
                    <div className="small muted">{unscoped ? 'Not yet scoped · excluded from forecasts' : <>{p.state === 'released' ? 'Released' : p.state === 'active' ? 'Active' : 'Locked'} · <Hrs v={ps.approved} /> of <Hrs v={ps.est} /> est.{ps.pending ? <> · <Hrs v={ps.pending} /> pending</> : null}</>}</div></div>
                  <div className="tl-var">{unscoped ? null : p.state === 'released' ? <Days n={E.workBetween(ps.pf, ps.af, s.holidays)} /> : mode === 'forecast' ? (ps.uncertain ? <span className="var unc" title={ps.uncertain}>uncertain</span> : <Days n={E.workBetween(ps.pf, ps.ff, s.holidays)} />) : null}</div>
                  <div className="tl-track" style={{ width }}>
                    <Today x={x} />
                    {!unscoped && <Bars plan={[ps.ps, ps.pf]} baseline={[ps.bs, ps.bf]} actual={ps.as ? [ps.as, ps.af || TODAY] : null} done={!!ps.af} fc={!ps.af && ps.ff ? [ps.as || ps.ps, ps.ff] : null} uncertain={ps.uncertain} />}
                    {g && ps.pf && <span className={`tl-gate ${p.state === 'released' ? 'rel' : ''}`} style={{ left: x(ps.af || ps.pf) }} title={`${E.gateName(s, g)} ${p.state === 'released' ? 'released' : `· ${ps.gatePending} approvals pending — gate controls completion`}`}>◆</span>}
                  </div>
                </div>);
            }
            if (r.kind === 'wp') {
              const all = E.allRecordsOfPhase(s, r.p.uid).filter((t) => t.wp === r.w.uid);
              const ps = all.reduce((a, t) => (!a || t.ps < a ? t.ps : a), null), pf = all.reduce((a, t) => (!a || t.pf > a ? t.pf : a), null);
              const ff = all.reduce((a, t) => { const q = E.done(s, t) ? t.af : f[t.uid]?.finish; return q && (!a || q > a) ? q : a; }, null);
              const unc = all.map((t) => f[t.uid]?.uncertain).find(Boolean);
              const as = all.map((t) => f[t.uid]?.aStart).filter(Boolean).sort()[0];
              const allDone = all.length && all.every((t) => E.done(s, t));
              return (
                <div key={r.w.uid} className="tl-row tl-wp" role="row">
                  <div className="tl-label ind1"><button className="tw" aria-expanded={!!open[r.w.uid]} onClick={() => toggle(r.w.uid)}>{open[r.w.uid] ? '▾' : '▸'}</button><span className="ell" title={r.w.title}>{r.w.title}</span></div>
                  <div className="tl-var">{mode === 'forecast' && pf ? (unc && !allDone ? <span className="var unc" title={unc}>uncertain</span> : <Days n={E.workBetween(pf, ff, s.holidays)} />) : null}</div>
                  <div className="tl-track" style={{ width }}><Today x={x} />{ps && <Bars plan={[ps, pf]} baseline={[all.reduce((a, t) => (t.bs && (!a || t.bs < a) ? t.bs : a), null), all.reduce((a, t) => (t.bf && (!a || t.bf > a) ? t.bf : a), null)]} actual={as ? [as, allDone ? ff : TODAY] : null} done={allDone} fc={!allDone && ff ? [as || ps, ff] : null} uncertain={!allDone && unc} />}</div>
                </div>);
            }
            const t = r.t; const kids = E.children(s, t.uid).length; const inc = E.incompleteTime(s, t);
            return (
              <div key={t.uid} id={`tl-${t.uid}`} className={`tl-row tl-task ${r.kind === 'sub' ? 'sub' : ''} ${sel === t.uid ? 'sel' : ''}`} role="row">
                <div className={`tl-label ${r.kind === 'sub' ? 'ind3' : 'ind2'}`}>
                  {kids ? <button className="tw" aria-expanded={!!open[t.uid]} onClick={() => toggle(t.uid)}>{open[t.uid] ? '▾' : '▸'}</button> : <span className="tw" />}
                  <button className="linkish tl-name" onClick={() => set({ tlSel: sel === t.uid ? null : t.uid })}><span className="mono faint">{code(s, t)}</span> {t.title}</button>
                  {inc.length > 0 && mode !== 'plan' && <span className="flag" title={`No recent time from ${inc.map((p) => E.person(s, p).name).join(', ')}`}>⚑</span>}
                </div>
                <div className="tl-var">{variance(t)}</div>
                <div className="tl-track clickable" style={{ width }} onClick={() => set({ tlSel: t.uid })}><Today x={x} />{taskBars(t)}</div>
              </div>);
          })}
        </div>
        {tf && <TaskPanel s={s} t={tf} dispatch={dispatch} nav={nav} close={() => set({ tlSel: null })} />}
      </div>
      <Section title="How the forecast is calculated" className="rules">
        <ul className="plain small">
          <li>• Remaining effort = PM-entered value, otherwise estimate × (1 − progress). Hours logged never change progress.</li>
          <li>• Weekly rate = each assignee's weekly capacity ÷ number of open tasks they share in the same planned window. The PM can override any allocation.</li>
          <li>• Roles not yet assigned to a person use a 32 h/week planning assumption, labelled on the task.</li>
          <li>• A task starts no earlier than today, its planned start, its dependencies' forecast finish, and the forecast release of the previous phase gate.</li>
          <li>• Weekends and holidays ({s.holidays.map(fmt).join(', ')}) are skipped. Blockers, holds and missing capacity make a forecast uncertain instead of guessing.</li>
          <li>• Actual bars use approved hours only. Submitted hours show separately. Gates, not hours or forecasts, complete a phase.</li>
        </ul>
      </Section>
    </div>
  );
}

const Today = ({ x }) => <span className="tl-today" style={{ left: x(TODAY) }} aria-hidden="true" />;

function TaskPanel({ s, t, dispatch, nav, close }) {
  const f = E.forecastAll(s)[t.uid] || {};
  const h = E.hours(s, t.uid, false);
  const hk = E.hours(s, t.uid, true);
  const pm = E.isPM(s);
  const [rem, setRem] = useState(E.remainingOf(s, t));
  const [why, setWhy] = useState('');
  const [alloc, setAlloc] = useState({});
  useEffect(() => { setRem(E.remainingOf(s, t)); setWhy(''); setAlloc({}); }, [t.uid, t.remaining, t.pct]);
  const d = E.done(s, t);
  const est = E.estRollup(s, t);
  const effortVar = Math.round((hk.approved + (d ? 0 : E.remainingOf(s, t) + E.children(s, t.uid).reduce((a, k) => a + (E.done(s, k) ? 0 : E.remainingOf(s, k)), 0)) - est) * 10) / 10;
  const elapsed = f.aStart ? E.workBetween(f.aStart, d ? t.af : TODAY, s.holidays) + 1 : null;
  const inc = E.incompleteTime(s, t);
  return (
    <aside className="tl-detail panel" aria-label="Task schedule detail">
      <header className="panel-h"><h2><span className="mono">{code(s, t)}</span> {t.title}</h2><button className="linkish" onClick={close} aria-label="Close">✕</button></header>
      <table className="kv small"><tbody>
        <tr><th>Baseline</th><td>{t.bs ? <>{fmt(t.bs)} – {fmt(t.bf)}</> : <span className="muted">Not in baseline (added after approval)</span>}</td></tr>
        <tr><th>Current plan</th><td>{fmt(t.ps)} – {fmt(t.pf)} {t.bf && t.bf !== t.pf && <Days n={E.workBetween(t.bf, t.pf, s.holidays)} />}</td></tr>
        <tr><th>Actual start</th><td>{f.aStart ? fmt(f.aStart) : <span className="muted">Not started</span>} {f.aStart && <Days n={E.workBetween(t.ps, f.aStart, s.holidays)} />}</td></tr>
        <tr><th>{d ? 'Actual finish' : 'Last approved work'}</th><td>{d ? <>{fmt(t.af)} <Days n={E.workBetween(t.pf, t.af, s.holidays)} /></> : f.lastAct ? fmt(f.lastAct) : '—'}</td></tr>
        {elapsed && <tr><th>Elapsed</th><td>{elapsed} working days</td></tr>}
        <tr><th>Progress</th><td>{E.pctOf(s, t)}% <span className="muted">(set in Workflow, independent of hours)</span></td></tr>
        {!d && <tr><th>Forecast</th><td>{f.uncertain ? <span className="twarn">Uncertain · {f.uncertain}</span> : f.finish ? <>{fmt(f.start)} – <b>{fmt(f.finish)}</b> <Days n={E.workBetween(t.pf, f.finish, s.holidays)} /></> : '—'}{f.cond?.length > 0 && <div className="muted">Assumes {f.cond.join(', ')} on forecast</div>}</td></tr>}
      </tbody></table>
      <h4>Effort</h4>
      <table className="kv small"><tbody>
        <tr><th>Estimated</th><td><Hrs v={est} />{est !== t.est && <span className="muted"> (incl. subtasks)</span>}</td></tr>
        <tr><th>Approved actual</th><td><Hrs v={hk.approved} /></td></tr>
        <tr><th>Submitted, pending</th><td><Hrs v={hk.pending} /> <span className="muted">not counted until approved</span></td></tr>
        <tr><th>Remaining</th><td><Hrs v={d ? 0 : E.remainingOf(s, t)} /> {t.remaining != null ? <Badge tone="accent">PM estimate</Badge> : <span className="muted">default rule</span>}</td></tr>
        <tr><th>Effort variance</th><td><span className={`var ${effortVar > est * 0.1 ? 'bad' : effortVar > 0 ? 'warn' : 'ok'}`}>{effortVar > 0 ? '+' : ''}{effortVar} h</span> <span className="muted">approved + remaining vs estimate</span></td></tr>
      </tbody></table>
      {inc.length > 0 && <p className="note warn small">No time logged in the last week by {inc.map((p) => E.person(s, p).name).join(', ')}. Actuals may be incomplete.</p>}
      {!d && <>
        <h4>Resourcing used by the forecast</h4>
        <table className="grid-table small"><thead><tr><th>Assignee</th><th>Capacity</th><th>Shared with</th><th>h / wk</th></tr></thead><tbody>
          {(f.alloc || []).map((a) => <tr key={a.id}><td>{a.name}{a.placeholder && <div className="muted">assumption</div>}</td><td>{a.cap} h</td><td>{a.load} task{a.load > 1 ? 's' : ''}</td>
            <td>{pm ? <input type="number" min="0" max="40" step="1" aria-label={`Hours per week for ${a.name}`} className="num" value={alloc[a.id] ?? a.hpw} onChange={(e) => setAlloc({ ...alloc, [a.id]: Number(e.target.value) })} /> : a.hpw}{a.explicit && <span className="muted"> set</span>}</td></tr>)}
        </tbody></table>
        {pm ? <div className="form tight">
          <label>Remaining effort (h)<input id="tl-rem" type="number" min="0" value={rem} onChange={(e) => setRem(Number(e.target.value))} /></label>
          <label className="span2">Reason (required)<input id="tl-why" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="e.g. Survey data arrived; redline scope smaller" /></label>
          <div className="row span2">
            <Btn kind="primary" size="sm" disabled={!why.trim()} reason="Record a reason" onClick={() => {
              if (rem !== E.remainingOf(s, t)) dispatch({ type: 'REMAINING', uid: t.uid, hours: rem, reason: why });
              Object.entries(alloc).forEach(([p, v]) => dispatch({ type: 'ALLOC', uid: t.uid, person: p, hpw: v, reason: why }));
            }}>Update forecast inputs</Btn>
            <Btn size="sm" onClick={() => dispatch({ type: 'HOLD', uid: t.uid, on: !t.hold })}>{t.hold ? 'Release hold' : 'Place on hold'}</Btn>
          </div>
        </div> : <p className="small muted">Only the PM adjusts remaining effort and allocation.</p>}
      </>}
      {t.remHistory.length > 0 && <><h4>Forecast input history</h4><ul className="plain small hist">{t.remHistory.map((r, i) => <li key={i}>{fmt(r.date)} · {r.by}: {r.alloc || `remaining ${r.from} → ${r.to} h`} — "{r.reason}"</li>)}</ul></>}
      <p className="row wrap"><button className="linkish small" onClick={() => nav.task(t.uid)}>Open in Workflow</button><button className="linkish small" onClick={() => nav.time(t.uid)}>Timesheet entries ({h.entries.length})</button></p>
    </aside>
  );
}

export function schedulePerformance(s) {
  const f = E.forecastAll(s);
  const scoped = E.livePhases(s).filter((p) => !(p.unscoped && !E.phaseSchedule(s, p.uid).count));
  const rows = scoped.map((p) => ({ p, ...E.phaseSchedule(s, p.uid) }));
  const last = rows[rows.length - 1];
  const bf = rows.reduce((a, r) => (r.bf && (!a || r.bf > a) ? r.bf : a), null);
  const pf = rows.reduce((a, r) => (r.pf && (!a || r.pf > a) ? r.pf : a), null);
  const unc = rows.find((r) => r.uncertain && !r.af);
  const drivers = Object.values(s.tasks).filter((t) => !t.archived && !E.done(s, t) && f[t.uid]?.finish && f[t.uid].finish > t.pf)
    .map((t) => ({ t, d: E.workBetween(t.pf, f[t.uid].finish, s.holidays) })).sort((a, b) => b.d - a.d).slice(0, 4);
  const blocked = Object.values(s.tasks).filter((t) => !t.archived && !E.done(s, t) && (t.blocker || t.hold));
  return { rows, bf, pf, ff: last?.ff, uncertain: unc?.uncertain, drivers, blocked,
    est: rows.reduce((a, r) => a + r.est, 0), approved: rows.reduce((a, r) => a + r.approved, 0), rem: rows.reduce((a, r) => a + r.rem, 0), pending: rows.reduce((a, r) => a + r.pending, 0) };
}
