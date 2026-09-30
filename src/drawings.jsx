import * as E from './engine.js';
import { CONDITIONAL_REVIEWER } from './seed.js';
import { Badge, Btn, Bar, Illus, fmt, Section, Empty, WhoSelect, MultiWho } from './ui.jsx';
import { TaskPicker } from './time.jsx';

const { useState, useEffect } = React;
const { code, whoLabel, TODAY } = E;
const APPROVAL = { not_started: ['Not started', 'neutral'], in_production: ['In production', 'accent'], internal_review: ['Internal review', 'warn'], approved: ['Internally approved', 'ok'], issued: ['Issued', 'ok'] };

export function Drawings({ s, dispatch, ui, setUi, nav }) {
  const [open, setOpen] = useState({ A: true });
  const [who, setWho] = useState('');
  const sel = ui.sheet;
  const setSel = (no) => setUi((u) => ({ ...u, sheet: no }));
  useEffect(() => { if (sel) setOpen((o) => ({ ...o, [sel[0]]: true })); }, [sel]);
  const reqsFor = (no) => s.reqs.filter((r) => r.primary === no || r.secondary.includes(no));
  const conditional = s.reqs.filter((r) => r.applicability === 'conditional');
  const involved = (x, pid) => [x.lead, x.owner, ...x.contrib, ...x.reviewers].some((r) => E.resolve(s, r) === pid);
  const tracks = [...new Set(s.jur.map((j) => j.track))].map((tr) => { const js = s.jur.filter((j) => j.track === tr); return { name: tr, auth: [...new Set(js.map((j) => j.authority))].join(' · '), jur: js.map((j) => j.id) }; });
  const readiness = (t) => {
    const js = t.jur.map((id) => s.jur.find((j) => j.id === id));
    if (js.some((j) => j.status === 'blocked')) return ['warn', 'Blocked by decision'];
    if (js.some((j) => j.status === 'potential')) return ['warn', 'Not ready · jurisdiction unverified'];
    if (js.every((j) => j.status === 'na')) return ['neutral', 'Not applicable (verified)'];
    const unmet = s.reqs.filter((r) => r.applicability !== 'na' && r.status !== 'met').length;
    return unmet ? ['neutral', 'Not ready · requirements open'] : ['ok', 'Ready for submission'];
  };
  return (
    <div className="page">
      <div className="page-h"><div><h1>Drawings & permits</h1><p className="muted">One master register. Permit and construction issues are revisions of the same sheet, never copies.</p></div></div>
      <div className="split">
        <div>
          <Section title="Master sheet register" right={<label className="small">Show sheets for <select id="dr-who" value={who} onChange={(e) => setWho(e.target.value)}><option value="">Everyone</option>{s.people.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}>
            {s.sheetDiscs.map(([d, name]) => {
              const sh = s.sheets.filter((x) => x.no.startsWith(d + '-') && (!who || involved(x, who)));
              if (!sh.length) return who ? null : <div className="disc" key={d}><div className="disc-h static"><span><span className="mono">{d}</span> · {name}</span><span className="small muted">No sheets yet</span></div></div>;
              const avg = Math.round(sh.reduce((a, x) => a + x.pct, 0) / (sh.length || 1));
              return (
                <div className="disc" key={d}>
                  <button className="disc-h" aria-expanded={!!open[d] || !!who} onClick={() => setOpen({ ...open, [d]: !open[d] })}>
                    <span><span className="caret">{open[d] || who ? '▾' : '▸'}</span> <span className="mono">{d}</span> · {name}</span>
                    <span className="r small">{sh.length} sheet{sh.length > 1 ? 's' : ''} · <Illus>{avg}%</Illus></span>
                  </button>
                  {(open[d] || who) && <ul className="sheets">{sh.map((x) => {
                    const rq = reqsFor(x.no); const met = rq.filter((r) => r.status === 'met').length;
                    const [al, at] = APPROVAL[x.approval] || APPROVAL.not_started;
                    return (
                      <li key={x.no}><button className={`sheet-row ${sel === x.no ? 'sel' : ''} ${x.proposed ? 'proposed' : ''}`} onClick={() => setSel(x.no)}>
                        <span className="mono">{x.no}</span><span className="ell">{x.title}</span>
                        <span className="small muted hide-sm">{whoLabel(s, x.owner)}</span>
                        <span className="small mono">{x.revs.length ? x.revs[x.revs.length - 1].rev : '—'}</span>
                        <span className="small">{rq.length ? `${met}/${rq.length} req.` : ''}</span>
                        {x.proposed ? <Badge tone="warn">Proposed</Badge> : x.conditional ? <Badge>If in scope</Badge> : <Badge tone={at}>{x.pct && x.approval === 'in_production' ? `${x.pct}%` : al}</Badge>}
                      </button></li>);
                  })}</ul>}
                </div>);
            })}
          </Section>
        </div>
        <div>
          {sel && s.sheets.find((x) => x.no === sel) ? <SheetDetail key={sel} s={s} no={sel} dispatch={dispatch} reqs={reqsFor(sel)} close={() => setSel(null)} nav={nav} /> :
            <Section title="Select a sheet"><p className="small muted">Pick a sheet to see who is accountable, who produces it, who reviews it, its revisions and linked BCC-323 requirements. Try A-102 First Floor Plan.</p></Section>}
          <Section title="Permit tracks">
            <ul className="plain list">{tracks.map((t) => { const [tone, label] = readiness(t); return (
              <li key={t.name}><div><b>{t.name}</b><div className="small muted">{t.auth}</div></div><Badge tone={tone}>{label}</Badge></li>); })}</ul>
          </Section>
          <Section title="Jurisdiction register">
            <ul className="plain list jurlist">{s.jur.map((j) => <JurRow key={j.id} s={s} j={j} dispatch={dispatch} />)}</ul>
          </Section>
          <Section title={`Conditional requirements (${conditional.length})`}>
            {conditional.length ? <ul className="plain list">{conditional.map((r) => <CondReq key={r.code} s={s} r={r} dispatch={dispatch} />)}</ul> : <Empty>All conditional requirements resolved.</Empty>}
          </Section>
        </div>
      </div>
    </div>
  );
}

function SheetDetail({ s, no, dispatch, reqs, close, nav }) {
  const x = s.sheets.find((q) => q.no === no);
  const can = E.isPM(s) || E.isAdmin(s);
  const up = (patch) => dispatch({ type: 'SHEET_UPDATE', no, patch });
  const [rv, setRv] = useState({ purpose: 'Permit issue' });
  const t = x.task && s.tasks[x.task];
  const nextRev = () => { const n = x.revs.length; const p = rv.purpose; return p === 'Permit issue' ? `P${x.revs.filter((r) => r.rev.startsWith('P')).length + 1}` : p === 'Construction issue' ? String(x.revs.filter((r) => /^\d+$/.test(r.rev)).length) : `C${x.revs.filter((r) => r.rev.startsWith('C')).length + 1 || n + 1}`; };
  return (
    <Section title={<><span className="mono">{x.no}</span> {x.title}</>} right={<Btn size="sm" onClick={close}>Close</Btn>}>
      {x.proposed && <p className="note warn small">{x.proposed}.</p>}
      {x.conditional && <p className="note small">{x.conditional}.</p>}
      {!can && <p className="small muted">Only the PM or an administrator changes sheet responsibilities.</p>}
      <div className="form">
        <label>Accountable discipline lead<WhoSelect s={s} id="sh-lead" value={x.lead} disabled={!can} onChange={(v) => up({ lead: v })} /></label>
        <label>Primary production owner<WhoSelect s={s} id="sh-owner" value={x.owner} disabled={!can} onChange={(v) => up({ owner: v })} /></label>
        <label className="span2">Contributors (any discipline)<MultiWho s={s} id="sh-contrib" values={x.contrib} disabled={!can} onChange={(v) => up({ contrib: v })} /></label>
        <label className="span2">Internal reviewers<MultiWho s={s} id="sh-rev" values={x.reviewers} disabled={!can} onChange={(v) => up({ reviewers: v })} /></label>
        <label>Planned start<input type="date" id="sh-ps" value={x.ps || ''} disabled={!can} onChange={(e) => up({ ps: e.target.value })} /></label>
        <label>Planned finish<input type="date" id="sh-pf" value={x.pf || ''} disabled={!can} onChange={(e) => up({ pf: e.target.value })} /></label>
        <label>Actual start<input type="date" id="sh-as" value={x.as || ''} disabled={!can} onChange={(e) => up({ as: e.target.value })} /></label>
        <label>Actual finish<input type="date" id="sh-af" value={x.af || ''} disabled={!can} onChange={(e) => up({ af: e.target.value })} /></label>
        <label>Approval status<select id="sh-appr" value={x.approval} disabled={!can} onChange={(e) => up({ approval: e.target.value })}>{Object.entries(APPROVAL).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label>Linked workflow task<TaskPicker s={s} id="sh-task" value={x.task || ''} onChange={(v) => can && up({ task: v || null })} /></label>
      </div>
      <div className="row"><span className="small">Production</span><Bar value={x.pct} w={120} /><Illus>{x.pct}%</Illus>
        <div className="seg small-seg" role="group" aria-label="Sheet production">{[0, 25, 50, 75, 100].map((v) => <button key={v} className={x.pct === v ? 'on' : ''} disabled={!can} onClick={() => up({ pct: v })}>{v}%</button>)}</div></div>
      {t && <p className="small">Workflow task: <button className="linkish" onClick={() => nav.task(t.uid)}><span className="mono">{code(s, t)}</span> {t.title}</button> · {E.status(s, t).label}</p>}
      <h4>Revisions of this master sheet</h4>
      {x.revs.length ? <table className="grid-table small"><thead><tr><th>Rev</th><th>Purpose</th><th>Date</th></tr></thead><tbody>{x.revs.map((r, i) => <tr key={i}><td className="mono">{r.rev}</td><td>{r.purpose}</td><td>{fmt(r.date)}</td></tr>)}</tbody></table> : <p className="small muted">No revisions issued. The number is not locked until first issue.</p>}
      {can && <div className="row"><select id="sh-rvp" value={rv.purpose} onChange={(e) => setRv({ purpose: e.target.value })}><option>Coordination draft</option><option>Permit issue</option><option>Permit resubmission</option><option>Construction issue</option></select>
        <Btn size="xs" onClick={() => up({ revs: [...x.revs, { rev: nextRev(), purpose: rv.purpose + ' (demo)', date: TODAY }], approval: rv.purpose.includes('issue') ? 'issued' : x.approval })}>Record revision {nextRev()}</Btn></div>}
      <p className="small muted">Permit submissions and the CD set reference exact revisions of this sheet. A permit revision stays in the record after the construction revision supersedes it.</p>
      <h4>Linked requirements ({reqs.length})</h4>
      {reqs.length ? <table className="reqs"><tbody>{reqs.map((r) => (
        <tr key={r.code}>
          <td className="mono faint">BCC-{r.code}</td>
          <td>{r.text}<div className="small muted">{r.primary === no ? 'Primary sheet' : `Secondary (primary ${r.primary})`} · {r.source}</div></td>
          <td>{r.applicability === 'conditional' ? <Badge tone="warn">Conditional</Badge> : r.applicability === 'na' ? <Badge>N/A</Badge> : <Badge tone={r.status === 'met' ? 'ok' : 'neutral'}>{r.status === 'met' ? 'Met' : 'Not met'}</Badge>}</td>
          <td>{r.applicability === 'required' && r.primary === no && <Btn size="xs" onClick={() => dispatch({ type: 'REQ_STATUS', code: r.code, status: r.status === 'met' ? 'not_met' : 'met' })}>{r.status === 'met' ? 'Mark not met' : 'Mark met'}</Btn>}</td>
        </tr>))}</tbody></table> : <p className="small muted">No BCC-323 requirement points at this sheet.</p>}
    </Section>
  );
}

function JurRow({ s, j, dispatch }) {
  const [openF, setOpenF] = useState(false);
  const [src, setSrc] = useState('');
  const [out, setOut] = useState('verified');
  const tone = { potential: 'warn', blocked: 'warn', verified: 'ok', na: 'neutral', stale: 'bad' }[j.status];
  const label = { potential: 'Potential · unverified', blocked: 'Blocked by decision', verified: 'Verified · applicable', na: 'Verified · not applicable', stale: 'Stale' }[j.status];
  return (
    <li className="col">
      <div className="row between"><div><b>{j.title}</b><div className="small muted">{j.authority} · reviewer {whoLabel(s, j.reviewer)}{j.verifiedOn ? ` · verified ${fmt(j.verifiedOn)}` : ''}{j.source ? ` · ${j.source}` : ''}</div></div><Badge tone={tone}>{label}</Badge></div>
      {j.status === 'potential' && (openF ? (
        <form className="inline-form" onSubmit={(e) => { e.preventDefault(); dispatch({ type: 'JUR_RESOLVE', id: j.id, outcome: out, source: src }); setOpenF(false); }}>
          <select id={`jo-${j.id}`} value={out} onChange={(e) => setOut(e.target.value)}><option value="verified">Applicable</option><option value="na">Not applicable</option></select>
          <input id={`js-${j.id}`} value={src} onChange={(e) => setSrc(e.target.value)} placeholder="Official source or written confirmation" />
          <Btn size="sm" type="submit">Record</Btn>
        </form>) : <Btn size="xs" onClick={() => setOpenF(true)}>Resolve with evidence</Btn>)}
      {j.status === 'blocked' && <p className="small muted">Waiting on the state approval-route decision (Manufacturing Lead).</p>}
    </li>
  );
}

function CondReq({ s, r, dispatch }) {
  const [openF, setOpenF] = useState(false);
  const [reason, setReason] = useState('');
  const [app, setApp] = useState('required');
  return (
    <li className="col">
      <div className="row between"><span><span className="mono faint">BCC-{r.code}</span> {r.text}</span><span className="small muted">Reviewer: {whoLabel(s, CONDITIONAL_REVIEWER(r.code))}</span></div>
      {openF ? <form className="inline-form" onSubmit={(e) => { e.preventDefault(); dispatch({ type: 'REQ_APPLY', code: r.code, app, reason }); setOpenF(false); }}>
        <select id={`ra-${r.code}`} value={app} onChange={(e) => setApp(e.target.value)}><option value="required">Applies</option><option value="na">Not applicable</option></select>
        <input id={`rr-${r.code}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" />
        <Btn size="sm" type="submit">Record</Btn></form> : <Btn size="xs" onClick={() => setOpenF(true)}>Decide applicability</Btn>}
    </li>
  );
}
