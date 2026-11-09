import { useEffect, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import OrgChart from '../components/OrgChart';
import { Num, PageHeader, Pill, Loading } from '../components/ui';
import { countNoun, fmt, type RadarData } from '../lib';

export default function Radar() {
  const { radar } = useOutletContext<{ radar: RadarData | null }>();
  const [params] = useSearchParams();
  const [focus, setFocus] = useState<number | null>(params.get('focus') ? Number(params.get('focus')) : null);
  useEffect(() => { const f = params.get('focus'); if (f) setFocus(Number(f)); }, [params]);

  if (!radar) return <Loading />;
  const critical = radar.positions.filter((p) => p.is_critical);
  const s = radar.summary;
  const noun = countNoun(s.critical_without_successor, 'منصب حرج واحد', 'منصبان حرجان', 'مناصب حرجة', 'منصباً حرجاً');
  const line = s.critical_without_successor > 0
    ? `${noun} بلا بديل داخلي جاهز، وتبلغ تكلفة شغورها ${fmt(s.critical_monthly_cost_sar)} ر.س شهرياً.`
    : `لكل المناصب الحرجة بديل داخلي جاهز.`;

  return (
    <>
      <PageHeader title="رادار الخلافة" line={line} />
      <div className="flex flex-col sm:flex-row gap-gap sm:flex-1 sm:min-h-0 sm:items-stretch max-sm:flex-none">
        <section className="relative sm:flex-1 min-w-0 bg-surface border border-border rounded-card overflow-hidden h-[60vh] max-sm:shrink-0 sm:h-auto sm:min-h-[420px]" aria-label="الهيكل التنظيمي">
          <OrgChart positions={radar.positions} focusId={focus} onSelect={setFocus} />
        </section>

        <aside className="w-full max-sm:shrink-0 sm:w-[360px] sm:shrink-0 bg-surface border border-border rounded-card flex flex-col">
          <div className="flex items-baseline justify-between px-4 py-4">
            <h2 className="text-section m-0">مناصب حرجة</h2>
            <span className="text-meta text-muted num">{critical.length}</span>
          </div>
          <ul className="list-none m-0 p-0 overflow-auto">
            {critical.map((p) => (
              <li key={p.id} className={`px-4 py-4 border-t border-rule cursor-pointer ${focus === p.id ? 'bg-raised' : 'hover:bg-raised'}`} onClick={() => setFocus(p.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-body font-medium">{p.title}</div>
                    <div className="text-meta text-muted">{p.department_name}</div>
                  </div>
                  <Pill tone="negative">بلا بديل</Pill>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-meta text-muted">تكلفة الشغور</div>
                    <Num value={fmt(p.monthly_vacancy_cost_sar)} unit="ر.س / شهر" className="text-body font-medium" />
                  </div>
                  <Link to={`/vacancy/${p.id}`} onClick={(e) => e.stopPropagation()} className="text-body font-medium text-text underline underline-offset-4 decoration-control hover:decoration-text">افتح شاغر</Link>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
