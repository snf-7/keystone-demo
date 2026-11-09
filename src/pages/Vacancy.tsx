import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { btnPrimary, btnSecondary, ErrorLine, Loading, Num, PageHeader, Pill } from '../components/ui';
import { api, countNoun, fmt } from '../lib';

interface Factor { factor: string; points: number; evidence: string }
interface Gap { skill: string; current: number; required: number; status: 'met' | 'near' | 'gap'; critical: boolean }
interface Step { positionId: number; positionTitle: string; employeeName: string | null; newHire: boolean }
type Impact = 'low' | 'medium' | 'high';
interface Cand {
  rank: number; employee_id: number; full_name: string; current_title: string; total: number; breakdown: Factor[];
  gaps: Gap[]; critical_met: boolean; ready_in_weeks: number; plan_steps: { title: string; weeks: number }[];
  transfer_impact: Impact; vacated_title: string; cost_sar: number; days: number; chain: Step[];
}
interface Analysis { extracted_skills: Record<string, number>; candidates: Cand[] }
interface Opened { position: { id: number; title: string; department_name: string; monthly_vacancy_cost_sar: number }; vacancy: { id: number; job_description: string } }

const weeks = (n: number) => countNoun(n, 'أسبوع واحد', 'أسبوعان', 'أسابيع', 'أسبوعاً');
const impactLabel: Record<Impact, string> = { low: 'أثر منخفض', medium: 'أثر متوسط', high: 'أثر مرتفع' };
const impactTone = { low: 'positive', medium: 'warning', high: 'negative' } as const;

const CriticalPill = ({ met }: { met: boolean }) => (met ? <Pill tone="positive">مستوفى</Pill> : <Pill tone="negative">فجوة حرجة</Pill>);
const ImpactPill = ({ v }: { v: Impact }) => <Pill tone={impactTone[v]}>{impactLabel[v]}</Pill>;
const Ready = ({ w }: { w: number }) => <span className="num text-body">{w === 0 ? 'جاهز الآن' : weeks(w)}</span>;

function ScoreBar({ total }: { total: number }) {
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-1 bg-rule rounded-track overflow-hidden" aria-hidden="true">
        <div className="h-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, total))}%` }} />
      </div>
      <span className="num text-body font-medium w-8 text-end">{total}</span>
    </div>
  );
}

/** current level as a 4px bar, required level as a 1px tick */
function GapBar({ g }: { g: Gap }) {
  return (
    <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[200px_1fr_56px] items-center gap-x-4 gap-y-1 py-2">
      <div className="text-body">{g.skill}{g.critical && <span className="text-meta text-muted"> (حرجة)</span>}</div>
      <div dir="ltr" className="num text-body text-start sm:order-3 font-medium" style={{ color: g.status === 'gap' ? 'var(--negative)' : undefined }} title="المستوى الحالي / المطلوب">{g.current} / {g.required}</div>
      <div className="relative h-1 bg-rule rounded-track col-span-2 sm:col-span-1 sm:order-2" aria-hidden="true">
        <div className="h-full bg-accent rounded-track" style={{ width: `${(g.current / 5) * 100}%` }} />
        <div className="absolute -top-1 w-px h-3 bg-text" style={{ insetInlineStart: `${(g.required / 5) * 100}%` }} />
      </div>
    </div>
  );
}

function CandidateRow({ c, open, onToggle, onChoose, busy }: { c: Cand; open: boolean; onToggle: () => void; onChoose: () => void; busy: boolean }) {
  const cols = 'grid-cols-[24px_1fr_96px] sm:grid-cols-[32px_minmax(0,1.5fr)_150px_104px_104px_104px_104px]';
  const hasGap = c.gaps.some((g) => g.status !== 'met');
  return (
    <li className="border-t border-rule">
      <button
        onClick={onToggle} aria-expanded={open}
        className={`w-full bg-transparent border-0 text-start cursor-pointer hover:bg-raised grid items-center gap-x-4 px-2 py-2 min-h-14 sm:min-h-12 sm:py-0 ${cols}`}
      >
        <span className="num text-body text-muted">{c.rank}</span>
        <span className="min-w-0">
          <span className="block text-body font-medium truncate">{c.full_name}</span>
          <span className="block text-meta text-muted truncate">{c.current_title}</span>
        </span>
        <ScoreBar total={c.total} />
        <span className="hidden sm:block"><CriticalPill met={c.critical_met} /></span>
        <span className="hidden sm:block"><Ready w={c.ready_in_weeks} /></span>
        <span className="hidden sm:block"><ImpactPill v={c.transfer_impact} /></span>
        <span className="hidden sm:block text-end"><Num value={fmt(c.cost_sar)} unit="ر.س" className="text-body" /></span>
      </button>

      <div
        className="grid"
        // collapsed content must not be focusable: hide it after the 150ms collapse finishes
        style={{ gridTemplateRows: open ? '1fr' : '0fr', visibility: open ? 'visible' : 'hidden', transition: `grid-template-rows 150ms ease-out, visibility 0s linear ${open ? '0s' : '150ms'}` }}
      >
        <div className="overflow-hidden">
          <div className="px-2 pt-3 pb-4 sm:ps-12 flex flex-col gap-gap">
            {/* the table's columns, repeated for phones where they are hidden */}
            <div className="sm:hidden grid grid-cols-2 gap-3">
              <div><div className="text-meta text-muted">الشرط الحرج</div><CriticalPill met={c.critical_met} /></div>
              <div><div className="text-meta text-muted">الجاهزية</div><Ready w={c.ready_in_weeks} /></div>
              <div><div className="text-meta text-muted">أثر النقل</div><ImpactPill v={c.transfer_impact} /></div>
              <div><div className="text-meta text-muted">التكلفة</div><Num value={fmt(c.cost_sar)} unit="ر.س" className="text-body" /></div>
            </div>

            <div>
              <h3 className="text-body font-semibold m-0 mb-1">لماذا هذه الدرجة</h3>
              {c.breakdown.map((b) => (
                <div key={b.factor} className="flex items-start justify-between gap-4 py-2">
                  <div className="min-w-0">
                    <span className="text-body font-medium">{b.factor}</span>
                    <span className="text-body text-muted"> — {b.evidence}</span>
                  </div>
                  <span className="num text-body font-medium shrink-0 text-positive">{'‎'}+{b.points}</span>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-body font-semibold m-0">الفجوة عن متطلبات المنصب</h3>
              <p className="text-meta text-muted m-0 mb-1">الشريط مستوى المرشح اليوم، والخط الأسود المستوى المطلوب. الرقم: الحالي / المطلوب.</p>
              {c.gaps.map((g) => <GapBar key={g.skill} g={g} />)}
            </div>

            <div>
              <h3 className="text-body font-semibold m-0 mb-1">خطة التطوير</h3>
              {hasGap ? (
                <>
                  {c.plan_steps.map((s) => (
                    <div key={s.title} className="flex items-center justify-between gap-4 py-2 border-t border-rule first:border-t-0">
                      <span className="text-body">{s.title}</span>
                      <span className="num text-body text-muted shrink-0">{weeks(s.weeks)}</span>
                    </div>
                  ))}
                  <p className="text-body m-0 pt-2 border-t border-rule">الجاهزية المتوقعة بعد <span className="num font-medium">{weeks(c.ready_in_weeks)}</span>.</p>
                </>
              ) : (
                <p className="text-body text-muted m-0">لا فجوات: المرشح يلبّي كل متطلبات المنصب الآن.</p>
              )}
            </div>

            <div><button className={btnSecondary} onClick={onChoose} disabled={busy}>اعتمد هذا المرشح</button></div>
          </div>
        </div>
      </div>
    </li>
  );
}

/** vertical relay: the vacancy, each role vacated along the way, then the entry-level hire */
function Scenario({ c }: { c: Cand }) {
  const first = c.full_name.split(' ')[0];
  const last = c.chain[c.chain.length - 1];
  const sentence =
    c.transfer_impact === 'high' ? `نقل ${first} يترك «${c.vacated_title}» بلا بديل داخلي جاهز.`
    : c.transfer_impact === 'medium' ? `«${c.vacated_title}» له بديل داخلي واحد جاهز.`
    : `«${c.vacated_title}» له بديل داخلي جاهز أو يُملأ بسهولة.`;
  return (
    <div className="bg-surface border border-border rounded-card p-4 flex flex-col min-w-0">
      <h3 className="text-section m-0">إذا نُقل {first}</h3>
      <ol className="list-none m-0 p-0 mt-3 border-s border-control">
        {c.chain.map((s, i) => (
          <li key={i} className="ps-4 pb-3 relative last:pb-0">
            <span className="absolute -start-[3px] top-2 w-[5px] h-[5px] bg-muted rounded-track" aria-hidden="true" />
            <div className="text-body font-medium">{s.positionTitle}</div>
            <div className="text-meta text-muted">{s.newHire ? 'شاغر ← تعيين جديد' : `يشغله ${s.employeeName}`}</div>
          </li>
        ))}
      </ol>
      <div className="mt-auto pt-4 flex flex-col gap-2 items-start">
        <ImpactPill v={c.transfer_impact} />
        <p className="text-body m-0">{sentence}</p>
        <p className="text-meta text-muted m-0">تنتهي السلسلة بتعيين جديد في «{last.positionTitle}».</p>
      </div>
    </div>
  );
}

function scenarioSummary(cs: Cand[]) {
  const best = cs[0];
  const order: Impact[] = ['low', 'medium', 'high'];
  const lowest = [...cs].sort((a, b) => order.indexOf(a.transfer_impact) - order.indexOf(b.transfer_impact) || a.rank - b.rank)[0];
  const f = (c: Cand) => c.full_name.split(' ')[0];
  if (best.employee_id === lowest.employee_id) return `${f(best)} الأعلى درجة والأقل أثراً على المنظمة بين المرشحين الثلاثة.`;
  return `${f(best)} الأعلى درجة، لكن أثر نقله ${impactLabel[best.transfer_impact]}. ${f(lowest)} يحقق الاحتياج بأثر ${impactLabel[lowest.transfer_impact]}.`;
}

export default function Vacancy() {
  const { positionId } = useParams();
  const nav = useNavigate();
  const [opened, setOpened] = useState<Opened | null>(null);
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setOpened(null); setAnalysis(null); setExpanded(null);
    api<Opened>(`/positions/${positionId}/vacancy`, { method: 'POST' })
      .then((d) => { if (live) { setOpened(d); setText(d.vacancy.job_description); } })
      .catch(() => live && setError('تعذّر فتح الشاغر.'));
    return () => { live = false; };
  }, [positionId]);

  if (error && !opened) return <ErrorLine>{error}</ErrorLine>;
  if (!opened) return <Loading />;
  const { position, vacancy } = opened;

  const analyze = async () => {
    setBusy(true); setError(null);
    try {
      const a = await api<Analysis>(`/vacancies/${vacancy.id}/analyze`, { method: 'POST', body: { jobDescription: text } });
      setAnalysis(a); setExpanded(null);
    } catch { setError('تعذّر التحليل.'); } finally { setBusy(false); }
  };
  const choose = async (employeeId: number) => {
    setBusy(true); setError(null);
    try {
      await api(`/vacancies/${vacancy.id}/decide`, { method: 'POST', body: { employeeId } });
      nav(`/decision/${vacancy.id}`);
    } catch { setError('تعذّر حفظ القرار.'); setBusy(false); }
  };

  const cs = analysis?.candidates ?? [];
  const top = cs[0];
  const noneCritical = cs.length > 0 && cs.every((c) => !c.critical_met);
  const line = top
    ? noneCritical
      ? `لا يستوفي أي مرشح داخلي الشرط الحرج لـ${position.title}؛ أعلاهم ${top.full_name} بدرجة ${top.total}.`
      : `${top.full_name} أعلى المرشحين الداخليين بدرجة ${top.total}، لـ${position.title}.`
    : `${position.title} — ${position.department_name}، وتبلغ تكلفة الشغور ${fmt(position.monthly_vacancy_cost_sar)} ر.س شهرياً.`;
  const skills = analysis ? Object.keys(analysis.extracted_skills) : [];

  return (
    <>
      <PageHeader title="الشاغر" line={line} />
      <section className="mb-gap">
        <h2 className="text-section m-0 mb-3">الوصف الوظيفي</h2>
        <textarea
          value={text} onChange={(e) => setText(e.target.value)} rows={9} aria-label="الوصف الوظيفي"
          className="w-full max-w-[720px] block p-3 rounded-control bg-surface border border-control text-body resize-y"
        />
        <div className="mt-3 flex items-center gap-4">
          <button className={btnPrimary} onClick={analyze} disabled={busy}>{busy && !analysis ? 'جارٍ التحليل…' : 'حلّل'}</button>
          {skills.length > 0 && <span className="text-meta text-muted">المهارات المستخرجة: {skills.join('، ')}</span>}
        </div>
        {error && <div className="mt-3"><ErrorLine>{error}</ErrorLine></div>}
      </section>

      {analysis && (
        <div className="flex flex-col gap-gap max-w-[1080px]">
          <section>
            <h2 className="text-section m-0 mb-3">أفضل 3 مرشحين داخليين</h2>
            <div className="hidden sm:grid grid-cols-[32px_minmax(0,1.5fr)_150px_104px_104px_104px_104px] gap-x-4 px-2 pb-2 text-meta text-muted">
              <span>#</span><span>المرشح</span><span>الدرجة</span><span>الشرط الحرج</span><span>الجاهزية</span><span>أثر النقل</span><span className="text-end">التكلفة التقديرية</span>
            </div>
            {cs.length === 0 ? (
              <p className="text-body text-muted m-0">لا يوجد مرشحون داخليون لهذا المنصب.</p>
            ) : (
              <ul className="list-none m-0 p-0 border-b border-rule">
                {cs.map((c) => (
                  <CandidateRow key={c.employee_id} c={c} open={expanded === c.employee_id} busy={busy}
                    onToggle={() => setExpanded(expanded === c.employee_id ? null : c.employee_id)} onChoose={() => choose(c.employee_id)} />
                ))}
              </ul>
            )}
          </section>

          {cs.length > 0 && (
            <section>
              <h2 className="text-section m-0">سيناريوهات النقل</h2>
              <p className="text-meta text-muted m-0 mt-1 mb-3">ماذا يحدث في المنظمة بعد نقل كل مرشح؟</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-gap">
                {cs.map((c) => <Scenario key={c.employee_id} c={c} />)}
              </div>
              <p className="text-body m-0 mt-gap bg-surface border border-border rounded-card p-4">{scenarioSummary(cs)}</p>
            </section>
          )}
        </div>
      )}
    </>
  );
}
