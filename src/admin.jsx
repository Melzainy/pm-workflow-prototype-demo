import { DISC_NAMES } from './seed.js';
import * as E from './engine.js';
import { Badge, Btn, fmt, Section, WhoSelect, MultiWho, Req, TypeMark } from './ui.jsx';

const { useState, useEffect } = React;
const { code, pad, whoLabel } = E;

export function Admin({ s, dispatch, ui, setUi }) {
  const st = s.scope === 'tpl' ? s.tpl : s;
  const [sel, setSel] = useState({ kind: 'task', uid: Object.values(s.tasks).find((t) => code(s, t) === '1.7')?.uid });
  const [open, setOpen] = useState({ PH1: true, W103: true });
  const [showArch, setShowArch] = useState(false);
  const [pending, setPending] = useState(null); // structural op awaiting confirmation
  const admin = E.isAdmin(s);
  useEffect(() => { if (s._selected) { const x = s._selected; const kind = x.startsWith('W') ? 'wp' : x.startsWith('PH') ? 'phase' : 'task'; setSel({ kind, uid: x }); } }, [s._selected]);
  const op = (a) => dispatch({ type: 'ADMIN', scope: s.scope, ...a });
  const drag = (e, uid) => { e.dataTransfer.setData('text/plain', uid); e.dataTransfer.effectAllowed = 'move'; };
  const dropOn = (e, wp, before) => { e.preventDefault(); const uid = e.dataTransfer.getData('text/plain'); if (!uid || !st.tasks[uid]) return; setSel({ kind: 'task', uid }); setPending({ kind: 'moveTask', uid, wp, before }); };
  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const phases = st.phases.filter((p) => showArch || !p.archived).sort((a, b) => a.order - b.order);
  return (
    <div className="page">
      <div className="page-h">
        <div><h1>Admin · Workflow editor</h1><p className="muted">Changes apply to the same records every screen uses. Stable IDs never change; display numbers follow position.</p></div>
        <div className="scope" role="group" aria-label="What you are editing">
          <button className={s.scope === 'proj' ? 'on' : ''} onClick={() => dispatch({ type: 'SCOPE', scope: 'proj' })}>This project · {s.name}</button>
          <button className={s.scope === 'tpl' ? 'on' : ''} onClick={() => dispatch({ type: 'SCOPE', scope: 'tpl' })}>Template · Standard Residential Modular {s.tpl.version}</button>
        </div>
      </div>
      {!admin && <p className="note warn">Read-only. Switch "Viewing as" to Administrator to edit the structure.</p>}
      {s.scope === 'tpl' && <p className="note">Editing the reusable template. {s.name} is not affected: it keeps template v1.0 until its PM accepts an upgrade. {admin && !s.tpl.published && <Btn size="xs" onClick={() => dispatch({ type: 'TPL_PUBLISH' })}>Publish v1.1</Btn>}{s.tpl.published && <Badge tone="ok">v1.1 published</Badge>}</p>}
      <div className="admin">
        <nav className="tree" aria-label="Project structure">
          <div className="tree-tools"><label className="check small"><input type="checkbox" id="showarch" checked={showArch} onChange={(e) => setShowArch(e.target.checked)} /> Show archived</label></div>
          {phases.map((p) => {
            const no = pad(E.phaseNo(st, p.uid)); const g = E.gateOfPhase(st, p.uid);
            return (
              <div key={p.uid} className={`tn-phase ${p.archived ? 'arch' : ''}`}>
                <div className={`tn ${sel.uid === p.uid ? 'sel' : ''}`}>
                  <button className="tw" aria-label={open[p.uid] ? 'Collapse' : 'Expand'} onClick={() => toggle(p.uid)}>{open[p.uid] ? '▾' : '▸'}</button>
                  <button className="tl" onClick={() => setSel({ kind: 'phase', uid: p.uid })}><span className="mono">{p.archived ? '—' : no}</span> <b>{p.title}</b></button>
                </div>
                {open[p.uid] && <div className="tn-kids">
                  {st.wps.filter((w) => w.phase === p.uid && (showArch || !w.archived)).sort((a, b) => a.order - b.order).map((w) => (
                    <div key={w.uid} className={w.archived ? 'arch' : ''}>
                      <div className={`tn wpn ${sel.uid === w.uid ? 'sel' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => dropOn(e, w.uid)}>
                        <button className="tw" onClick={() => toggle(w.uid)}>{open[w.uid] ? '▾' : '▸'}</button>
                        <button className="tl" onClick={() => setSel({ kind: 'wp', uid: w.uid })}>{w.title}</button>
                      </div>
                      {open[w.uid] && <div className="tn-kids">
                        {Object.values(st.tasks).filter((t) => t.wp === w.uid && !t.parent && (showArch || !t.archived)).sort((a, b) => a.order - b.order).map((t) => (
                          <div key={t.uid} className={t.archived ? 'arch' : ''}>
                            <div className={`tn taskn ${sel.uid === t.uid ? 'sel' : ''}`} draggable={admin && !t.archived} onDragStart={(e) => drag(e, t.uid)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => dropOn(e, w.uid, t.uid)}>
                              {E.children(st, t.uid).length ? <button className="tw" onClick={() => toggle(t.uid)}>{open[t.uid] ? '▾' : '▸'}</button> : <span className="tw" />}
                              <button className="tl" onClick={() => setSel({ kind: 'task', uid: t.uid })}><TypeMark type={t.type} /> <span className="mono faint">{t.archived ? 'archived' : code(st, t)}</span> {t.title} <Req req={t.req} /></button>
                              {admin && <span className="grip" aria-hidden="true" title="Drag onto a work package">⋮⋮</span>}
                            </div>
                            {open[t.uid] && <div className="tn-kids">{E.children(st, t.uid, showArch).map((k) => (
                              <div key={k.uid} className={`tn subn ${sel.uid === k.uid ? 'sel' : ''} ${k.archived ? 'arch' : ''}`}><span className="tw" />
                                <button className="tl" onClick={() => setSel({ kind: 'task', uid: k.uid })}><span className="mono faint">{k.archived ? '—' : code(st, k)}</span> {k.title}</button></div>))}</div>}
                          </div>))}
                      </div>}
                    </div>))}
                  {g && <div className={`tn gaten ${sel.uid === g.uid ? 'sel' : ''}`}><span className="tw" /><button className="tl" onClick={() => setSel({ kind: 'gate', uid: g.uid })}>◆ {E.gateName(st, g)} · {p.gateTitle} ({g.conds.length})</button></div>}
                </div>}
              </div>);
          })}
          {s.scope === 'proj' && <div className={`tn ${sel.kind === 'sheets' ? 'sel' : ''}`}><span className="tw" /><button className="tl" onClick={() => setSel({ kind: 'sheets' })}><b>Drawing disciplines & sheets</b></button></div>}
        </nav>
        <div className="editor">
          {pending ? <Impact s={s} st={st} op={pending} admin={admin} onCancel={() => setPending(null)} onApply={() => {
            if (pending.kind === 'moveTask') op({ op: 'task.move', uid: pending.uid, wp: pending.wp, before: pending.before });
            if (pending.kind === 'archiveTask') op({ op: 'task.archive', uid: pending.uid });
            if (pending.kind === 'addPhase') op({ op: 'phase.add', after: pending.after, title: pending.title });
            if (pending.kind === 'archivePhase') op({ op: 'phase.archive', uid: pending.uid });
            setPending(null);
          }} /> : null}
          {sel.kind === 'task' && st.tasks[sel.uid] && <TaskEditor key={sel.uid + JSON.stringify(st.tasks[sel.uid])} s={s} st={st} t={st.tasks[sel.uid]} admin={admin} op={op} setPending={setPending} setSel={setSel} />}
          {sel.kind === 'wp' && <WpEditor key={sel.uid} s={s} st={st} w={st.wps.find((w) => w.uid === sel.uid)} admin={admin} op={op} />}
          {sel.kind === 'phase' && <PhaseEditor key={sel.uid} s={s} st={st} p={st.phases.find((p) => p.uid === sel.uid)} admin={admin} op={op} setPending={setPending} />}
          {sel.kind === 'gate' && <GateEditor s={s} st={st} g={st.gates.find((g) => g.uid === sel.uid)} admin={admin} op={op} />}
          {sel.kind === 'sheets' && <SheetsEditor s={s} admin={admin} dispatch={dispatch} />}
        </div>
      </div>
    </div>
  );
}

function Impact({ s, st, op, admin, onApply, onCancel }) {
  const imp = E.impact(s, st, op);
  const t = op.uid && st.tasks[op.uid];
  const title = { moveTask: `Move ${t ? code(st, t) : ''} to "${st.wps.find((w) => w.uid === op.wp)?.title}"`, archiveTask: `Archive ${t ? code(st, t) : ''}`, addPhase: 'Insert a new phase', archivePhase: 'Archive phase' }[op.kind];
  return (
    <Section title={`Review impact · ${title}`} className="impact">
      {imp.blocking.length > 0 && <><h4>Cannot apply</h4><ul className="plain small">{imp.blocking.map((x) => <li key={x} className="tbad">✕ {x}</li>)}</ul></>}
      {imp.warnings.length > 0 && <><h4>Check before applying</h4><ul className="plain small">{imp.warnings.map((x) => <li key={x} className="twarn">! {x}</li>)}</ul></>}
      <h4>What changes</h4><ul className="plain small">{imp.changes.map((x) => <li key={x}>• {x}</li>)}</ul>
      {op.kind === 'addPhase' && <label className="small block">New phase title<input id="newphase" defaultValue={op.title} onChange={(e) => (op.title = e.target.value)} /></label>}
      <div className="row"><Btn kind="primary" disabled={!admin || imp.blocking.length > 0} reason={!admin ? 'Administrator only' : 'Resolve the blocking items first'} onClick={onApply}>Apply change</Btn><Btn onClick={onCancel}>Cancel</Btn></div>
      {imp.blocking.some((b) => b.includes('change request')) && <p className="small"><Btn size="xs" onClick={() => { onCancel(); }}>Close</Btn> Approved-baseline changes go through change control in Workflow.</p>}
    </Section>
  );
}

function TaskEditor({ s, st, t, admin, op, setPending, setSel }) {
  const [d, setD] = useState({ title: t.title, type: t.type, req: t.req, priority: t.priority, owner: t.owner, contrib: t.contrib, disc: t.disc, w: t.w, est: t.est, ps: t.ps, pf: t.pf, deps: t.deps, outputs: t.outputs, criteria: t.criteria, group: t.group || '' });
  const [out, setOut] = useState('');
  const [moveTo, setMoveTo] = useState(t.wp);
  const dirty = JSON.stringify(d) !== JSON.stringify({ title: t.title, type: t.type, req: t.req, priority: t.priority, owner: t.owner, contrib: t.contrib, disc: t.disc, w: t.w, est: t.est, ps: t.ps, pf: t.pf, deps: t.deps, outputs: t.outputs, criteria: t.criteria, group: t.group || '' });
  const allTasks = Object.values(st.tasks).filter((x) => !x.archived && x.uid !== t.uid && !x.parent);
  const lockedMsg = s.scope === 'proj' && E.done(s, t) ? 'Complete: title, type, estimate and outputs are protected.' : null;
  const whereUsed = s.scope === 'proj' ? [
    'Project Workflow', E.assignees(s, t).length ? `My Work (${E.assignees(s, t).map((p) => E.person(s, p)?.name).join(', ')})` : null, 'Master Timeline', 'Timesheets', t.sheets.length ? `Drawing register (${t.sheets.join(', ')})` : null,
    ...s.gates.flatMap((g) => g.conds.filter((c) => (c.ev.items || []).includes(t.uid)).map(() => `${E.gateName(s, g)} evidence`)),
  ].filter(Boolean) : ['Template only'];
  const F = (k) => (e) => setD({ ...d, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value });
  return (
    <Section title={<><span className="mono">{t.archived ? 'Archived' : code(st, t)}</span> {t.parent ? 'Subtask' : 'Task'}</>} right={<span className="small muted">Stable ID {t.uid}{t.legacy ? ` · formerly ${t.legacy}` : ''}</span>}>
      {lockedMsg && <p className="note warn small">{lockedMsg}</p>}
      <fieldset disabled={!admin || t.archived} className="form">
        <label className="span2">Title<input id="ed-title" value={d.title} onChange={F('title')} /></label>
        <label>Type<select id="ed-type" value={d.type} onChange={F('type')}>{['task', 'meeting', 'decision', 'review', 'submission', 'milestone', 'signoff'].map((x) => <option key={x} value={x}>{x === 'signoff' ? 'client sign-off' : x}</option>)}</select></label>
        <label>Requirement<select id="ed-req" value={d.req} onChange={F('req')}><option value="required">Required</option><option value="optional">Optional</option><option value="conditional">Conditional</option></select></label>
        <label>Priority<select id="ed-pri" value={d.priority} onChange={F('priority')}><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></label>
        <label>Discipline<select id="ed-disc" value={d.disc} onChange={F('disc')}>{Object.entries(DISC_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="span2">Accountable owner<WhoSelect s={s} id="ed-owner" value={d.owner} onChange={(v) => setD({ ...d, owner: v })} /></label>
        <label className="span2">Contributors<MultiWho s={s} id="ed-contrib" values={d.contrib} disabled={!admin} onChange={(v) => setD({ ...d, contrib: v })} /></label>
        <label>Planned start<input id="ed-ps" type="date" value={d.ps} onChange={F('ps')} /></label>
        <label>Planned finish<input id="ed-pf" type="date" value={d.pf} onChange={F('pf')} /></label>
        <label>Estimated effort (h)<input id="ed-est" type="number" min="0" value={d.est} onChange={F('est')} /></label>
        <label>Weight {t.parent ? '(n/a for subtasks)' : ''}<input id="ed-w" type="number" min="0" value={d.w} disabled={!!t.parent} onChange={F('w')} /></label>
        {t.parent && <label className="span2">Subtask group<input id="ed-group" value={d.group} onChange={F('group')} /></label>}
        {!t.parent && <label className="span2">Dependencies (finish-to-start)
          <select id="ed-deps" multiple size={4} value={d.deps} onChange={(e) => setD({ ...d, deps: [...e.target.selectedOptions].map((o) => o.value) })}>
            {allTasks.map((x) => <option key={x.uid} value={x.uid}>{code(st, x)} {x.title}</option>)}</select></label>}
        <div className="span2"><span className="flabel">Required outputs</span>
          <ul className="plain small">{d.outputs.map((o, i) => <li key={i} className="row">{o}<button type="button" className="linkish small" onClick={() => setD({ ...d, outputs: d.outputs.filter((_, j) => j !== i) })}>Remove</button></li>)}</ul>
          <div className="row"><input id="ed-out" value={out} placeholder="Add a required output" onChange={(e) => setOut(e.target.value)} /><Btn size="sm" onClick={() => { if (out.trim()) { setD({ ...d, outputs: [...d.outputs, out.trim()] }); setOut(''); } }}>Add</Btn></div></div>
        <label className="span2">Completion criteria<input id="ed-crit" value={d.criteria} onChange={F('criteria')} /></label>
      </fieldset>
      <div className="row wrap savebar">
        <Btn kind="primary" disabled={!admin || !dirty} reason={!admin ? 'Administrator only' : 'No changes'} onClick={() => { const cur = { ...d, group: d.group || null }; const patch = Object.fromEntries(Object.entries(cur).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(t[k] ?? null))); op({ op: 'task.update', uid: t.uid, patch }); }}>Save changes</Btn>
        {dirty && <Btn onClick={() => setD({ title: t.title, type: t.type, req: t.req, priority: t.priority, owner: t.owner, contrib: t.contrib, disc: t.disc, w: t.w, est: t.est, ps: t.ps, pf: t.pf, deps: t.deps, outputs: t.outputs, criteria: t.criteria, group: t.group || '' })}>Revert</Btn>}
        <span className="small muted">Appears in: {whereUsed.join(' · ')}</span>
      </div>
      <h4>Structure</h4>
      <div className="row wrap">
        {!t.parent && <Btn size="sm" disabled={!admin || t.archived} onClick={() => op({ op: 'task.add', wp: t.wp, parent: t.uid, title: 'New subtask' })}>+ Add subtask</Btn>}
        <Btn size="sm" disabled={!admin || t.archived} onClick={() => op({ op: 'task.add', wp: t.wp, title: 'New task' })}>+ Add task in this work package</Btn>
        <Btn size="sm" disabled={!admin || t.archived} onClick={() => op({ op: 'task.duplicate', uid: t.uid })}>Duplicate</Btn>
        <Btn size="sm" disabled={!admin} onClick={() => op({ op: 'task.reorder', uid: t.uid, dir: -1 })}>Move up</Btn>
        <Btn size="sm" disabled={!admin} onClick={() => op({ op: 'task.reorder', uid: t.uid, dir: 1 })}>Move down</Btn>
        {t.archived ? <Btn size="sm" disabled={!admin} onClick={() => op({ op: 'task.archive', uid: t.uid, restore: true })}>Restore</Btn>
          : <Btn size="sm" kind="danger" disabled={!admin} onClick={() => setPending({ kind: 'archiveTask', uid: t.uid })}>Archive…</Btn>}
      </div>
      {!t.archived && <div className="row wrap movebar"><label className="small">Move to work package
        <select id="ed-move" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
          {E.livePhases(st).map((p) => <optgroup key={p.uid} label={`${pad(E.phaseNo(st, p.uid))} ${p.title}`}>{E.wpsOf(st, p.uid).map((w) => <option key={w.uid} value={w.uid}>{w.title}</option>)}</optgroup>)}
        </select></label><Btn size="sm" disabled={!admin || (moveTo === t.wp && !t.parent)} onClick={() => setPending({ kind: 'moveTask', uid: t.uid, wp: moveTo })}>Review move…</Btn>
        <span className="small muted">Or drag the task onto a work package in the tree.</span></div>}
    </Section>
  );
}

function WpEditor({ s, st, w, admin, op }) {
  const [title, setTitle] = useState(w.title);
  return (
    <Section title="Work package" right={<span className="small muted">Stable ID {w.uid}</span>}>
      <fieldset disabled={!admin} className="form"><label className="span2">Title<input id="wp-title" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="span2">Phase<select id="wp-phase" value={w.phase} onChange={(e) => op({ op: 'wp.update', uid: w.uid, patch: { phase: e.target.value } })}>{E.livePhases(st).map((p) => <option key={p.uid} value={p.uid}>{pad(E.phaseNo(st, p.uid))} {p.title}</option>)}</select></label></fieldset>
      <div className="row wrap">
        <Btn kind="primary" disabled={!admin || title === w.title} onClick={() => op({ op: 'wp.update', uid: w.uid, patch: { title } })}>Save</Btn>
        <Btn size="sm" disabled={!admin} onClick={() => op({ op: 'task.add', wp: w.uid, title: 'New task' })}>+ Add task</Btn>
        <Btn size="sm" disabled={!admin} onClick={() => op({ op: 'wp.add', phase: w.phase, title: 'New work package' })}>+ Add work package</Btn>
        <Btn size="sm" disabled={!admin} onClick={() => op({ op: 'wp.reorder', uid: w.uid, dir: -1 })}>Move up</Btn>
        <Btn size="sm" disabled={!admin} onClick={() => op({ op: 'wp.reorder', uid: w.uid, dir: 1 })}>Move down</Btn>
        <Btn size="sm" kind="danger" disabled={!admin} onClick={() => op({ op: 'wp.archive', uid: w.uid, restore: w.archived })}>{w.archived ? 'Restore' : 'Archive'}</Btn>
      </div>
      <p className="small muted">{E.topTasks(st, w.uid).length} tasks. A work package can be archived only when it is empty.</p>
    </Section>
  );
}

function PhaseEditor({ s, st, p, admin, op, setPending }) {
  const [title, setTitle] = useState(p.title); const [gate, setGate] = useState(p.gateTitle || '');
  return (
    <Section title={`Phase ${pad(E.phaseNo(st, p.uid))}`} right={<span className="small muted">Stable ID {p.uid}{p.legacy ? ` · formerly ${p.legacy}` : ''}</span>}>
      <fieldset disabled={!admin} className="form"><label className="span2">Title<input id="ph-title" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="span2">Gate name<input id="ph-gate" value={gate} onChange={(e) => setGate(e.target.value)} /></label></fieldset>
      <div className="row wrap">
        <Btn kind="primary" disabled={!admin || (title === p.title && gate === p.gateTitle)} onClick={() => op({ op: 'phase.update', uid: p.uid, patch: { title, gateTitle: gate } })}>Save</Btn>
        <Btn size="sm" disabled={!admin} onClick={() => setPending({ kind: 'addPhase', after: p.uid, title: 'New phase' })}>+ Insert phase after…</Btn>
        <Btn size="sm" disabled={!admin} onClick={() => op({ op: 'wp.add', phase: p.uid })}>+ Add work package</Btn>
        {p.archived ? <Btn size="sm" disabled={!admin} onClick={() => op({ op: 'phase.archive', uid: p.uid, restore: true })}>Restore</Btn> : <Btn size="sm" kind="danger" disabled={!admin} onClick={() => setPending({ kind: 'archivePhase', uid: p.uid })}>Archive…</Btn>}
      </div>
      {s.scope === 'proj' && <p className="small muted">State: {p.state}. Inserting a phase renumbers every later phase, gate and task code. Stable IDs, dependencies, approvals and hours are unaffected.</p>}
    </Section>
  );
}

function GateEditor({ s, st, g, admin, op }) {
  const [text, setText] = useState(''); const [owner, setOwner] = useState('role:pm'); const [items, setItems] = useState([]);
  const tasks = Object.values(st.tasks).filter((t) => !t.archived && !t.parent && E.phaseOfTask(st, t) === g.phase);
  return (
    <Section title={`${E.gateName(st, g)} · approval requirements`}>
      <ul className="plain list">{g.conds.map((c, i) => (
        <li key={c.uid}><span className="mono faint">G{E.phaseNo(st, g.phase)}.{i + 1}</span><span style={{ flex: 1 }}>{c.text}{c.legal && <span className="muted small"> · legally required</span>}<div className="small muted">{whoLabel(s, c.owner)} · {c.ev.type === 'items' ? `evidence ${c.ev.items.map((u) => st.tasks[u] ? code(st, st.tasks[u]) : '?').join(', ')}` : c.ev.type}</div></span>
          {c.status !== 'pending' && s.scope === 'proj' && <Badge tone="ok">{c.status}</Badge>}
          <Btn size="xs" disabled={!admin || c.ev.type === 'release' || c.legal} reason={c.legal ? 'Legally required permit condition' : 'Release condition'} onClick={() => op({ op: 'cond.remove', g: g.uid, c: c.uid })}>Remove</Btn></li>))}</ul>
      <fieldset disabled={!admin} className="form"><label className="span2">New condition<input id="gc-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Geotechnical report reviewed by Structural" /></label>
        <label>Approver<WhoSelect s={s} id="gc-owner" value={owner} onChange={setOwner} includeClient /></label>
        <label>Evidence tasks<select id="gc-items" multiple size={4} value={items} onChange={(e) => setItems([...e.target.selectedOptions].map((o) => o.value))}>{tasks.map((t) => <option key={t.uid} value={t.uid}>{code(st, t)} {t.title}</option>)}</select></label></fieldset>
      <Btn kind="primary" disabled={!admin || !text.trim()} onClick={() => { op({ op: 'cond.add', g: g.uid, text, owner, items }); setText(''); setItems([]); }}>Add condition</Btn>
      <p className="small muted">A condition without evidence tasks requires an uploaded document. Approved conditions and legally required permits cannot be removed.</p>
    </Section>
  );
}

function SheetsEditor({ s, admin, dispatch }) {
  const [f, setF] = useState({ disc: 'A', no: 'A-403', title: '', lead: 'role:arch', task: '' });
  const [nd, setNd] = useState({ letter: 'I', name: 'Interiors' });
  const tasks = Object.values(s.tasks).filter((t) => !t.archived && !t.parent);
  return (
    <Section title="Drawing disciplines & sheets">
      <p className="small muted">{s.sheets.length} sheets in the master register. Numbers follow the External Reviewer's NCS convention and are never reused after issue.</p>
      <fieldset disabled={!admin} className="form">
        <label>Discipline<select id="sh-disc" value={f.disc} onChange={(e) => setF({ ...f, disc: e.target.value, no: `${e.target.value}-` })}>{s.sheetDiscs.map(([l, n]) => <option key={l} value={l}>{l} · {n}</option>)}</select></label>
        <label>Number<input id="sh-no" value={f.no} onChange={(e) => setF({ ...f, no: e.target.value.toUpperCase() })} /></label>
        <label className="span2">Title<input id="sh-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Enlarged Stair Plans" /></label>
        <label>Accountable lead<WhoSelect s={s} id="sh-lead" value={f.lead} onChange={(v) => setF({ ...f, lead: v })} /></label>
        <label>Linked workflow task<select id="sh-task" value={f.task} onChange={(e) => setF({ ...f, task: e.target.value })}><option value="">None yet</option>{tasks.map((t) => <option key={t.uid} value={t.uid}>{code(s, t)} {t.title}</option>)}</select></label>
      </fieldset>
      <Btn kind="primary" disabled={!admin || !f.title.trim() || !/^[A-Z]-\d{3}(\.\d)?$/.test(f.no)} reason="Enter a title and a number like A-403" onClick={() => dispatch({ type: 'SHEET_ADD', sheet: { no: f.no, title: f.title, lead: f.lead, owner: f.lead, task: f.task || null } })}>Add required sheet</Btn>
      <h4>Add a discipline</h4>
      <fieldset disabled={!admin} className="form"><label>Letter<input id="nd-l" value={nd.letter} maxLength={1} onChange={(e) => setNd({ ...nd, letter: e.target.value.toUpperCase() })} /></label><label>Name<input id="nd-n" value={nd.name} onChange={(e) => setNd({ ...nd, name: e.target.value })} /></label></fieldset>
      <Btn size="sm" disabled={!admin || s.sheetDiscs.some(([l]) => l === nd.letter)} onClick={() => dispatch({ type: 'SHEET_DISC_ADD', ...nd })}>Add discipline</Btn>
    </Section>
  );
}
