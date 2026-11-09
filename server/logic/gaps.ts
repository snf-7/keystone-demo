import type { Candidate, Position } from '../types.js';
import { assertNoProtectedFields } from './protected.js';

export interface SkillGap {
  skill: string;
  current: number;
  required: number;
  status: 'met' | 'near' | 'gap';
  /** the position's make-or-break skill */
  critical: boolean;
}
export interface DevelopmentPlan {
  gaps: SkillGap[];
  criticalMet: boolean;
  readyInWeeks: number;
  steps: { title: string; weeks: number }[];
}

/**
 * STUB — MOCK DATA. Replace with the real gap analysis and development-plan logic.
 *
 * MOCK rules: met = at or above the required level; near = one point short; gap = two or more.
 * The critical skill is the highest-required one. Weeks and steps are derived from the points missing.
 * Candidates arrive stripped of nationality/gender (see protected.ts).
 */
export function analyzeGaps(position: Position, candidate: Candidate): DevelopmentPlan {
  assertNoProtectedFields(candidate);

  const entries = Object.entries(position.required_skills);
  const topLevel = Math.max(0, ...entries.map(([, lvl]) => lvl));
  const criticalSkill = entries.find(([, lvl]) => lvl === topLevel)?.[0];

  const gaps: SkillGap[] = entries.map(([skill, required]) => {
    const current = candidate.skills[skill] ?? 0;
    const status = current >= required ? 'met' : current >= required - 1 ? 'near' : 'gap';
    return { skill, current, required, status, critical: skill === criticalSkill };
  });

  const missing = gaps.filter((g) => g.status !== 'met');
  const steps = missing.map((g) => ({ title: `دورة تدريبية: ${g.skill}`, weeks: (g.required - g.current) * 3 }));
  if (missing.length) steps.push({ title: 'مشروع تطبيقي على مهام المنصب', weeks: 4 });
  if (gaps.some((g) => g.critical && g.status === 'gap')) steps.push({ title: 'اختبار عملي في المهارة الحرجة', weeks: 1 });

  return {
    gaps,
    criticalMet: gaps.find((g) => g.critical)?.status !== 'gap',
    readyInWeeks: steps.reduce((s, x) => s + x.weeks, 0),
    steps,
  };
}
