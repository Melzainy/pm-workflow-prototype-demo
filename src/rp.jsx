// Resource Planning (Prototype v3): company-level, reads every project through the shared store.
import * as E from './engine.js';
import * as R from './resource.js';
import { projView, projectsOf } from './portfolio.js';
import { Badge, Btn, fmt, Section, Hrs, Empty, Illus } from './ui.jsx';

const { useState, useMemo } = React;
const RANGES = [[1, 'This week'], [4, 'Next 4 weeks'], [8, 'Next 8 weeks'], [12, 'Next 12 weeks'], [0, 'Custom']];
const r0 = (x) => Math.round(x);
const r1 = (x) => Math.round(x * 10) / 10;
const pctTxt = (u) => (u >= 999 ? 'no capacity' : `${u}%`);

// Cell status, never colour-only: every state has a mark and a word.
export const St = ({ st, compact }) => <span className={`rst ${st.key}`} title={st.label}><i aria-hidden="true">{st.mark}</i>{compact ? null : ` ${st.label}`}</span>;

export function useRange(S, ui) {
  const M = R.resourceModel(S);
  const rp = ui.rp || {};
  const n = rp.range ?? S.rp.horizon ?? 8;
  let i0 = 0; let i1 = Math.max(0, n - 1);
  if (n === 0) { i0 = Math.max(0, M.idx[E.weekOf(rp.from || E.TODAY)] ?? 0); i1 = Math.max(i0, M.idx[E.weekOf(rp.to || E.addDays(E.TODAY, 7 * 7))] ?? i0 + 7); }
  return { M, i0, i1, n: i1 - i0 + 1 };
}

// Weekly demand for one person honouring the project / phase / search filters.
function personWeeks(S, M, pid, f, i0, i1) {
  const out = [];
  for (let i = i0; i <= i1; i++) {
    const c = M.cap[pid][i];
    const items = M.cells[pid][i].filter(({ row }) => (!f.project || row.proj === f.project) && (!f.phase || row.phaseNo === Number(f.phase)) && (!f._proj || f._proj.has(row.proj)));
    const d = f.project || f.phase || f._proj ? items.reduce((a, x) => a + x.h, 0) : M.demand[pid][i];
    const u = c.avail > 0 ? r0((d / c.avail) * 100) : d > 0 ? 999 : 0;
    out.push({ i, wk: M.weeks[i], cap: c, d, u, st: R.status(S, u, c.avail, d), items });
  }
  return out;
}

export function ResourcePlanning({ S, dispatch, ui, setUi, nav }) {
  const rp = ui.rp || {};
  const set = (patch) => setUi((u) => ({ ...u, rp: { ...(u.rp || {}), ...patch } }));
  const { M, i0, i1 } = useRange(S, ui);
  const f0 = rp.f || { active: true };
  const setF = (patch) => set({ f: { ...f0, ...patch } });
  const allowed = f0.pm ? new Set(projectsOf(S).filter((p) => (f0.pm === 'tbd' ? !p.roles.pm : p.roles.pm === f0.pm)).map((p) => p.id)) : null;
  const f = { ...f0, _proj: allowed };
  const view = rp.view || 'person';
  const me = ['admin', 'pm', 'exec'].includes(S.viewer) ? null : S.viewer; // team members see their own workload
  const canEdit = S.viewer === 'admin' || S.viewer === 'pm';
  const weeks = M.weeks.slice(i0, i1 + 1);
  const people = R.companyPeople(S);
  const q = me ? '' : (rp.q || '').trim().toLowerCase();
  const fx = me ? { ...f, person: '', onlyOver: false, onlyAvail: false } : f;
  const allRows = people.map((p) => ({ p, disc: R.discOf(S, p), w: personWeeks(S, M, p.id, f, i0, i1) }))
    .map((r) => { const C = r.w.reduce((a, x) => a + x.cap.avail, 0); const Dm = r.w.reduce((a, x) => a + x.d, 0); const u = C > 0 ? r0((Dm / C) * 100) : Dm > 0 ? 999 : 0; return { ...r, C, Dm, u, st: R.status(S, u, C, Dm) }; })
    .filter((r) => (!fx.disc || r.disc === fx.disc || R.secondaryDiscs(S, r.p).includes(fx.disc)) && (!fx.person || r.p.id === fx.person)
      && (!fx.onlyOver || r.w.some((x) => x.st.key === 'over')) && (!fx.onlyAvail || r.st.key === 'avail')
      && (!fx.project || r.Dm > 0 || fx.showZero || r.p.id === me) && (!q || r.p.name.toLowerCase().includes(q) || r.w.some((x) => x.items.some(({ row }) => `${row.title} ${row.projName} ${row.code}`.toLowerCase().includes(q)))));
  // Team members: own detailed rows only; discipline/company figures stay aggregated across everyone.
  const rows = me ? allRows.filter((r) => r.p.id === me) : allRows;
  const discs = R.DISCIPLINES.map(([d, name]) => ({ d, name, all: allRows.filter((r) => r.disc === d), rows: rows.filter((r) => r.disc === d) })).filter((g) => (!f.disc || g.d === f.disc));
  const neededAll = M.needed.filter((n) => (!f._proj || f._proj.has(n.proj)) && (!f.project || n.proj === f.project) && (!f.phase || n.phaseNo === Number(f.phase)) && (!f.disc || n.need === f.disc));
  const open = rp.open || {};
  const toggle = (k) => set({ open: { ...open, [k]: !open[k] } });
  const sel = rp.sel;
  const pick = (x) => { if (me && x && (x.kind === 'person' || x.kind === 'cell') && x.id !== me) return; set({ sel: x }); };
  return (
    <div className="page">
      <div className="page-h"><div><h1>Resource planning</h1><p className="muted">Company-wide workload from every project's tasks, assignments, allocations, plans, capacity and timesheets. <Illus>All capacity, allocations and hours are illustrative, not verified.</Illus></p></div>
        {S.viewer === 'admin' && <button className="linkish small" onClick={() => pick({ kind: 'settings' })}>Resource settings</button>}</div>
      {me && <p className="note small">Team-member view: your own assignments and workload in detail, plus discipline and company totals. Person-level detail for colleagues is visible to Administrators, PMs and Executive Management.</p>}
      <Controls S={S} rp={rp} set={set} f={f0} setF={setF} me={me} />
      <Summary S={S} M={M} i0={i0} i1={i1} rows={allRows} needed={neededAll} me={me} />
      <div className="seg rp-view" role="group" aria-label="Group by">
        {[['person', 'By person'], ['disc', 'By discipline'], ['project', 'By project']].map(([k, l]) => <button key={k} className={view === k ? 'on' : ''} aria-pressed={view === k} onClick={() => set({ view: k })}>{l}</button>)}
      </div>
      {f.onlyUnassigned ? null : view === 'person' ? (
        <Board S={S} M={M} weeks={weeks} i0={i0} discs={discs} open={open} toggle={toggle} pick={pick} sel={sel} f={f} me={me} />
      ) : view === 'disc' ? (
        <DiscTable S={S} M={M} weeks={weeks} i0={i0} i1={i1} discs={discs} rows={rows} pick={pick} open={open} toggle={toggle} f={f} me={me} />
      ) : <ProjectTable S={S} M={M} i0={i0} i1={i1} f={f} open={open} toggle={toggle} pick={pick} nav={nav} me={me} />}
      <Needed S={S} items={neededAll} notDefined={M.notDefined.filter((n) => (!f.project || n.proj === f.project))} nav={nav} i0={i0} i1={i1} M={M} me={me} />
      <p className="small muted">Weekly availability = standard weekly capacity × working days ÷ 5 − unavailable days (holidays, vacation, training). Workload = each task's remaining effort, split by the allocations entered on the task (or an illustrative equal split, labelled), spread over the working days of its current plan from today. Hours logged never change task progress.</p>
      {sel && <Drawer close={() => pick(null)} label={sel.kind === 'person' ? 'Person detail' : sel.kind === 'cell' ? 'Week detail' : sel.kind === 'disc' ? 'Discipline detail' : 'Resource settings'}>
        {sel.kind === 'person' && <PersonPanel S={S} M={M} pid={sel.id} dispatch={dispatch} nav={nav} canEdit={canEdit} i0={i0} i1={i1} pick={pick} />}
        {sel.kind === 'cell' && <WeekPanel S={S} M={M} pid={sel.id} i={sel.i} nav={nav} pick={pick} />}
        {sel.kind === 'disc' && <DiscPanel S={S} M={M} d={sel.id} i0={i0} i1={i1} nav={nav} pick={pick} me={me} />}
        {sel.kind === 'settings' && <Settings S={S} dispatch={dispatch} />}
      </Drawer>}
    </div>
  );
}

function Controls({ S, rp, set, f, setF, me }) {
  const n = rp.range ?? S.rp.horizon ?? 8;
  const ps = projectsOf(S, true);
  return (
    <div className="rp-controls">
      <div className="seg" role="group" aria-label="Date range">{RANGES.map(([k, l]) => <button key={k} className={n === k ? 'on' : ''} aria-pressed={n === k} onClick={() => set({ range: k })}>{l}</button>)}</div>
      {n === 0 && <span className="row small"><label>From <input type="date" id="rp-from" value={rp.from || E.TODAY} onChange={(e) => set({ from: e.target.value })} /></label><label>To <input type="date" id="rp-to" value={rp.to || E.addDays(E.TODAY, 49)} onChange={(e) => set({ to: e.target.value })} /></label></span>}
      <div className="filters wrap rp-filters">
        {!me && <label>Search<input id="rp-q" value={rp.q || ''} placeholder="Person, task or project" onChange={(e) => set({ q: e.target.value })} /></label>}
        <label>Discipline<select id="rp-disc" value={f.disc || ''} onChange={(e) => setF({ disc: e.target.value })}><option value="">All</option>{R.DISCIPLINES.map(([d, l]) => <option key={d} value={d}>{l}</option>)}</select></label>
        {!me && <label>Person<select id="rp-person" value={f.person || ''} onChange={(e) => setF({ person: e.target.value })}><option value="">All</option>{R.companyPeople(S).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
        <label>Project<select id="rp-project" value={f.project || ''} onChange={(e) => setF({ project: e.target.value })}><option value="">All</option>{ps.filter((p) => !f.active || p.status === 'active').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>Project Manager<select id="rp-pm" value={f.pm || ''} onChange={(e) => setF({ pm: e.target.value })}><option value="">All</option><option value="tbd">TBD (not assigned)</option></select></label>
        <label>Phase<select id="rp-phase" value={f.phase || ''} onChange={(e) => setF({ phase: e.target.value })}><option value="">All</option>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{E.pad(n)}</option>)}</select></label>
        {!me && <><label className="check small"><input type="checkbox" id="rp-over" checked={!!f.onlyOver} onChange={(e) => setF({ onlyOver: e.target.checked })} /> Overallocated only</label>
        <label className="check small"><input type="checkbox" id="rp-avail" checked={!!f.onlyAvail} onChange={(e) => setF({ onlyAvail: e.target.checked })} /> Available only</label></>}
        <label className="check small"><input type="checkbox" id="rp-unas" checked={!!f.onlyUnassigned} onChange={(e) => setF({ onlyUnassigned: e.target.checked })} /> Unassigned work only</label>
        <label className="check small"><input type="checkbox" id="rp-active" checked={!!f.active} onChange={(e) => setF({ active: e.target.checked })} /> Active projects only</label>
      </div>
    </div>
  );
}

function Summary({ S, M, i0, i1, rows, needed, me }) {
  const ps = projectsOf(S);
  const C = rows.reduce((a, r) => a + r.C, 0); const Dm = rows.reduce((a, r) => a + r.Dm, 0);
  const wk0 = rows.map((r) => r.w[0]).filter(Boolean); // counts only, never names, in the summary
  const cnt = (k) => wk0.filter((x) => x.st.key === k).length;
  const unas = needed.reduce((a, n) => a + weeksHours(M, n, i0, i1), 0);
  const back = E.addDays(E.weekOf(E.TODAY), -28);
  const act = S.time.filter((e) => e.date >= back && (!me || e.person === me));
  const ap = act.filter((e) => e.status === 'approved').reduce((a, e) => a + e.hours, 0);
  const pe = S.time.filter((e) => e.status === 'submitted' && (!me || e.person === me)).reduce((a, e) => a + e.hours, 0);
  const K = ({ l, v, sub }) => <div><div className="lbl">{l}</div><b>{v}</b>{sub && <div className="sub">{sub}</div>}</div>;
  const u = C > 0 ? r0((Dm / C) * 100) : 0;
  return (
    <div className="kpis rp-kpis" aria-label="Resource summary">
      <K l="Active projects" v={ps.length} />
      <K l="Team members in view" v={rows.length} sub={`of ${R.companyPeople(S).length} active`} />
      <K l="Available capacity" v={<Hrs v={r0(C)} />} sub={`${M.weeks[i0] ? R.wkLabel(M.weeks[i0]) : ''}–${R.wkLabel(M.weeks[i1])} · illustrative`} />
      <K l="Allocated workload" v={<Hrs v={r0(Dm)} />} sub="assigned people" />
      <K l="Utilization" v={<>{u}% <St st={R.status(S, u, C, Dm)} compact /></>} sub={`over / near ≥ ${S.rp.over} / ${S.rp.near}%`} />
      <K l="Over capacity this week" v={cnt('over')} sub="people above 100%" />
      <K l="Near capacity this week" v={cnt('near')} sub={`${cnt('bal')} balanced`} />
      <K l="Available this week" v={cnt('avail')} sub="people below 70%" />
      <K l="Unassigned work" v={<Hrs v={r0(unas)} />} sub={`${needed.length} items in range or later`} />
      <K l="Planned hours in period" v={<Hrs v={r0(Dm + unas)} />} sub="assigned + unassigned" />
      <K l="Approved actual" v={<Hrs v={r1(ap)} />} sub="last 4 weeks" />
      <K l="Pending timesheets" v={<Hrs v={r1(pe)} />} sub="awaiting PM approval" />
    </div>
  );
}
const weeksHours = (M, n, i0, i1) => { const a = M.assignments.find((x) => x.proj === n.proj && x.uid === n.uid && !x.pid && x.role === n.role); if (!a) return 0; let h = 0; for (let i = i0; i <= i1; i++) h += a.weeks[M.weeks[i]] || 0; return h; };

function Cell({ x, onClick, label }) {
  const w = Math.min(100, x.u >= 999 ? 100 : x.u);
  return (
    <button className={`rcell ${x.st.key}`} onClick={onClick} aria-label={label}>
      <span className="rbar" aria-hidden="true"><i style={{ width: `${w}%` }} /></span>
      <span className="rpct">{x.u >= 999 ? '—' : `${x.u}%`}<i aria-hidden="true">{x.st.mark}</i></span>
      <span className="rh">{r0(x.d)}/{r0(x.cap.avail)}{x.cap.off ? <em title={x.cap.kinds.join(', ')}> ·{x.cap.kinds[0]?.[0]}</em> : null}</span>
    </button>
  );
}

function Board({ S, M, weeks, i0, discs, open, toggle, pick, f, me }) {
  return (
    <div className="rp-board" role="region" aria-label="Weekly resource capacity board" tabIndex={0}>
      <table className="rtable">
        <thead><tr><th className="rname">Person</th><th className="rsum">Range</th>{weeks.map((w) => <th key={w} className="rwk"><b>{R.wkLabel(w)}</b><span>{fmt(w)}</span></th>)}</tr></thead>
        <tbody>
          {discs.map((g) => {
            const isOpen = open[g.d] ?? (!!me && g.rows.length > 0);
            const agg = weeks.map((w, k) => { const i = i0 + k; const c = g.all.reduce((a, r) => a + r.w[k].cap.avail, 0); const d = g.all.reduce((a, r) => a + r.w[k].d, 0); const u = c > 0 ? r0((d / c) * 100) : d > 0 ? 999 : 0; return { i, cap: { avail: c, off: 0, kinds: [] }, d, u, st: R.status(S, u, c, d) }; });
            const C = agg.reduce((a, x) => a + x.cap.avail, 0); const Dm = agg.reduce((a, x) => a + x.d, 0); const u = C > 0 ? r0((Dm / C) * 100) : Dm > 0 ? 999 : 0;
            const un = M.unassigned[g.d];
            if (!g.all.length && !un && (f.onlyOver || f.onlyAvail || f.person)) return null;
            if (!me && !g.rows.length && (f.onlyOver || f.onlyAvail || f.person)) return null;
            return [
              <tr key={g.d} className="rgroup">
                <th className="rname"><button className="tw" aria-expanded={!!isOpen} aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${g.name}`} onClick={() => toggle(g.d)}>{isOpen ? '▾' : '▸'}</button>
                  <button className="linkish" onClick={() => pick({ kind: 'disc', id: g.d })}><b>{g.name}</b></button> <span className="muted small">{g.all.length} {g.all.length === 1 ? 'person' : 'people'}</span></th>
                <td className="rsum">{g.all.length ? <><b>{pctTxt(u)}</b> <St st={R.status(S, u, C, Dm)} compact /><div className="small muted">{r0(Dm)}/{r0(C)} h</div></> : <span className="small muted">No people</span>}</td>
                {agg.map((x) => <td key={x.i}>{g.all.length ? <div className={`rcell grp ${x.st.key}`}><span className="rpct">{x.u >= 999 ? '—' : `${x.u}%`}<i aria-hidden="true">{x.st.mark}</i></span></div> : null}</td>)}
              </tr>,
              ...(isOpen ? g.rows.map((r) => (
                <tr key={r.p.id} className="rperson">
                  <th className="rname"><button className="linkish" onClick={() => pick({ kind: 'person', id: r.p.id })}>{r.p.name}</button>{r.p.note && <span className="muted small"> · {r.p.note}</span>}
                    <div className="small muted">{R.capPeriod(r.p, M.weeks[i0])} h/wk {r.p.capVerified ? '' : <Illus title="Illustrative capacity — not verified">illustrative</Illus>}{R.secondaryDiscs(S, r.p).length ? ` · also ${R.secondaryDiscs(S, r.p).map(R.discName).join(', ')}` : ''}</div></th>
                  <td className="rsum"><b>{pctTxt(r.u)}</b> <St st={r.st} /><div className="small muted">{r0(r.Dm)}/{r0(r.C)} h</div></td>
                  {r.w.map((x) => <td key={x.i}><Cell x={x} onClick={() => pick({ kind: 'cell', id: r.p.id, i: x.i })} label={`${r.p.name}, ${R.wkLabel(x.wk)}: ${r0(x.d)} of ${r0(x.cap.avail)} hours, ${x.u}% ${x.st.label}`} /></td>)}
                </tr>)) : []),
              ...(isOpen && un && !me ? [<tr key={g.d + 'u'} className="runas">
                <th className="rname"><span className="muted">Unassigned {g.name.toLowerCase()} work</span><div className="small muted">roles TBD / no one assigned</div></th>
                <td className="rsum"><span className="small">{r0(weeks.reduce((a, w, k) => a + un[i0 + k], 0))} h</span></td>
                {weeks.map((w, k) => <td key={w}><span className="small muted">{un[i0 + k] ? `${r0(un[i0 + k])} h` : ''}</span></td>)}
              </tr>] : []),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

function DiscTable({ S, M, weeks, i0, i1, discs, rows, pick, open, toggle, f, me }) {
  return (
    <div className="rp-board" role="region" aria-label="Discipline summary" tabIndex={0}>
      <table className="rtable disc">
        <thead><tr><th className="rname">Discipline</th><th>People</th><th>Capacity / wk</th><th>Assigned</th><th>Available</th><th>Utilization</th><th>Over · near · avail. (range)</th><th>Unassigned tasks</th><th>Top projects</th>{weeks.slice(0, 8).map((w) => <th key={w} className="rwk"><b>{R.wkLabel(w)}</b></th>)}</tr></thead>
        <tbody>{discs.map((g) => {
          const s = discStats(S, M, g.d, g.all, i0, i1);
          const isOpen = !!open['d' + g.d];
          return [
            <tr key={g.d} className="rgroup">
              <th className="rname"><button className="tw" aria-expanded={isOpen} aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${g.name}`} onClick={() => toggle('d' + g.d)}>{isOpen ? '▾' : '▸'}</button><button className="linkish" onClick={() => pick({ kind: 'disc', id: g.d })}><b>{g.name}</b></button></th>
              <td>{g.all.length}</td><td>{r0(s.capWk)} h</td><td>{r0(s.Dm)} h</td><td>{r0(s.C - s.Dm)} h</td>
              <td>{g.all.length ? <><b>{s.u}%</b> <St st={s.st} compact /></> : '—'}</td>
              <td className="small">{s.over} · {s.near} · {s.avail}</td>
              <td>{s.needed ? <Badge tone="warn">{s.needed}</Badge> : '0'}</td>
              <td className="small">{s.top.slice(0, 2).map(([p, h]) => `${S.projects[p]?.name} ${r0(h)} h`).join(' · ') || '—'}</td>
              {s.weekly.slice(0, 8).map((x, k) => <td key={k}>{g.all.length ? <span className={`rcell grp ${x.st.key}`}><span className="rpct">{x.u >= 999 ? '—' : `${x.u}%`}<i aria-hidden="true">{x.st.mark}</i></span></span> : null}</td>)}
            </tr>,
            ...(isOpen ? g.rows.map((r) => <tr key={r.p.id} className="rperson"><th className="rname"><button className="linkish" onClick={() => pick({ kind: 'person', id: r.p.id })}>{r.p.name}</button></th>
              <td /><td>{r0(r.C / (i1 - i0 + 1))} h</td><td>{r0(r.Dm)} h</td><td>{r0(r.C - r.Dm)} h</td><td><b>{pctTxt(r.u)}</b> <St st={r.st} compact /></td><td colSpan={3} />
              {r.w.slice(0, 8).map((x) => <td key={x.i}><span className={`rcell grp ${x.st.key}`}><span className="rpct">{x.u >= 999 ? '—' : `${x.u}%`}<i aria-hidden="true">{x.st.mark}</i></span></span></td>)}</tr>) : []),
          ];
        })}</tbody>
      </table>
    </div>
  );
}

export function discStats(S, M, d, rows, i0, i1) {
  const n = i1 - i0 + 1;
  const C = rows.reduce((a, r) => a + r.C, 0); const Dm = rows.reduce((a, r) => a + r.Dm, 0);
  const u = C > 0 ? r0((Dm / C) * 100) : Dm > 0 ? 999 : 0;
  const weekly = []; for (let k = 0; k < n; k++) { const c = rows.reduce((a, r) => a + r.w[k].cap.avail, 0); const dd = rows.reduce((a, r) => a + r.w[k].d, 0); const uu = c > 0 ? r0((dd / c) * 100) : dd > 0 ? 999 : 0; weekly.push({ c, d: dd, u: uu, st: R.status(S, uu, c, dd) }); }
  const proj = {}; rows.forEach((r) => r.w.forEach((x) => x.items.forEach(({ row, h }) => { proj[row.proj] = (proj[row.proj] || 0) + h; })));
  const needed = M.needed.filter((x) => x.need === d).length;
  return { C, Dm, u, st: R.status(S, u, C, Dm), capWk: C / n, weekly, over: rows.filter((r) => r.st.key === 'over').length, near: rows.filter((r) => r.st.key === 'near').length, avail: rows.filter((r) => r.st.key === 'avail').length, needed, top: Object.entries(proj).sort((a, b) => b[1] - a[1]) };
}

function ProjectTable({ S, M, i0, i1, f, open, toggle, pick, nav, me }) {
  const ps = projectsOf(S).filter((p) => !f.project || p.id === f.project);
  const inR = (row) => { let h = 0; for (let i = i0; i <= i1; i++) h += row.weeks[M.weeks[i]] || 0; return h; };
  return (
    <Section title="Resource demand by project" right={<span className="small muted">{R.wkLabel(M.weeks[i0])}–{R.wkLabel(M.weeks[i1])}</span>}>
      <ul className="plain rproj">{ps.map((P) => {
        const rows = M.assignments.filter((a) => a.proj === P.id && (!f.phase || a.phaseNo === Number(f.phase)));
        const byD = {}; rows.forEach((a) => { const h = inR(a); if (!h) return; const d = a.pid ? a.udisc : a.udisc; (byD[d] ||= { h: 0, people: {} }).h += h; const k = a.pid ? (me && a.pid !== me ? 'others' : a.pid) : `tbd:${a.role}`; byD[d].people[k] = (byD[d].people[k] || 0) + h; });
        const tot = Object.values(byD).reduce((a, x) => a + x.h, 0);
        const po = !!open['p' + P.id];
        return <li key={P.id}>
          <div className="row between"><span><button className="tw" aria-expanded={po} onClick={() => toggle('p' + P.id)}>{po ? '▾' : '▸'}</button><b>{P.name}</b> <span className="muted small">{P.address}</span></span><span><Hrs v={r0(tot)} /> in range</span></div>
          {po && <ul className="plain rproj-d">{R.DISCIPLINES.concat([['consult', 'External consultants']]).filter(([d]) => byD[d]).map(([d, l]) => {
            const dk = `p${P.id}${d}`; const dopen = !!open[dk];
            return <li key={d}><div className="row between"><span><button className="tw" aria-expanded={dopen} onClick={() => toggle(dk)}>{dopen ? '▾' : '▸'}</button>{l}</span><Hrs v={r0(byD[d].h)} /></div>
              {dopen && <ul className="plain rproj-p">{Object.entries(byD[d].people).sort((a, b) => b[1] - a[1]).map(([k, h]) => <li key={k} className="row between">
                {k === 'others' ? <span className="muted">Colleagues (combined)</span> : k.startsWith('tbd:') ? <span className="muted">{E.roleLabel(k.slice(4))} (TBD)</span> : <button className="linkish" onClick={() => pick({ kind: 'person', id: k })}>{S.people.find((p) => p.id === k)?.name}</button>}<Hrs v={r0(h)} /></li>)}</ul>}
            </li>;
          })}{!tot && <li className="muted small">No remaining work in this range.</li>}</ul>}
        </li>;
      })}</ul>
    </Section>
  );
}

function Needed({ S, items, notDefined, nav, i0, i1, M, me }) {
  const [openG, setOpenG] = useState({});
  const [showND, setShowND] = useState(false);
  const groups = {}; items.forEach((n) => { (groups[n.reason] ||= []).push(n); });
  const order = Object.keys(groups).sort((a, b) => (a === 'Missing Project Manager') - (b === 'Missing Project Manager') || groups[b].length - groups[a].length);
  return (
    <Section title={`Resource needed (${items.length})`} right={<span className="small muted">Tasks with planned effort and no person for part of it</span>} className="rneeded">
      {order.map((g) => {
        const list = groups[g].sort((a, b) => (a.from < b.from ? -1 : 1)); const o = !!openG[g];
        return <div key={g} className="rneed-g">
          <button className="disc-h" aria-expanded={o} onClick={() => setOpenG({ ...openG, [g]: !o })}><span><span className="caret">{o ? '▾' : '▸'}</span> {g}</span><span className="r small">{list.length} · <Hrs v={r0(list.reduce((a, n) => a + n.hours, 0))} /></span></button>
          {o && <div className="scroll"><table className="grid-table small"><thead><tr><th>Project</th><th>Phase</th><th>Task</th><th>Required discipline</th><th>Required hours</th><th>Needed from</th><th>Needed until</th><th>Priority</th></tr></thead><tbody>
            {list.slice(0, 40).map((n, k) => <tr key={k}><td>{n.projName}</td><td>{E.pad(n.phaseNo)}{n.locked ? <span className="muted"> · locked</span> : ''}</td>
              <td><button className="linkish" onClick={() => nav.openTask(n.proj, n.uid)}><span className="mono">{n.code}</span> {n.title}</button></td><td>{R.discName(n.need)}</td><td><Hrs v={r1(n.hours)} /></td><td>{fmt(n.from)}</td><td>{fmt(n.to)}{n.overdue ? <span className="tbad"> · overdue</span> : ''}</td><td>{n.priority}</td></tr>)}
          </tbody></table>{list.length > 40 && <p className="small muted">{list.length - 40} more. Filter by project or phase to narrow.</p>}</div>}
        </div>;
      })}
      {!items.length && <Empty>Every task with remaining effort has a person for all of it.</Empty>}
      <div className="rneed-g"><button className="disc-h" aria-expanded={showND} onClick={() => setShowND(!showND)}><span><span className="caret">{showND ? '▾' : '▸'}</span> Allocation not defined</span><span className="r small">{notDefined.length} tasks with several assignees and no hours or % entered</span></button>
        {showND && <ul className="plain small list">{notDefined.slice(0, 40).map((n, k) => <li key={k}><button className="linkish" onClick={() => nav.openTask(n.proj, n.uid)}>{n.projName} · <span className="mono">{n.code}</span> {n.title}</button><span className="muted">{r1(n.rem)} h remaining · shown as an illustrative equal split</span></li>)}</ul>}
      </div>
    </Section>
  );
}

function Drawer({ children, close, label }) {
  return <aside className="drawer rdrawer" aria-label={label}><header><b>{label}</b><Btn size="xs" onClick={close}>Close</Btn></header><div className="rdrawer-b">{children}</div></aside>;
}

function Mini({ S, M, pid, i0, n, pick }) {
  const w = personWeeks(S, M, pid, {}, i0, i0 + n - 1);
  return <div className="rmini" role="list" aria-label="Weekly workload">{w.map((x) => <button key={x.i} role="listitem" className={`rmini-c ${x.st.key}`} onClick={() => pick({ kind: 'cell', id: pid, i: x.i })} title={`${R.wkLabel(x.wk)} ${r0(x.d)}/${r0(x.cap.avail)} h`}>
    <span className="rmini-b"><i style={{ height: `${Math.min(100, x.u >= 999 ? 100 : x.u)}%` }} /></span><span className="rmini-l">{R.wkLabel(x.wk)}</span><span className="rmini-v">{x.u >= 999 ? '—' : `${x.u}%`}</span></button>)}</div>;
}

function PersonPanel({ S, M, pid, dispatch, nav, canEdit, i0, i1, pick }) {
  const p = S.people.find((x) => x.id === pid);
  const fc = R.forecastFor(S, M, pid);
  const w0 = personWeeks(S, M, pid, {}, 0, 0)[0];
  const rows = M.assignments.filter((a) => a.pid === pid);
  const byProj = {}; rows.forEach((a) => { (byProj[a.proj] ||= []).push(a); });
  const inR = (a) => { let h = 0; for (let i = i0; i <= i1; i++) h += a.weeks[M.weeks[i]] || 0; return h; };
  const wk = M.weeks[0]; const act = M.actual[pid]?.[wk] || { approved: 0, pending: 0 };
  const back = E.addDays(wk, -28);
  const recent = S.time.filter((e) => e.person === pid && e.date >= back);
  const exc = S.capEx.filter((x) => x.person === pid);
  const [ex, setEx] = useState({ kind: 'Vacation', from: E.addDays(wk, 14), to: E.addDays(wk, 18) });
  const [cap, setCap] = useState({ hpw: R.capPeriod(p, wk), from: wk, verified: !!p.capVerified });
  const [add, setAdd] = useState({ proj: '', uid: '', h: 12 });
  const addTasks = add.proj ? (() => { const V = projView(S, add.proj); return Object.values(V.tasks).filter((t) => !t.archived && !E.done(V, t) && E.phase(V, E.phaseOfTask(V, t))?.state !== 'released' && t.pf >= E.TODAY).sort((a, b) => (a.ps < b.ps ? -1 : 1)).slice(0, 80).map((t) => ({ t, c: E.code(V, t) })); })() : [];
  const admin = S.viewer === 'admin';
  return (
    <div className="rpanel">
      <h2>{p.name}</h2>
      <p className="small muted">{R.discName(R.discOf(S, p))}{R.secondaryDiscs(S, p).length ? ` · also ${R.secondaryDiscs(S, p).map(R.discName).join(', ')}` : ''}{p.note ? ` · ${p.note}` : ''} · {p.active ? 'active' : 'inactive'}</p>
      <div className="kpis mini">
        <div><div className="lbl">Capacity</div><b>{R.capPeriod(p, wk)} h/wk</b><div className="sub">{p.capVerified ? 'verified' : 'illustrative capacity'}</div></div>
        <div><div className="lbl">This week</div><b>{r0(w0.d)} h · {pctTxt(w0.u)}</b><div className="sub"><St st={w0.st} /> · {r0(w0.cap.avail - w0.d)} h free</div></div>
        <div><div className="lbl">Actual this week</div><b><Hrs v={act.approved} /></b><div className="sub"><Hrs v={act.pending} /> pending</div></div>
      </div>
      <h4>Forecast</h4>
      <p className="small">This week {pctTxt(fc.now)} · next 4 weeks avg {pctTxt(fc.avg4)} · next 8 weeks avg {pctTxt(fc.avg8)} · {fc.overWeeks} overloaded week{fc.overWeeks === 1 ? '' : 's'} in 8 · meaningful availability {fc.firstAvailable ? <b>{R.wkLabel(fc.firstAvailable)} ({fmt(fc.firstAvailable)})</b> : 'not within the horizon'}</p>
      <h4>Next 8 weeks</h4>
      <Mini S={S} M={M} pid={pid} i0={0} n={8} pick={pick} />
      <h4>Current projects & open tasks</h4>
      {Object.keys(byProj).length ? Object.entries(byProj).map(([proj, list]) => (
        <div key={proj} className="rpp"><div className="row between"><b>{S.projects[proj].name}</b><span className="small"><Hrs v={r0(list.reduce((a, x) => a + inR(x), 0))} /> in range</span></div>
          <table className="grid-table small"><tbody>{list.sort((a, b) => (a.from < b.from ? -1 : 1)).map((a) => <AssignRow key={a.uid + a.key} S={S} a={a} inR={inR(a)} dispatch={dispatch} nav={nav} canEdit={canEdit} />)}</tbody></table></div>
      )) : <Empty>No open assignments.</Empty>}
      <h4>Timesheets (last 4 weeks)</h4>
      {recent.length ? <table className="grid-table small num-right"><thead><tr><th>Project</th><th>Approved</th><th>Pending</th></tr></thead><tbody>
        {Object.entries(recent.reduce((m, e) => { const k = e.project; m[k] ||= { a: 0, p: 0 }; if (e.status === 'approved') m[k].a += e.hours; if (e.status === 'submitted') m[k].p += e.hours; return m; }, {})).map(([k, v]) => <tr key={k}><td>{S.projects[k]?.name}</td><td><Hrs v={v.a} /></td><td className="twarn"><Hrs v={v.p} /></td></tr>)}</tbody></table> : <Empty>No recent entries.</Empty>}
      <h4>Availability exceptions</h4>
      {exc.length ? <ul className="plain small list">{exc.map((x) => <li key={x.id}><span>{x.kind} · {fmt(x.from)} – {fmt(x.to)} <Illus>illustrative</Illus></span>{canEdit && <button className="linkish small" onClick={() => dispatch({ type: 'CAPEX_REMOVE', id: x.id })}>Remove</button>}</li>)}</ul> : <p className="small muted">None recorded.</p>}
      {canEdit && <div className="row wrap"><select id="ex-kind" aria-label="Exception type" value={ex.kind} onChange={(e) => setEx({ ...ex, kind: e.target.value })}>{['Vacation', 'Unavailable', 'Training', 'Public Holiday'].map((k) => <option key={k}>{k}</option>)}</select>
        <input type="date" id="ex-from" aria-label="From" value={ex.from} onChange={(e) => setEx({ ...ex, from: e.target.value })} /><input type="date" id="ex-to" aria-label="To" value={ex.to} onChange={(e) => setEx({ ...ex, to: e.target.value })} />
        <Btn size="sm" onClick={() => dispatch({ type: 'CAPEX_ADD', person: pid, ...ex })}>Add exception</Btn></div>}
      <p className="small muted">Generic categories only. No personal or medical reasons are recorded.</p>
      {admin && <><h4>Weekly capacity</h4><div className="row wrap"><label className="small">h/week <input type="number" id="cap-h" className="num" min="0" max="60" value={cap.hpw} onChange={(e) => setCap({ ...cap, hpw: Number(e.target.value) })} /></label>
        <label className="small">effective <input type="date" id="cap-from" value={cap.from} onChange={(e) => setCap({ ...cap, from: e.target.value })} /></label>
        <label className="check small"><input type="checkbox" checked={cap.verified} onChange={(e) => setCap({ ...cap, verified: e.target.checked })} /> verified</label>
        <Btn size="sm" onClick={() => dispatch({ type: 'CAP_SET', person: pid, ...cap })}>Save capacity</Btn></div>
        {(p.caps || []).length > 1 && <ul className="plain small muted">{p.caps.map((c, k) => <li key={k}>{c.hpw} h/wk from {fmt(c.from)}{c.to ? ` to ${fmt(c.to)}` : ''}</li>)}</ul>}</>}
      {canEdit && <><h4>Add an assignment</h4>
        <div className="form tight">
          <label>Project<select id="as-proj" value={add.proj} onChange={(e) => setAdd({ ...add, proj: e.target.value, uid: '' })}><option value="">Choose…</option>{projectsOf(S).map((P) => <option key={P.id} value={P.id}>{P.name}</option>)}</select></label>
          <label>Hours of remaining effort<input id="as-h" type="number" min="0" value={add.h} onChange={(e) => setAdd({ ...add, h: Number(e.target.value) })} /></label>
          <label className="span2">Task<select id="as-task" value={add.uid} onChange={(e) => setAdd({ ...add, uid: e.target.value })}><option value="">Choose…</option>{addTasks.map(({ t, c }) => <option key={t.uid} value={t.uid}>{c} {t.title} · {fmt(t.ps)}–{fmt(t.pf)}</option>)}</select></label>
        </div>
        <Btn kind="primary" size="sm" disabled={!add.proj || !add.uid} reason="Pick a project and task" onClick={() => dispatch({ type: 'ASSIGN_ALLOC', _pid: add.proj, uid: add.uid, person: pid, h: add.h })}>Assign {add.h} h to {p.name}</Btn>
        <p className="small muted">Adds {p.name} as a contributor on that task in its project, with an explicit allocation. The project's Workflow, My Work and Timeline show the same assignment.</p></>}
    </div>
  );
}

function AssignRow({ S, a, inR, dispatch, nav, canEdit }) {
  const [h, setH] = useState(a.h);
  const V = projView(S, a.proj); const f = E.forecastAll(V)[a.uid];
  const t = V.tasks[a.uid];
  return <tr>
    <td><button className="linkish" onClick={() => nav.openTask(a.proj, a.uid)}><span className="mono">{a.code}</span> {a.title}</button>
      <div className="muted">{E.pad(a.phaseNo)} · {a.wp} · {fmt(a.from)}–{fmt(a.to)}{a.locked ? ' · phase locked' : ''}</div>
      <div className="muted">Plan {fmt(t.pf)} · {f?.uncertain ? <span className="twarn">forecast uncertain</span> : f?.finish ? <>forecast {fmt(f.finish)}</> : ''}</div></td>
    <td className="nowrap"><b>{r1(a.h)} h</b>{a.explicit ? <span className="muted"> {a.pct != null ? `(${a.pct}%)` : 'allocated'}</span> : <div><Illus title="No allocation entered: illustrative equal split">allocation not defined</Illus></div>}<div className="muted">{r1(inR)} h in range</div></td>
    {canEdit && <td className="nowrap"><input type="number" className="num" min="0" aria-label={`Allocated hours on ${a.code}`} value={h} onChange={(e) => setH(Number(e.target.value))} /> <Btn size="xs" disabled={h === a.h && a.explicit} onClick={() => dispatch({ type: 'ALLOC', _pid: a.proj, uid: a.uid, ref: a.key, h, reason: 'Set from Resource Planning' })}>Set</Btn></td>}
  </tr>;
}

function WeekPanel({ S, M, pid, i, nav, pick }) {
  const p = S.people.find((x) => x.id === pid); const wk = M.weeks[i];
  const x = personWeeks(S, M, pid, {}, i, i)[0];
  const act = M.actual[pid]?.[wk] || { approved: 0, pending: 0, proj: {} };
  return (
    <div className="rpanel">
      <h2>{p.name} — {R.wkLabel(wk)}</h2><p className="small muted">{fmt(wk)} – {fmt(E.addDays(wk, 4))}</p>
      <table className="kv small"><tbody>
        <tr><th>Standard capacity</th><td>{x.cap.hpw} h {p.capVerified ? '' : <Illus>illustrative</Illus>}</td></tr>
        <tr><th>Available</th><td>{x.cap.avail} h{x.cap.hol ? ` · ${x.cap.hol} holiday` : ''}{x.cap.off ? ` · ${x.cap.off} day${x.cap.off > 1 ? 's' : ''} ${x.cap.kinds.join(', ').toLowerCase()}` : ''}</td></tr>
        <tr><th>Allocated</th><td>{r1(x.d)} h</td></tr>
        <tr><th>Utilization</th><td><b>{pctTxt(x.u)}</b> <St st={x.st} /></td></tr>
        {x.d > x.cap.avail && <tr><th>Overallocated</th><td className="tbad">+{r1(x.d - x.cap.avail)} h</td></tr>}
        <tr><th>Actual</th><td><Hrs v={act.approved} /> approved · <Hrs v={act.pending} /> pending</td></tr>
      </tbody></table>
      <h4>Assignments</h4>
      {x.items.length ? <ul className="plain small list">{x.items.sort((a, b) => b.h - a.h).map(({ row, h }, k) => <li key={k}><button className="linkish" onClick={() => nav.openTask(row.proj, row.uid)}>{row.projName} → {row.phaseTitle.split(' &')[0]} → <span className="mono">{row.code}</span> {row.title}</button><span><b>{r1(h)} h</b>{row.assumed ? <Illus title="Allocation not defined: illustrative equal split"> *</Illus> : ''}</span></li>)}</ul> : <Empty>Nothing planned this week.</Empty>}
      {x.items.some(({ row }) => row.assumed) && <p className="small muted">* Allocation not defined on the task: illustrative equal split among its assignees.</p>}
      <button className="linkish small" onClick={() => pick({ kind: 'person', id: pid })}>Open {p.name}'s full workload</button>
    </div>
  );
}

function DiscPanel({ S, M, d, i0, i1, nav, pick, me }) {
  const people = R.companyPeople(S).filter((p) => R.discOf(S, p) === d);
  const rows = people.map((p) => { const w = personWeeks(S, M, p.id, {}, i0, i1); const C = w.reduce((a, x) => a + x.cap.avail, 0); const Dm = w.reduce((a, x) => a + x.d, 0); const u = C > 0 ? r0((Dm / C) * 100) : Dm > 0 ? 999 : 0; return { p, w, C, Dm, u, st: R.status(S, u, C, Dm) }; });
  const s = discStats(S, M, d, rows, i0, i1);
  const next = (() => { const w = rows.map((r) => personWeeks(S, M, r.p.id, {}, 4, 7)); const C = w.flat().reduce((a, x) => a + x.cap.avail, 0); const Dm = w.flat().reduce((a, x) => a + x.d, 0); return { C, Dm, free: C - Dm }; })();
  const deadlines = M.assignments.filter((a) => a.udisc === d && a.to >= E.TODAY && a.to <= E.addDays(E.TODAY, 28)).filter((a, k, arr) => arr.findIndex((b) => b.proj === a.proj && b.uid === a.uid) === k).sort((a, b) => (a.to < b.to ? -1 : 1)).slice(0, 8);
  const needed = M.needed.filter((x) => x.need === d);
  return (
    <div className="rpanel">
      <h2>{R.discName(d)}</h2>
      <div className="kpis mini">
        <div><div className="lbl">People</div><b>{people.length}</b></div>
        <div><div className="lbl">Capacity in range</div><b>{r0(s.C)} h</b><div className="sub">{r0(s.capWk)} h/wk</div></div>
        <div><div className="lbl">Assigned</div><b>{r0(s.Dm)} h</b><div className="sub">{rows.length ? `${s.u}%` : '—'} <St st={s.st} compact /></div></div>
      </div>
      <p className="small"><b>Capacity for another project next month</b> ({R.wkLabel(M.weeks[4])}–{R.wkLabel(M.weeks[7])}): {people.length ? <>{r0(next.free)} h unallocated of {r0(next.C)} h ({next.C ? r0((next.Dm / next.C) * 100) : 0}% utilized){next.free < 40 ? <span className="tbad"> · tight</span> : ''}</> : <span className="tbad">no {R.discName(d)} people in the roster</span>}. <Illus>Illustrative</Illus></p>
      <h4>Workload trend</h4>
      <div className="rmini">{s.weekly.map((x, k) => <span key={k} className={`rmini-c ${x.st.key}`}><span className="rmini-b"><i style={{ height: `${Math.min(100, x.u >= 999 ? 100 : x.u)}%` }} /></span><span className="rmini-l">{R.wkLabel(M.weeks[i0 + k])}</span><span className="rmini-v">{rows.length ? (x.u >= 999 ? '—' : `${x.u}%`) : '—'}</span></span>)}</div>
      <h4>Team members</h4>
      {!rows.length ? <Empty>No one in the roster has this primary discipline.</Empty> : me ? <p className="small">{rows.length} people · {s.over} overallocated · {s.near} near capacity · {s.avail} available <span className="muted">(individual workloads are visible to Administrators, PMs and Executive Management)</span></p>
        : <ul className="plain small list">{rows.map((r) => <li key={r.p.id}><button className="linkish" onClick={() => pick({ kind: 'person', id: r.p.id })}>{r.p.name}</button><span>{pctTxt(r.u)} <St st={r.st} /></span></li>)}</ul>}
      <h4>Projects consuming {R.discName(d)}</h4>
      {s.top.length ? <ul className="plain small list">{s.top.map(([p, h]) => <li key={p}><span>{S.projects[p]?.name}</span><Hrs v={r0(h)} /></li>)}</ul> : <Empty>None in range.</Empty>}
      <h4>Upcoming deadlines (4 weeks)</h4>
      {deadlines.length ? <ul className="plain small list">{deadlines.map((a) => <li key={a.proj + a.uid}><button className="linkish" onClick={() => nav.openTask(a.proj, a.uid)}>{a.projName} · <span className="mono">{a.code}</span> {a.title}</button><span>{fmt(a.to)}</span></li>)}</ul> : <Empty>None.</Empty>}
      <h4>Resource needed ({needed.length})</h4>
      {needed.length ? <ul className="plain small list">{needed.slice(0, 12).map((n, k) => <li key={k}><button className="linkish" onClick={() => nav.openTask(n.proj, n.uid)}>{n.projName} · <span className="mono">{n.code}</span> {n.title}</button><span>{r1(n.hours)} h · {n.reason}</span></li>)}</ul> : <Empty>None.</Empty>}
    </div>
  );
}

function Settings({ S, dispatch }) {
  const [f, setF] = useState(S.rp); const [hd, setHd] = useState('');
  return (
    <div className="rpanel">
      <h2>Resource planning defaults</h2>
      <div className="form tight">
        <label>Overallocated above (%)<input type="number" id="rs-over" value={f.over} onChange={(e) => setF({ ...f, over: Number(e.target.value) })} /></label>
        <label>Near capacity from (%)<input type="number" id="rs-near" value={f.near} onChange={(e) => setF({ ...f, near: Number(e.target.value) })} /></label>
        <label>Available below (%)<input type="number" id="rs-av" value={f.available} onChange={(e) => setF({ ...f, available: Number(e.target.value) })} /></label>
        <label>Default range (weeks)<select id="rs-h" value={f.horizon} onChange={(e) => setF({ ...f, horizon: Number(e.target.value) })}>{[1, 4, 8, 12].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
      </div>
      <Btn size="sm" kind="primary" onClick={() => dispatch({ type: 'RP_SET', patch: f })}>Save defaults</Btn>
      <h4>Company holidays</h4>
      <ul className="plain small list">{S.holidays.filter((d) => d >= E.addDays(E.TODAY, -30)).map((d) => <li key={d}><span>{fmt(d)} · Public Holiday</span><button className="linkish small" onClick={() => dispatch({ type: 'HOLIDAY_REMOVE', date: d })}>Remove</button></li>)}</ul>
      <div className="row"><input type="date" id="rs-hd" aria-label="Holiday date" value={hd} onChange={(e) => setHd(e.target.value)} /><Btn size="sm" disabled={!hd} onClick={() => dispatch({ type: 'HOLIDAY_ADD', date: hd })}>Add holiday</Btn></div>
      <p className="small muted">Holidays apply to every project's working-day calendar, capacity and forecast. Teams, members, disciplines and roles are edited in each project's Team tab (the directory is company-wide).</p>
    </div>
  );
}
