import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { btnPrimary, btnSecondary, ErrorLine, Loading, Num, PageHeader } from '../components/ui';
import { api, fmt } from '../lib';

interface Factor { factor: string; points: number; evidence: string }
interface Cand { rank: number; employee_id: number; full_name: string; current_title: string; total: number; breakdown: Factor[] }
interface Analysis { extracted_skills: Record<string, number>; candidates: Cand[] }
interface Opened { position: { id: number; title: string; department_name: string; monthly_vacancy_cost_sar: number }; vacancy: { id: number; job_description: string } }

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

function CandidateRow({ c, open, onToggle, onChoose, busy }: { c: Cand; open: boolean; onToggle: () => void; onChoose: () => void; busy: boolean }) {
  return (
    <li className="border-t border-rule">
      <button
        onClick={onToggle} aria-expanded={open}
        className="w-full bg-transparent border-0 text-start cursor-pointer hover:bg-raised grid items-center gap-x-4 px-2 py-2 min-h-14 sm:min-h-12 sm:py-0 grid-cols-[24px_1fr_112px] sm:grid-cols-[32px_1.2fr_1.4fr_220px]"
      >
        <span className="num text-body text-muted row-start-1 col-start-1 row-span-2 sm:row-span-1">{c.rank}</span>
        <span className="text-body font-medium row-start-1 col-start-2 truncate">{c.full_name}</span>
        <span className="text-meta sm:text-body text-muted row-start-2 col-start-2 sm:row-start-1 sm:col-start-3 truncate">{c.current_title}</span>
        <span className="row-start-1 col-start-3 row-span-2 sm:row-span-1 sm:col-start-4"><ScoreBar total={c.total} /></span>
      </button>
      <div
        className="grid"
        // collapsed content must not be focusable: hide it after the 150ms collapse finishes
        style={{ gridTemplateRows: open ? '1fr' : '0fr', visibility: open ? 'visible' : 'hidden', transition: `grid-template-rows 150ms ease-out, visibility 0s linear ${open ? '0s' : '150ms'}` }}
      >
        <div className="overflow-hidden">
          <div className="px-2 pb-4 sm:ps-12">
            {c.breakdown.map((b) => (
              <div key={b.factor} className="flex items-start justify-between gap-4 py-2">
                <div className="min-w-0">
                  <span className="text-body font-medium">{b.factor}</span>
                  <span className="text-body text-muted"> — {b.evidence}</span>
                </div>
                <span className="num text-body font-medium shrink-0 text-positive">{'\u200E'}+{b.points}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 pt-3 mt-2 border-t border-rule">
              <span className="text-body text-muted">المجموع</span>
              <Num value={String(c.total)} className="text-body font-medium" />
            </div>
            <div className="mt-3"><button className={btnSecondary} onClick={onChoose} disabled={busy}>اعتمد هذا المرشح</button></div>
          </div>
        </div>
      </div>
    </li>
  );
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

  const top = analysis?.candidates[0];
  const line = top
    ? `${top.full_name} أعلى المرشحين الداخليين بدرجة ${top.total}، لـ${position.title}.`
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
        <section className="max-w-[960px]">
          <h2 className="text-section m-0 mb-3">أفضل 3 مرشحين داخليين</h2>
          <div className="hidden sm:grid grid-cols-[32px_1.2fr_1.4fr_220px] gap-x-4 px-2 pb-2 text-meta text-muted">
            <span>#</span><span>المرشح</span><span>المنصب الحالي</span><span>الدرجة</span>
          </div>
          {analysis.candidates.length === 0 ? (
            <p className="text-body text-muted m-0">لا يوجد مرشحون داخليون لهذا المنصب.</p>
          ) : (
            <ul className="list-none m-0 p-0 border-b border-rule">
              {analysis.candidates.map((c) => (
                <CandidateRow key={c.employee_id} c={c} open={expanded === c.employee_id} busy={busy}
                  onToggle={() => setExpanded(expanded === c.employee_id ? null : c.employee_id)} onChoose={() => choose(c.employee_id)} />
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
