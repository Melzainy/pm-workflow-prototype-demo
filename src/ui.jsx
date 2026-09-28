import { DEMO_TODAY } from './seed.js';

export const Badge = ({ tone = 'neutral', children, title }) => <span className={`badge ${tone}`} title={title}>{children}</span>;

export const Btn = ({ kind = 'secondary', size, disabled, reason, onClick, children, id, type = 'button' }) => (
  <button id={id} type={type} className={`btn ${kind} ${size || ''}`} disabled={disabled} title={disabled ? reason : undefined}
    aria-disabled={disabled || undefined} onClick={disabled ? undefined : onClick}>{children}</button>
);

export const Bar = ({ value, w = 120 }) => (
  <span className="bar" style={{ width: w }} role="progressbar" aria-valuenow={value ?? 0} aria-valuemin={0} aria-valuemax={100}>
    <i style={{ width: `${value ?? 0}%` }} />
  </span>
);

export const Illus = ({ children, title = 'Illustrative value, not verified project data' }) => <span className="illus" title={title}>{children}</span>;


export const TypeMark = ({ type }) => {
  const m = { task: ['T', ''], meeting: ['M', 'm'], review: ['R', 'r'], signoff: ['S', 's'], decision: ['D', 'd'], milestone: ['◇', ''], submission: ['↑', 's'] }[type] || ['?', ''];
  const names = { task: 'Task', meeting: 'Meeting', review: 'Review', signoff: 'Client sign-off', decision: 'Decision', milestone: 'Milestone', submission: 'Submission' };
  return <span className={`type ${m[1]}`} title={names[type]} aria-label={names[type]}>{m[0]}</span>;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmt = (d) => { if (!d) return '—'; const [y, m, dd] = d.split('-'); return `${MONTHS[+m - 1]} ${+dd}${y !== '2026' ? `, ${y}` : ''}`; };
export const isPast = (d) => d < DEMO_TODAY;

export const Section = ({ title, right, children, className = '' }) => (
  <section className={`panel ${className}`}>
    {(title || right) && <header className="panel-h"><h2>{title}</h2>{right}</header>}
    {children}
  </section>
);

export const Empty = ({ children }) => <p className="empty">{children}</p>;

// ── v2 additions ────────────────────────────────────────────────────────────
import { ROLE_DEFS } from './seed.js';
import { whoLabel } from './engine.js';

export const Hrs = ({ v, title }) => <span className="mono" title={title}>{Math.round((v || 0) * 10) / 10} h</span>;

export function ownerOptions(s, { includeClient = false } = {}) {
  const roles = ROLE_DEFS.filter(([k]) => includeClient || k !== 'client').map(([k]) => ({ value: `role:${k}`, label: whoLabel(s, `role:${k}`) }));
  const people = s.people.filter((p) => p.active).map((p) => ({ value: p.id, label: p.name + (p.note ? ` · ${p.note}` : '') }));
  return { roles, people };
}
export function WhoSelect({ s, id, value, onChange, disabled, title, includeClient, placeholder }) {
  const o = ownerOptions(s, { includeClient });
  return (
    <select id={id} value={value || ''} disabled={disabled} title={title} onChange={(e) => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      <optgroup label="Roles">{o.roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</optgroup>
      <optgroup label="People">{o.people.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</optgroup>
    </select>
  );
}
export function MultiWho({ s, id, values, onChange, disabled, title }) {
  return (
    <div className="multi">
      {values.map((v) => <span key={v} className="tag">{whoLabel(s, v)}{!disabled && <button className="x" aria-label={`Remove ${whoLabel(s, v)}`} onClick={() => onChange(values.filter((x) => x !== v))}>×</button>}</span>)}
      {!disabled && <WhoSelect s={s} id={id} value="" placeholder="+ Add person or role" onChange={(v) => v && !values.includes(v) && onChange([...values, v])} title={title} />}
      {!values.length && disabled && <span className="muted small">None</span>}
    </div>
  );
}
export const Req = ({ req }) => (req === 'optional' ? <span className="reqtag">Optional</span> : req === 'conditional' ? <span className="reqtag cond">Conditional</span> : null);
export const Days = ({ n }) => (n == null ? null : <span className={`var ${n > 5 ? 'bad' : n > 0 ? 'warn' : 'ok'}`} title={`${n > 0 ? '+' : ''}${n} working days`}>{n > 0 ? `+${n}d` : n < 0 ? `${n}d` : 'on plan'}</span>);
