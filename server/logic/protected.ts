import type { Candidate, Employee } from '../types.js';

/**
 * Fields that must never influence who gets promoted.
 * Nationality matters for the Saudization *estimate* (nitaqat.ts) — it must not
 * matter for ranking people.
 */
export const PROTECTED_FIELDS = ['nationality', 'gender'] as const;

/**
 * Build the object scoring is allowed to see, from an allowlist.
 *
 * WHY: promotion scoring must be blind to nationality and gender. Stripping happens
 * HERE, before scoreCandidates() is ever called, so that whatever logic is written
 * inside scoring.ts cannot read those fields even by accident. Do not move this
 * after the call and do not "just pass the whole employee".
 */
export function toCandidate(e: Employee): Candidate {
  return {
    id: e.id,
    position_id: e.position_id,
    monthly_salary_sar: e.monthly_salary_sar,
    hire_date: e.hire_date,
    skills: e.skills,
    performance: e.performance,
    achievements: e.achievements,
  };
}

/** Deep check; throws if a protected key appears anywhere in the value. */
export function assertNoProtectedFields(value: unknown, path = 'candidate'): void {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoProtectedFields(v, `${path}[${i}]`));
    return;
  }
  for (const [k, v] of Object.entries(value)) {
    if ((PROTECTED_FIELDS as readonly string[]).includes(k)) {
      throw new Error(`Protected field "${k}" reached scoring at ${path}.${k}`);
    }
    assertNoProtectedFields(v, `${path}.${k}`);
  }
}
