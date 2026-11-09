import type { Employee, SaudizationEstimate } from '../types.js';

/**
 * STUB — PLACEHOLDER. Replace with the real Nitaqat estimate.
 *
 * Right now: Saudis earning >= 3,000 SAR / headcount. No band tables, no activity-size
 * weighting, no special categories. It is computed from the rows it is given, nothing typed in.
 */
export function estimateSaudization(
  employees: Pick<Employee, 'nationality' | 'monthly_salary_sar'>[],
): SaudizationEstimate {
  const headcount = employees.length;
  const countedSaudis = employees.filter(
    (e) => e.nationality === 'saudi' && e.monthly_salary_sar >= 3000,
  ).length;
  const percentage = headcount ? Math.round((countedSaudis / headcount) * 1000) / 10 : 0;
  return { percentage, countedSaudis, headcount };
}
