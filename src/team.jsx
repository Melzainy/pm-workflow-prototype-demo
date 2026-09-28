import * as E from './engine.js';
import { ROLE_DEFS, DISC_NAMES } from './seed.js';
import { Badge, Btn, Section, Hrs, Empty } from './ui.jsx';

const { useState } = React;
const { code, whoLabel } = E;

export function Team({ s, dispatch, nav }) {
  const admin = E.isAdmin(s);
  const [sel, setSel] = useState('alex');
  const [showInactive, setShowInactive] = useState(true);
  const [np, setNp] = useState({ name: '', teams: ['arch'], note: '' });
  const [nt, setNt] = useState('');
  const teams = s.teams;
  const p = E.person(s, sel);
  return (
    <div className="page">
      <div className="page-h"><div><h1>Team directory</h1><p className="muted">All names are fictional sample data. No one here has an app account, and every assignment is illustrative.</p></div></div>
      {!admin && <p className="note small">Read-only. The Administrator edits the directory; the PM or Administrator assigns project roles.</p>}
      <div className="split">
        <div>
          <Section title="Teams & members" right={<label className="check small"><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Show inactive</label>}>
            {teams.filter((t) => !t.archived || showInactive).map((t) => {
              const ms = s.people.filter((x) => x.teams.includes(t.id) && (x.active || showInactive));
              return (
                <div key={t.id} className={`team ${t.archived ? 'arch' : ''}`}>
                  <div className="team-h"><TeamName t={t} admin={admin} dispatch={dispatch} /><span className="small muted">{ms.length} member{ms.length !== 1 ? 's' : ''}</span>
                    {admin && <button className="linkish small" onClick={() => dispatch({ type: 'TEAM_UPDATE', id: t.id, patch: { archived: !t.archived } })}>{t.archived ? 'Restore' : 'Archive'}</button>}</div>
                  <ul className="plain members">{ms.map((m) => <li key={m.id}><button className={`linkish ${sel === m.id ? 'cur' : ''} ${m.active ? '' : 'muted'}`} onClick={() => setSel(m.id)}>{m.name}{m.note && <span className="muted"> · {m.note}</span>}{!m.active && ' (inactive)'}</button>
                    {m.teams.length > 1 && <span className="small muted"> also {m.teams.filter((x) => x !== t.id).map((x) => teams.find((q) => q.id === x)?.name).join(', ')}</span>}</li>)}
                    {!ms.length && <li className="small muted">No members</li>}</ul>
                </div>);
            })}
            {admin && <>
              <h4>Add a member</h4>
              <div className="form">
                <label>Name<input id="np-name" value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} /></label>
                <label>Specialty (optional)<input id="np-note" value={np.note} onChange={(e) => setNp({ ...np, note: e.target.value })} /></label>
                <fieldset className="span2 checks"><legend className="flabel">Teams</legend>{teams.filter((t) => !t.archived).map((t) => <label key={t.id} className="check small"><input type="checkbox" checked={np.teams.includes(t.id)} onChange={(e) => setNp({ ...np, teams: e.target.checked ? [...np.teams, t.id] : np.teams.filter((x) => x !== t.id) })} /> {t.name}</label>)}</fieldset>
              </div>
              <Btn size="sm" kind="primary" disabled={!np.name.trim() || !np.teams.length} onClick={() => { dispatch({ type: 'PERSON_ADD', ...np }); setNp({ name: '', teams: ['arch'], note: '' }); }}>Add member</Btn>
              <h4>Create a team</h4>
              <div className="row"><input id="nt-name" value={nt} onChange={(e) => setNt(e.target.value)} placeholder="e.g. Landscape" /><Btn size="sm" disabled={!nt.trim()} onClick={() => { dispatch({ type: 'TEAM_ADD', name: nt }); setNt(''); }}>Create</Btn></div>
            </>}
          </Section>
          <Section title="Project roles · Demo Residence">
            <table className="grid-table small"><tbody>{ROLE_DEFS.filter(([k]) => k !== 'client').map(([k, l]) => (
              <tr key={k}><td>{l}</td><td>{(admin || E.isPM(s)) ? <select id={`role-${k}`} value={s.roles[k] || ''} onChange={(e) => dispatch({ type: 'ROLE_ASSIGN', role: k, person: e.target.value || null })}><option value="">TBD</option>{s.people.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select> : (s.roles[k] ? E.person(s, s.roles[k]).name : <span className="muted">TBD</span>)}</td>
                <td className="small muted">{Object.values(s.tasks).filter((t) => !t.archived && (t.owner === `role:${k}` || t.contrib.includes(`role:${k}`))).length} tasks</td></tr>))}</tbody></table>
            <p className="small muted">Assigning a person to a role moves every role-owned task, sheet and approval into that person's My Work. Forecasts stop using the 32 h/week placeholder for that role.</p>
          </Section>
        </div>
        <div>{p ? <PersonPanel key={p.id} s={s} p={p} admin={admin} dispatch={dispatch} nav={nav} /> : <Empty>Select a person.</Empty>}</div>
      </div>
    </div>
  );
}

function TeamName({ t, admin, dispatch }) {
  const [edit, setEdit] = useState(false); const [v, setV] = useState(t.name);
  if (!edit) return <b className="grow">{t.name}{admin && <button className="linkish small" onClick={() => setEdit(true)}> Rename</button>}</b>;
  return <span className="grow row"><input value={v} aria-label="Team name" onChange={(e) => setV(e.target.value)} /><Btn size="xs" onClick={() => { dispatch({ type: 'TEAM_UPDATE', id: t.id, patch: { name: v } }); setEdit(false); }}>Save</Btn></span>;
}

function PersonPanel({ s, p, admin, dispatch, nav }) {
  const [f, setF] = useState({ name: p.name, note: p.note, cap: p.cap, teams: p.teams });
  const tasks = Object.values(s.tasks).filter((t) => !t.archived && E.involves(s, t, p.id));
  const sheets = s.sheets.filter((x) => [x.lead, x.owner, ...x.contrib, ...x.reviewers].some((r) => E.resolve(s, r) === p.id));
  const roles = ROLE_DEFS.filter(([k]) => s.roles[k] === p.id).map(([, l]) => l);
  const h = s.time.filter((e) => e.person === p.id);
  const ap = h.filter((e) => e.status === 'approved').reduce((a, e) => a + e.hours, 0);
  const pe = h.filter((e) => e.status === 'submitted').reduce((a, e) => a + e.hours, 0);
  const openT = tasks.filter((t) => !E.done(s, t));
  const load = openT.filter((t) => t.ps <= E.addDays(E.TODAY, 14) && t.pf >= E.TODAY).length;
  const roleOf = (t) => (E.resolve(s, t.owner) === p.id ? 'Accountable' : 'Contributor');
  const sheetRole = (x) => [E.resolve(s, x.lead) === p.id && 'Lead', E.resolve(s, x.owner) === p.id && 'Owner', x.contrib.some((r) => E.resolve(s, r) === p.id) && 'Contributor', x.reviewers.some((r) => E.resolve(s, r) === p.id) && 'Reviewer'].filter(Boolean).join(', ');
  return (
    <Section title={p.name} right={<span className="row"><Badge>No account yet</Badge>{!p.active && <Badge tone="bad">Inactive</Badge>}</span>}>
      <div className="form">
        <label>Name<input id="pp-name" value={f.name} disabled={!admin} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label>Specialty<input id="pp-note" value={f.note} disabled={!admin} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
        <label>Weekly capacity (h)<input id="pp-cap" type="number" min="0" max="60" value={f.cap} disabled={!admin} onChange={(e) => setF({ ...f, cap: Number(e.target.value) })} /></label>
        <fieldset className="span2 checks"><legend className="flabel">Teams</legend>{s.teams.filter((t) => !t.archived).map((t) => <label key={t.id} className="check small"><input type="checkbox" disabled={!admin} checked={f.teams.includes(t.id)} onChange={(e) => setF({ ...f, teams: e.target.checked ? [...f.teams, t.id] : f.teams.filter((x) => x !== t.id) })} /> {t.name}</label>)}</fieldset>
      </div>
      {admin && <div className="row"><Btn size="sm" kind="primary" disabled={JSON.stringify(f) === JSON.stringify({ name: p.name, note: p.note, cap: p.cap, teams: p.teams })} onClick={() => dispatch({ type: 'PERSON_UPDATE', id: p.id, patch: f })}>Save</Btn>
        <Btn size="sm" kind={p.active ? 'danger' : undefined} onClick={() => dispatch({ type: 'PERSON_UPDATE', id: p.id, patch: { active: !p.active } })}>{p.active ? 'Deactivate' : 'Reactivate'}</Btn></div>}
      {!p.active && <p className="note small">Deactivated. Approved timesheets, approvals and history stay attributed to {p.name}. Open assignments should be reassigned by the PM{openT.length ? ` (${openT.length} still open)` : ''}.</p>}
      <p className="small">{roles.length ? <>Project roles: <b>{roles.join(', ')}</b> · </> : null}Approved <Hrs v={ap} /> · pending <Hrs v={pe} /> · {load} task{load !== 1 ? 's' : ''} planned in the next 2 weeks</p>
      <h4>Workflow responsibilities ({tasks.length})</h4>
      {tasks.length ? <table className="grid-table small"><tbody>{tasks.map((t) => <tr key={t.uid}><td><button className="linkish" onClick={() => nav.task(t.uid)}><span className="mono">{code(s, t)}</span> {t.title}</button></td><td>{roleOf(t)}</td><td>{E.status(s, t).label}</td></tr>)}</tbody></table> : <Empty>No workflow tasks assigned.</Empty>}
      <h4>Drawing responsibilities ({sheets.length})</h4>
      {sheets.length ? <table className="grid-table small"><tbody>{sheets.map((x) => <tr key={x.no}><td><button className="linkish" onClick={() => nav.sheet(x.no)}><span className="mono">{x.no}</span> {x.title}</button></td><td>{sheetRole(x)}</td><td>{x.pct}%</td></tr>)}</tbody></table> : <Empty>No sheets assigned.</Empty>}
      <p className="small muted">Disciplines: {[...new Set(p.teams.map((t) => s.teams.find((q) => q.id === t)?.disc))].map((d) => DISC_NAMES[d] || d).join(', ')}</p>
    </Section>
  );
}
