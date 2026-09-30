import { DISC_NAMES } from './seed.js';
import * as E from './engine.js';
import { Badge, Btn, fmt, Section, Hrs, Empty } from './ui.jsx';

const { useState, useEffect } = React;
const { code, pad, TODAY } = E;
const ST = { draft: ['Draft', 'neutral'], submitted: ['Submitted · awaiting PM', 'warn'], approved: ['Approved', 'ok'], returned: ['Returned', 'bad'] };

export function TaskPicker({ s, id, value, onChange, mineFirst }) {
  const me = E.viewerPerson(s);
  const mine = Object.values(s.tasks).filter((t) => !t.archived && me && E.involves(s, t, me));
  return (
    <select id={id} value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose a task or subtask…</option>
      {mineFirst && mine.length > 0 && <optgroup label="Assigned to me">{mine.map((t) => <option key={'m' + t.uid} value={t.uid}>{code(s, t)} {t.title}</option>)}</optgroup>}
      {E.livePhases(s).map((p) => E.wpsOf(s, p.uid).map((w) => {
        const ts = E.topTasks(s, w.uid).flatMap((t) => [t, ...E.children(s, t.uid)]);
        return ts.length ? <optgroup key={w.uid} label={`${pad(E.phaseNo(s, p.uid))} · ${w.title}`}>{ts.map((t) => <option key={t.uid} value={t.uid}>{t.parent ? '   ' : ''}{code(s, t)} {t.title}</option>)}</optgroup> : null;
      }))}
    </select>
  );
}

export function Timesheets({ s, dispatch, ui, setUi, nav }) {
  const me = E.viewerPerson(s);
  const pm = E.isPM(s);
  const focus = ui.timeTask || null;
  const [tab, setTab] = useState(me ? 'mine' : pm ? 'approve' : 'reports');
  useEffect(() => { if (focus) setTab('reports'); }, [focus]);
  useEffect(() => { if (!me && tab === 'mine') setTab(pm ? 'approve' : 'reports'); }, [s.viewer]);
  const pendingN = s.time.filter((e) => e.status === 'submitted').length;
  return (
    <div className="page">
      <div className="page-h"><div><h1>Timesheets</h1><p className="muted">Every entry points at the same task record as Workflow and Timeline. Hours measure effort; they never mark work complete.</p></div></div>
      <div className="tabs sub" role="tablist">
        <button role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>My time</button>
        <button role="tab" aria-selected={tab === 'approve'} className={tab === 'approve' ? 'on' : ''} onClick={() => setTab('approve')}>PM approval {pendingN > 0 && <Badge tone="warn">{pendingN}</Badge>}</button>
        <button role="tab" aria-selected={tab === 'reports'} className={tab === 'reports' ? 'on' : ''} onClick={() => setTab('reports')}>Reports</button>
      </div>
      {tab === 'mine' && <MyTime s={s} dispatch={dispatch} ui={ui} nav={nav} />}
      {tab === 'approve' && <Approve s={s} dispatch={dispatch} nav={nav} />}
      {tab === 'reports' && <Reports s={s} focus={focus} clearFocus={() => setUi((u) => ({ ...u, timeTask: null }))} nav={nav} />}
    </div>
  );
}

function MyTime({ s, dispatch, ui, nav }) {
  const me = E.viewerPerson(s);
  const blank = { task: ui.timeTask || '', date: TODAY, hours: 2, desc: '' };
  const [e, setE] = useState(blank);
  if (!me) return <p className="note">Choose a team member under "Viewing as" to log time. {E.isPM(s) && !s.roles.pm && 'The Project Manager role is not yet assigned to a person, so the PM view approves but does not log time.'}</p>;
  const t = e.task && s.tasks[e.task];
  const snap = t && E.snapOf(s, t.uid);
  const mine = s.time.filter((x) => x.person === me).sort((a, b) => (a.date < b.date ? 1 : -1));
  const week = E.weekOf(TODAY);
  const weekH = mine.filter((x) => x.date >= week).reduce((a, x) => a + x.hours, 0);
  const cap = E.person(s, me)?.cap;
  const save = (submit) => { dispatch({ type: 'TIME_SAVE', e: { ...e, hours: Number(e.hours) }, submit }); setE({ ...blank, task: e.task, date: e.date }); };
  return (
    <div className="split2">
      <Section title={e.uid ? 'Edit entry' : 'Log time'} right={<span className="small muted">{E.person(s, me).name} · this week <Hrs v={weekH} /> of {cap} h capacity</span>}>
        <div className="form">
          <label className="span2">Task or subtask<TaskPicker s={s} id="te-task" value={e.task} mineFirst onChange={(v) => setE({ ...e, task: v })} /></label>
          <div className="span2 autofill small">{snap ? <>Project <b>{s.name}</b> · Phase <b>{pad(snap.phaseNo)}</b> {E.phase(s, snap.phase).title} · WP <b>{snap.wpTitle}</b> · {DISC_NAMES[snap.disc]}{!E.involves(s, t, me) && <span className="twarn"> · You are not assigned to this task</span>}</> : <span className="muted">Phase and work package fill in from the task.</span>}</div>
          <label>Date<input id="te-date" type="date" value={e.date} max={TODAY} onChange={(x) => setE({ ...e, date: x.target.value })} /></label>
          <label>Hours<input id="te-hours" type="number" min="0.25" max="16" step="0.25" value={e.hours} onChange={(x) => setE({ ...e, hours: x.target.value })} /></label>
          <label className="span2">Work description<input id="te-desc" value={e.desc} onChange={(x) => setE({ ...e, desc: x.target.value })} placeholder="What you worked on" /></label>
        </div>
        <div className="row"><Btn size="sm" disabled={!t} reason="Choose a task" onClick={() => save(false)}>Save draft</Btn><Btn kind="primary" size="sm" disabled={!t} reason="Choose a task" onClick={() => save(true)}>Submit for approval</Btn>{e.uid && <Btn size="sm" onClick={() => setE(blank)}>Cancel edit</Btn>}</div>
      </Section>
      <Section title="My entries" right={<Btn size="xs" onClick={() => dispatch({ type: 'TIME_SUBMIT_ALL' })} disabled={!mine.some((x) => x.status === 'draft')}>Submit all drafts</Btn>}>
        {!mine.length ? <Empty>No entries yet.</Empty> : <table className="grid-table small"><thead><tr><th>Date</th><th>Task</th><th>Hours</th><th>Status</th><th /></tr></thead><tbody>
          {mine.map((x) => <tr key={x.uid}><td>{fmt(x.date)}</td><td><button className="linkish" onClick={() => nav.task(x.task)}><span className="mono">{x.snap?.code}</span> {x.snap?.title}</button><div className="muted">{x.desc}</div>{x.status === 'returned' && <div className="tbad">PM: {x.note}</div>}</td><td><Hrs v={x.hours} /></td>
            <td><Badge tone={ST[x.status][1]}>{ST[x.status][0]}</Badge>{x.status === 'approved' && <div className="muted">🔒 locked</div>}</td>
            <td>{x.status !== 'approved' && <><button className="linkish" onClick={() => setE({ uid: x.uid, task: x.task, date: x.date, hours: x.hours, desc: x.desc })}>Edit</button> <button className="linkish" onClick={() => dispatch({ type: 'TIME_DELETE', uid: x.uid })}>Delete</button></>}</td></tr>)}
        </tbody></table>}
        <p className="small muted">Approved entries are locked. Corrections go through the PM, and the original entry stays in the record.</p>
      </Section>
    </div>
  );
}

function Approve({ s, dispatch, nav }) {
  const pm = E.isPM(s);
  const q = s.time.filter((e) => e.status === 'submitted').sort((a, b) => (a.person + a.date < b.person + b.date ? -1 : 1));
  const [sel, setSel] = useState([]);
  const [note, setNote] = useState('');
  useEffect(() => setSel((x) => x.filter((u) => q.some((e) => e.uid === u))), [s.time]);
  if (!pm) return <p className="note">Only the Project Manager approves timesheets. Switch "Viewing as" to Project Manager.</p>;
  if (!q.length) return <Empty>Nothing waiting for approval.</Empty>;
  return (
    <Section title={`Submitted entries · ${q.length}`}>
      <table className="grid-table small"><thead><tr><th><input type="checkbox" aria-label="Select all" checked={sel.length === q.length} onChange={(x) => setSel(x.target.checked ? q.map((e) => e.uid) : [])} /></th><th>Person</th><th>Date</th><th>Task</th><th>Hours</th><th>Task estimate / approved</th></tr></thead><tbody>
        {q.map((e) => { const t = s.tasks[e.task]; const h = E.hours(s, e.task, false); return (
          <tr key={e.uid}><td><input type="checkbox" aria-label={`Select entry ${e.uid}`} checked={sel.includes(e.uid)} onChange={(x) => setSel(x.target.checked ? [...sel, e.uid] : sel.filter((u) => u !== e.uid))} /></td>
            <td>{E.person(s, e.person)?.name}</td><td>{fmt(e.date)}</td><td><button className="linkish" onClick={() => nav.task(e.task)}><span className="mono">{code(s, t)}</span> {t.title}</button><div className="muted">{e.desc}</div></td><td><Hrs v={e.hours} /></td><td><Hrs v={t.est} /> / <Hrs v={h.approved} /></td></tr>); })}
      </tbody></table>
      <div className="row wrap">
        <Btn kind="primary" size="sm" disabled={!sel.length} reason="Select entries" onClick={() => { dispatch({ type: 'TIME_REVIEW', uids: sel, d: 'approved' }); setSel([]); }}>Approve selected ({sel.length})</Btn>
        <input id="ap-note" className="grow" value={note} onChange={(x) => setNote(x.target.value)} placeholder="Note to the person (required to return)" />
        <Btn size="sm" disabled={!sel.length || !note.trim()} reason="Select entries and add a note" onClick={() => { dispatch({ type: 'TIME_REVIEW', uids: sel, d: 'returned', note }); setSel([]); setNote(''); }}>Return for correction</Btn>
      </div>
      <p className="small muted">Approval locks the entry and records its phase and work package at that moment. If the task moves later, these hours keep that attribution.</p>
    </Section>
  );
}

const GROUPS = [['phase', 'Phase'], ['wp', 'Work package'], ['task', 'Task / subtask'], ['disc', 'Discipline'], ['person', 'Team member'], ['week', 'Week'], ['month', 'Month']];

export function Reports({ s, focus, clearFocus, nav, compact }) {
  const [f, setF] = useState({ from: '', to: '', phase: '', disc: '', person: '' });
  const [by, setBy] = useState('phase');
  const [inclPending, setIncl] = useState(true);
  let es = E.filterEntries(s, f);
  if (focus) es = es.filter((e) => e.task === focus || s.tasks[e.task]?.parent === focus);
  const key = {
    phase: (e) => `${pad(e.snap.phaseNo)} ${E.phase(s, e.snap.phase)?.title || ''}`,
    wp: (e) => `${pad(e.snap.phaseNo)} · ${e.snap.wpTitle}`,
    task: (e) => `${e.snap.code} ${e.snap.title}`,
    disc: (e) => DISC_NAMES[e.snap.disc] || e.snap.disc,
    person: (e) => E.person(s, e.person)?.name || e.person,
    week: (e) => `Week of ${fmt(E.weekOf(e.date))}`,
    month: (e) => E.toD(e.date).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
  }[by];
  const rows = E.group(es, key);
  if (by === 'week' || by === 'month') rows.sort((a, b) => (a.key < b.key ? -1 : 1));
  const plannedFor = (r) => { // planned vs actual only for structural groupings
    if (by === 'phase') { const e = es.find((x) => key(x) === r.key); const ps = E.phaseSchedule(s, e.snap.phase); return { est: ps.est, rem: ps.rem }; }
    if (by === 'task') { const e = es.find((x) => key(x) === r.key); const t = s.tasks[e.task]; return { est: t.est, rem: E.done(s, t) ? 0 : E.remainingOf(s, t) }; }
    if (by === 'wp') { const e = es.find((x) => key(x) === r.key); const ts = Object.values(s.tasks).filter((t) => t.wp === e.snap.wp && !t.archived); return { est: ts.reduce((a, t) => a + t.est, 0), rem: ts.reduce((a, t) => a + (E.done(s, t) ? 0 : E.remainingOf(s, t)), 0) }; }
    return null;
  };
  const tot = rows.reduce((a, r) => ({ approved: a.approved + r.approved, pending: a.pending + r.pending, draft: a.draft + r.draft }), { approved: 0, pending: 0, draft: 0 });
  const showPlan = ['phase', 'wp', 'task'].includes(by);
  const moved = es.filter((e) => e.status === 'approved' && s.tasks[e.task] && E.snapOf(s, e.task).wp !== e.snap.wp);
  return (
    <Section title={compact ? 'Project hours' : `Hours report · ${s.name}`} right={focus && <span className="small">Filtered to <b className="mono">{code(s, s.tasks[focus])}</b> <button className="linkish" onClick={clearFocus}>Show all</button></span>}>
      <div className="filters wrap">
        <label>From<input type="date" id="rp-from" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></label>
        <label>To<input type="date" id="rp-to" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></label>
        <label>Phase<select id="rp-phase" value={f.phase} onChange={(e) => setF({ ...f, phase: e.target.value })}><option value="">All</option>{E.livePhases(s).map((p) => <option key={p.uid} value={p.uid}>{pad(E.phaseNo(s, p.uid))} {p.title}</option>)}</select></label>
        <label>Discipline<select id="rp-disc" value={f.disc} onChange={(e) => setF({ ...f, disc: e.target.value })}><option value="">All</option>{Object.entries(DISC_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label>Person<select id="rp-person" value={f.person} onChange={(e) => setF({ ...f, person: e.target.value })}><option value="">All</option>{s.people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.active ? '' : ' (inactive)'}</option>)}</select></label>
        <label>Group by<select id="rp-by" value={by} onChange={(e) => setBy(e.target.value)}>{GROUPS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="check small"><input type="checkbox" checked={inclPending} onChange={(e) => setIncl(e.target.checked)} /> Show pending</label>
      </div>
      {!rows.length ? <Empty>No entries match.</Empty> : <table className="grid-table small num-right"><thead><tr><th>{GROUPS.find((g) => g[0] === by)[1]}</th><th>Approved</th>{inclPending && <th>Pending approval</th>}{inclPending && <th>Draft</th>}{showPlan && <><th>Estimated</th><th>Remaining</th><th>Est. at completion</th></>}</tr></thead><tbody>
        {rows.map((r) => { const p = showPlan && plannedFor(r); const eac = p ? r.approved + p.rem : null; return (
          <tr key={r.key}><td>{r.key}</td><td><Hrs v={r.approved} /></td>{inclPending && <td className="twarn"><Hrs v={r.pending} /></td>}{inclPending && <td className="muted"><Hrs v={r.draft} /></td>}
            {p && <><td><Hrs v={p.est} /></td><td><Hrs v={p.rem} /></td><td className={eac > p.est ? 'tbad' : ''}><Hrs v={eac} /></td></>}</tr>); })}
        <tr className="total"><td>Total</td><td><Hrs v={tot.approved} /></td>{inclPending && <td><Hrs v={tot.pending} /></td>}{inclPending && <td><Hrs v={tot.draft} /></td>}{showPlan && <><td /><td /><td /></>}</tr>
      </tbody></table>}
      <p className="small muted">Grouping uses the phase and work package recorded on each entry. Approved hours keep the location they were approved under.{moved.length > 0 && <> {moved.length} approved entr{moved.length > 1 ? 'ies' : 'y'} belong to tasks that have since moved: <b>{moved.map((e) => `${e.snap.code} → ${code(s, s.tasks[e.task])}`).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</b>.</>}</p>
      {nav && compact && <button className="linkish small" onClick={() => nav.screen('time')}>Open timesheets</button>}
    </Section>
  );
}
