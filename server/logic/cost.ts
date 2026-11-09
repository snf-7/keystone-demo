import type { Candidate, CostComparison, Position } from '../types.js';

/**
 * STUB — MOCK DATA. Replace with the real internal-vs-external cost model.
 * Returns whole SAR rounded to the nearest 100 and whole days.
 */
export function compareInternalExternal(position: Position, candidate: Candidate): CostComparison {
  const r100 = (n: number) => Math.round(n / 100) * 100;
  const internalDays = 14 + position.level * 7;
  const externalDays = 45 + position.level * 15;
  const vacancyPerDay = position.monthly_vacancy_cost_sar / 30;
  const annual = candidate.monthly_salary_sar * 12;

  return {
    internal: {
      days: internalDays,
      costSar: r100(annual * 0.12 + 8000 + vacancyPerDay * internalDays),
    },
    external: {
      days: externalDays,
      costSar: r100(annual * 1.35 * 0.2 + vacancyPerDay * externalDays),
    },
  };
}
