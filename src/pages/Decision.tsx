import { Link, useParams } from 'react-router-dom';
import { ErrorLine, Loading, Num, PageHeader } from '../components/ui';
import { fmt, pct, useApi } from '../lib';

interface Step { positionId: number; positionTitle: string; employeeId: number | null; employeeName: string | null; newHire: boolean }
interface DecisionData {
  position: { id: number; title: string; department: string; monthly_vacancy_cost_sar: number };
  chosen: { full_name: string; current_title: string };
  chain: Step[];
  internal: { cost_sar: number; days: number };
  external: { cost_sar: number; days: number };
  saudization: { before: number; after: number };
}

function Arrow() {
  // points left = direction of reading in RTL
  return (<svg width="32" height="12" viewBox="0 0 32 12" fill="none" stroke="var(--muted)" strokeWidth="1" aria-hidden="true" className="shrink-0"><path d="M32 6H2M7 1 2 6l5 5" /></svg>);
}

function Metric({ label, value, unit, caption, tone }: { label: string; value: string; unit: string; caption: string; tone?: 'positive' }) {
  return (
    <div className="px-6 py-4">
      <div className="text-meta text-muted">{label}</div>
      <Num value={value} unit={unit} className="text-kpi block" />
      <div className={`text-meta ${tone === 'positive' ? 'text-positive' : 'text-muted'}`}>{caption}</div>
    </div>
  );
}

export default function Decision() {
  const { vacancyId } = useParams();
  const { data: d, error } = useApi<DecisionData>(`/vacancies/${vacancyId}/decision`);
  if (error) return <ErrorLine>لا يوجد قرار لهذا الشاغر بعد. <Link to="/radar" className="underline">ارجع إلى الرادار</Link></ErrorLine>;
  if (!d) return <Loading />;

  const dCost = d.external.cost_sar - d.internal.cost_sar;
  const dDays = d.external.days - d.internal.days;
  const cheaper = dCost >= 0 ? 'الترقية الداخلية' : 'التوظيف الخارجي';
  const faster = dDays >= 0 ? 'الترقية الداخلية' : 'التوظيف الخارجي';
  const line = cheaper === faster
    ? `${cheaper} أقل كلفة بمقدار ${fmt(Math.abs(dCost))} ر.س وأسرع بمقدار ${Math.abs(dDays)} يوماً.`
    : `${cheaper} أقل كلفة بمقدار ${fmt(Math.abs(dCost))} ر.س، لكن ${faster} أسرع بمقدار ${Math.abs(dDays)} يوماً.`;

  const { before, after } = d.saudization;
  const delta = Math.round((after - before) * 10) / 10;
  const base = Math.min(before, after);

  return (
    <>
      <PageHeader title="القرار" line={line} />
      <div className="flex flex-col gap-gap max-w-[960px]">
        {/* one card, split in two */}
        <section className="bg-surface border border-border rounded-card grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border">
          {([
            ['ترقية داخلية', d.internal, dCost >= 0, 'التوظيف الخارجي'],
            ['توظيف خارجي', d.external, dCost < 0, 'الترقية الداخلية'],
          ] as const).map(([title, v, cheapest, other], i) => {
            const otherV = i === 0 ? d.external : d.internal;
            return (
              <div key={title}>
                <h2 className="text-section m-0 px-6 pt-4">{title}</h2>
                <div className="grid grid-cols-2 divide-x divide-x-reverse divide-rule">
                  <Metric label="التكلفة" value={fmt(v.cost_sar)} unit="ر.س"
                    caption={cheapest ? `أقل من ${other} بـ ${fmt(Math.abs(v.cost_sar - otherV.cost_sar))}` : `أعلى من ${other} بـ ${fmt(Math.abs(v.cost_sar - otherV.cost_sar))}`}
                    tone={cheapest ? 'positive' : undefined} />
                  <Metric label="المدة" value={String(v.days)} unit="يوم"
                    caption={v.days <= otherV.days ? `أسرع من ${other} بـ ${otherV.days - v.days} يوماً` : `أبطأ من ${other} بـ ${v.days - otherV.days} يوماً`}
                    tone={v.days <= otherV.days ? 'positive' : undefined} />
                </div>
              </div>
            );
          })}
        </section>

        {/* chain relay, right to left */}
        <section className="bg-surface border border-border rounded-card p-6">
          <h2 className="text-section m-0">سلسلة الترقية</h2>
          <p className="text-meta text-muted m-0 mt-1 mb-4">كل حلقة تُخلي منصبها ليشغله من يليها، وتنتهي بتعيين جديد في أدنى مستوى.</p>
          <div className="flex items-stretch gap-3 overflow-x-auto pb-2">
            {d.chain.map((s, i) => (
              <div key={i} className="flex items-center gap-3 shrink-0">
                {s.newHire ? (
                  <div className="border border-text rounded-card px-6 py-6 min-w-[240px] min-h-[120px] flex flex-col justify-center">
                    <div className="text-meta text-muted">{s.positionTitle}</div>
                    <div className="text-section mt-1">تعيين جديد</div>
                  </div>
                ) : (
                  <div className="border border-border rounded-card px-4 py-3 min-w-[168px]">
                    <div className="text-meta text-muted">{s.positionTitle}</div>
                    <div className="text-body font-medium mt-1">{s.employeeName}</div>
                  </div>
                )}
                {i < d.chain.length - 1 && <Arrow />}
              </div>
            ))}
          </div>
        </section>

        {/* Saudization */}
        <section className="bg-surface border border-border rounded-card p-6">
          <h2 className="text-section m-0">السعودة</h2>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 divide-x divide-x-reverse divide-rule border-y border-rule">
            <Metric label="قبل" value={pct(before)} unit="" caption="النسبة الحالية للموظفين المحتسبين" />
            <Metric label="بعد" value={pct(after)} unit="" caption="بعد إتمام السلسلة" />
            <div className="hidden sm:block"><Metric label="الفرق" value={`\u200E${delta > 0 ? '+' : ''}${delta.toFixed(1)}`} unit="نقطة" caption="مقارنة بالنسبة الحالية" tone={delta > 0 ? 'positive' : undefined} /></div>
          </div>
          <div className="mt-6" aria-label={`قبل ${pct(before)} بعد ${pct(after)}`}>
            <div className="relative h-2 bg-active rounded-track overflow-hidden">
              <div className="absolute inset-y-0 start-0 bg-accent" style={{ width: `${base}%` }} />
              <div className={`absolute inset-y-0 ${delta >= 0 ? 'bg-positive' : 'bg-negative'}`} style={{ insetInlineStart: `${base}%`, width: `${Math.abs(after - before)}%` }} />
            </div>
            <div className="flex justify-between text-meta text-muted mt-2 num"><span>0</span><span>100%</span></div>
            <p className="text-meta text-muted m-0 mt-2">تقديري — النسبة الرسمية في منصة قوى</p>
            <p className="text-meta text-muted m-0 mt-1">يفترض أن يغادر شاغل المنصب، وأن يكون التعيين الجديد سعودياً بأجر لا يقل عن 3٬000 ر.س.</p>
          </div>
        </section>
        <div><Link to="/radar" className="text-body font-medium text-text underline underline-offset-4 decoration-control hover:decoration-text">العودة إلى الرادار</Link></div>
      </div>
    </>
  );
}
