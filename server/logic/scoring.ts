import type { Candidate, CandidateScore, Position, ScoreFactor } from '../types.js';
import { assertNoProtectedFields } from './protected.js';

/**
 * STUB — MOCK DATA. Replace with the real scoring logic.
 *
 * Contract: returns one entry per candidate, `total` = sum of breakdown points,
 * every breakdown row carries a human-readable Arabic `evidence` line.
 * Candidates arrive already stripped of nationality/gender (see protected.ts).
 */
export function scoreCandidates(position: Position, candidates: Candidate[]): CandidateScore[] {
  assertNoProtectedFields(candidates); // defence in depth; the real guard is in analysis.ts

  const nowYear = 2026;
  return candidates.map((c) => {
    const years = Math.max(0, nowYear - Number(c.hire_date.slice(0, 4)));
    const avgPerf = c.performance.length
      ? c.performance.reduce((s, p) => s + p.score, 0) / c.performance.length
      : 0;
    const req = Object.entries(position.required_skills);
    const met = req.filter(([skill, lvl]) => (c.skills[skill] ?? 0) >= lvl - 1).length;

    const breakdown: ScoreFactor[] = [
      {
        factor: 'الأداء',
        points: Math.round(avgPerf * 5),
        evidence: `متوسط التقييم ${avgPerf.toFixed(1)} من 5 (عدد التقييمات السنوية: ${c.performance.length})`,
      },
      {
        factor: 'المهارات',
        points: req.length ? Math.round((met / req.length) * 30) : 0,
        evidence: `يلبّي ${met} من ${req.length} مهارات مطلوبة للمنصب`,
      },
      {
        factor: 'الخبرة',
        points: Math.min(15, Math.round(years * 1.5)),
        evidence: `${years} سنة في الشركة`,
      },
      {
        factor: 'الإنجازات',
        points: Math.min(10, c.achievements.length * 5),
        evidence: c.achievements.length ? c.achievements.join('، ') : 'لا إنجازات موثّقة',
      },
    ];
    return { employeeId: c.id, total: breakdown.reduce((s, b) => s + b.points, 0), breakdown };
  });
}
