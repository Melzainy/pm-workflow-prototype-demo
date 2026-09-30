import { DISC_NAMES } from './seed.js';
import * as E from './engine.js';
import { Badge, Btn, Bar, Illus, TypeMark, fmt, Section, Hrs, WhoSelect, MultiWho, Req, Days } from './ui.jsx';

const { useState } = React;
const { code, whoLabel, pad } = E;

// ── Next actions (computed, per viewer) ─────────────────────────────────────
export function nextActions(s) {
  const out = []; const me = E.viewerPerson(s); const pm = E.isPM(s) || E.isAdmin(s) || E.isExec(s);
  const mine = (t) => pm || (me && E.involves(s, t, me));
  const active = E.livePhases(s).find((p) => p.state === 'active');
  if (!active) return out;
  E.allRecordsOfPhase(s, active.uid).forEach((t) => {
    if (t.parent) return;
    const st = E.status(s, t);
    if (!mine(t)) return;
    if (st.key === 'overdue') out.push({ rank: 0, tone: 'bad', label: 'Overdue', task: t.uid, text: t.title, sub: `due ${fmt(t.pf)} · ${whoLabel(s, t.owner)}`, owner: t.owner });
    if (st.key === 'blocked') out.push({ rank: 1, tone: 'bad', label: 'Blocked', task: t.uid, text: t.title, sub: t.blocker, owner: t.owner });
    const inc = E.incompleteTime(s, t);
    if (inc.length && pm) out.push({ rank: 3, tone: 'warn', label: 'Timesheets missing', task: t.uid, text: t.title, sub: `No time logged this week by ${inc.map((p) => E.person(s, p).name).join(', ')}`, owner: t.owner });
  });
  s.actions.filter((a) => a.critical && a.status !== 'closed').forEach((a) => out.push({ rank: 1, tone: 'bad', label: 'Critical action', task: a.task, text: `${a.id} ${a.text}`, sub: `blocks gate · ${whoLabel(s, a.owner)}`, owner: a.owner }));
  const g = E.gateOfPhase(s, active.uid);
  if (g && E.isPM(s)) {
    g.conds.forEach((c) => { if (c.ev.type !== 'release' && c.status === 'pending' && E.evidence(s, c).ready) out.push({ rank: 2, tone: 'accent', label: 'Ready to approve', gate: g.uid, text: c.text, sub: 'Evidence complete', owner: c.owner }); });
    if (E.gateReadiness(s, g.uid).ready) out.push({ rank: 0, tone: 'ok', label: 'Gate ready', gate: g.uid, text: `Release ${E.gateName(s, g)}`, sub: 'All conditions approved', owner: 'role:pm' });
  }
  const pend = s.time.filter((e) => e.status === 'submitted');
  if (E.isPM(s) && pend.length) out.push({ rank: 2, tone: 'accent', label: 'Timesheets', screen: 'time', text: `${pend.length} time entries waiting for approval`, sub: `${pend.reduce((a, e) => a + e.hours, 0)} h pending`, owner: 'role:pm' });
  return out.sort((a, b) => a.rank - b.rank);
}

export function StatusStrip({ s, nav }) {
  const active = E.livePhases(s).find((p) => p.state === 'active');
  const na = nextActions(s); const next = na[0];
  const g = active && E.gateOfPhase(s, active.uid); const r = g && E.gateReadiness(s, g.uid);
  const f = E.forecastAll(s); const ph = active && E.phaseSchedule(s, active.uid);
  const delay = ph && ph.ff && ph.pf ? E.workBetween(ph.pf, ph.ff, s.holidays) : null;
  return (
    <section className="status" aria-label="Where the project stands">
      <div><div className="lbl">Where we are</div><strong>{active ? `Phase ${pad(E.phaseNo(s, active.uid))} · ${active.title.split(' &')[0]}` : '—'}</strong><div className="sub">{active ? `${E.phaseProgress(s, active.uid) ?? 0}% weighted progress` : ''}</div></div>
      <div><div className="lbl">Next required action</div>{next ? <button className="linkish" onClick={() => nav.go(next)}><strong>{next.text}</strong></button> : <strong>Nothing waiting</strong>}<div className="sub">{next?.label}</div></div>
      <div><div className="lbl">Responsible</div><strong>{next ? whoLabel(s, next.owner) : '—'}</strong><div className="sub">Viewing as {E.viewerLabel(s)}</div></div>
      <div><div className="lbl">Blocking progress</div><strong className={na.some((x) => x.tone === 'bad') ? 'tbad' : ''}>{na.filter((x) => x.tone === 'bad').length || 'Nothing'} blocking</strong><div className="sub">Overdue, blocked, critical actions</div></div>
      <div><div className="lbl">Schedule</div><strong>{ph?.ff ? <>Forecast {fmt(ph.ff)} <Days n={delay} /></> : 'Forecast uncertain'}</strong><div className="sub">{g ? `${E.gateName(s, g)} · ${r.approved} of ${r.total} approved` : ''}</div></div>
    </section>
  );
}

export function JurLine({ s, nav }) {
  const open = E.jurOpen(s);
  return (
    <section className="jur" aria-label="Jurisdiction verification">
      <span><b>Jurisdiction</b> · {open.length ? `${open.length} unresolved decisions` : 'all verified'}</span>
      <span className="muted">{open.map((j) => j.title.split(' (')[0]).join(' · ')}</span>
      <button className="linkish small" onClick={() => nav.screen('drawings')}>Open register</button>
      <Badge tone={open.length ? 'warn' : 'ok'}>Permit readiness: {open.length ? 'Not ready' : 'Internally complete'}</Badge>
    </section>
  );
}

export function NextActions({ s, nav }) {
  const list = nextActions(s).slice(0, 6);
  return (
    <Section title="Next actions" right={<span className="muted small">For {E.viewerLabel(s)}</span>}>
      {list.length ? <ol className="next">{list.map((n, i) => (
        <li key={i}><span className={`dot ${n.tone}`} /><button className="linkish" onClick={() => nav.go(n)}>{n.task && <span className="mono faint">{code(s, s.tasks[n.task])}</span>} {n.text}</button>
          <span className="muted small hide-sm">{n.sub}</span><Badge tone={n.tone}>{n.label}</Badge></li>))}</ol> : <p className="empty">Nothing is waiting on this role.</p>}
    </Section>
  );
}

// ── Workflow ────────────────────────────────────────────────────────────────
export function Workflow({ s, dispatch, ui, setUi, nav }) {
  const [f, setF] = useState({ disc: 'all', mine: false, open: false });
  const me = E.viewerPerson(s);
  const pass = (t) => (f.disc === 'all' || t.disc === f.disc) && (!f.mine || (me && (E.involves(s, t, me) || E.children(s, t.uid).some((k) => E.involves(s, k, me))))) && (!f.open || !E.done(s, t));
  const filtering = f.disc !== 'all' || f.mine || f.open;
  const active = E.livePhases(s).find((p) => p.state === 'active');
  const flip = (key, id, cur) => setUi((u) => ({ ...u, [key]: { ...u[key], [id]: !cur } }));
  return (
    <>
      <StatusStrip s={s} nav={nav} />
      <JurLine s={s} nav={nav} />
      <NextActions s={s} nav={nav} />
      <div className="toolbar">
        <div className="filters" role="group" aria-label="Filter">
          <span className="lbl">Filter</span>
          {['all', 'arch', 'int', 'str', 'mep', 'civ', 'bim', 'mfg', 'pm'].map((d) => <button key={d} className={`chip ${f.disc === d ? 'on' : ''}`} onClick={() => setF({ ...f, disc: d })}>{d === 'all' ? 'All disciplines' : DISC_NAMES[d]}</button>)}
          <button className={`chip ${f.mine ? 'on' : ''}`} disabled={!me} title={!me ? 'Choose a team member in Viewing as' : undefined} onClick={() => setF({ ...f, mine: !f.mine })}>Assigned to me</button>
          <button className={`chip ${f.open ? 'on' : ''}`} onClick={() => setF({ ...f, open: !f.open })}>Open only</button>
        </div>
        <div className="demo-tools"><span className="lbl">Demo shortcut</span>
          <Btn size="sm" disabled={!active || !E.isPM(s)} reason="Switch to Project Manager" onClick={() => dispatch({ type: 'DEMO_PHASE', p: active.uid })}>Complete all Phase {active ? pad(E.phaseNo(s, active.uid)) : ''} tasks</Btn></div>
      </div>
      <div className="legend">
        {[['task', 'Task'], ['meeting', 'Meeting'], ['review', 'Review'], ['decision', 'Decision'], ['signoff', 'Client sign-off'], ['milestone', 'Milestone']].map(([t, l]) => <span key={t}><TypeMark type={t} />{l}</span>)}
        <span><span className="reqtag">Optional</span><span className="reqtag cond">Conditional</span></span>
        <span><Illus>Dotted</Illus> = illustrative</span>
      </div>
      {E.livePhases(s).map((p) => <Phase key={p.uid} s={s} p={p} dispatch={dispatch} ui={ui} flip={flip} pass={pass} filtering={filtering} nav={nav} />)}
    </>
  );
}

function Phase({ s, p, dispatch, ui, flip, pass, filtering, nav }) {
  const no = pad(E.phaseNo(s, p.uid));
  const open = ui.phases[p.uid] ?? p.state === 'active';
  const wps = E.wpsOf(s, p.uid);
  const top = E.tasksOfPhase(s, p.uid);
  const prog = E.phaseProgress(s, p.uid);
  const g = E.gateOfPhase(s, p.uid);
  const sch = E.phaseSchedule(s, p.uid);
  const prev = E.livePhases(s)[E.phaseNo(s, p.uid) - 2];
  const badge = { active: <Badge tone="accent">Active</Badge>, released: <Badge tone="ok">Released</Badge>, locked: <Badge>{p.unscoped ? 'Not scoped' : 'Locked'}</Badge> }[p.state];
  return (
    <section className={`phase ${p.state}`} id={`phase-${p.uid}`}>
      <button className="phase-h" aria-expanded={open} onClick={() => flip('phases', p.uid, open)}>
        <span className="phase-no">{no}</span>
        <span className="phase-t"><span className="phase-title">{p.title}{p.legacy && p.legacy !== no && <span className="legacy">formerly {p.legacy}</span>}</span>
          <span className="phase-sub">{wps.length} work packages{top.length ? ` · ${top.length} tasks` : ''}{g ? ` · Gate ${no}: ${p.gateTitle} (${g.conds.length} conditions)` : ''}{sch.est ? ` · ${sch.approved} of ${sch.est} h approved` : ''}</span></span>
        <span className="phase-r">{prog !== null && <><Bar value={prog} /><Illus title="Weighted task progress (weights proposed). Hours do not affect it.">{prog}%</Illus></>}{badge}<span className="caret" aria-hidden="true">{open ? '▾' : '▸'}</span></span>
      </button>
      {open && (
        <div className="phase-b">
          {p.state === 'locked' && !p.unscoped && prev && <p className="note">Locked until Gate {pad(E.phaseNo(s, prev.uid))} is released. The PM can plan owners and dates; progress and time logging wait.</p>}
          {p.unscoped && <p className="note">Work packages only. Tasks, durations, weights and owners are added in Admin once the construction management plan exists.</p>}
          {p.state === 'released' && <p className="note ok">Released by {s.releases[g?.uid]?.by} (simulated). History in this phase is protected.</p>}
          {wps.map((w) => {
            const its = E.topTasks(s, w.uid).filter(pass);
            if (filtering && !its.length) return null;
            const all = E.topTasks(s, w.uid);
            const wopen = ui.wps[w.uid] ?? (p.state === 'active' && all.some((t) => !E.done(s, t)));
            return (
              <div className="wp" key={w.uid}>
                <button className="wp-h" aria-expanded={wopen} onClick={() => flip('wps', w.uid, wopen)}>
                  <span><span className="caret" aria-hidden="true">{wopen ? '▾' : '▸'}</span> {w.title}</span>
                  <span className="r">{all.length ? `${all.filter((t) => E.done(s, t)).length}/${all.length} complete` : 'No tasks yet'}</span>
                </button>
                {wopen && its.length > 0 && <ul className="items">{its.map((t) => <TaskRow key={t.uid} s={s} t={t} dispatch={dispatch} open={ui.task === t.uid} nav={nav} />)}</ul>}
              </div>);
          })}
          {g && <Gate s={s} g={g} dispatch={dispatch} nav={nav} />}
        </div>)}
    </section>
  );
}

function TaskRow({ s, t, dispatch, open, nav }) {
  const st = E.status(s, t);
  const h = E.hours(s, t.uid);
  const est = E.estRollup(s, t);
  const kids = E.children(s, t.uid);
  return (
    <li id={`task-${t.uid}`} className={open ? 'open' : ''}>
      <button className="item-row" aria-expanded={open} onClick={() => nav.task(open ? null : t.uid)}>
        <TypeMark type={t.type} />
        <span className="mono faint">{code(s, t)}</span>
        <span className="title">{t.title} <Req req={t.req} />{kids.length > 0 && <span className="muted small"> · {kids.filter((k) => E.done(s, k)).length}/{kids.length} subtasks</span>}{t.blocker && !E.done(s, t) && <span className="flag">● blocker</span>}</span>
        <span className="owner">{whoLabel(s, t.owner)}</span>
        <span className="mono faint hide-sm" title="Approved / estimated hours">{est ? `${h.approved}/${est} h` : ''}</span>
        <span className="mono faint due"><Illus>{fmt(t.pf)}</Illus></span>
        <Badge tone={st.tone}>{st.label}</Badge>
      </button>
      {open && <TaskDetail s={s} t={t} dispatch={dispatch} nav={nav} />}
    </li>
  );
}

export function TaskDetail({ s, t, dispatch, nav }) {
  const lockedPhase = E.locked(s, t);
  const edit = E.canEditTask(s, t) && !lockedPhase;
  const why = lockedPhase ? 'This phase is locked' : 'Only assigned people or the PM can update this task';
  const assign = E.isPM(s) || E.isAdmin(s);
  const h = E.hours(s, t.uid); const est = E.estRollup(s, t); const f = E.forecastAll(s)[t.uid] || {};
  const kids = E.children(s, t.uid);
  const groups = [...new Set(kids.map((k) => k.group || ''))];
  const inc = E.incompleteTime(s, t);
  return (
    <div className="detail">
      <div className="dcol">
        <h4>Accountable owner</h4>
        <WhoSelect s={s} id={`own-${t.uid}`} value={t.owner} disabled={!assign} title={!assign ? 'Only the PM or an administrator assigns owners' : undefined} onChange={(v) => dispatch({ type: 'ASSIGN', uid: t.uid, patch: { owner: v } })} />
        <h4>Contributors</h4>
        <MultiWho s={s} id={`con-${t.uid}`} values={t.contrib} disabled={!assign} onChange={(v) => dispatch({ type: 'ASSIGN', uid: t.uid, patch: { contrib: v } })} />
        <AllocTable s={s} t={t} dispatch={dispatch} assign={assign} />
        <h4>Plan <Illus>(illustrative)</Illus></h4>
        <p className="small">Current {fmt(t.ps)} → {fmt(t.pf)}<br /><span className="muted">{t.bs ? <>Baseline {fmt(t.bs)} → {fmt(t.bf)}</> : 'Not in baseline (added after approval)'}</span></p>
        <p className="small muted">Stable ID {t.uid}{t.legacy ? ` · formerly ${t.legacy}` : ''}{t.codeHistory?.length ? ` · was ${t.codeHistory.map((c) => c.code).join(', ')}` : ''}</p>
      </div>
      <div className="dcol">
        <h4>Effort</h4>
        <div className="kv small"><span>Estimate</span><b><Hrs v={est} /></b><span>Approved</span><b><Hrs v={h.approved} /></b><span>Pending</span><b><Hrs v={h.pending} /></b><span>Remaining</span><b><Hrs v={f.rem ?? E.remainingOf(s, t)} />{t.remaining != null ? ' (PM estimate)' : ' (default rule)'}</b></div>
        <p className="small muted">Hours never change progress or gate status.</p>
        {inc.length > 0 && <p className="note warn small">Actual effort incomplete: no time logged in the last week by {inc.map((p) => E.person(s, p).name).join(', ')}.</p>}
        <h4>Forecast</h4>
        <p className="small">{E.done(s, t) ? <>Finished {fmt(t.af)} <Days n={E.workBetween(t.pf, t.af, s.holidays)} /></> : f.uncertain ? <span className="twarn">Uncertain: {f.uncertain}</span> : f.finish ? <>Forecast {fmt(f.finish)} <Days n={E.workBetween(t.pf, f.finish, s.holidays)} />{f.placeholder && <span className="muted"> · TBD roles assumed at their planned rate</span>}{f.notDefined && <span className="muted"> · allocation not defined (equal split)</span>}</> : '—'}</p>
        <p className="row wrap"><button className="linkish small" onClick={() => nav.timeline(t.uid)}>Open in timeline</button><button className="linkish small" onClick={() => nav.time(t.uid)}>Timesheets for this task</button></p>
        {t.deps.length > 0 && <><h4>Depends on</h4><ul className="plain small">{t.deps.map((d) => s.tasks[d] && <li key={d}><span className={`ck ${E.done(s, s.tasks[d]) ? 'y' : ''}`} /><button className="linkish" onClick={() => nav.task(d)}><span className="mono">{code(s, s.tasks[d])}</span> {s.tasks[d].title}</button></li>)}</ul></>}
        {t.sheets.length > 0 && <><h4>Linked sheets</h4><p className="small">{t.sheets.map((no) => <button key={no} className="linkish mono sheetlink" onClick={() => nav.sheet(no)}>{no}</button>)}</p></>}
      </div>
      <div className="dcol wide">
        {t.blocker && !E.done(s, t) && <p className="note bad small">Blocker: {t.blocker} {E.isPM(s) && <Btn size="xs" onClick={() => dispatch({ type: 'BLOCKER', uid: t.uid, text: null })}>Clear blocker</Btn>}</p>}
        {kids.length > 0 ? (<>
          <h4>Subtasks · progress {E.pctOf(s, t)}% (from subtasks)</h4>
          {groups.map((gname) => (
            <div key={gname} className="subgroup">{gname && <div className="subg">{gname}</div>}
              <ul className="plain">{kids.filter((k) => (k.group || '') === gname).map((k) => (
                <li key={k.uid} className="subrow2" id={`task-${k.uid}`}>
                  <label className="check"><input type="checkbox" id={`sub-${k.uid}`} checked={k.pct >= 100} disabled={!(E.canEditTask(s, k) && !lockedPhase)} onChange={() => dispatch({ type: 'SUB_TOGGLE', uid: k.uid })} />
                    <span className="mono faint">{code(s, k)}</span> {k.title} <Req req={k.req} /></label>
                  <span className="muted small">{whoLabel(s, k.owner)}{k.contrib.length ? ` + ${k.contrib.map((c) => whoLabel(s, c)).join(', ')}` : ''}{k.est ? ` · ${E.hours(s, k.uid, false).approved}/${k.est} h` : ''}</span>
                </li>))}</ul></div>))}
        </>) : <TypeControls s={s} t={t} dispatch={dispatch} edit={edit} why={why} />}
        {t.outputs.length > 0 && <><h4>Required outputs</h4><ul className="plain small outputs">{t.outputs.map((o) => <li key={o}>{o}</li>)}</ul></>}
        {t.criteria && <p className="small muted">Completion criteria: {t.criteria}</p>}
        {code(s, t) === '1.2' && <InfoRequests s={s} dispatch={dispatch} />}
        {t.vendors && <VendorRegister s={s} nav={nav} />}
        {t.type === 'meeting' && <Actions s={s} t={t} dispatch={dispatch} />}
      </div>
    </div>
  );
}

function AllocTable({ s, t, dispatch, assign }) {
  const sh = E.shares(s, t);
  const [ed, setEd] = useState({});
  if (!sh.units.length || sh.rem <= 0) return null;
  return <>
    <h4>Allocation of remaining effort <Illus>(illustrative)</Illus></h4>
    <table className="grid-table small alloc"><tbody>{sh.units.map((u) => <tr key={u.key}>
      <td>{u.name}</td>
      <td className="nowrap">{assign && u.pid ? <><input type="number" min="0" className="num" aria-label={`Allocated hours for ${u.name}`} value={ed[u.key] ?? u.h} onChange={(e) => setEd({ ...ed, [u.key]: Number(e.target.value) })} /> h</> : <>{u.h} h</>}
        <div className="muted">{u.explicit ? (u.pct != null ? `${u.pct}% of remaining` : 'allocated') : 'allocation not defined'}</div></td>
      {assign && u.pid && <td className="nowrap"><button className="linkish small" disabled={ed[u.key] == null} onClick={() => { dispatch({ type: 'ALLOC', uid: t.uid, ref: u.key, h: ed[u.key] }); setEd({ ...ed, [u.key]: undefined }); }}>Set</button>
        {u.explicit && <> · <button className="linkish small" onClick={() => dispatch({ type: 'ALLOC', uid: t.uid, ref: u.key })}>Clear</button></>}</td>}
    </tr>)}</tbody></table>
    <p className="small muted">{sh.rem} h remaining. Resource Planning reads these same allocations.</p>
  </>;
}

function TypeControls({ s, t, dispatch, edit, why }) {
  const [f, setF] = useState({ file: t.doc || 'Signed.pdf', signer: 'Client (demo)', date: E.TODAY, method: 'E-signature platform' });
  const [opt, setOpt] = useState(t.options?.[0]);
  if (t.type === 'task') return (<><h4>Progress (set independently of hours)</h4>
    <div className="seg" role="group" aria-label="Progress">{[0, 25, 50, 75, 100].map((v) => <button key={v} className={t.pct === v ? 'on' : ''} disabled={!edit} title={!edit ? why : undefined} onClick={() => dispatch({ type: 'PCT', uid: t.uid, pct: v })}>{v === 100 ? 'Complete' : `${v}%`}</button>)}</div></>);
  if (t.type === 'meeting') return t.minutes ? <p className="small"><Badge tone="ok">Minutes issued</Badge> Completing a meeting never closes its actions.</p> : <Btn kind="primary" size="sm" disabled={!edit} reason={why} onClick={() => dispatch({ type: 'MINUTES', uid: t.uid })}>Record minutes & complete meeting</Btn>;
  if (t.type === 'signoff') return t.evidence ? <p className="small"><Badge tone="ok">Recorded</Badge> <span className="mono">{t.evidence.file}</span> · {t.evidence.signer}, {fmt(t.evidence.date)}. Simulated, not a legal signature.</p> : (
    <form className="signoff" onSubmit={(e) => { e.preventDefault(); dispatch({ type: 'EVIDENCE', uid: t.uid, evidence: f }); }}>
      <h4>Record the signed client document (simulated)</h4>
      <div className="grid2"><label>File<input id={`sf-${t.uid}`} value={f.file} onChange={(e) => setF({ ...f, file: e.target.value })} /></label><label>Signed by<input id={`ss-${t.uid}`} value={f.signer} onChange={(e) => setF({ ...f, signer: e.target.value })} /></label></div>
      <Btn kind="primary" size="sm" type="submit" disabled={!edit} reason={why}>Record signed document</Btn></form>);
  if (t.type === 'review') return t.outcome === 'approved' ? <p className="small"><Badge tone="ok">Approved</Badge> (simulated)</p> : <div className="row"><Btn kind="primary" size="sm" disabled={!edit} reason={why} onClick={() => dispatch({ type: 'OUTCOME', uid: t.uid, outcome: 'approved' })}>Approve</Btn><Btn size="sm" disabled={!edit} reason={why} onClick={() => dispatch({ type: 'OUTCOME', uid: t.uid, outcome: 'revise' })}>Request revision</Btn></div>;
  if (t.type === 'decision') return t.choice ? <p className="small"><Badge tone="ok">Decided</Badge> {t.choice}</p> : (
    <div className="row wrap">{t.options.map((o) => <label key={o} className="check small"><input type="radio" name={`o-${t.uid}`} checked={opt === o} onChange={() => setOpt(o)} /> {o}</label>)}<Btn kind="primary" size="sm" disabled={!edit} reason={why} onClick={() => dispatch({ type: 'DECIDE', uid: t.uid, option: opt })}>Record decision</Btn></div>);
  return E.done(s, t) ? <p className="small"><Badge tone="ok">Recorded</Badge></p> : <Btn kind="primary" size="sm" disabled={!edit} reason={why} onClick={() => dispatch({ type: 'PCT', uid: t.uid, pct: 100 })}>{t.type === 'submission' ? 'Record submission' : 'Mark reached'}</Btn>;
}

function Actions({ s, t, dispatch }) {
  const acts = s.actions.filter((a) => a.task === t.uid);
  if (!acts.length) return null;
  return (<><h4>Meeting actions</h4><ul className="plain actions">{acts.map((a) => (
    <li key={a.id} className={a.status === 'closed' ? 'done' : ''}><span className="mono faint">{a.id}</span> {a.text} <span className="muted small">· {whoLabel(s, a.owner)}</span>
      {a.critical && <Badge tone="bad">Critical · blocks the gate</Badge>}
      <Btn size="xs" onClick={() => dispatch({ type: 'ACTION_STATUS', id: a.id, status: a.status === 'closed' ? 'open' : 'closed' })}>{a.status === 'closed' ? 'Reopen' : 'Close action'}</Btn></li>))}</ul></>);
}

function InfoRequests({ s, dispatch }) {
  const [text, setText] = useState(''); const [to, setTo] = useState('role:civ');
  return (<><h4>Missing-information register</h4>
    <ul className="plain list">{s.infoReq.map((r) => (
      <li key={r.id}><span className="mono faint">{r.id}</span><span style={{ flex: 1 }}>{r.text}</span>
        <WhoSelect s={s} id={`ir-${r.id}`} value={r.to} disabled={!E.isPM(s)} onChange={(v) => dispatch({ type: 'IR_ASSIGN', id: r.id, to: v })} />
        <Btn size="xs" onClick={() => dispatch({ type: 'IR_STATUS', id: r.id, status: r.status === 'open' ? 'received' : 'open' })}>{r.status === 'open' ? 'Mark received' : 'Reopen'}</Btn>
        <Badge tone={r.status === 'open' ? 'warn' : 'ok'}>{r.status === 'open' ? 'Open' : 'Received'}</Badge></li>))}</ul>
    <form className="inline-form" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { dispatch({ type: 'IR_ADD', text, to }); setText(''); } }}>
      <input id="ir-new" placeholder="New information request" value={text} onChange={(e) => setText(e.target.value)} /><WhoSelect s={s} id="ir-new-to" value={to} onChange={setTo} /><Btn size="sm" type="submit">Add request</Btn></form></>);
}

function VendorRegister({ s, nav }) {
  const cats = [...new Set(s.vendors.map((v) => v.cat))];
  return (<><h4>Vendor register</h4>{cats.map((c) => (
    <div key={c} className="subgroup"><div className="subg">{c}</div><ul className="plain small">{s.vendors.filter((v) => v.cat === c).map((v) => (
      <li key={v.id} className="vendor"><span className="mono faint">{v.id}</span> <b>{v.name}</b> <span className="muted">· {v.info}</span>
        <div className="muted">Tasks {v.tasks.map((u) => <button key={u} className="linkish mono" onClick={() => nav.task(u)}>{code(s, s.tasks[u])} </button>)}· {v.discs.map((d) => DISC_NAMES[d]).join(', ')} · Sheets {v.sheets.map((no) => <button key={no} className="linkish mono" onClick={() => nav.sheet(no)}>{no} </button>)}</div>
        <Badge tone={v.status === 'requested' ? 'accent' : 'neutral'}>{v.status === 'requested' ? 'Requested' : 'Not started'}</Badge></li>))}</ul></div>))}</>);
}

// ── Gate ────────────────────────────────────────────────────────────────────
function Gate({ s, g, dispatch, nav }) {
  const ph = E.phase(s, g.phase); const r = E.gateReadiness(s, g.uid);
  const released = !!s.releases[g.uid]; const inactive = ph.state !== 'active';
  const co = s.gateSettings[g.uid]?.co; const pending = s.pendingRelease[g.uid];
  const [confirm, setConfirm] = useState(false);
  const prog = E.phaseProgress(s, g.phase);
  const tone = released ? 'ok' : r.ready ? 'accent' : 'warn';
  const nextNo = pad(E.phaseNo(s, g.phase) + 1);
  return (
    <section className={`gate ${tone}`} id={`gate-${g.uid}`}>
      <header><span><b>{E.gateName(s, g)} · {ph.gateTitle}</b> <span className="muted">· releases Phase {nextNo}</span></span>
        <Badge tone={tone}>{released ? 'Released' : inactive ? `Inactive · ${r.approved} of ${r.total}` : r.ready ? 'Ready for PM release' : `Locked · ${r.approved} of ${r.total} approved`}</Badge></header>
      {!released && !inactive && prog === 100 && !r.ready && <p className="note warn">Phase progress is 100% and the gate is still locked. Progress and hours never unlock a phase.</p>}
      <div className="scroll"><table className="conds"><thead><tr><th>#</th><th>Condition</th><th className="hide-sm">Owner</th><th>Evidence</th><th>Status</th><th /></tr></thead>
        <tbody>{g.conds.map((c, i) => {
          const ev = E.evidence(s, c); const isRel = c.ev.type === 'release';
          const can = !inactive && !released && (E.isPM(s) || E.holdsRole(s, c.owner));
          return (
            <tr key={c.uid} className={c.status}>
              <td className="mono faint">G{E.phaseNo(s, g.phase)}.{i + 1}</td>
              <td>{c.text}{c.legal && <span className="muted small"> · legally required</span>}{c.comment && c.status !== 'approved' && <div className="small muted">“{c.comment}”</div>}</td>
              <td className="muted small hide-sm">{whoLabel(s, c.owner)}</td>
              <td className="small">{isRel ? <span className="muted">Release record</span> : c.ev.type === 'items' ? c.ev.items.map((u) => s.tasks[u] && <button key={u} className={`linkish mono evl ${E.done(s, s.tasks[u]) ? 'okc' : ''}`} onClick={() => nav.task(u)}>{code(s, s.tasks[u])}</button>) : <span className="muted">{c.ev.label || (c.ev.key === 'jurisdiction' ? 'Checkpoint + register' : 'Requirement register')}</span>}
                {!isRel && <div className={ev.ready ? 'tok' : 'twarn'}>{ev.ready ? 'Evidence ready' : ev.missing}</div>}</td>
              <td><Badge tone={{ approved: 'ok', na: 'neutral', rejected: 'bad', resubmission: 'bad', pending: 'neutral' }[c.status]}>{isRel ? (released ? 'Released' : 'Pending') : { approved: 'Approved', na: 'N/A', rejected: 'Rejected', resubmission: 'Resubmit', pending: 'Pending' }[c.status]}</Badge></td>
              <td className="acts">{!isRel && can && c.status !== 'approved' && c.status !== 'na' && <>
                {ev.needsUpload && <Btn size="xs" disabled={!E.isPM(s)} reason="Only the PM records signed documents" onClick={() => dispatch({ type: 'COND_UPLOAD', g: g.uid, c: c.uid })}>Record signed document</Btn>}
                <Btn size="xs" kind="primary" disabled={!ev.ready} reason={ev.missing} onClick={() => dispatch({ type: 'COND', g: g.uid, c: c.uid, d: 'approved' })}>Approve</Btn></>}</td>
            </tr>);
        })}</tbody></table></div>
      {r.crit.length > 0 && !released && <p className="note bad">Critical action open: {r.crit.map((a) => <button key={a.id} className="linkish" onClick={() => nav.task(a.task)}>{a.id} ({code(s, s.tasks[a.task])})</button>)}. The gate cannot be released until it is closed.</p>}
      <footer>
        <div className="pol"><span>Release by <b>Project Manager</b>{co ? <> + <b>Executive</b> co-approval</> : ''}.</span>
          {!released && !inactive && <label className="check small"><input type="checkbox" id={`co-${g.uid}`} checked={!!co} disabled={!E.isPM(s)} onChange={(e) => dispatch({ type: 'COAPPROVAL', g: g.uid, on: e.target.checked })} /> Require executive co-approval</label>}</div>
        {released ? <span className="small muted">Released {s.releases[g.uid].at} (simulated)</span> :
          pending ? (E.isExec(s) ? <Btn kind="primary" onClick={() => dispatch({ type: 'CO_APPROVE', g: g.uid })}>Co-approve & release</Btn> : <Badge tone="warn">Waiting for executive co-approval</Badge>) :
            confirm ? <span className="row"><Btn kind="primary" onClick={() => { dispatch({ type: 'RELEASE', g: g.uid }); setConfirm(false); }}>Confirm release</Btn><Btn onClick={() => setConfirm(false)}>Cancel</Btn></span> :
              <Btn kind="primary" disabled={inactive || !r.ready || !E.isPM(s)} reason={inactive ? 'Phase not active' : !E.isPM(s) ? 'Only the Project Manager releases gates' : 'Not every condition is approved'} onClick={() => setConfirm(true)}>Release Phase {nextNo}</Btn>}
      </footer>
    </section>
  );
}
