import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApi, type RadarData } from '../lib';

const USER_INITIALS = 'FF'; // placeholder: replace with the signed-in user's initials

const icon = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.25, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const IconOrg = () => (
  <svg {...icon} aria-hidden="true"><rect x="5.5" y="1.5" width="5" height="3.5" rx="1" /><rect x="1.5" y="11" width="5" height="3.5" rx="1" /><rect x="9.5" y="11" width="5" height="3.5" rx="1" /><path d="M8 5v3M4 11V8h8v3" /></svg>
);
const IconMenu = () => (<svg {...icon} aria-hidden="true"><path d="M2 4.5h12M2 8h12M2 11.5h12" /></svg>);
const IconSearch = () => (<svg {...icon} aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></svg>);

/** keystone: tapered block, wider at the top */
function Mark() {
  return (<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 3h13l-2.6 14H6.1z" fill="var(--accent)" /></svg>);
}

function Search({ radar }: { radar: RadarData | null }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const box = useRef<HTMLDivElement>(null);
  const results = useMemo(() => {
    const s = q.trim();
    if (!radar || !s) return [];
    const out: { key: string; label: string; sub: string; positionId: number }[] = [];
    for (const p of radar.positions) {
      if (p.title.includes(s)) out.push({ key: `p${p.id}`, label: p.title, sub: p.department_name, positionId: p.id });
      for (const h of p.holders) if (h.full_name.includes(s)) out.push({ key: `e${h.id}`, label: h.full_name, sub: p.title, positionId: p.id });
    }
    return out.slice(0, 8);
  }, [q, radar]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div ref={box} className="relative w-full max-w-[420px]">
      <span className="absolute top-2 start-3 text-muted pointer-events-none"><IconSearch /></span>
      <input
        value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        placeholder="ابحث عن منصب أو موظف" aria-label="بحث"
        className="h-8 w-full ps-8 pe-3 rounded-control bg-surface border border-border hover:border-control text-body placeholder:text-muted"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 top-[36px] inset-x-0 m-0 p-1 list-none bg-surface border border-border rounded-card">
          {results.map((r) => (
            <li key={r.key}>
              <button
                className="w-full h-8 px-2 flex items-center justify-between gap-3 text-start bg-transparent border-0 rounded-control hover:bg-raised cursor-pointer"
                onClick={() => { setOpen(false); setQ(''); nav(`/radar?focus=${r.positionId}`); }}
              >
                <span className="truncate text-body">{r.label}</span>
                <span className="truncate text-meta text-muted">{r.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Shell() {
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  useEffect(() => setMenu(false), [loc.pathname]);
  const { data: radar } = useApi<RadarData>('/radar');
  const company = radar?.company ?? 'شركة الريادة للتوزيع';

  const navItem = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 h-[34px] px-3 rounded-nav text-body no-underline ${isActive ? 'bg-active text-text' : 'text-text hover:bg-raised'}`;

  return (
    <div className="h-full grid grid-cols-1 grid-rows-[48px_1fr] sm:grid-cols-[228px_1fr] bg-ground">
      {/* sidebar (right in RTL); on phones it collapses to a 48px bar */}
      <aside aria-label="القائمة الرئيسية" className="relative row-start-1 sm:row-span-2 sm:p-4 flex flex-col">
        <div className="h-12 sm:h-auto flex items-center justify-between px-4 sm:px-0">
          <div className="flex items-center gap-2"><Mark /><span className="text-body font-semibold" dir="ltr">Keystone</span></div>
          <button className="sm:hidden h-8 w-8 flex items-center justify-center bg-transparent border-0 rounded-control text-muted" aria-label="القائمة" aria-expanded={menu} onClick={() => setMenu(!menu)}><IconMenu /></button>
        </div>
        <div className={`${menu ? 'flex' : 'hidden'} sm:flex flex-col max-sm:absolute max-sm:top-12 max-sm:inset-x-0 max-sm:z-30 max-sm:bg-ground max-sm:border-b max-sm:border-border max-sm:px-4 max-sm:pb-3`}>
          <div className="text-body text-muted sm:mt-1 mb-4 truncate">{company}</div>
          <div className="sm:hidden mb-3"><Search radar={radar} /></div>
          <nav className="flex flex-col">
            <NavLink to="/radar" className={navItem}><span className="text-muted"><IconOrg /></span>الرادار</NavLink>
          </nav>
        </div>
      </aside>

      {/* top bar */}
      <header className="hidden sm:flex row-start-1 col-start-2 items-center justify-center relative px-4">
        <Search radar={radar} />
        <span className="absolute left-4 h-6 min-w-6 px-1 flex items-center justify-center rounded-control bg-active text-meta font-medium text-muted" dir="ltr" title="الحساب">{USER_INITIALS}</span>
      </header>

      {/* sheet */}
      <main className="row-start-2 col-start-1 sm:col-start-2 min-h-0 overflow-auto bg-surface p-6 flex flex-col sm:border sm:border-border sm:rounded-sheet sm:ml-2 sm:mb-2 max-sm:p-4">
        <Outlet context={{ radar }} />
      </main>
    </div>
  );
}
